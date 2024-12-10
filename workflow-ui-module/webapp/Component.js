sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "orderapp/workflowuimodule/model/models",
  ],
  function (UIComponent, Device, models) {
    "use strict";

    return UIComponent.extend(
      "orderapp.workflowuimodule.Component",
      {
        metadata: {
          manifest: "json",
        },

      
        init: function () {
          // call the base component's init function
          UIComponent.prototype.init.apply(this, arguments);

          // enable routing
          this.getRouter().initialize();

          // set the device model
          this.setModel(models.createDeviceModel(), "device");

          this.setTaskModels();

          const rejectOutcomeId = "reject";
          this.getInboxAPI().addAction(
              {
              action: rejectOutcomeId,
              label: "Reject",
              type: "reject",
              },
              function () {
              this.completeTask(false, rejectOutcomeId);
              },
              this
          );
          const approveOutcomeId = "approve";
          this.getInboxAPI().addAction(
              {
              action: approveOutcomeId,
              label: "Approve",
              type: "accept",
              },
              function () {
              this.completeTask(true, approveOutcomeId);
              },
              this
          );
          },

          setTaskModels: function () {
          // set the task model
          var startupParameters = this.getComponentData().startupParameters;
          this.setModel(startupParameters.taskModel, "task");

          // set the task context model
          var taskContextModel = new sap.ui.model.json.JSONModel(
              this._getTaskInstancesBaseURL() + "/context"
          );
          this.setModel(taskContextModel, "context");
          },

          _getTaskInstancesBaseURL: function () {
          return (
              this._getWorkflowRuntimeBaseURL() +
              "/task-instances/" +
              this.getTaskInstanceID()
          );
          },

          _getWorkflowRuntimeBaseURL: function () {  
            var ui5CloudService = this.getManifestEntry("/sap.cloud/service").replaceAll(".", "");  
            var ui5ApplicationName = this.getManifestEntry("/sap.app/id").replaceAll(".", "");  
            var appPath = `${ui5CloudService}.${ui5ApplicationName}`;
            return `/${appPath}/api/public/workflow/rest/v1`

          },

          getTaskInstanceID: function () {
          return this.getModel("task").getData().InstanceID;
          },

          getInboxAPI: function () {
          var startupParameters = this.getComponentData().startupParameters;
          return startupParameters.inboxAPI;
          },

          completeTask: function (approvalStatus, outcomeId) {
          this.getModel("context").setProperty("/approved", approvalStatus);
          this._patchTaskInstance(outcomeId);
          },

          completeTask: function (outcomeId) {
            const context = this.getModel("context").getData();
        
            // Define all the fields to be included in the payload
            var data = {
                status: "COMPLETED",
                decision: outcomeId,
                context: {
                    comment: context.comment || "",
                    totalprice: Number(context.totalprice) || 0, // Ensure totalprice is a number
                    requestno: Number(context.requestno) || 0,   // Ensure requestno is a number
                    requestdesc: context.requestdesc || "",
                    requestby: context.requestby || "",
                    requestid: Number(context.requestid) || 0,   // Ensure requestid is a number
                    requestitem: context.requestitem || [],
                }
                /* context: {
                    ...context,
                    comment: context.comment || "",
                    totalprice: parseInt(context.totalprice) || 0, // Convert to number
                    requestno: parseInt(context.requestno, 10) || 0, // Convert to number
                    requestdesc: context.requestdesc || "",
                    requestby: context.requestby || "",
                    requestid: parseInt(context.requestid, 10) || 0, // Convert to number
                    requestitem: context.requestitem || [],
                } */
            };
        
            // Make the AJAX PATCH call to update the task instance
            jQuery.ajax({
                url: `${this._getTaskInstancesBaseURL()}`,
                method: "PATCH",
                contentType: "application/json",
                async: true,
                data: JSON.stringify(data),
                headers: {
                    "X-CSRF-Token": this._fetchToken(),
                },
            }).done(function(response) {
                console.log("Task updated successfully:", response);
                this._refreshTaskList();
            }).fail(function(xhr, status, error) {
                console.error("Error updating task:", error);
                console.log("Response Text:", xhr.responseText); // Inspect the full response from the server
            });
        },
        

          _fetchToken: function () {
          var fetchedToken;

          jQuery.ajax({
              url: this._getWorkflowRuntimeBaseURL() + "/xsrf-token",
              method: "GET",
              async: false,
              headers: {
              "X-CSRF-Token": "Fetch",
              },
              success(result, xhr, data) {
              fetchedToken = data.getResponseHeader("X-CSRF-Token");
              },
          });
          return fetchedToken;
          },

          _refreshTaskList: function () {
          this.getInboxAPI().updateTask("NA", this.getTaskInstanceID());
          },
      }
      );
  }
);
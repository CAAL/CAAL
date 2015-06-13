/// <reference path="menuitem.ts" />
/// <reference path="save.ts" />
/// <reference path="../../activity/activityhandler.ts" />

class New extends MenuItem {
    protected onClick(e) : void {
        console.log(this.activityHandler);
        var reset = () => {
            this.storage.setObj("autosave", null); // Reset the auto save.
            this.project.reset();
            this.activityHandler.selectActivity("editor");
            Main.showNotification("New project created!", 2000);
        }

        var saveAndReset = () => {
            var save = new Save(null, this.activityHandler);
            save.saveToStorage();
            reset();
        }

        if (this.project.isSaved()) {
            reset();
        } else {
            this.showConfirmModal("Save Changes",
                                  "Any unsaved changes will be lost. Save current project before proceeding?",
                                  "Don't Save",
                                  "Save",
                                  reset,
                                  saveAndReset);
        }
    }
}

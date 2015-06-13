/// <reference path="menuitem.ts" />
/// <reference path="../../activity/activityhandler.ts" />

class Delete extends MenuItem {
    public constructor(button : string, activityHandler : Activity.ActivityHandler) {
        super(button, activityHandler);

        this.showProjects();

        $(document).on("save", () => this.showProjects());
        $(document).on("delete", () => this.showProjects());
    }

    private deleteFromStorage(e) : void {
        var id = e.data.id;

        var callback = () => {
            var projects = this.storage.getObj("projects");

            for (var i = 0; i < projects.length; i++) {
                if (projects[i].id === id) {
                    if (projects.length === 1) {
                        this.storage.delete("projects");
                    } else {
                        projects.splice(i, 1);
                        this.storage.setObj("projects", projects);
                    }
                    this.project.setId(null);
                    $(document).trigger("delete");
                    Main.showNotification("Project deleted!", 2000);
                    break;
                }
            }
        }

        this.showConfirmModal("Confirm Delete",
                              "Are you sure you want to delete this project?",
                              "Cancel",
                              "Delete",
                              null,
                              callback);
    }

    private showProjects() : void {
        var projects = this.storage.getObj("projects");
        var $ccsProjects = $("#ccs-delete-list");
        var $tccsProjects = $("#tccs-delete-list");
        var ccsFound = false;
        var tccsFound = false;

        $("li.delete").remove();

        if (projects) {
            this.$button.show();

            projects.sort(function(a, b) {return b.title.localeCompare(a.title)});

            for (var i = 0; i < projects.length; i++) {
                var html = $("<li class=\"delete\"><a>" + projects[i].title + "</a></li>");

                if (projects[i].inputMode.toLowerCase() === "ccs") {
                    ccsFound = true;
                    $ccsProjects.after(html);
                } else if (projects[i].inputMode.toLowerCase() === "tccs") {
                    tccsFound = true;
                    $tccsProjects.after(html);
                }

                html.on("click", {id: projects[i].id}, e => this.deleteFromStorage(e));
            }
        } else {
            this.$button.hide();
        }

        $ccsProjects.toggle(ccsFound);
        $tccsProjects.toggle(tccsFound).prev().toggle(ccsFound && tccsFound);
    }
}

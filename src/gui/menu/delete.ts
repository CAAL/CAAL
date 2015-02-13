/// <reference path="menuitem.ts" />
/// <reference path="../../activity/activityhandler.ts" />

class Delete extends MenuItem {
    private $deleteList : JQuery;
    private $deleteModal : JQuery;
    private $deleteModalConfirm : JQuery;

    public constructor(button : string, activityHandler : Activity.ActivityHandler) {
        super(button, activityHandler);

        this.$deleteList = $("#delete-list");
        this.$deleteModal = $("#delete-modal");
        this.$deleteModalConfirm = $("#confirm-delete");

        this.showProjects();

        $(document).on("save", () => this.showProjects());
        $(document).on("delete", () => this.showProjects());
    }

    private deleteFromStorage(e) : void {
        this.$deleteModal.modal("show");

        this.$deleteModal.on("hide.bs.modal", () => {
            this.$deleteModalConfirm.off("click");
        })

        this.$deleteModalConfirm.on("click", () => {
            this.$deleteModal.modal("hide");

            var projects = this.storage.getObj("projects");
            var id = e.data.id;

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
                    break;
                }
            }
        });
    }

    private showProjects() : void {
        var projects = this.storage.getObj("projects");

        $("li.delete").remove();

        if (projects) {
            for (var i = 0; i < projects.length; i++) {
                var html = $("<li class=\"delete\"><a>" + projects[i].title + "</a></li>");
                this.$deleteList.after(html);
                html.on("click", {id: projects[i].id}, e => this.deleteFromStorage(e));
            }
        }
    }
}

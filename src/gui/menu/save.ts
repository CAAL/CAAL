/// <reference path="menuitem.ts" />
/// <reference path="../../activity/activityhandler.ts" />

class Save extends MenuItem {
    private $saveFileButton : JQuery;
    private $saveMyProjectsButton : JQuery;

    public constructor(button : string, activityHandler : Activity.ActivityHandler) {
        super(button, activityHandler);

        this.$saveFileButton = $("#save-file-btn");
        this.$saveMyProjectsButton = $("#save-projects-btn");

        this.$saveFileButton.on("click", () => this.saveToFile());
        this.$saveMyProjectsButton.on("click", () => this.saveToStorage());
    }

    private saveToFile() : void {
        var json = this.project.toJSON();
        json.id = null;
        var blob = new Blob([JSON.stringify(json)], {type: "text/plain"});
        this.$saveFileButton.attr("href", URL.createObjectURL(blob));
        this.$saveFileButton.attr("download", this.project.getTitle() + ".caal");
        Main.showNotification("Project saved!", 2000);
    }

    public saveToStorage() : void {
        this.storage.setObj("autosave", null); // Reset the auto save.
        var id = this.project.getId();
        var projects = this.storage.getObj("projects");

        if (id !== null) {
            for (var i = 0; i < projects.length; i++) {
                if (projects[i].id === id) {
                    if (projects[i].title !== this.project.getTitle()) { // Title changed. Assign new id and save.
                        this.project.setId(this.nextId());
                        projects.push(this.project.toJSON());
                    } else {
                        projects[i] = this.project.toJSON();
                    }
                    this.storage.setObj("projects", projects);
                    break;
                }
            }
        } else { // Assign unique id and save.
            this.project.setId(this.nextId());
            if (projects) {
                projects.push(this.project.toJSON());
                this.storage.setObj("projects", projects);
            } else {
                this.storage.setObj("projects", [this.project.toJSON()]);
            }
        }

        Main.showNotification("Project saved!", 2000);
        $(document).trigger("save");
    }

    /*
     * Returns a unique id.
     * Does not consider holes in the id's.
     * E.g. [0, 1, 3] will return 4 and not 2.
     */
    private nextId() : number {
        var projects = this.storage.getObj("projects");

        if (!projects) {return 0}

        projects.sort(function(a, b) {return a.id - b.id});

        return projects[projects.length - 1].id + 1;
    }
}

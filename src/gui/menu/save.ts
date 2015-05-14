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
    }

    /*
     * Saves the current project to Local Storage.
     * Assigns a unique id to the project if it does not already have one.
     * Triggers the "save"-event after saving.
     */
    public saveToStorage() : void {
        var id = this.project.getId();
        var projects = this.storage.getObj("projects");
        this.storage.setObj("autosave", null); // Reset the auto save.
        
        if (id !== null) { // Has id. Overwrite existing project and save.
            for (var i = 0; i < projects.length; i++) {
                if (projects[i].id === id) {
                    projects[i] = this.project.toJSON();
                    this.storage.setObj("projects", projects);
                    break;
                }
            }
        } else { // No id. Assign id and save.
            this.project.setId(this.nextId());
            if (projects) {
                projects.push(this.project.toJSON());
                this.storage.setObj("projects", projects);
            } else {
                this.storage.setObj("projects", [this.project.toJSON()]);
            }
        }

        Main.showInfoBox("Project \"" + this.project.getTitle() + "\" saved!", 1750);
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

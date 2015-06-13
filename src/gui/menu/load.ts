/// <reference path="menuitem.ts" />
/// <reference path="save.ts" />
/// <reference path="../examples.ts" />
/// <reference path="../../activity/activityhandler.ts" />

class Load extends MenuItem {
    private $loadFileButton : JQuery;
    private $fileInput : JQuery;

    public constructor(button : string, activityHandler : Activity.ActivityHandler) {
        super(button, activityHandler);

        this.$loadFileButton = $("#load-file-btn");
        this.$fileInput = $("#file-input");

        this.showProjects();
        this.showExamples();

        this.$loadFileButton.on("click", () => this.loadFromFile());
        this.$fileInput.on("change", e => this.readFile(e));

        $(document).on("save", () => this.showProjects());
        $(document).on("delete", () => this.showProjects());
    }

    private readFile(e) : void {
        var file = e.target.files[0];
        var reader = new FileReader();
        reader.readAsText(file);

        reader.onload = () => {
            var project = JSON.parse(reader.result);
            this.project.update(null, project.title, project.ccs, project.properties, project.inputMode);
            this.activityHandler.selectActivity("editor");
            this.$fileInput.replaceWith(this.$fileInput = this.$fileInput.clone(true)); // Clear input field.
            Main.showNotification("Project loaded!", 2000);
        }
    }

    private loadFromFile() : void {
        var load = () => {
            this.storage.setObj("autosave", null); // Reset the auto save.
            this.$fileInput.click();
        }

        var saveAndLoad = () => {
            var save = new Save(null, this.activityHandler);
            save.saveToStorage();
            load();
        }

        if (this.project.isSaved()) {
            this.$fileInput.click()
        } else {
            this.showConfirmModal("Save Changes",
                                  "Any unsaved changes will be lost. Save current project before proceeding?",
                                  "Don't Save",
                                  "Save",
                                  load,
                                  saveAndLoad);
        }
    }

    private loadFromStorage(e) : void {
        var id = e.data.id;

        var load = () => {
            this.storage.setObj("autosave", null); // Reset the auto save.
            var projects = this.storage.getObj("projects");

            for (var i = 0; i < projects.length; i++) {
                if (projects[i].id === id) {
                    this.project.update(id, projects[i].title, projects[i].ccs, projects[i].properties, projects[i].inputMode);
                    this.activityHandler.selectActivity("editor");
                    Main.showNotification("Project loaded!", 2000);
                    break;
                }
            }
        }

        var saveAndLoad = () => {
            var save = new Save(null, this.activityHandler);
            save.saveToStorage();
            load();
        }

        if (this.project.isSaved()) {
            load();
        } else {
            this.showConfirmModal("Save Changes",
                                  "Any unsaved changes will be lost. Save current project before proceeding?",
                                  "Don't Save",
                                  "Save",
                                  load,
                                  saveAndLoad);
        }
    }

    private loadExample(e) : void {
        var title = e.data.title;

        var load = () => {
            this.storage.setObj("autosave", null); // Reset the auto save.

            for (var i = 0; i < examples.length; i++) {
                if (examples[i].title === title) {
                    this.project.update(null, examples[i].title, examples[i].ccs, examples[i].properties, examples[i].inputMode);
                    this.activityHandler.selectActivity("editor");
                    Main.showNotification("Example loaded!", 2000);
                    break;
                }
            }
        }

        var saveAndLoad = () => {
            var save = new Save(null, this.activityHandler);
            save.saveToStorage();
            load();
        }

        if (this.project.isSaved()) {
            load();
        } else {
            this.showConfirmModal("Save Changes",
                                  "Any unsaved changes will be lost. Save current project before proceeding?",
                                  "Don't Save",
                                  "Save",
                                  load,
                                  saveAndLoad);
        }
    }

    private showProjects() : void {
        var projects = this.storage.getObj("projects");
        var $ccsProjects = $("#ccs-projects-list");
        var $tccsProjects = $("#tccs-projects-list");
        var ccsFound = false;
        var tccsFound = false;

        $("li.project").remove();

        if (projects) {
            projects.sort(function(a, b) {return b.title.localeCompare(a.title)});

            for (var i = 0; i < projects.length; i++) {
                var html = $("<li class=\"project\"><a>" + projects[i].title + "</a></li>");

                if (projects[i].inputMode.toLowerCase() === "ccs") {
                    ccsFound = true;
                    $ccsProjects.after(html);
                } else if (projects[i].inputMode.toLowerCase() === "tccs") {
                    tccsFound = true;
                    $tccsProjects.after(html);
                }

                html.on("click", {id: projects[i].id}, e => this.loadFromStorage(e));
            }
        }

        $ccsProjects.toggle(ccsFound).prev().toggle(ccsFound);
        $tccsProjects.toggle(tccsFound).prev().toggle(tccsFound);
    }

    private showExamples() : void {
        var $ccsExamples = $("#ccs-examples-list");
        var $tccsExamples = $("#tccs-examples-list");
        var ccsFound = false;
        var tccsFound = false;

        if (examples) {
            examples.sort(function(a, b) {return b.title.localeCompare(a.title)});

            for (var i = 0; i < examples.length; i++) {
                var html = $("<li><a>" + examples[i].title + "</a></li>");

                if (examples[i].inputMode.toLowerCase() === "ccs") {
                    ccsFound = true;
                    $ccsExamples.after(html);
                } else if (examples[i].inputMode.toLowerCase() === "tccs") {
                    tccsFound = true;
                    $tccsExamples.after(html);
                }

                html.on("click", {title: examples[i].title}, e => this.loadExample(e));
            }
        }

        $ccsExamples.toggle(ccsFound).prev().toggle(ccsFound);
        $tccsExamples.toggle(tccsFound).prev().toggle(tccsFound);
    }
}

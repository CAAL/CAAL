/// <reference path="menuitem.ts" />
/// <reference path="../examples.ts" />
/// <reference path="../../activity/activityhandler.ts" />

class Load extends MenuItem {
    private $loadFileButton : JQuery;
    private $fileInput : JQuery;
    private $projectsList : JQuery;
    private $examplesList : JQuery;

    public constructor(button : string, activityHandler : Activity.ActivityHandler) {
        super(button, activityHandler);

        this.$loadFileButton = $("#load-file-btn");
        this.$fileInput = $("#file-input");
        this.$projectsList = $("#projects-list");
        this.$examplesList = $("#examples-list");

        this.showProjects();
        this.showExamples();

        // Simulate click on hidden <input> element.
        this.$loadFileButton.on("click", () => this.$fileInput.click());

        this.$fileInput.on("change", e => this.loadFromFile(e));

        $(document).on("save", () => this.showProjects());
        $(document).on("delete", () => this.showProjects());
    }

    private loadFromFile(e) : void {
        this.storage.setObj("autosave", null); // Reset the auto save.
        var file = e.target.files[0];
        var reader = new FileReader();
        reader.readAsText(file);

        reader.onload = () => {
            var project = JSON.parse(reader.result);
            this.project.update(null, project.title, project.ccs, project.properties, project.inputMode === "CCS" ? InputMode.CCS : InputMode.TCCS);
            this.activityHandler.selectActivity("editor");
            this.$fileInput.replaceWith(this.$fileInput = this.$fileInput.clone(true)); // Clear input field.
        }
    }

    private loadFromStorage(e) : void {
        this.storage.setObj("autosave", null); // Reset the auto save.
        var projects = this.storage.getObj("projects");
        
        var id = e.data.id;
        for (var i = 0; i < projects.length; i++) {
            if (projects[i].id === id) {
                this.project.update(id, projects[i].title, projects[i].ccs, projects[i].properties, projects[i].inputMode === "CCS" ? InputMode.CCS : InputMode.TCCS);
                this.activityHandler.selectActivity("editor");
                break;
            }
        }
    }

    private loadExample(e) : void {
        this.storage.setObj("autosave", null); // Reset the auto save.
        var title = e.data.title;

        for (var i = 0; i < examples.length; i++) {
            if (examples[i].title === title) {
                this.project.update(null, examples[i].title, examples[i].ccs, examples[i].properties, examples[i].inputMode === "CCS" ? InputMode.CCS : InputMode.TCCS);
                this.activityHandler.selectActivity("editor");
                break;
            }
        }
    }

    private showProjects() : void {
        var projects = this.storage.getObj("projects");

        $("li.project").remove();

        if (projects) {
            projects.sort(function(a, b) {return b.title.localeCompare(a.title)});

            for (var i = 0; i < projects.length; i++) {
                var html = $("<li class=\"project\"><a>" + projects[i].title + "</a></li>");
                this.$projectsList.after(html);
                html.on("click", {id: projects[i].id}, e => this.loadFromStorage(e));
            }
        }
    }

    private showExamples() : void {
        if (examples) {
            examples.sort(function(a, b) {return b.title.localeCompare(a.title)});

            for (var i = 0; i < examples.length; i++) {
                var html = $("<li><a>" + examples[i].title + "</a></li>");
                this.$examplesList.after(html);
                html.on("click", {title: examples[i].title}, e => this.loadExample(e));
            }
        }
    }
}

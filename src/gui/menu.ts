/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="project" />
/// <reference path="storage" />
/// <reference path="examples"/>

function helpDialogFunction()
{
	$('#help-dialog').modal('show');
}

class MenuItem {
    public buttonId: string;
    public elementIds: any;
    public project: Project;
    public activityHandler: Main.ActivityHandler;
    public storage: WebStorage;
    public session: WebStorage;

    public constructor(buttonId: string, elementIds: any, project: Project, activityHandler: Main.ActivityHandler) {
        this.buttonId = buttonId;
        this.elementIds = elementIds;
        this.project = project;
        this.activityHandler = activityHandler;
        this.storage = new WebStorage(localStorage);
        this.session = new WebStorage(sessionStorage);

        $(buttonId).on('click', (e) => this.onClick(e));
    }

    public onClick(e): void {}
}

class New extends MenuItem {
    public onClick(e): void {
        this.project.reset();
        this.activityHandler.selectActivity('editor');
    }
}

class Save extends MenuItem {
    public constructor(buttonId: string, elementIds: any, project: Project, activityHandler: Main.ActivityHandler) {
        super(buttonId, elementIds, project, activityHandler);
        $(elementIds.saveFileId).on('click', () => this.saveToFile());
        $(elementIds.saveProjectsId).on('click', () => this.saveToStorage());
    }

    private saveToFile(): void {
        var json = this.project.toJSON();
        json.id = null;
        var blob = new Blob([JSON.stringify(json)], {type: 'text/plain'});
        $(this.elementIds.saveFileId).attr('href', URL.createObjectURL(blob));
        $(this.elementIds.saveFileId).attr('download', this.project.getTitle() + '.ccs-project');
    }

    /*
     * Saves the current project to Local Storage.
     * Assigns a unique id to the project if it does not already have one.
     * Triggers the "save"-event after saving.
     */
    private saveToStorage(): void {
        var id = this.project.getId();
        var projects = this.storage.getObj('projects');

        if (id !== null) { // Has id. Overwrite existing project and save.
            for (var i = 0; i < projects.length; i++) {
                if (projects[i].id === id) {
                    projects[i] = this.project.toJSON();
                    this.storage.setObj('projects', projects);
                    break;
                }
            }
        } else { // No id. Assign id and save.
            this.project.setId(this.nextId());
            if (projects) {
                projects.push(this.project.toJSON());
                this.storage.setObj('projects', projects);
            } else {
                this.storage.setObj('projects', [this.project.toJSON()]);
            }
        }

        $(document).trigger('save');
    }

    /*
     * Returns a unique id.
     * Does not consider holes in the id's.
     * E.g. [0, 1, 3] will return 4 and not 2.
     */
    private nextId(): number {
        var projects = this.storage.getObj('projects');

        if (!projects) {return 0}

        projects.sort(function(a, b) {return a.id - b.id});

        return projects[projects.length - 1].id + 1;
    }
}

class Load extends MenuItem {
    public constructor(buttonId: string, elementIds: any, project: Project, activityHandler: Main.ActivityHandler) {
        super(buttonId, elementIds, project, activityHandler);

        this.showProjects();
        this.showExamples();

        // Simulate click on hidden <input> element.
        $(elementIds.loadFileId).on('click', () => $(elementIds.fileInputId).click());

        $(document).on('save', () => this.showProjects());
        $(document).on('delete', () => this.showProjects());

        $(elementIds.fileInputId).on('change', e => this.loadFromFile(e));
    }

    public loadFromFile(e): void {
        var file = e.target.files[0];
        var reader = new FileReader();
        reader.readAsText(file);

        reader.onload = () => {
            var project = JSON.parse(reader.result);
            this.project.update(null, project.title, project.ccs, project.properties);
            this.activityHandler.selectActivity("editor");
            $(this.elementIds.fileInputId).replaceWith($(this.elementIds.fileInputId).val('').clone(true)); // Clear input field.
        }
    }

    private loadFromStorage(e): void {
        var projects = this.storage.getObj('projects');
        var id = e.data.id;

        for (var i = 0; i < projects.length; i++) {
            if (projects[i].id === id) {
                this.project.update(id, projects[i].title, projects[i].ccs, projects[i].properties);
                this.activityHandler.selectActivity("editor");
                break;
            }
        }
    }

    private loadExample(e): void {
        var title = e.data.title;

        for (var i = 0; i < examples.length; i++) {
            if (examples[i].title === title) {
                this.project.update(null, examples[i].title, examples[i].ccs, examples[i].properties);
                this.activityHandler.selectActivity("editor");
                break;
            }
        }
    }

    private showProjects(): void {
        var projects = this.storage.getObj('projects');
        var list = $(this.elementIds.projectsId);

        $('li.project').remove();

        if (projects) {
            for (var i = 0; i < projects.length; i++) {
                var html = $('<li class="project"><a>' + projects[i].title + '</a></li>');
                list.after(html);
                html.on('click', {id: projects[i].id}, e => this.loadFromStorage(e));
            }
        }
    }

    private showExamples(): void {
        var list = $(this.elementIds.examplesId);

        if (examples) {
            for (var i = 0; i < examples.length; i++) {
                var html = $('<li><a>' + examples[i].title + '</a></li>');
                list.after(html);
                html.on('click', {title: examples[i].title}, e => this.loadExample(e));
            }
        }
    }
}

class Delete extends MenuItem {
    public constructor(buttonId: string, elementIds: any, project: Project, activityHandler: Main.ActivityHandler) {
        super(buttonId, elementIds, project, activityHandler);

        this.showProjects();

        $(document).on('save', () => this.showProjects());
        $(document).on('delete', () => this.showProjects());
    }

    private deleteFromStorage(e): void {
        var deleteModal = $('#delete-modal');
        var deleteButton = $('#confirm-delete');

        deleteModal.modal('show');

        deleteModal.on('hide.bs.modal', function() {
            deleteButton.off('click');
        })

        deleteButton.on('click', () => {
            deleteModal.modal('hide');

            var projects = this.storage.getObj('projects');
            var id = e.data.id;

            for (var i = 0; i < projects.length; i++) {
                if (projects[i].id === id) {
                    if (projects.length === 1) {
                        this.storage.delete('projects');
                    } else {
                        projects.splice(i, 1);
                        this.storage.setObj('projects', projects);
                    }
                    this.project.setId(null);
                    $(document).trigger('delete');
                    break;
                }
            }
        });
    }

    private showProjects(): void {
        var projects = this.storage.getObj('projects');
        var list = $(this.elementIds.deleteId);

        $('li.delete').remove();

        if (projects) {
            for (var i = 0; i < projects.length; i++) {
                var html = $('<li class="delete"><a>' + projects[i].title + '</a></li>');
                list.after(html);
                html.on('click', {id: projects[i].id}, e => this.deleteFromStorage(e));
            }
        }
    }
}

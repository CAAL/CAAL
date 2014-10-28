/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="project" />
/// <reference path="storage" />
/// <reference path="examples"/>
/*
 * TODO
 * - Get rid of duplicate classes MyProjects and Examples at some point.
 */

class MenuItem {
    public itemId: string;
    public project: Project;
    public storage: WebStorage;

    public constructor(itemId: string, project: Project) {
        this.itemId = itemId;
        this.project = project;
        this.storage = new WebStorage(localStorage);

        $(itemId).click((event) => this.onClick(event));
        $(itemId).change((event) => this.onChange(event));
    }

    public onClick(event) {}
    public onChange(event) {}
}

class New extends MenuItem {
    public onClick(event) {
        this.project.reset();
    }
}

class Save extends MenuItem {
    /*
     * Saves the current project to Local Storage.
     * Assigns a unique id to the project if it does not already have one.
     * Triggers the "save"-event after saving.
     */
    public onClick(event) {
        var id = this.project.getId();
        var projects = this.storage.getObj('projects');

        if (id) { // Has id. Overwrite existing project and save.
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

class Import extends MenuItem {
    public onChange(event) {
        var file = event.target.files[0];
        var reader = new FileReader();
        reader.readAsText(file);

        reader.onload = () => {
            var project = JSON.parse(reader.result);
            this.project.update(project.id, project.title, project.description, project.ccs);
            $(this.itemId).replaceWith($(this.itemId).val('').clone(true)); // Clear input field.
        }
    }
}

class Export extends MenuItem {
    public onClick(event) {
        var blob = new Blob([JSON.stringify(this.project.toJSON())], {type: 'text/plain'});
        $(this.itemId).attr('href', URL.createObjectURL(blob));
        $(this.itemId).attr('download', this.project.getTitle() + '.ccs');
    }
}

class MyProjects extends MenuItem {
    private listId: string;

    public constructor(itemId: string, listId: string, project: Project) {
        super(itemId, project);
        this.listId = listId;
        this.show();
        $(document).on('save', () => this.show()); // Update list when a new project has been saved.
    }

    public onClick(event): void {
        $(this.listId).toggle();
    }

    private show() {
        var projects = this.storage.getObj('projects');
        var list = $(this.listId);
        list.empty();

        if (projects) {
            for (var i = 0; i < projects.length; i++) {
                var html = $('<li><a>' + projects[i].title + '</li></a>');
                list.append(html);
                html.on('click', {id: projects[i].id}, event => this.load(event));
            }
        } else {
            list.append('<li><p>No projects saved yet</p></li>');
        }
    }

    private load(event) {
        var projects = this.storage.getObj('projects');
        var id = event.data.id;

        for (var i = 0; i < projects.length; i++) {
            if (projects[i].id === id) {
                this.project.update(id, projects[i].title, projects[i].description, projects[i].ccs);
                break;
            }
        }
    }
}

class Examples extends MenuItem {
    private listId: string;

    public constructor(itemId: string, listId: string, project: Project) {
        super(itemId, project);
        this.listId = listId;
        this.show();
    }

    public onClick(event): void {
        $(this.listId).toggle();
    }

    private show() {
        var list = $(this.listId);

        if (examples) {
            for (var i = 0; i < examples.length; i++) {
                var html = $('<li><a>' + examples[i].title + '</li></a>');
                list.append(html);
                html.on('click', {id: examples[i].id}, event => this.load(event));
            }
        } else {
            list.append('<li><p>No examples</p></li>');
        }
    }

    private load(event) {
         var id = event.data.id;

        for (var i = 0; i < examples.length; i++) {
            if (examples[i].id === id) {
                this.project.update(id, examples[i].title, examples[i].description, examples[i].ccs);
                break;
            }
        }
    }
}

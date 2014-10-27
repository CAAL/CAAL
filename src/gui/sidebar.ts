/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="project" />
/// <reference path="storage" />
/// <reference path="examples"/>
/*
 * TODO
 * - Unique names.
 * - Get rid of duplicate classes MyProjects and Examples at some point.
 */

class MenuItem {
    public itemId: string;
    public project: Project;
    public storage: LocalStorage;

    public constructor(itemId: string, project: Project) {
        this.itemId = itemId;
        this.project = project;
        this.storage = new LocalStorage();

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
    public onClick(event) {
        var projects = this.storage.get('projects');

        if (projects) {
            var json = JSON.parse(projects);
            json.push(this.project.toJSON());
            this.storage.set('projects', JSON.stringify(json));
        } else {
            this.storage.set('projects', JSON.stringify([this.project.toJSON()]));
        }

        $(document).trigger('save'); // Trigger event to update list display.
    }
}

class Import extends MenuItem {
    public onChange(event) {
        var file = event.target.files[0];
        var reader = new FileReader();
        reader.readAsText(file);

        reader.onload = () => {
            var project = JSON.parse(reader.result);
            this.project.update(project.title, project.description, project.ccs);
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
        var projects = this.storage.getJSON('projects');
        var list = $(this.listId);
        list.empty();

        if (projects) {
            for (var i = 0; i < projects.length; i++) {
                list.append('<li><a>' + projects[i].title + '</li></a>');
            }

            $(this.listId + '> li > a').click((event) => this.load(event));
        } else {
            list.append('<li><p>No projects saved yet</p></li>');
        }
    }

    private load(event) {
        var projects = this.storage.getJSON('projects');
        var title = $(event.target).text();

        for (var i = 0; i < projects.length; i++) {
            if (projects[i].title === title) {
                this.project.update(projects[i].title, projects[i].description, projects[i].ccs);
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
                list.append('<li><a>' + examples[i].title + '</li></a>');
            }

            $(this.listId + '> li > a').click((event) => this.load(event));
        } else {
            list.append('<li><p>No examples</p></li>');
        }
    }

    private load(event) {
        var title = $(event.target).text();

        for (var i = 0; i < examples.length; i++) {
            if (examples[i].title === title) {
                this.project.update(examples[i].title, examples[i].description, examples[i].ccs);
                break;
            }
        }
    }
}

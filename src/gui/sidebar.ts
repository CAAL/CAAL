class ExpandableList {
    private itemId: string;

    constructor(startState: boolean, buttonId: string, itemId: string) {
        this.itemId = itemId;

        $(itemId).toggle(startState);
        $(buttonId).click(() => this.toggle());
    }

    private toggle() {
        $(this.itemId).toggle();
    }
}

class MenuItem {
    public itemId: string;
    public project: Project;

    public constructor(itemId: string, project: Project) {
        this.itemId = itemId;
        this.project = project;

        $(itemId).click((event) => this.onClick(event));
        $(itemId).change((event) => this.onChange(event));
    }

    public onClick(event) {}
    public onChange(event) {}
}

class New extends MenuItem {
    public onClick(event) {
        this.project.new();
    }
}

class Save extends MenuItem {
    public onClick(event) {
        var projects = this.project.storage.get('projects');

        if (projects) {
            var json = JSON.parse(projects);
            json.push(this.project.toJSON());
            this.project.storage.set('projects', JSON.stringify(json));
        } else {
            this.project.storage.set('projects', JSON.stringify([this.project.toJSON()]));
        }
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

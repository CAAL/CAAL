class Project {
    private defaultTitle: string;
    private defaultDescription: string;
    private defaultCCS: string;
    private title: string;
    private description: string;
    private titleId: string;
    private descriptionId: string;
    private editor: any;
    public storage: LocalStorage;

    public constructor(defaultTitle: string,
                defaultDescription: string,
                defaultCCS: string,
                titleId: string,
                descriptionId: string,
                editorId: string)
    {
        this.defaultTitle = defaultTitle;
        this.defaultDescription = defaultDescription;
        this.defaultCCS = defaultCCS;
        this.titleId = titleId;
        this.descriptionId = descriptionId;
        this.editor = ace.edit(editorId);
        this.storage = new LocalStorage();

        /* Set default values */
        this.setTitle(this.defaultTitle);
        this.setDescription(this.defaultDescription);
        this.setCCS(this.defaultCCS);

        /* Register event handlers */
        $(this.titleId).focusout(() => this.onTitleChanged());
        $(this.descriptionId).focusout(() => this.onDescriptionChanged());

        this.loadMyProjects();
    }

    public update(title: string, description: string, ccs: string) {
        this.setTitle(title);
        this.setDescription(description);
        this.setCCS(ccs);
    }

    private setTitle(title: string) {
        this.title = title;
        $(this.titleId).text(this.title);
    }

    private setDescription(description: string) {
        this.description = description;
        $(this.descriptionId).text(this.description);
    }

    private setCCS(ccs: string) {
        this.editor.setValue(ccs);
        this.editor.clearSelection();
    }

    public getTitle(): string {
        return this.title;
    }

    private getCCS(): string {
        return this.editor.getSession().getValue();
    }

    private loadMyProjects() {
        var projects = this.getProjects();
        var list = $('#projects-list');
        list.empty();

        if (projects) {
            for (var i = 0; i < projects.length; i++) {
                list.append('<li><a>' + projects[i].title + '</li></a>');
            }

            $('#projects-list > li > a').click((event) => this.load(event));
        } else {
            list.append('<li><p>No projects saved yet</p></li>');
        }
    }

    private getProjects() {
        if (typeof(Storage) !== 'undefined') {
            var projects = localStorage['projects'];

            try {
                return JSON.parse(projects);
            } catch(error) {
                // ...
            }
        } else {
            alert('Your browser does not support Web Storage.');
        }
    }

    public new() {
        this.update(this.defaultTitle, this.defaultDescription, this.defaultCCS);
    }

    public save() {
        var projects = this.getProjects();

        if (projects) {
            projects.push(this.toJSON());
            localStorage['projects'] = JSON.stringify(projects);
        } else {
            localStorage['projects'] = JSON.stringify([this.toJSON()]);
        }

        this.loadMyProjects();
    }

    private load(event) {
        var projects = this.getProjects();
        var title = $(event.target).text();

        for (var i = 0; i < projects.length; i++) {
            if (projects[i].title === title) {
                this.update(projects[i].title, projects[i].description, projects[i].ccs);
            }
        }
    }

    public importProject(evt) {
        var file = evt.target['files'][0];
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
            var project = JSON.parse(reader.result);
            this.update(project.title, project.description, project.ccs);
        }
    }

    public exportProject(exportId: string) {
        var blob = new Blob([JSON.stringify(this.toJSON())], {type: 'text/plain'});
        $(exportId).attr('href', URL.createObjectURL(blob));
        $(exportId).attr('download', this.title + '.ccs');
    }

    private onTitleChanged() {
        this.title = $(this.titleId).text();
    }

    private onDescriptionChanged() {
        this.description = $(this.descriptionId).text();
    }

    public toJSON() {
        return {
            title: this.title,
            description: this.description,
            ccs: this.getCCS()
        };
    }
}

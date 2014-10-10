class Project {
    private defaultTitle: string;
    private defaultDescription: string;
    private defaultCCS: string;
    private title: string;
    private description: string;
    private titleId: string;
    private descriptionId: string;
    private editor: any;

    constructor(defaultTitle: string,
                defaultDescription: string,
                defaultCCS: string,
                titleId: string,
                descriptionId: string,
                editor: any)
    {
        this.defaultTitle = defaultTitle;
        this.defaultDescription = defaultDescription;
        this.defaultCCS = defaultCCS;
        this.titleId = titleId;
        this.descriptionId = descriptionId;
        this.editor = editor;

        /* Set default values */
        this.setTitle(this.defaultTitle);
        this.setDescription(this.defaultDescription);
        this.setCCS(this.defaultCCS);

        /* Register event handlers */
        $(this.titleId).focusout(() => this.onTitleChanged());
        $(this.descriptionId).focusout(() => this.onDescriptionChanged());
    }

    new() {
        this.setTitle(this.defaultTitle);
        this.setDescription(this.defaultDescription);
        this.setCCS(this.defaultCCS);
    }

    private save() {

    }

    private saveSession() {

    }

    private load() {

    }

    private import() {

    }

    export(exportId: string) {
        var blob = new Blob([this.toJSON()], {type: 'text/plain'});
        $(exportId).attr('href', URL.createObjectURL(blob));
        $(exportId).attr('download', this.title + '.ccs');
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
    }

    private getCCS(): string {
        return this.editor.getSession().getValue();
    }

    private onTitleChanged() {
        this.title = $(this.titleId).text();
    }

    private onDescriptionChanged() {
        this.description = $(this.descriptionId).text();
    }

    private toJSON() {
        return JSON.stringify(
            {
                title: this.title,
                description: this.description,
                ccs: this.getCCS()
            }
        );
    }

    /*private import(evt) {
        $(':file').click();
        console.log(evt);
        var file = evt.target['files'][0];
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function() {
            console.log(reader.result);
            this.editor.getSession().setValue(reader.result);
        }
    }*/
}

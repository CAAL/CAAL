class Project {
    private defaultTitle: string;
    private defaultDescription: string;
    private title: string;
    private description: string;
    private titleId: string;
    private descriptionId: string;
    private resetId: string;

    constructor(defaultTitle: string,
                defaultDescription: string,
                titleId: string,
                descriptionId: string,
                resetId: string)
    {
        this.defaultTitle = defaultTitle;
        this.defaultDescription = defaultDescription;
        this.titleId = titleId;
        this.descriptionId = descriptionId;
        this.resetId = resetId;

        this.setTitle(this.defaultTitle);
        this.setDescription(this.defaultDescription);

        /* Register event handlers */
        $(this.titleId).focusout(() => this.onTitleChanged());
        $(this.descriptionId).focusout(() => this.onDescriptionChanged());
        $(this.resetId).click(() => this.reset());
    }

    private reset() {
        this.setTitle(this.defaultTitle);
        this.setDescription(this.defaultDescription);
    }

    private save() {

    }

    private saveSession() {

    }

    private load() {

    }

    private import() {

    }

    private export() {

    }

    private setTitle(title: string) {
        this.title = title;
        $(this.titleId).text(this.title);
    }

    private setDescription(description: string) {
        this.description = description;
        $(this.descriptionId).text(this.description);
    }

    private onTitleChanged() {
        this.title = $(this.titleId).text();
    }

    private onDescriptionChanged() {
        this.description = $(this.descriptionId).text();
    }

    /*private export() {
        var blob = new Blob([this.toJSON()], {type: 'text/plain'});
        $(exportId).attr('href', URL.createObjectURL(blob));
        $(exportId).attr('download', this.title + '.ccs');
    }

    private toJSON() {
        return JSON.stringify(
            {
                title: this.title,
                description: this.description,
                ccs: this.editor.getValue()
            }
        );
    }

    private import(evt) {
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

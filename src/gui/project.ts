/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/ace.d.ts" />
class Project {
    private defaultTitle: string;
    private defaultDescription: string;
    private defaultCCS: string;
    private titleId: string;
    private descriptionId: string;
    private editor: any;
    private id: number;
    private title: string;
    private description: string;

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
        this.editor = ace.edit($(editorId)[0]);

        /* Set default values */
        this.reset();

        /* Register event handlers */
        $(this.titleId).focusout(() => this.onTitleChanged());
        $(this.descriptionId).focusout(() => this.onDescriptionChanged());
    }

    public getId(): number {
        return this.id;
    }

    public setId(id: number): void {
        this.id = id;
    }

    public getTitle(): string {
        return this.title;
    }

    public setTitle(title: string): void {
        this.title = title;
        $(this.titleId).text(this.title);
    }

    public getDescription(): string {
        return this.description;
    }

    public setDescription(description: string): void {
        this.description = description;
        $(this.descriptionId).text(this.description);
    }

    public getCCS(): string {
        return this.editor.getSession().getValue();
    }

    public setCCS(ccs: string): void {
        this.editor.setValue(ccs, 1);
        this.editor.clearSelection();
    }

    public update(id: number, title: string, description: string, ccs: string): void {
        this.setId(id);
        this.setTitle(title);
        this.setDescription(description);
        this.setCCS(ccs);
    }

    public reset(): void {
        this.update(null, this.defaultTitle, this.defaultDescription, this.defaultCCS);
    }

    public toJSON(): Object {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            ccs: this.getCCS()
        };
    }

    private onTitleChanged(): void {
        this.title = $(this.titleId).text();
    }

    private onDescriptionChanged(): void {
        this.description = $(this.descriptionId).text();
    }
}

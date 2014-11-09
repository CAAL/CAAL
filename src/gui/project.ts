/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/ace.d.ts" />

class Project {
    private defaultTitle: string;
    private defaultCCS: string;
    private titleId: string;
    private editor: any;
    private id: number;
    private title: string;

    public constructor(defaultTitle: string, defaultCCS: string, titleId: string, editor: any) {
        this.defaultTitle = defaultTitle;
        this.defaultCCS = defaultCCS;
        this.titleId = titleId;
        this.editor = editor;

        this.reset();

        $(this.titleId).focusout(() => this.onTitleChanged());
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

    public getCCS(): string {
        return this.editor.getSession().getValue();
    }

    public setCCS(ccs: string): void {
        this.editor.setValue(ccs, 1);
        this.editor.clearSelection();
    }

    public update(id: number, title: string, ccs: string): void {
        this.setId(id);
        this.setTitle(title);
        this.setCCS(ccs);
    }

    public reset(): void {
        this.update(null, this.defaultTitle, this.defaultCCS);
    }

    public toJSON(): Object {
        return {
            id: this.getId(),
            title: this.getTitle(),
            ccs: this.getCCS()
        };
    }

    private onTitleChanged(): void {
        this.title = $(this.titleId).text();
    }
}

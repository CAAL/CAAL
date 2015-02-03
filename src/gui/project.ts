/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/ace.d.ts" />
/// <reference path="property.ts" />

class Project {
    private defaultTitle: string;
    private defaultCCS: string;
    private titleId: string;
    private editor: any;
    private id: number;
    private title: string;
    private properties: Property.Property[];

    public constructor(defaultTitle: string, defaultCCS: string, titleId: string, editor: any) {
        this.defaultTitle = defaultTitle;
        this.defaultCCS = defaultCCS;
        this.titleId = titleId;
        this.editor = editor;
        this.properties = Array();

        this.reset();

        $(this.titleId).focusout(() => this.onTitleChanged());
    }

    public update(id: number, title: string, ccs: string, properties: any[]): void {
        this.setId(id);
        this.setTitle(title);
        this.setCCS(ccs);
        this.setProperties(properties);
    }

    public reset(): void {
        this.update(null, this.defaultTitle, this.defaultCCS, Array());
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

    private onTitleChanged(): void {
        this.title = $(this.titleId).text();
    }

    public getCCS(): string {
        return this.editor.getSession().getValue();
    }

    public setCCS(ccs: string): void {
        this.editor.setValue(ccs, 1);
        this.editor.clearSelection();
    }

    public getProperties(): Property.Property[] {
        return this.properties;
    }

    public setProperties(properties: any[]): void {
        for (var i = 0; i < properties.length; i++) {
            this.addProperty(new window["Property"][properties[i].type](properties[i].options));
        }
    }

    public addProperty(property: Property.Property): void {
        this.properties.push(property);
    }

    public deleteProperty(property: Property.Property): void {
        var id = property.getId();

        for (var i = 0; i < this.properties.length; i++) {
            if (this.properties[i].getId() === id) {
                this.properties.splice(i, 1);
                break;
            }
        }
    }

    public toJSON(): any {
        var properties = Array();

        for (var i = 0; i < this.properties.length; i++) {
            properties.push(this.properties[i].toJSON());
        }

        return {
            id: this.getId(),
            title: this.getTitle(),
            ccs: this.getCCS(),
            properties: properties
        };
    }
}

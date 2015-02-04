/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/ace.d.ts" />
/// <reference path="../../lib/wolfy87-eventemitter.d.ts" />
/// <reference path="../../lib/ccs.d.ts" />
/// <reference path="property.ts" />

class Project {
    private id = null;
    private defaultTitle = "Untitled Project";
    private defaultCCS = "";
    private properties: Property.Property[]
    private projectTitle = $("#project-title");
    private currentCCS: string;
    private eventEmitter = new EventEmitter();

    public constructor() {
        this.reset();
        this.projectTitle.focusout(() => this.onTitleChanged());
    }

    public update(id: number, title: string, ccs: string, properties: any[]): void {
        this.setId(id);
        this.setTitle(title);
        this.setCCS(ccs);
        this.setProperties(properties);
    }

    public reset(): void {
        this.update(null, this.defaultTitle, this.defaultCCS, null);
    }

    public getId(): number {
        return this.id;
    }

    public setId(id: number): void {
        this.id = id;
    }

    public getTitle(): string {
        return this.projectTitle.text();
    }

    public setTitle(title: string): void {
        this.projectTitle.text(title);
    }

    private onTitleChanged(): void {
        if (this.projectTitle.text() === "") {
            this.projectTitle.text(this.defaultTitle);
        }
    }

    public getCCS(): string {
        return this.currentCCS;
    }

    public setCCS(ccs: string): void {
        this.currentCCS = ccs;
        this.eventEmitter.emit("ccs-change", {ccs: this.currentCCS});
    }

    public onCCSChanged(ccs: string): void {
        this.currentCCS = ccs;
    }

    public getGraph(): CCS.Graph {
        var graph = new CCS.Graph();
            CCSParser.parse(this.currentCCS, {ccs: CCS, graph: graph});
        return graph;
    }

    public getProperties(): Property.Property[] {
        return this.properties;
    }

    public setProperties(properties: any[]): void {
        this.properties = Array();

        if (properties !== null) 
        {
            for (var i = 0; i < properties.length; i++) {
                try {
                    this.addProperty(new window["Property"][properties[i].type](properties[i].options));
                } catch (e) {
                    console.log("Unknown Property type");
                }
            }
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

    public on(event: string, listener: Function): void {
        this.eventEmitter.on(event, listener);
    }

    public off(event: string, listener: Function): void {
        this.eventEmitter.off(event, listener);
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

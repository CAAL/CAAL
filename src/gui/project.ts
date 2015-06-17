/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/ace.d.ts" />
/// <reference path="../../lib/ccs.d.ts" />
/// <reference path="property.ts" />

enum InputMode {CCS, TCCS}

class Project {
    private static instance : Project = null;
    private defaultTitle : string = "Untitled Project";
    private defaultCCS : string = "";
    private id : number = null;
    private $projectTitle : JQuery = $("#project-title");
    private ccs : string;
    private properties : Property.Property[];
    private changed : boolean = false;
    private inputMode : InputMode = InputMode.CCS;

    public constructor() {
        if (Project.instance) {
            throw new Error("Cannot instantiate singleton. Use getInstance() instead.");
        } else {
            Project.instance = this;
        }

        this.reset();
        this.$projectTitle.keypress(function(e) {return e.which != 13}); // Disable line breaks. Can still be copy/pasted.
        this.$projectTitle.focusout(() => this.onTitleChanged());
    }

    public static getInstance() : Project {
        if (Project.instance === null) {
            Project.instance = new Project();
        }

        return Project.instance;
    }

    public reset() : void {
        this.update(null, this.defaultTitle, this.defaultCCS, null, "CCS");
    }

    public update(id : number, title : string, ccs : string, properties : any[], inputMode : string) : void {
        this.setId(id);
        this.setTitle(title);
        this.setCCS(ccs);
        this.setProperties(properties);
        this.setInputMode(InputMode[inputMode]);
        this.updateInputModeToggle();
    }

    public getId() : number {
        return this.id;
    }

    public setId(id : number) : void {
        this.id = id;
    }

    public getTitle() : string {
        return this.$projectTitle.text();
    }

    public setTitle(title : string) : void {
        this.$projectTitle.text(title);
    }

    private onTitleChanged() : void {
        var title = this.$projectTitle.text();

        if (title === "") {
            this.setTitle(this.defaultTitle);
        } else {
            this.setTitle(title); // Removes line breaks since $.text() trims line breaks.
        }
    }

    public getCCS() : string {
        return this.ccs;
    }

    public setCCS(ccs : string) : void {
        this.ccs = ccs;
    }

    public getProperties() : Property.Property[] {
        return this.properties;
    }

    public setProperties(properties : any[]) : void {
        this.properties = Array();

        if (properties) {
            if (properties.length !== 0) {
                for (var i = 0; i < properties.length; i++) {
                    try {
                        this.addProperty(new window["Property"][properties[i].className](properties[i].options, properties[i].status));
                    } catch (e) {
                        console.log("Unknown property type");
                    }
                }
            }
        }
    }

    public addProperty(property : Property.Property) : void {
        this.properties.push(property);
    }

    public deleteProperty(property : Property.Property) : void {
        var id = property.getId();

        for (var i = 0; i < this.properties.length; i++) {
            if (this.properties[i].getId() === id) {
                this.properties.splice(i, 1);
                break;
            }
        }
    }

    public getFormulaSetsForProperties() {
        var result = {};

        this.properties.forEach((prop) => {
            if (prop instanceof Property.HML){
                result[prop.getId()] = this.createFormulaSetFromProperty(prop);
            }
        });

        return result;
    }

    private createFormulaSetFromProperty(property : Property.HML) : HML.FormulaSet {
        var formulaSet = new HML.FormulaSet;
        HMLParser.parse(property.getDefinitions(), {ccs: CCS, hml: HML, formulaSet: formulaSet});
        HMLParser.parse(property.getTopFormula(), {startRule: "TopFormula", ccs: CCS, hml: HML, formulaSet: formulaSet});
        return formulaSet;
    }

    public isChanged() : boolean {
        return this.changed;
    }

    public setChanged(changed : boolean) : void {
        // Changed from false to true.
        if (changed !== this.changed && changed === true) {
            $(document).trigger("ccs-changed");
        }

        this.changed = changed;
    }

    public getInputMode() : InputMode {
        return this.inputMode;
    }
    
    private updateInputModeToggle() : void {
        $("#input-mode").find("input[value=" + InputMode[this.inputMode] + "]").click();
    }
    
    public setInputMode(inputMode : InputMode) : void {
        this.inputMode = inputMode;
    }

    public getGraph() : CCS.Graph {
        var graph;
        if (this.inputMode === InputMode.CCS) {
            graph = new CCS.Graph();
            CCSParser.parse(this.ccs, {ccs: CCS, graph: graph});
            return graph;
        } else if (this.inputMode === InputMode.TCCS) {
            graph = new TCCS.Graph();
            TCCSParser.parse(this.ccs, {ccs: CCS, tccs: TCCS, graph: graph});
            return graph;
        }
    }

    public isSaved() : boolean {
        return this.ccs === "";
    }

    public toJSON() : any {
        var properties = Array();
        for (var i = 0; i < this.properties.length; i++) {
            properties.push(this.properties[i].toJSON());
        }

        return {
            id: this.getId(),
            title: this.getTitle(),
            ccs: this.getCCS(),
            properties: properties,
            inputMode: this.inputMode === InputMode.CCS ? "CCS" : "TCCS"
        };
    }
}

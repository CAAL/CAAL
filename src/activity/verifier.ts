/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../main.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="../gui/property.ts" />
/// <reference path="activity.ts" />

module Activity {

    export class Verifier extends Activity {
        private changed : boolean
        private editor: any;
        private addCcsPropertyList: JQuery;
        private addTccsPropertyList: JQuery;
        private propertyTableBody: JQuery;
        private verifyAllButton: JQuery;
        private verifyStopButton: JQuery;
        private currentVerifyingProperty = null;
        private clockInterval;
        private propsToVerify = [];
        private startTime;
        private currentShownPropertyForm = null;
        private propertyForms = {};
        private formulaEditor : any;
        private toolMenuOptions = {};
        private rowClickHandlers = {};

        constructor(container: string, button: string) {
            super(container, button);

            this.project = Project.getInstance();
            this.addCcsPropertyList = $("#add-property");
            this.addTccsPropertyList = $("#add-time-property");
            this.propertyTableBody = $("#property-table").find("tbody");
            this.verifyAllButton = $("#verify-all");
            this.verifyStopButton = $("#verify-stop");

            this.addCcsPropertyList.find("li.property-item").on("click", (e) => this.addProperty(e));
            this.addTccsPropertyList.find("li.property-item").on("click", (e) => this.addProperty(e));
            this.verifyAllButton.on("click", () => {
                this.verifyAllButton.prop("disabled", true);
                this.verifyAll() 
                });
            this.verifyStopButton.on("click", () => {
                this.propsToVerify = [];
                if (this.currentVerifyingProperty) {
                    try {
                        this.currentVerifyingProperty.abortVerification();
                    } catch (error) {
                        console.log("Error stopping verification of property " + this.currentVerifyingProperty + ": " + error);
                    }
                    this.verifactionEnded(PropertyStatus.unknown);
                }
            });

            $(document).on("ccs-changed", () => this.changed = true); // on CCS change event (reset everything)

            this.editor = ace.edit("hml-editor");
            this.editor.setTheme("ace/theme/crisp");
            this.editor.getSession().setMode("ace/mode/hml");
            this.editor.getSession().setUseWrapMode(true);
            this.editor.setOptions({
                enableBasicAutocompletion: true,
                showPrintMargin: false,
                fontSize: 14,
                fontFamily: "Inconsolata"
            });

            this.formulaEditor = ace.edit("hml-formula");
            this.formulaEditor.setTheme("ace/theme/crisp");
            this.formulaEditor.getSession().setMode("ace/mode/hml");
            this.formulaEditor.getSession().setUseWrapMode(true);
            this.formulaEditor.setOptions({
                enableBasicAutocompletion: true,
                showPrintMargin: false,
                fontSize: 14,
                fontFamily: "Inconsolata",
                showLineNumbers: false,
                minLines: 1,
                maxLines: 1
            });

            this.propertyForms = 
            {
                hmlform :
                    {
                        container : $("#hml-form"),
                        processList : $("#hml-process"),
                    }, 
                twoprocesslistform :
                    {
                        container : $("#two-processlist-form"),
                        firstProcessList : $('#first-processlist'),
                        secondProcessList : $('#second-processlist'),
                    }            
            };

            this.toolMenuOptions = {
                "edit": {
                    id:"#property-edit",
                    label: "Edit",
                    click: (e) => this.editProperty(e)
                }, 
                "delete": {
                    id: "#property-delete",
                    label: "Delete",
                    click: (e) => this.deleteProperty(e)
                },
                "play": {
                    id: "#property-playgame",
                    label: "Play",
                    click: (e) => this.playGame(e)
                },
                "distinguishing" : {
                    id: "#property-distinguishing",
                    label: "Distinguishing formula",
                    click: (e) => this.generateDistinguishingFormula(e)
                }
            };

            this.rowClickHandlers = {
                "collapse" : {
                    id:"#property-collapse-btn",
                    click : (e) => this.onCollapseClick(e),
                },
                "status" : {
                    id : "#property-status-btn",
                    click : (e) => this.playGame(e)
                },
                "description": {
                    id : "#property-description-btn",
                    click : (e) => this.editProperty(e)
                },
                "verify": {
                    id : "#property-verify-btn",
                    click : (e) => this.verify(e)
                }
            }
        }

        public onShow(configuration?: any): void {
            if (this.changed) {
                this.changed = false;
                // If project has changed check whether the properties are still valid? Meaning that their processes are still defined,
                // Also check wether the actions exists in used in the ccs program. (low prio)
                var properties = this.project.getProperties();
                var processList = this.project.getGraph().getNamedProcesses()
                //$("#equivalence").hide(); // hide the equivalence box(process selector), since it might have the wrong data 
                //$("#model-checking").hide(); // hide the model-checking(HMl process selector) box, since it might have the wrong data
                properties.forEach((property : Property.Property) => {
                    if (property instanceof Property.Equivalence) {
                        if (processList.indexOf(property.getFirstProcess()) === -1 || processList.indexOf(property.getSecondProcess()) === -1 ) {
                            // If process is not in list of named processes, show the red triangle
                            property.setInvalidateStatus("One of the processes selected is not defined in the CCS program.")
                        }
                        else {
                            property.setUnknownStatus(); // Otherwise set the unknown status
                        }
                    }
                    else if (property instanceof Property.DistinguishingFormula) {
                        var temp : Property.DistinguishingFormula = <Property.DistinguishingFormula> property;
                        if (processList.indexOf(temp.getFirstProcess()) === -1 || processList.indexOf(temp.getSecondProcess()) === -1 ) {
                            // If process is not in list of named processes, show the red triangle
                            temp.setInvalidateStatus("One of the processes selected is not defined in the CCS program.")
                        }
                        else {
                            temp.setUnknownStatus(); // Otherwise set the unknown status
                        }
                    }
                    else if (property instanceof Property.HML) {
                        if (processList.indexOf(property.getProcess()) === -1) {
                            // If process is not in list of named processes, show the red triangle
                            property.setInvalidateStatus("The processes selected is not defined in the CCS program.")
                        }
                        else {
                            property.setUnknownStatus(); // Otherwise set the unknown status
                        }
                    }
                });
            }
            
            if (this.project.getInputMode() === InputMode.TCCS) {
                $("#ccs-properties").hide();
                $("#tccs-properties").show();
                this.editor.getSession().setMode("ace/mode/thml");
                this.formulaEditor.getSession().setMode("ace/mode/thml");
            } else {
                $("#tccs-properties").hide();
                $("#ccs-properties").show();
                this.editor.getSession().setMode("ace/mode/hml");
                this.formulaEditor.getSession().setMode("ace/mode/hml");
            }

            this.displayProperties(); // update the properties table
        }

        public onHide() : void {
            for (var propertyForm in this.propertyForms) {
                this.propertyForms[propertyForm].container.hide();
            }
        }

        public displayProcessList(processes: string[], list: JQuery, selected: string): void {
            list.empty();

            for (var i = 0; i < processes.length; i++) {
                if (processes[i] === selected) {
                    list.append($("<option selected></option").append(processes[i]));
                } else {
                    list.append($("<option></option").append(processes[i]));
                }
            }

            if (!selected) {
                // select the first element in the list
                list.prop("selectedIndex", 0);
            }
        }

        private generateToolMenuOptions(options : string[]) {
            var result = {};
            for (var key in this.toolMenuOptions){
                var index = options.indexOf(key);
                if(index !== -1){
                    result[key] = this.toolMenuOptions[key];
                }
            }

            return result
        }

        private generateRowClickHandlers(options : string[]) {
            var result = {};
            for (var key in this.rowClickHandlers){
                var index = options.indexOf(key);
                if(index !== -1){
                    result[key] = this.rowClickHandlers[key];
                }
            }

            return result
        }

        public displayProperties(): void {
            var properties = this.project.getProperties();
            this.propertyTableBody.empty();

            for (var i = 0; i < properties.length; i++) {
                var propertyRows = null;
                if (properties[i] instanceof Property.DistinguishingFormula) {
                    /* distinguishing formula */                        
                    properties[i].setRowClickHandlers(this.generateRowClickHandlers(["collapse", "description", "verify"]));
                    properties[i].setToolMenuOptions(this.generateToolMenuOptions(["edit", "delete"]));
                    propertyRows = properties[i].toTableRow();
                }
                else if (properties[i] instanceof Property.StrongTraceInclusion || properties[i] instanceof Property.WeakTraceInclusion || 
                         properties[i] instanceof Property.WeakTraceEq || properties[i] instanceof Property.StrongTraceEq) {
                    properties[i].setRowClickHandlers(this.generateRowClickHandlers(["description", "verify"]));
                    properties[i].setToolMenuOptions(this.generateToolMenuOptions(["edit", "delete"]));
                    propertyRows = properties[i].toTableRow();
                }
                else if(properties[i] instanceof Property.StrongBisimulation || properties[i] instanceof Property.WeakBisimulation) { 
                    /* Strong/Weak bisim*/
                    properties[i].setRowClickHandlers(this.generateRowClickHandlers(["status", "description", "verify", "delete"]));
                    properties[i].setToolMenuOptions(this.generateToolMenuOptions(["play", "edit", "delete", "distinguishing"]));
                    propertyRows = properties[i].toTableRow();
                }
                else {
                    /* HML */
                    properties[i].setRowClickHandlers(this.generateRowClickHandlers(["status", "description", "verify", "delete"]));
                    properties[i].setToolMenuOptions(this.generateToolMenuOptions(["play", "edit", "delete"]));
                    propertyRows = properties[i].toTableRow();
                }

                propertyRows.forEach((row) => {
                    this.propertyTableBody.append(row);
                });                
            }
        }

        private onCollapseClick(e) {
            if(e.data.property.isExpanded()){
                this.onCollapse(e);
                e.data.property.setExpanded(false);
            } else {
                this.onExpand(e);
                e.data.property.setExpanded(true);
            }
            this.displayProperties()
        }

        public onCollapse(e) {
            if (e.data.property instanceof Property.DistinguishingFormula) {
                var firstProperty = e.data.property.getFirstHML();
                var firstHMLid = firstProperty.getId();
                var firstHMLRow = this.propertyTableBody.find("#" + firstHMLid);
                firstHMLRow.hide();
                
                var secondProperty = e.data.property.getSecondHML();
                var secondHMLid = secondProperty.getId();
                var secondHMLRow = this.propertyTableBody.find("#" + secondHMLid);
                secondHMLRow.hide();
            } else {
                throw "Cannot collapse this property"
            }
        }

        public onExpand(e) {
            if (e.data.property instanceof Property.DistinguishingFormula) {
                var firstHMLid = e.data.property.getFirstHML().getId();
                var firstHMLRow = this.propertyTableBody.find("#" + firstHMLid);
                firstHMLRow.show();
                
                var secondHMLid = e.data.property.getSecondHML().getId();
                var secondHMLRow = this.propertyTableBody.find("#" + secondHMLid);
                secondHMLRow.show();

            } else {
                throw "Cannot expand this property"
            }
        }

        public addProperty(e): void {
            var type = e.currentTarget.id;
            var property = null;
            var time = "";
            
            if (this.project.getInputMode() === InputMode.TCCS) {
                time = type.substring(0, 5) === "timed" ? "timed" : "untimed";
                type = type.substring(time.length, type.length);
            }
            
            switch(type) {
                case "strong":
                    property = new Property.StrongBisimulation({time: time, firstProcess: "", secondProcess: ""});
                    break;
                case "weak":
                    property = new Property.WeakBisimulation({time: time, firstProcess: "", secondProcess: ""});
                    break;
                case "strongsim":
                    property = new Property.StrongSimulation({time: time, firstProcess: "", secondProcess: ""});
                    break;
                case "weaksim":
                    property = new Property.WeakSimulation({time: time, firstProcess: "", secondProcess: ""});
                    break;
                case "strongtraceinclusion":
                    property = new Property.StrongTraceInclusion(
                        {
                            time: time,
                            firstHMLProperty: {process: "", topFormula: "", definitions: ""},
                            secondHMLProperty: {process: "", topFormula: "", definitions: ""}
                        });
                    break;
                case "weaktraceinclusion":
                    property = new Property.WeakTraceInclusion(
                        {
                            time: time,
                            firstHMLProperty: {process: "", topFormula: "", definitions: ""}, 
                            secondHMLProperty: {process: "", topFormula: "", definitions: ""}
                        });
                    break;
                case "strongtraceeq":
                    property = new Property.StrongTraceEq({time: time, firstProcess: "", secondProcess: ""});
                    break;
                case "weaktraceeq":
                    property = new Property.WeakTraceEq({time: time, firstProcess: "", secondProcess: ""});
                    break;
                case "hml":
                    property = new Property.HML({process: "", topFormula: "", definitions: ""});
                    break;
                case "distinguishing-strong":
                    property = new Property.DistinguishingBisimulationFormula(
                        {
                            time: time,
                            firstHMLProperty: {process: "", topFormula: "", definitions: ""}, 
                            secondHMLProperty: {process: "", topFormula: "", definitions: ""},
                            succGenType: "strong"
                        });
                    break;
                case "distinguishing-weak":
                    property = new Property.DistinguishingBisimulationFormula(
                        {
                            time: time,
                            firstHMLProperty: {process: "", topFormula: "", definitions: ""}, 
                            secondHMLProperty: {process: "", topFormula: "", definitions: ""},
                            succGenType: "weak"
                        });
                    break;
            }

            this.project.addProperty(property);
            this.displayProperties();
            this.editProperty({data: {property: property}});
        }

        private playGame(e) : void {
            var property =  <Property.Property>e.data.property;
            
            if(property.getStatus() != PropertyStatus.satisfied && property.getStatus() != PropertyStatus.unsatisfied) {
                throw "Property has not yet been evaluated";
            }

            if (property instanceof Property.Equivalence) {
                    var equivalence = <Property.Equivalence> property,
                        gameType,
                        playerType = (equivalence.getStatus() === PropertyStatus.satisfied) ? "attacker" : "defender";
                    
                    if (equivalence instanceof Property.StrongBisimulation)
                        gameType = "strong";
                    else if (equivalence instanceof Property.WeakBisimulation)
                        gameType = "weak";
                    else if (equivalence instanceof Property.StrongSimulation)
                        gameType = "strongsim";
                    else
                        gameType = "weaksim";
                    
                    if (this.project.getInputMode() === InputMode.TCCS) {
                        gameType = (<Property.Equivalence>property).getTime() + gameType;
                    }
                    
                    var EquivConfiguration = {
                            gameType: gameType,
                            playerType: playerType,
                            leftProcess: equivalence.firstProcess,
                            rightProcess: equivalence.secondProcess
                    };
                    Main.activityHandler.selectActivity("game", EquivConfiguration);
            } 
            else if(property instanceof Property.HML) {
                    var gameType : any = "strong";
                    var formulaSetForProperty = this.project.getFormulaSetsForProperties()[property.getId()];
                    var HmlConfiguration = Object.create(null),
                        graph : ccs.Graph = this.project.getGraph();

                    HmlConfiguration.succGen = CCS.getSuccGenerator(graph, {succGen: gameType, reduce: false});
                    HmlConfiguration.processName = property.getProcess();
                    HmlConfiguration.propertyId = property.getId();
                    HmlConfiguration.formulaId = formulaSetForProperty.getTopFormula().id;
                    HmlConfiguration.type = "not default";

                    Main.activityHandler.selectActivity("hmlgame", HmlConfiguration);
            } 
            else {
                throw "This kind of property is not playable.";
            }
        }

        private generateDistinguishingFormula(e = null) : void {            
            if (e) {
                var property =  <Property.StrongBisimulation | Property.WeakBisimulation>e.data.property;
                property.generateDistinguishingFormula((result) => this.generationEnded(result));
            }
        }

        public generationEnded(result = null) { 
            if (result) {
                this.project.addProperty(result.firstProperty);
                this.project.addProperty(result.secondProperty);
                this.displayProperties();
            } else {
                this.displayProperties();
                throw "result was empty."; 
            }
        }

        private showPropertyForm(propertyFormName : string) {
            if(this.currentShownPropertyForm){
                // hide previous form
                this.currentShownPropertyForm.container.hide()
            }
            
            for (var key in this.propertyForms){
                if (key === propertyFormName){
                    this.currentShownPropertyForm = this.propertyForms[key];
                }
            }

            this.currentShownPropertyForm.container.show();
            return this.currentShownPropertyForm;
        }
        
        private hidePropertyForm(propertyFormName : string = "") {
            var hiddenForm;
            if(propertyFormName === "") {
                /*Hide all forms*/
                for (var key in this.propertyForms){
                    hiddenForm = this.propertyForms[key]
                    hiddenForm.container.hide()
                }
            } else {
                for (var key in this.propertyForms) {
                    if (key === propertyFormName) {
                        hiddenForm = this.propertyForms[key].container.hide();
                        hiddenForm.container.hide()
                    }
                }
            }

            this.currentShownPropertyForm = null;
            return hiddenForm
        }

        public editProperty(e): void {
            var property = e.data.property;

            var CCSProcessList = this.project.getGraph().getNamedProcesses();
            CCSProcessList.reverse();

            if (property instanceof Property.Equivalence || property instanceof Property.DistinguishingFormula) {
                var equivalenceForm = this.showPropertyForm("twoprocesslistform");

                this.displayProcessList(CCSProcessList, equivalenceForm.firstProcessList, property.getFirstProcess());
                this.displayProcessList(CCSProcessList, equivalenceForm.secondProcessList, property.getSecondProcess());

                if (property.getFirstProcess() !== equivalenceForm.firstProcessList.val()){
                    property.setFirstProcess(equivalenceForm.firstProcessList.val()); // Re-set the chosen process, since the process might have been deleted
                }
                if (property.getSecondProcess() !== equivalenceForm.secondProcessList.val()){
                    property.setSecondProcess(equivalenceForm.secondProcessList.val()); // Re-set the chosen process, since the process might have been deleted
                }
                this.displayProperties(); // update the process table

                equivalenceForm.firstProcessList.off("change");
                equivalenceForm.firstProcessList.on("change", () => {
                    // On change, set the process.
                    property.setFirstProcess(equivalenceForm.firstProcessList.val());
                    this.displayProperties();
                });

                equivalenceForm.secondProcessList.off("change");
                equivalenceForm.secondProcessList.on("change", () => {
                    // On change, set the process.
                    property.setSecondProcess(equivalenceForm.secondProcessList.val());
                    this.displayProperties();
                });
            } else if (property instanceof Property.HML) {
                var hmlForm = this.showPropertyForm("hmlform");

                this.displayProcessList(CCSProcessList, hmlForm.processList, property.getProcess());

                if (property.getProcess() !== hmlForm.processList.val()) {
                    property.setProcess(hmlForm.processList.val()); // Re-set the chosen process, since the process might have been deleted
                    this.displayProperties(); // update the process table
                }

                hmlForm.processList.off("change");
                hmlForm.processList.on("change", () => {
                    property.setProcess(hmlForm.processList.val());
                    this.displayProperties();
                });

                this.editor.removeAllListeners("change");
                this.formulaEditor.removeAllListeners("change");
                this.editor.setValue(property.getDefinitions(), 1);
                this.formulaEditor.setValue(property.getTopFormula(), 1);

                this.updateHeight();
                this.editor.focus();

                this.editor.on("change", () => {
                    property.setDefinitions(this.editor.getValue());
                    this.displayProperties();
                    this.updateHeight();
                });

                this.formulaEditor.on("change", () => {
                    property.setTopFormula(this.formulaEditor.getValue());
                    this.displayProperties();
                    this.updateHeight();
                });
            }
        }

        public deleteProperty(e): void {
            e.stopPropagation();
            this.hidePropertyForm(); // hides all the propertyforms.
            this.project.deleteProperty(e.data.property);
            this.displayProperties();
        }

        private verifactionEnded(result? : PropertyStatus) {
            this.currentVerifyingProperty = null;
            this.enableVerificationGUI()
            this.displayProperties();
            this.doNextVerification();
        }

        private doNextVerification() {
            if (!this.currentVerifyingProperty && this.propsToVerify.length > 0) {
                var property = this.propsToVerify.shift();
                this.verify({data: {property: property}});
            }
        }

        private disabledVerificationGUI() {
            /*Hide the displayed propertyforms*/
            this.hidePropertyForm();
            
            /* enable the stop btn and disable the verify all btn. */
            this.verifyAllButton.prop("disabled", true);
            this.verifyStopButton.prop("disabled", false);

            /* Disable all verify(play-btn)*/
            $("tr #property-verify-btn").prop("disabled", true);
        }

        private enableVerificationGUI() {
            /* Disable the stop btn, and enable the verify all btn. */
            this.verifyAllButton.prop("disabled", false);
            this.verifyStopButton.prop("disabled", true);

            /* Enable all verify(play-btns) */
            $("tr #property-verify-btn").prop("disabled", false);

        }

        public verify(e): void {
            var property = (e.data.property instanceof Property.Property) ? e.data.property : null;

            /* Start to verify a property row*/
            
            this.disabledVerificationGUI();
            this.currentVerifyingProperty = property; // the current verifying property
            
            property.verify(this.verifactionEnded.bind(this));
        }

        public verifyAll(): void {
            var numProperties = this.project.getProperties();
            this.queuePropertiesToVerification(numProperties);
            this.doNextVerification();
        }

        public queuePropertiesToVerification(properties : Property.Property[]) {
            properties.forEach((property) => this.propsToVerify.push(property));
        }
        
        private updateHeightForEditor(editor, id) : void {
            var newHeight = editor.getSession().getScreenLength() * editor.renderer.lineHeight + editor.renderer.scrollBar.getWidth();
            $("#" + id).height(newHeight.toString() + "px");
            $("#" + id + "-section").height(newHeight.toString() + "px");
            editor.resize();
        }

        // http://stackoverflow.com/questions/11584061/
        private updateHeight(): void {
            this.updateHeightForEditor(this.editor, "hml-editor");
            this.updateHeightForEditor(this.formulaEditor, "hml-formula");

            // var newHeight =
            //           this.editor.getSession().getScreenLength()
            //           * this.editor.renderer.lineHeight
            //           + this.editor.renderer.scrollBar.getWidth();

            // $('#hml-editor').height(newHeight.toString() + "px");
            // $('#hml-editor-section').height(newHeight.toString() + "px");

            // // This call is required for the editor to fix all of
            // // its inner structure for adapting to a change in size
            // this.editor.resize();

        }
    }
}

/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../main.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="../gui/property.ts" />
/// <reference path="activity.ts" />

module Activity {

    export class Verifier extends Activity {
        private project: Project;
        private changed : boolean
        private editor: any;
        private addPropertyList: JQuery;
        private propertyTableBody: JQuery;
        private verifyAllButton: JQuery;
        private verifyStopButton: JQuery;
        private currentVerifyingProperty = null;
        private clockInterval;
        private propsToVerify = [];
        private startTime;

        constructor(container: string, button: string) {
            super(container, button);

            this.project = Project.getInstance();
            this.addPropertyList = $("#add-property");
            this.propertyTableBody = $("#property-table").find("tbody");
            this.verifyAllButton = $("#verify-all");
            this.verifyStopButton = $("#verify-stop");

            this.addPropertyList.find("li").on("click", (e) => this.addProperty(e));
            this.verifyAllButton.on("click", () => this.verifyAll());
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
                maxLines: Infinity,
                showPrintMargin: false,
                fontSize: 14,
                fontFamily: "Inconsolata",
            });
        }

        protected checkPreconditions(): boolean {
            var graph = Main.getGraph();

            if (!graph) {
                this.showExplainDialog("Syntax Error", "Your program contains one or more syntax errors.");
                return false;
            } else if (graph.getNamedProcesses().length === 0) {
                this.showExplainDialog("No Named Processes", "There must be at least one named process in the program.");
                return false;
            }

            return true;
        }

        public onShow(configuration?: any): void {
            if (this.changed) {
                this.changed = false;
                // If project has changed check whether the properties are still valid? Meaning that their processes are still defined,
                // Also check wether the actions exists in used in the ccs program. (low prio)
                var properties = this.project.getProperties();
                var processList = Main.getGraph().getNamedProcesses()
                //$("#equivalence").hide(); // hide the equivalence box(process selector), since it might have the wrong data 
                //$("#model-checking").hide(); // hide the model-checking(HMl process selector) box, since it might have the wrong data

                properties.forEach((property) => {
                    if (property instanceof Property.StrongBisimulation || 
                        property instanceof Property.WeakBisimulation) {
                        if (processList.indexOf(property.getFirstProcess()) === -1 || processList.indexOf(property.getSecondProcess()) === -1 ) {
                            // If process is not in list of named processes, show the red triangle
                            property.setInvalidateStatus()
                        }
                        else {
                            property.setUnknownStatus(); // Otherwise set the unknown status
                        }
                    }
                    else if (property instanceof Property.HML) {
                        if (processList.indexOf(property.getProcess()) === -1) {
                            // If process is not in list of named processes, show the red triangle
                            property.setInvalidateStatus()
                        }
                        else {
                            property.setUnknownStatus(); // Otherwise set the unknown status
                        }
                    }   
                });
            }

            this.displayProperties(); // update the properties table
        }

        public onHide() : void {
            $("#equivalence-first-process").empty(); // empty the process selector (Equivalence)
            $("#equivalence-second-process").empty(); // empty the process selector (Equivalence)
            $("#hml-process").empty(); // empty the process selector (HML)
            
            $("#equivalence").hide(); // hide the equivalence box(process selector), since it might have the wrong data 
            $("#model-checking").hide(); // hide the model-checking(HMl process selector) box, since it might have the wrong data
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

        public displayProperties(): void {
            var properties = this.project.getProperties();
            this.propertyTableBody.empty();
            
            for (var i = 0; i < properties.length; i++) {
                var propertyRows = null;
                if (properties[i] instanceof Property.Equivalence || properties[i] instanceof Property.HML) {
                    /* Strong/Weak bisim and HML*/
                    properties[i].onStatusClick = (e) => this.onStatusClick(e);
                    properties[i].onStatusHover = (e) => this.onStatusHover(e);
                    properties[i].onEdit = (e) => this.editProperty(e);
                    properties[i].onDelete = (e) => this.deleteProperty(e);
                    properties[i].onVerify = (e) => this.verify(e);

                    propertyRows = properties[i].toTableRow();
                } else {
                    /* distinguishing formula */
                    properties[i].onStatusClick = (e) => {
                        if(e.data.property.isExpanded()){
                            this.onCollapse(e);
                            e.data.property.setExpanded(false);
                        } else {
                            this.onExpand(e);
                            e.data.property.setExpanded(true);
                        }
                    };
                    properties[i].onStatusHover = (e) => this.onStatusHover(e);
                    properties[i].onEdit = (e) => this.editProperty(e);
                    properties[i].onDelete = (e) => this.deleteProperty(e);
                    properties[i].onVerify = (e) => this.verify(e);
                    
                    propertyRows = properties[i].toTableRow();
                }

                propertyRows.forEach((row) => {
                    this.propertyTableBody.append(row);
                });

                
            }
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

            switch(type) {
                case "strong":
                    property = new Property.StrongBisimulation({firstProcess: "", secondProcess: ""});
                    break;
                case "weak":
                    property = new Property.WeakBisimulation({firstProcess: "", secondProcess: ""});
                    break;
                case "hml":
                    property = new Property.HML({process: "", formula: ""});
                    break;
                case "distinguishing":
                    property = new Property.DistinguishingFormula({firstProcess: "", secondProcess: ""});
                    break;
            }

            this.project.addProperty(property);
            this.displayProperties();
            this.editProperty({data: {property: property}});
        }

        private onStatusHover(property) {
            return property.statistics.elapsedTime + " ms";
        }

        private onStatusClick(e) {
            var property = e.data.property;
            if (property instanceof Property.Equivalence) {
                var equivalence = <Property.Equivalence> property,
                    gameType = (equivalence instanceof Property.StrongBisimulation) ? "strong" : "weak",
                    playerType = (equivalence.getStatus() === PropertyStatus.satisfied) ? "attacker" : "defender",
                    configuration = {
                        gameType: gameType,
                        playerType: playerType,
                        leftProcess: equivalence.firstProcess,
                        rightProcess: equivalence.secondProcess
                    };
                Main.activityHandler.selectActivity("game", configuration);
            }
        }

        public editProperty(e): void {
            var property = e.data.property;

            if (property instanceof Property.Equivalence) {
                $("#model-checking").hide();
                $("#distinguishing-formula").hide()
                $("#equivalence").show();

                var firstProcessList = $("#equivalence-first-process");
                var secondProcessList = $("#equivalence-second-process");

                var processes = Main.getGraph().getNamedProcesses();
                processes.reverse() // reverse the list since the most used processes are at the buttom.
                this.displayProcessList(processes, firstProcessList, property.getFirstProcess());
                this.displayProcessList(processes, secondProcessList, property.getSecondProcess());

                if (property.getFirstProcess() !== firstProcessList.val()){
                    property.setFirstProcess(firstProcessList.val()); // Re-set the chosen process, since the process might have been deleted
                }
                if (property.getSecondProcess() !== secondProcessList.val()){
                    property.setSecondProcess(secondProcessList.val()); // Re-set the chosen process, since the process might have been deleted
                }
                this.displayProperties(); // update the process table

                firstProcessList.off("change");
                firstProcessList.on("change", () => {
                    // On change, set the process.
                    property.setFirstProcess(firstProcessList.val());
                    this.displayProperties();
                });

                secondProcessList.off("change");
                secondProcessList.on("change", () => {
                    // On change, set the process.
                    property.setSecondProcess(secondProcessList.val());
                    this.displayProperties();
                });
            } else if (property instanceof Property.HML) {
                $("#equivalence").hide();
                $("#distinguishing-formula").hide()
                $("#model-checking").show();

                var processList = $("#hml-process");
                this.displayProcessList(Main.getGraph().getNamedProcesses(), processList, property.getProcess());

                if (property.getProcess() !== processList.val()) {
                    property.setProcess(processList.val()); // Re-set the chosen process, since the process might have been deleted
                    this.displayProperties(); // update the process table
                }

                processList.off("change");
                processList.on("change", () => {
                    property.setProcess(processList.val());
                    this.displayProperties();
                });

                this.editor.removeAllListeners("change");
                this.editor.setValue(property.getFormula(), 1);
                this.editor.focus();
                this.editor.on("change", () => {
                    property.setFormula(this.editor.getValue());
                    this.displayProperties();
                });
            } else if (property instanceof Property.DistinguishingFormula){
                $("#equivalence").hide();
                $("#model-checking").hide();
                $("#distinguishing-formula").show();

                var firstProcessList = $('#distinguishing-first-process');
                var secondProcessList = $('#distinguishing-second-process');
                var CCSProcessList = Main.getGraph().getNamedProcesses();
                CCSProcessList.reverse();

                this.displayProcessList(CCSProcessList, firstProcessList, property.getFirstProcess());
                this.displayProcessList(CCSProcessList, secondProcessList, property.getSecondProcess());

                if (property.getFirstProcess() !== firstProcessList.val()){
                    property.setFirstProcess(firstProcessList.val()); // Re-set the chosen process, since the process might have been deleted
                }
                if (property.getSecondProcess() !== secondProcessList.val()){
                    property.setSecondProcess(secondProcessList.val()); // Re-set the chosen process, since the process might have been deleted
                }

                this.displayProperties(); // update the process table

                firstProcessList.off("change");
                firstProcessList.on("change", () => {
                    // On change, set the process.
                    property.setFirstProcess(firstProcessList.val());
                    this.displayProperties();
                });

                secondProcessList.off("change");
                secondProcessList.on("change", () => {
                    // On change, set the process.
                    property.setSecondProcess(secondProcessList.val());
                    this.displayProperties();
                });
            }
        }

        public deleteProperty(e): void {
            e.stopPropagation();
            this.project.deleteProperty(e.data.property);
            this.displayProperties();
        }

        private verifactionEnded(result? : PropertyStatus) {
            this.currentVerifyingProperty.statistics.elapsedTime = (this.startTime) ? new Date().getTime() - this.startTime : 0;
            clearInterval(this.clockInterval);
            this.verifyStopButton.prop("disabled", true);
            this.currentVerifyingProperty = null;
            this.displayProperties();
            this.doNextVerification();
        }

        private doNextVerification() {
            if (!this.currentVerifyingProperty && this.propsToVerify.length > 0) {
                var property = this.propsToVerify.shift();
                this.verify({data: {property: property}});
            }
        }

        public verify(e): void {
            // TODO some checking before running verify
            var property = (e.data.property instanceof Property.Property) ? e.data.property : null;
            
            if(property instanceof Property.DistinguishingFormula){
                /* Do not run a distinguishing property, both run its children. */
                this.propsToVerify.push(property.getFirstHML())
                this.propsToVerify.push(property.getSecondHML())
                this.doNextVerification();
                return;
            }

            /* Start to verify a property row*/
            var row = this.propertyTableBody.find("#" + property.getId());
            this.verifyStopButton.prop("disabled", false);
            var statusTd = row.find("#property-status");
            
            this.startTime = new Date().getTime();
            var updateTimer = () => {
                var elapsedTime = new Date().getTime() - this.startTime;
                statusTd.text(elapsedTime + "ms");
            }

            this.clockInterval = setInterval(updateTimer, 100);
            this.currentVerifyingProperty = property;


            property.verify(this.verifactionEnded.bind(this));
        }

        public verifyAll(): void {
            var numProperties = this.project.getProperties();
            numProperties.forEach((property : Property.Property) => this.propsToVerify.push(property));
            this.doNextVerification();
        }
    }
}

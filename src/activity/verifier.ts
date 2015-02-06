/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../main.ts" />
/// <reference path="../gui/property.ts" />
/// <reference path="activity.ts" />

module Activity {

    export class Verifier extends Activity {
        private project: Project;
        private editor: any;
        private addPropertyList: JQuery;
        private propertyTableBody: JQuery;
        private verifyAllButton: JQuery;
        private verifyStopButton: JQuery;
        private currentVerifyingProperty = null;
        private clockInterval;
        private propsToVerify = [];

        public constructor(project: Project) {
            super();

            this.project = project;
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
                    this.verifactionEnded();
                }
            });

            this.editor = ace.edit("hml-editor");
            this.editor.setTheme("ace/theme/crisp");
            this.editor.getSession().setMode("ace/mode/hml");
            this.editor.getSession().setUseWrapMode(true);
            this.editor.setOptions({
                enableBasicAutocompletion: true,
                maxLines: 3,
                showPrintMargin: false,
                fontSize: 14,
                fontFamily: "Inconsolata",
            });
        }

        public beforeShow(): void {
            this.displayProperties();
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
                list.prop("selectedIndex", -1);
            }
        }

        public displayProperties(): void {
            var properties = this.project.getProperties();
            this.propertyTableBody.empty();

            for (var i = 0; i < properties.length; i++) {
                var row = $("<tr></tr>");
                var del = $("<i class=\"fa fa-trash\"></i>");
                var verify = $("<i class=\"fa fa-play\"></i>");

                var tdStatus = $("<td class=\"text-center\"></td>").append(properties[i].getStatusIcon());
                var tdDescription = $("<td></td>").append(properties[i].getDescription());
                var tdDelete = $("<td class=\"text-center\"></td>").append(del);
                var tdVerify = $("<td class=\"text-center\"></td>").append(verify);
                row.append(tdStatus, tdDescription, tdDelete, tdVerify);

                this.propertyTableBody.append(row);

                tdStatus.on("click", {property: properties[i]}, (e) => this.onStatusClick(e));
                row.on("click", {property: properties[i]}, (e) => this.editProperty(e));
                tdDelete.on("click", {property: properties[i]}, (e) => this.deleteProperty(e));
                tdVerify.on("click", {idx: i}, (e) => this.verify(e.data.idx));
            }
        }

        public addProperty(e): void {
            var type = e.currentTarget.id;
            var property = null;

            switch(type) {
                case "strong":
                    property = new Property.StrongBisimulation(null, {firstProcess: "", secondProcess: ""});
                    break;
                case "weak":
                    property = new Property.WeakBisimulation(null, {firstProcess: "", secondProcess: ""});
                    break;
                case "hml":
                    property = new Property.HML(null, {process: "", formula: ""});
                    break;
            }

            this.project.addProperty(property);
            this.displayProperties();
            this.editProperty({data: {property: property}});
        }

        private onStatusClick(e) {
            var property = e.data.property;
            if (property instanceof Property.Equivalence) {
                var equivalence = <Property.Equivalence>property,
                    isWeak = equivalence instanceof Property.WeakBisimulation,
                    graph = Main.getGraph(),
                    configuration = {
                        graph: graph,
                        successorGenerator: (isWeak ? Main.getWeakSuccGenerator(graph) : Main.getStrictSuccGenerator(graph)),
                        isWeakSuccessorGenerator: isWeak,
                        processNameA: equivalence.firstProcess,
                        processNameB: equivalence.secondProcess
                    };
                Main.activityHandler.openActivityWithConfiguration("game", configuration);
                //Don't process click event further
                return false;
            }
        }

        public editProperty(e): void {
            var property = e.data.property;

            if (property instanceof Property.Equivalence) {
                $("#equivalence").show();
                $("#model-checking").hide();

                var firstProcessList = $("#equivalence-first-process");
                var secondProcessList = $("#equivalence-second-process");

                var processes = Main.getGraph().getNamedProcesses();
                this.displayProcessList(processes, firstProcessList, property.getFirstProcess());
                this.displayProcessList(processes, secondProcessList, property.getSecondProcess());

                firstProcessList.off("change");
                firstProcessList.on("change", () => {
                    property.setFirstProcess(firstProcessList.val());
                    this.displayProperties();
                });

                secondProcessList.off("change");
                secondProcessList.on("change", () => {
                    property.setSecondProcess(secondProcessList.val());
                    this.displayProperties();
                });
            } else if (property instanceof Property.HML) {
                $("#equivalence").hide();
                $("#model-checking").show();

                var processList = $("#hml-process");
                this.displayProcessList(Main.getGraph().getNamedProcesses(), processList, property.getProcess());

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
            }
        }

        public deleteProperty(e): void {
            e.stopPropagation();
            this.project.deleteProperty(e.data.property);
            this.displayProperties();
        }

        private verifactionEnded() {
            clearInterval(this.clockInterval);
            this.verifyStopButton.prop("disabled", true);
            this.currentVerifyingProperty = null;
            this.displayProperties();
            this.doNextVerification();
        }

        private doNextVerification() {
            if (!this.currentVerifyingProperty && this.propsToVerify.length > 0) {
                var propIndex = this.propsToVerify.shift();
                this.verify(propIndex);
            }
        }

        public verify(index): void {
            var property = this.project.getProperties()[index];
            this.verifyStopButton.prop("disabled", false);

            var row = this.propertyTableBody.find("tr").eq(index);
            var statusTd = row.find("td").eq(0);
            var startTime = new Date().getTime();
            
            this.clockInterval = setInterval(updateTimer, 100);
            this.currentVerifyingProperty = property;

            function updateTimer() {
                var elapsedTime = new Date().getTime() - startTime;
                statusTd.text(elapsedTime + "ms");
            }

            property.verify(this.verifactionEnded.bind(this));
        }

        public verifyAll(): void {
            var numProperties = this.project.getProperties();
            numProperties.forEach( (p, i) => this.propsToVerify.push(i));
            this.doNextVerification();
        }
    }
}

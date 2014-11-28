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

        public constructor(project: Project) {
            super();

            this.project = project;
            this.addPropertyList = $("#add-property");
            this.propertyTableBody = $("#property-table").find("tbody");
            this.verifyAllButton = $("#verify-all");

            this.addPropertyList.find("li").on("click", (e) => this.addProperty(e));
            this.verifyAllButton.on("click", () => this.verifyAll());

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

                row.append($("<td class=\"text-center\"></td>").append(properties[i].getSatisfiable()));
                row.append($("<td></td>").append(properties[i].getDescription()));
                row.append($("<td class=\"text-center\"></td>").append(del));
                row.append($("<td class=\"text-center\"></td>").append(verify));

                this.propertyTableBody.append(row);

                row.on("click", {property: properties[i]}, (e) => this.editProperty(e));
                del.on("click", {property: properties[i]}, (e) => this.deleteProperty(e));
                verify.on("click", {property: properties[i]}, (e) => this.verify(e));
            }
        }

        public addProperty(e): void {
            var type = e.currentTarget.id;
            var property = null;

            switch(type) {
                case "strong":
                    property = new Property.StrongBisimulation("", "");
                    break;
                case "weak":
                    property = new Property.WeakBisimulation("", "");
                    break;
                case "hml":
                    property = new Property.HML("", "");
                    break;
            }

            this.project.addProperty(property);
            this.displayProperties();
            this.editProperty({data: {property: property}});
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

        public verify(e): void {
            e.data.property.verify();
            this.displayProperties();
        }

        public verifyAll(): void {
            var properties = this.project.getProperties();

            for (var i = 0; i < properties.length; i++) {
                properties[i].verify();
            }

            this.displayProperties();
        }
    }
}

/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../main.ts" />
/// <reference path="../gui/property.ts" />
/// <reference path="activity.ts" />

module Activity {

    export class Verifier extends Activity {
        private selectedProperties: Property.Property[];
        private project: Project;
        private addPropertyList: JQuery;
        private propertyTable: JQuery;
        private verifyAllButton: JQuery;

        public constructor(project: Project) {
            super();

            this.project = project;
            this.addPropertyList = $("#add-property");
            this.propertyTable = $("#property-table");
            this.verifyAllButton = $("#verify-all");

            this.addPropertyList.find("li").on("click", (e) => this.addProperty(e));
            this.verifyAllButton.on("click", () => this.verifyAll());
        }

        public displayProcesses(processes: string[], firstSelected?: string, secondSelected?: string): void {
            var firstProcess = $("#first-process").empty();
            var secondProcess = $("#second-process").empty();

            for (var i = 0; i < processes.length; i++) {
                if (processes[i] === firstSelected) {
                    firstProcess.append($("<option selected></option").append(processes[i]));
                } else {
                    firstProcess.append($("<option></option").append(processes[i]));
                }

                if (processes[i] === secondSelected) {
                    secondProcess.append($("<option selected></option").append(processes[i]));
                } else {
                    secondProcess.append($("<option></option").append(processes[i]));
                }
            }
        }

        public displayProperties(): void {
            var properties = this.project.getProperties();
            var tableBody = this.propertyTable.find("tbody");
            tableBody.empty();

            for (var i = 0; i < properties.length; i++) {
                var row = $("<tr></tr>");
                row.append($("<td class=\"text-center\"></td>").append(properties[i].getSatisfiable()));
                row.append($("<td></td>").append(properties[i].getDescription()));

                var del = $("<i class=\"fa fa-trash\"></i>");
                var verify = $("<i class=\"fa fa-play\"></i>");
                row.append($("<td class=\"text-center\"></td>").append(del));
                row.append($("<td class=\"text-center\"></td>").append(verify));

                tableBody.append(row);

                row.on("click", {property: properties[i]}, (e) => this.editProperty(e));
                del.on("click", {property: properties[i]}, (e) => this.deleteProperty(e));
                verify.on("click", {property: properties[i]}, (e) => this.verify(e));
            }
        }

        public addProperty(e): void {
            var type = e.currentTarget.id;

            switch(type) {
                case "strong":
                    var property = new Property.StrongBisimulation("", "");
                    break;
                case "weak":
                    var property = new Property.WeakBisimulation("", "");
                    break;
            }

            this.project.addProperty(property);
            this.displayProperties();
            this.editProperty({data: {property: property}});
        }

        public editProperty(e): void {
            var property = e.data.property;

            if (property instanceof Property.Equivalence) {
                this.displayProcesses(Main.getGraph().getNamedProcesses(), property.getFirstProcess(), property.getSecondProcess());

                $("#first-process").off("change");
                $("#first-process").on("change", () => {
                    property.setFirstProcess($("#first-process").val());
                    this.displayProperties();
                });

                $("#second-process").on("change", () => {
                    $("#second-process").off("change");
                    property.setSecondProcess($("#second-process").val());
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

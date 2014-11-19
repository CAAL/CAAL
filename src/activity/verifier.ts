/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../main.ts" />
/// <reference path="../gui/property.ts" />
/// <reference path="activity.ts" />

module Activity {

    enum PropertyType {Strong, Weak, Trace, HML};

    export class Verifier extends Activity {
        private currentProperty: PropertyType;
        private project: Project;
        private propertySelector: JQuery;
        private propertyTable: JQuery;
        private addPropertyButton: JQuery;
        private verifyButton: JQuery;
        private deleteButton: JQuery;
        private toggleSelectButton: JQuery;

        public constructor(project: Project) {
            super();

            this.project = project;
            this.propertySelector = $("#property-selector");
            this.propertyTable = $("#property-table");
            this.addPropertyButton = $("#add-property");
            this.verifyButton = $("#verify-prop-btn");
            this.deleteButton = $("#delete-prop-btn");
            this.toggleSelectButton = $("#toggle-select");

            this.addPropertyButton.on("click", () => this.addProperty());
            this.verifyButton.on("click", () => this.verify());
            this.toggleSelectButton.on("click", () => this.toggleSelect());

            $("li[data-tab]").on("click", (e) => this.displayOptions(e));
        }

        public displayOptions(e): void {
            var id = $(e.currentTarget).attr("data-tab");
            this.currentProperty = parseInt(id);
            this.propertySelector.html($(e.currentTarget).text() + " <span class=\"caret\"></span>");

            $("div[data-tab]").each(function() {
                $(this).toggle($(this).attr("data-tab") === id);
            })

            switch(this.currentProperty) {
                case PropertyType.Strong:
                    var namedProcesses = Main.getGraph().getNamedProcesses();
                    this.displayProcesses(namedProcesses);
                    break;
                case PropertyType.Weak:
                    break;
                case PropertyType.Trace:
                    break;
                case PropertyType.HML:
                    break;
            }
        }

        public displayProcesses(namedProcesses: string[]): void {
            var firstProcess = $("#first-process").empty();
            var secondProcess = $("#second-process").empty();

            for (var i = 0; i < namedProcesses.length; i++) {
                firstProcess.append($("<option></option").append(namedProcesses[i]));
                secondProcess.append($("<option></option").append(namedProcesses[i]));
            }
        }

        public addProperty(): void {
            switch(this.currentProperty) {
                case PropertyType.Strong:
                    var firstSelected = $("#first-process :selected").text();
                    var secondSelected = $("#second-process :selected").text();
                    this.project.addProperty(new Property.StrongBisimulation(firstSelected, secondSelected));
                    this.displayProperties();
                    break;
                case PropertyType.Weak:
                    break;
                case PropertyType.Trace:
                    break;
                case PropertyType.HML:
                    break;
            }
        }

        public displayProperties(): void {
            var properties = this.project.getProperties();
            var tableBody = this.propertyTable.find("tbody");
            tableBody.empty();

            for (var i = 0; i < properties.length; i++) {
                tableBody.append(properties[i].toHTML());
            }
        }

        public verify(): void {
            var properties = this.project.getProperties();

            for (var i = 0; i < properties.length; i++) {
                properties[i].verify();
            }

            this.displayProperties();
        }

        private toggleSelect(): void {
            $(":checkbox").prop("checked", this.toggleSelectButton.prop("checked"));
        }
    }
}

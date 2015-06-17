module Activity {

    export class Verifier extends Activity {
        private graph : CCS.Graph;
        private timer : number;
        private verificationQueue: Property.Property[];
        private formulaEditor : any;
        private definitionsEditor : any;

        constructor(container: string, button: string) {
            super(container, button);

            $("#add-property").on("click", () => this.showPropertyModal());
            $("#verify-all").on("click", () => this.verifyAll());
            $("input[name=property-type]").on("change", () => this.showSelectedPropertyType());

            this.formulaEditor = ace.edit("hml-formula-editor");
            this.formulaEditor.setTheme("ace/theme/crisp");
            this.formulaEditor.getSession().setMode("ace/mode/hml");
            this.formulaEditor.getSession().setUseWrapMode(true);
            this.formulaEditor.setOptions({
                enableBasicAutocompletion: true,
                showPrintMargin: false,
                fontSize: 14,
                fontFamily: "Inconsolata",
                showLineNumbers: false,
            });

            this.definitionsEditor = ace.edit("hml-definitions-editor");
            this.definitionsEditor.setTheme("ace/theme/crisp");
            this.definitionsEditor.getSession().setMode("ace/mode/hml");
            this.definitionsEditor.getSession().setUseWrapMode(true);
            this.definitionsEditor.setOptions({
                enableBasicAutocompletion: true,
                showPrintMargin: false,
                fontSize: 14,
                fontFamily: "Inconsolata",
                showLineNumbers: false,
                maxLines: Infinity,
            });
        }

        public onShow() : void {
            if (this.changed) {
                this.changed = false;
                this.graph = this.project.getGraph();
                this.displayProperties();
                this.setPropertyModalOptions();

                if (this.project.getInputMode() === InputMode.CCS) {
                    this.formulaEditor.getSession().setMode("ace/mode/hml");
                    this.definitionsEditor.getSession().setMode("ace/mode/hml");
                } else {
                    this.formulaEditor.getSession().setMode("ace/mode/thml");
                    this.definitionsEditor.getSession().setMode("ace/mode/thml");
                }
            }
        }

        private displayProperty(property : Property.Property, replace? : JQuery) : void {
            var $row = $("<tr>");
            property.setRow($row);

            $row.append($("<td>").append(property.getStatusIcon()));

            var $time = $("<td>").append(property.getElapsedTime());
            property.setTimeCell($time);
            $row.append($time);

            $row.append($("<td>").append(property.getDescription()));

            var $verify = $("<td>").append($("<i>").attr("class", "fa fa-play-circle"));
            $verify.on("click", {property: property, row: $row, time: $time}, (e) => this.verify(e));
            $row.append($verify);

            var $edit = $("<td>").append($("<i>").attr("class", "fa fa-pencil"));
            $edit.on("click", {property: property, row: $row}, (e) => this.showPropertyModal(e));
            $row.append($edit);

            var $delete = $("<td>").append($("<i>").attr("class", "fa fa-trash"));
            $delete.on("click", {property: property, row: $row}, (e) => this.deleteProperty(e));
            $row.append($delete);

            $row.append($("<td>").append($("<i>").attr("class", "fa fa-bars")));

            if (replace) {
                replace.replaceWith($row);
            } else {
                $("#property-table tbody").append($row);
            }
        }

        private displayProperties() : void {
            var $table = $("#property-table tbody").empty();
            var properties = this.project.getProperties();

            for (var i = 0; i < properties.length; i++) {
                this.displayProperty(properties[i]);
            }
        }

        private setPropertyModalOptions() : void {
            var processes = this.graph.getNamedProcesses().reverse();
            var $lists = $("#firstProcess").add($("#secondProcess")).add($("#hmlProcess")).empty();

            for (var i = 0; i < processes.length; i++) {
                var $option = $("<option></option>").append(processes[i]);
                $lists.append($option);
            }

            $("#secondProcess").find("option:nth-child(2)").prop("selected", true);

            $("#ccsTransition").toggle(this.project.getInputMode() === InputMode.CCS);
            $("#tccsTransition").toggle(this.project.getInputMode() === InputMode.TCCS);
        }

        private showPropertyModal(e? : any) : void {
            $("#save-property").off("click");

            if (e) {
                var property = e.data.property;

                if (property instanceof Property.HML) {
                    this.setSelectedPropertyType("hml-formula");
                    $("#hmlProcess").val(property.getProcess());
                    this.formulaEditor.setValue(property.getTopFormula());
                    this.definitionsEditor.setValue(property.getDefinitions());
                } else {
                    this.setSelectedPropertyType("relation");
                    $("#relationType").val(property.getPropertyType());
                    $("#firstProcess").val(property.getFirstProcess());
                    $("#secondProcess").val(property.getSecondProcess());

                    if (this.project.getInputMode() === InputMode.CCS) {
                        $("#ccsTransition [value=" + property.getType() + "]").prop("selected", true);
                    } else {
                        $("#tccsTransition [value=" + property.getType() + "][data-time=" + property.getTime() + "]").prop("selected", true);
                    }
                }

                $("#save-property").on("click", e.data, (e) => this.saveProperty(e));
            } else {
                $("#save-property").on("click", () => this.saveProperty());
            }

            $("#property-modal").modal("show");
        }

        private getSelectedPropertyType() : string {
            return $("input[name=property-type]:checked").val();
        }

        private setSelectedPropertyType(value : string) : void {
            $("input[name=property-type][value=" + value + "]").prop("checked", true).trigger("change");
        }

        private showSelectedPropertyType() : void {
            if (this.getSelectedPropertyType() === "relation") {
                $("#add-hml-formula").fadeOut(200, () => $("#add-relation").fadeIn(200));
            } else {
                $("#add-relation").fadeOut(200, () => $("#add-hml-formula").fadeIn(200));
            }
        }

        private saveProperty(e? : any) : void {
            var propertyName, options;

            if (this.getSelectedPropertyType() === "relation") {
                propertyName = $("#relationType option:selected").val();
                options = {
                    firstProcess: $("#firstProcess option:selected").val(),
                    secondProcess: $("#secondProcess option:selected").val(),
                    type: null,
                    time: null
                };

                if (this.project.getInputMode() === InputMode.CCS) {
                    options["type"] = $("#ccsTransition option:selected").val();
                } else {
                    options["type"] = $("#tccsTransition option:selected").val();
                    options["time"] = $("#tccsTransition option:selected").data("time");
                }
            } else {
                propertyName = "hml";
                options = {
                    process: $("#hmlProcess option:selected").val(),
                    topFormula: this.formulaEditor.getValue(),
                    definitions: this.definitionsEditor.getValue()
                };
            }

            var property = Property.createProperty(propertyName, options);
            this.project.addProperty(property);

            if (e) {
                this.project.deleteProperty(e.data.property);
                this.displayProperty(property, e.data.row);
            } else {
                this.displayProperty(property);
            }
        }

        private deleteProperty(e) : void {
            var callback = () => {
                this.project.deleteProperty(e.data.property);
                e.data.row.fadeOut(200, function() { $(this).remove() });
            }

            Main.showConfirmModal("Delete Property",
                "Are you sure you want to delete this property?",
                "Cancel",
                "Delete",
                null,
                callback);
        }

        private verify(e) : void {
            $("#verify-all").prop("disabled", true);
            $("#verify-stop").prop("disabled", false);
            e.data.property.verify((property) => this.verificationEnded(property));
        }

        private verifyNext() : void {
            if (this.verificationQueue.length > 0) {
                var property = this.verificationQueue.shift();
                this.verify({data: {property: property}});
            }
        }

        private verifyAll() : void {
            this.verificationQueue = [];
            var properties = this.project.getProperties();
            properties.forEach((property) => this.verificationQueue.push(property));
            this.verifyNext();
        }

        private verificationEnded(property : Property.Property) {
            $("#verify-all").prop("disabled", false);
            $("#verify-stop").prop("disabled", true);
            this.displayProperty(property, property.getRow());
            this.verifyNext();
        }
    }
}

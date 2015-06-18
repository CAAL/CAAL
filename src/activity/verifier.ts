module Activity {

    export class Verifier extends Activity {
        private graph : CCS.Graph;
        private timer : number;
        private verificationQueue : Property.Property[];
        private verificationInProgress : boolean;
        private formulaEditor : any;
        private definitionsEditor : any;

        constructor(container: string, button: string) {
            super(container, button);

            this.verificationQueue = [];
            this.verificationInProgress = false;

            $("#add-property").on("click", () => this.showPropertyModal());
            $("#verify-all").on("click", () => this.verifyAll());
            $("input[name=property-type]").on("change", () => this.showSelectedPropertyType());

            this.formulaEditor = ace.edit("hml-formula-editor");
            this.formulaEditor.setTheme("ace/theme/crisp");
            this.formulaEditor.getSession().setMode("ace/mode/hml");
            this.formulaEditor.setOptions({
                enableBasicAutocompletion: true,
                showPrintMargin: false,
                highlightActiveLine: false,
                fontSize: 14,
                fontFamily: "Inconsolata",
                showLineNumbers: false,
                maxLines: 1
            });

            this.definitionsEditor = ace.edit("hml-definitions-editor");
            this.definitionsEditor.setTheme("ace/theme/crisp");
            this.definitionsEditor.getSession().setMode("ace/mode/hml");
            this.definitionsEditor.getSession().setUseWrapMode(true);
            this.definitionsEditor.setOptions({
                enableBasicAutocompletion: true,
                showPrintMargin: false,
                highlightActiveLine: false,
                fontSize: 14,
                fontFamily: "Inconsolata",
                showLineNumbers: false,
                maxLines: Infinity
            });
        }

        public onShow() : void {
            if (this.changed) {
                this.changed = false;
                this.graph = this.project.getGraph();

                if (this.project.getInputMode() === InputMode.CCS) {
                    this.formulaEditor.getSession().setMode("ace/mode/hml");
                    this.definitionsEditor.getSession().setMode("ace/mode/hml");
                } else {
                    this.formulaEditor.getSession().setMode("ace/mode/thml");
                    this.definitionsEditor.getSession().setMode("ace/mode/thml");
                }

                var properties = this.project.getProperties();
                for (var i = 0; i < properties.length; i++) {
                    properties[i].setUnknownStatus();
                    properties[i].isReadyForVerification();
                }

                this.displayProperties();
                this.setPropertyModalOptions();
            }
        }

        private displayProperty(property : Property.Property) : void {
            var $row = $("<tr>");

            if (property.getStatus() === PropertyStatus.invalid) {
                // Add some tooltip with the error to the status icon.
            }
            $row.append($("<td>").append(property.getStatusIcon()));

            var $time = $("<td>").append(property.getElapsedTime());
            property.setTimeCell($time);
            $row.append($time);

            var $description = $("<td>").append(property.getDescription());
            $description.on("dblclick", {property: property}, (e) => this.showPropertyModal(e));
            $row.append($description);

            var $verify = $("<i>").addClass("fa fa-play-circle fa-lg verify-property");
            $verify.on("click", {property: property}, (e) => this.verify(e));
            $row.append($("<td>").append($verify));

            var $edit = $("<i>").addClass("fa fa-pencil fa-lg");
            $edit.on("click", {property: property}, (e) => this.showPropertyModal(e));
            $row.append($("<td>").append($edit));

            var $delete = $("<i>").addClass("fa fa-trash fa-lg");
            $delete.on("click", {property: property}, (e) => this.deleteProperty(e));
            $row.append($("<td>").append($delete));

            var $options = $("<i>").addClass("fa fa-bars fa-lg");
            $row.append($("<td>").append(this.generateContextMenu(property, $options)));

            if (property.getRow()) {
                property.getRow().replaceWith($row);
            } else {
                $("#property-table tbody").append($row);
            }

            property.setRow($row);
        }

        private displayProperties() : void {
            $("#property-table tbody").empty();
            var properties = this.project.getProperties();

            for (var i = 0; i < properties.length; i++) {
                properties[i].setRow(null);
                this.displayProperty(properties[i]);
            }
        }

        private generateContextMenu(property : Property.Property, $element : JQuery) : JQuery {
            var status = property.getStatus();
            var $ul = $("<ul>");

            if (status === PropertyStatus.unknown || status === PropertyStatus.invalid) {
            } else {
                var gameConfiguration = property.getGameConfiguration();
                if (gameConfiguration) {
                    var startGame = () => {
                        if (property instanceof Property.HML) {
                            Main.activityHandler.selectActivity("hmlgame", gameConfiguration);
                        } else {
                            Main.activityHandler.selectActivity("game", gameConfiguration);
                        }
                    }

                    $ul.append($("<li>").append($("<a>").append("Play Game"))
                        .on("click", () => startGame()));
                }

                if (status === PropertyStatus.unsatisfied && property instanceof Property.DistinguishingFormula) {
                    var generateFormula = (properties) => {
                        this.displayProperty(property);

                        if (properties) {
                            this.project.addProperty(properties.firstProperty);
                            this.project.addProperty(properties.secondProperty);
                            this.displayProperty(properties.firstProperty);
                            this.displayProperty(properties.secondProperty);
                        }
                    }

                    $ul.append($("<li>").append($("<a>").append("Distinguishing Formula"))
                        .on("click", () => property.generateDistinguishingFormula(generateFormula)));
                }
            }

            if ($ul.find("li").length > 0) {
                $ul.addClass("dropdown-menu pull-right");
                $element.attr("data-toggle", "dropdown");
                return $("<div>").addClass("relative").append($element).append($ul);
            } else {
                return $element.addClass("text-muted");
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
                    $("#relationType").val(property.getClassName());
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

            this.formulaEditor.focus()
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
                $("#add-relation").fadeOut(200, () => $("#add-hml-formula").fadeIn(200, () => this.formulaEditor.focus()));
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
                propertyName = "HML";
                options = {
                    process: $("#hmlProcess option:selected").val(),
                    topFormula: this.formulaEditor.getValue(),
                    definitions: this.definitionsEditor.getValue()
                };
            }

            var property = new window["Property"][propertyName](options);
            this.project.addProperty(property);

            if (e) {
                this.project.deleteProperty(e.data.property);
                property.setRow(e.data.property.getRow());
            }

            this.displayProperty(property);
        }

        private deleteProperty(e) : void {
            var callback = () => {
                this.project.deleteProperty(e.data.property);
                e.data.property.getRow().fadeOut(200, function() {$(this).remove()});
            }

            Main.showConfirmModal("Delete Property",
                "Are you sure you want to delete this property?",
                "Cancel",
                "Delete",
                null,
                callback);
        }

        private verify(e) : void {
            if (!this.verificationInProgress) {
                this.verificationInProgress = true;
                this.disableVerification();
                e.data.property.verify((property) => this.verificationEnded(property));
            }
        }

        private verifyNext() : void {
            if (this.verificationQueue.length > 0) {
                var property = this.verificationQueue.shift();
                this.verify({data: {property: property}});
            }
        }

        private verifyAll() : void {;
            this.verificationQueue = [];
            var properties = this.project.getProperties();
            properties.forEach((property) => this.verificationQueue.push(property));
            this.verifyNext();
        }

        private verificationEnded(property : Property.Property) {
            this.verificationInProgress = false;
            this.enableVerification();
            this.displayProperty(property);
            this.verifyNext();
        }

        private enableVerification() : void {
            $(".verify-property").removeClass("text-muted");
            $("#verify-all").prop("disabled", false);
            $("#verify-stop").prop("disabled", true);
        }

        private disableVerification() : void {
            $(".verify-property").addClass("text-muted");
            $("#verify-all").prop("disabled", true);
            $("#verify-stop").prop("disabled", false);
        }
    }
}

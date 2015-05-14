/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/util.d.ts" />
/// <reference path="../../lib/ccs.d.ts" />
/// <reference path="../../lib/suppressWarnings.d.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../gui/arbor/arbor.ts" />
/// <reference path="../gui/arbor/renderer.ts" />
/// <reference path="activity.ts" />
/// <reference path="fullscreen.ts" />
/// <reference path="tooltip.ts" />

module Activity {

    export class Explorer extends Activity {
        private changed: boolean;
        private graph : CCS.Graph;
        private succGenerator : CCS.SuccessorGenerator;
        private selectedProcess : CCS.Process;
        private fullscreen : Fullscreen;
        private $canvasContainer : JQuery;
        private $statusContainer : JQuery;
        private $statusTable : JQuery;
        private tooltip : ProcessTooltip;
        private timeout : number;
        private $zoom : JQuery;
        private $depth : JQuery;
        private $freeze : JQuery;
        private $save : JQuery;
        private canvas : HTMLCanvasElement;
        private renderer: Renderer;
        private uiGraph: GUI.ProcessGraphUI;

        constructor(container: string, button: string) {
            super(container, button);

            this.project = Project.getInstance();
            this.fullscreen = new Fullscreen($("#explorer-fullscreen-container")[0], $("#explorer-fullscreen"), () => this.resize(this.$zoom.val()));
            this.$canvasContainer = $("#explorer-canvas");
            this.$statusContainer = $("#explorer-transitions");
            this.$statusTable = this.$statusContainer.find("tbody");
            this.tooltip = new ProcessTooltip(this.$statusTable);
            this.$zoom = $("#explorer-zoom");
            this.$depth = $("#explorer-depth");
            this.$freeze = $("#explorer-freeze");
            this.$save = $("#explorer-save");
            this.canvas = <HTMLCanvasElement> $("#explorer-canvas").find("canvas")[0];
            this.renderer = new Renderer(this.canvas);
            this.uiGraph = new GUI.ArborGraph(this.renderer);

            this.$statusTable
                .on("click", "tr", this.onTransitionTableRowClick.bind(this))
                .on("mouseenter", "tr", this.onTransitionTableRowHover.bind(this, true))
                .on("mouseleave", "tr", this.onTransitionTableRowHover.bind(this, false));

            // Use onchange instead of oninput for IE.
            if (navigator.userAgent.indexOf("MSIE ") > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
                this.$zoom.on("change", () => this.resize(this.$zoom.val()));
            } else {
                this.$zoom.on("input", () => this.resize(this.$zoom.val()));
            }

            this.$depth.on("change", () => this.setDepth(this.$depth.val()));
            this.$freeze.on("click", () => this.toggleFreeze(!this.$freeze.data("frozen")));
            this.$save.on("click", () => this.save());

            // Prevent options menu from closing when pressing form elements.
            $(document).on('click', '.yamm .dropdown-menu', e => e.stopPropagation());

            // Manually remove focus from zoom, depth and freeze when the canvas is clicked.
            this.$canvasContainer.on("click", () => {
                this.$zoom.blur();
                this.$depth.blur();
                this.$freeze.blur();
            });

            $(document).on("ccs-changed", () => this.changed = true);

            $("#explorer-process-list, input[name=option-collapse], input[name=option-successor], #option-simplify").on("change", () => this.draw());
        }

        public onShow(configuration? : any) : void {
            $(window).on("resize", () => this.resize(this.$zoom.val()));

            this.fullscreen.onShow();

            if (this.changed) {
                this.changed = false;
                this.graph = this.project.getGraph();
                this.tooltip.setGraph(this.graph);
                this.displayOptions();
                this.draw();
            }

            this.uiGraph.bindCanvasEvents();

            this.uiGraph.setOnSelectListener((processId) => this.expand(this.graph.processById(processId)));

            this.uiGraph.setHoverOnListener((processId) => {
                this.timeout = setTimeout(() => {
                    var tooltipAnchor = $("#explorer-canvas-tooltip");
                    var position = this.uiGraph.getPosition(processId);

                    tooltipAnchor.css("left", position.x - this.$canvasContainer.scrollLeft());
                    tooltipAnchor.css("top", position.y - this.$canvasContainer.scrollTop() - 10);

                    tooltipAnchor.tooltip({title: this.tooltip.ccsNotationForProcessId(processId)});
                    tooltipAnchor.tooltip("show");
                }, 1000)
            });

            this.uiGraph.setHoverOutListener(() => {
                clearTimeout(this.timeout);
                $("#explorer-canvas-tooltip").tooltip("destroy");
            });
        }

        public onHide() : void {
            $(window).off("resize");

            this.fullscreen.onHide();

            this.uiGraph.unbindCanvasEvents();
            this.uiGraph.clearOnSelectListener();
            this.uiGraph.clearHoverOnListener();
            this.uiGraph.clearHoverOutListener();
        }

        private displayOptions() : void {
            var processes = this.graph.getNamedProcesses().reverse();
            var list = $("#explorer-process-list").empty();

            for (var i = 0; i < processes.length; i++) {
                list.append($("<option></option>").append(processes[i]));
            }

            if (this.project.getInputMode() === InputMode.CCS) {
                $("input[name=option-successor][value=weak]").parent().parent().show();
                $("input[name=option-collapse]").parent().parent().show().next(".divider").show();
            } else {
                $("input[name=option-successor][value=weak]").parent().parent().hide();
                $("input[name=option-collapse]").parent().parent().hide().next(".divider").hide();
            }
        }

        private getOptions() : any {
            return {
                process: $("#explorer-process-list :selected").text(),
                successor: $("input[name=option-successor]:checked").val(),
                collapse: $("input[name=option-collapse]:checked").val(),
                simplify: $("#option-simplify").prop("checked"),
                inputMode: InputMode[this.project.getInputMode()]
            };
        }

        private draw() : void {
            this.uiGraph.clearAll();
            this.$zoom.val("1");
            this.resize(1);

            var options = this.getOptions();
            this.succGenerator = CCS.getSuccGenerator(this.graph, {inputMode: options.inputMode, succGen: options.successor, reduce: options.simplify});
            var process = this.succGenerator.getProcessByName(options.process);

            if (options.collapse !== "none") {
                //Always attack with strong succ generator (improves performance)
                var attackSuccGen = CCS.getSuccGenerator(this.graph, {succGen: "strong", reduce: options.simplify});
                var defendSuccGen = CCS.getSuccGenerator(this.graph, {succGen: options.collapse, reduce: options.simplify});
                var collapse = Equivalence.getBisimulationCollapse(attackSuccGen, defendSuccGen, process.id, process.id);
                var collapseSuccGen = new Traverse.CollapsingSuccessorGenerator(this.succGenerator, collapse);
                //Wrap the transition relation used in the collapse.
                this.succGenerator = collapseSuccGen;
                //Process have been replaced by collapse.
                process = collapseSuccGen.getCollapseForProcess(process.id);
            }

            this.expand(process);
        }

        private save() : void {
            this.$save.attr("href", this.canvas.toDataURL("image/png"));
            this.$save.attr("download", this.getOptions().process + ".png");
        }

        private setDepth(depth : number) : void {
            if (!/^[0-9]+$/.test(depth.toString())) {
                this.$depth.val(this.$depth.data("previous-depth"));
            } else {
                this.$depth.data("previous-depth", depth);
                this.draw();
            }
        }

        private toggleFreeze(freeze : boolean) : void {
            var icon = this.$freeze.find("i");

            if (freeze) {
                this.uiGraph.freeze();
                icon.replaceWith("<i class='fa fa-lock fa-lg'></i>");
            } else {
                this.uiGraph.unfreeze();
                icon.replaceWith("<i class='fa fa-unlock-alt fa-lg'></i>");
            }

            this.$freeze.data("frozen", freeze);
        }

        private showProcess(process : CCS.Process) : void {
            if (!process || this.uiGraph.getProcessDataObject(process.id)) return;
            this.uiGraph.showProcess(process.id, {label: this.labelFor(process), status: "unexpanded"});
        }

        private labelFor(process : CCS.Process) : string {
            return this.graph.getLabel(process);
        }

        private expand(process : CCS.Process) : void {
            this.selectedProcess = process;

            var allTransitions = CCS.getNSuccessors(this.succGenerator, process, this.$depth.val());
            var data = this.uiGraph.getProcessDataObject(process.id.toString());

            if (!data || data.status === "unexpanded") {
                this.toggleFreeze(false);

                for (var fromId in allTransitions) {
                    var fromProcess = this.graph.processById(fromId);
                    this.showProcess(fromProcess);
                    this.showProcessAsExplored(fromProcess);
                    var groupedByTargetProcessId = ArrayUtil.groupBy(allTransitions[fromId].toArray(), t => t.targetProcess.id);

                    Object.keys(groupedByTargetProcessId).forEach(strProcId => {
                        var group = groupedByTargetProcessId[strProcId];
                        var data = group.map(t => {
                            if (t instanceof CCS.ActionTransition) {
                                return { label: t.action.toString() };
                            } else if (t instanceof TCCS.DelayTransition) {
                                return { label: t.delay.toString() };
                            }
                        });
                        this.showProcess(this.graph.processById(strProcId));
                        this.uiGraph.showTransitions(fromProcess.id, strProcId, data);
                    });
                }
            }

            this.updateStatusTable(allTransitions[process.id]);
            this.uiGraph.setSelected(process.id.toString());
            this.centerProcess(process);
        }

        private updateStatusTable(transitions : CCS.Transition[]) : void {
            this.$statusTable.empty();

            transitions.forEach(t => {
                var row = $("<tr>");
                var $actionTd = $("<td>");
                
                if (t instanceof CCS.ActionTransition) {
                    if (this.succGenerator instanceof Traverse.WeakSuccessorGenerator) {
                        var weakSuccGen = <Traverse.WeakSuccessorGenerator>this.succGenerator;
                        var $action = Tooltip.wrap(t.action.toString());
                        Tooltip.setTooltip($action, Tooltip.strongSequence(weakSuccGen, this.selectedProcess, t.action, t.targetProcess));
                        $actionTd.append($action);
                    } else {
                        $actionTd.append(t.action.toString());
                    }
                } else if (t instanceof TCCS.DelayTransition) {
                    $actionTd.append(t.delay.toString());
                }

                row.append($("<td>").append(this.sourceText(this.selectedProcess)));
                row.append($actionTd);
                row.append($("<td>").append(Tooltip.wrapProcess(this.labelFor(t.targetProcess))));

                row.attr("data-target-id", t.targetProcess.id);

                this.$statusTable.append(row);
            });
        }

        private sourceText(process : ccs.Process) : any {
            // Collapsed process presents us with another indirection meaning
            // under normal cirsumstances it would not be possible to hover
            // over the constituent processes and get their description.
            if (process instanceof ccs.CollapsedProcess) {
                var wrappedSubProcs = process.subProcesses.map(p => Tooltip.wrapProcess(this.labelFor(p)));
                return [].concat(
                    [Tooltip.wrapProcess(this.labelFor(process))],
                    [" = {"],
                    ArrayUtil.intersperse<any>(wrappedSubProcs, ", "), 
                    ["}"]
                );
            } else {
                return Tooltip.wrapProcess(this.labelFor(process));
            }
        }

        private onTransitionTableRowHover(entering : boolean, event) : void {
            if (entering) {
                this.uiGraph.setHover($(event.currentTarget).data("targetId"));
            } else {
                this.uiGraph.clearHover();
            }
        }

        private onTransitionTableRowClick(e : Event) : void {
            var targetId = $(e.currentTarget).data("targetId");

            if (targetId !== "undefined") {
                this.expand(this.graph.processById(targetId));
                this.uiGraph.clearHover();
            }
        }

        private showProcessAsExplored(process : CCS.Process) : void {
            this.uiGraph.getProcessDataObject(process.id).status = "expanded";
        }

        private centerProcess(process : CCS.Process) : void {
            var position = this.uiGraph.getPosition(process.id.toString());

            if (position && this.$zoom.val() > 1) {
                this.$canvasContainer.scrollLeft(position.x - (this.$canvasContainer.width() / 2));
                this.$canvasContainer.scrollTop(position.y - (this.$canvasContainer.height() / 2));
            }
        }

        private resize(zoom : number) : void {
            var offsetTop = this.$canvasContainer.offset().top;
            var offsetBottom = this.$statusContainer.height() + 43; // Margin bot + border.

            var availableHeight = window.innerHeight - offsetTop - offsetBottom;

            var width = this.$canvasContainer.width();
            var height = Math.max(265, availableHeight); // Minimum height 265px.

            this.$canvasContainer.height(height);

            this.canvas.width = width * zoom;
            this.canvas.height = height * zoom;

            this.renderer.resize(this.canvas.width, this.canvas.height);

            if (zoom > 1) {
                this.$canvasContainer.parent().find(".input-group").css("right", 30);
                this.$canvasContainer.css("overflow", "auto");
                this.centerProcess(this.selectedProcess);
            } else {
                this.$canvasContainer.parent().find(".input-group").css("right", 10);
                this.$canvasContainer.css("overflow", "hidden");
            }
        }
    }
}

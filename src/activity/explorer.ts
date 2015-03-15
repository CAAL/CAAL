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
        private project: Project;
        private changed: boolean;
        private graph : CCS.Graph;
        private succGenerator : CCS.SuccessorGenerator;
        private selectedProcess : CCS.Process;
        private fullscreen : Fullscreen;
        private tooltip : TooltipNotation;
        private htmlNotationVisitor : Traverse.TooltipHtmlCCSNotationVisitor;
        private $transitionsTable : JQuery
        private $zoom : JQuery;
        private $freeze : JQuery;
        private $save : JQuery;
        private canvas : HTMLCanvasElement;
        private renderer: Renderer;
        private uiGraph: GUI.ProcessGraphUI;
        private expandDepth : number;

        constructor(container: string, button: string) {
            super(container, button);

            this.project = Project.getInstance();
            this.fullscreen = new Fullscreen(this.$container.find("#fullscreen-container")[0], this.$container.find("#explorer-fullscreen-btn"), () => this.resize(this.$zoom.val()));
            this.$transitionsTable = $("#explorer-transitions").find("tbody");
            this.$zoom = $("#explorer-zoom");
            this.$freeze = $("#explorer-freeze");
            this.$save = $("#explorer-save");
            this.canvas = <HTMLCanvasElement> $("#explorer-canvas").find("canvas")[0];
            this.renderer = new Renderer(this.canvas);
            this.uiGraph = new GUI.ArborGraph(this.renderer);

            this.tooltip = new TooltipNotation(this.$transitionsTable);
            this.htmlNotationVisitor = new Traverse.TooltipHtmlCCSNotationVisitor();

            this.$transitionsTable
                .on("click", "tr", this.onTransitionTableRowClick.bind(this))
                .on("mouseenter", "tr", this.onTransitionTableRowHover.bind(this, true))
                .on("mouseleave", "tr", this.onTransitionTableRowHover.bind(this, false));

            // Use onchange instead of oninput for IE.
            if (navigator.userAgent.indexOf("MSIE ") > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
                this.$zoom.on("change", () => this.resize(this.$zoom.val()));
            } else {
                this.$zoom.on("input", () => this.resize(this.$zoom.val()));
            }

            this.$freeze.on("click", (e) => this.toggleFreeze(!this.$freeze.data("frozen")));

            // Prevent options menu from closing when pressing form elements.
            $(document).on('click', '.yamm .dropdown-menu', e => e.stopPropagation());

            $(document).on("ccs-changed", () => this.changed = true);

            $("#explorer-process-list, input[name=option-collapse], input[name=option-successor], #option-simplify").on("change", () => this.draw());
            $("#option-depth").on("change", () => {
                this.expandDepth = $("#option-depth").val();
                this.draw();
            });
        }

        protected checkPreconditions() : boolean {
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

        public onShow(configuration? : any) : void {
            $(window).on("resize", () => this.resize(this.$zoom.val()));

            this.fullscreen.onShow();

            if (this.changed) {
                this.changed = false;
                this.graph = this.project.getGraph();
                this.displayOptions();
                this.draw();
            }
            
            this.tooltip.setGraph(this.graph);

            this.uiGraph.bindCanvasEvents();
            this.uiGraph.setOnSelectListener((processId) => this.expand(this.graph.processById(processId), this.expandDepth));
            this.uiGraph.setHoverOnListener((processId) => this.uiGraph.setHover(processId));
            this.uiGraph.setHoverOutListener(() => this.uiGraph.clearHover());
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
            var list = $("#explorer-process-list > select").empty();

            for (var i = 0; i < processes.length; i++) {
                list.append($("<option></option>").append(processes[i]));
            }
        }

        private getOptions() : any {
            return {
                process: $("#explorer-process-list :selected").text(),
                depth: $("#option-depth").val(),
                successor: $("input[name=option-successor]:checked").val(),
                collapse: $("input[name=option-collapse]:checked").val(),
                simplify: $("#option-simplify").prop("checked")
            };
        }

        private draw() : void {
            this.$zoom.val("1");
            this.resize(1);

            this.clear();

            var options = this.getOptions();

            this.succGenerator = CCS.getSuccGenerator(this.graph, {succGen: options.successor, reduce: options.simplify});

            var process = this.succGenerator.getProcessByName(options.process);
            this.selectedProcess = process;

            if (options.collapse !== "none") {
                var otherSuccGenerator = CCS.getSuccGenerator(this.graph, {succGen: options.collapse, reduce: options.simplify});
                var collapse = Equivalence.getBisimulationCollapse(this.succGenerator, otherSuccGenerator, process.id, process.id);
                this.succGenerator = new Traverse.CollapsingSuccessorGenerator(this.succGenerator, collapse);
            }

            this.htmlNotationVisitor.clearCache();
            this.expand(process, options.depth);
        }

        private saveCanvas() : void {
            this.$save.attr("href", this.canvas.toDataURL("image/png"));
            this.$save.attr("download", this.getOptions().process + ".png");
        }

        private clear() : void {
            this.uiGraph.clearAll();
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
            return (process instanceof CCS.NamedProcess) ? (<CCS.NamedProcess>process).name : "" + process.id;
        }

        private expand(process : CCS.Process, depth) : void {
            var allTransitions = this.expandBFS(process, depth);
            var data = this.uiGraph.getProcessDataObject(process.id.toString());

            if (!data || data.status === "unexpanded") {
                this.toggleFreeze(false);

                for (var fromId in allTransitions) {
                    var fromProcess = this.graph.processById(fromId);
                    this.showProcess(fromProcess);
                    this.showProcessAsExplored(fromProcess);
                    var groupedByTargetProcessId = ArrayUtil.groupBy(allTransitions[fromId].toArray(), t => t.targetProcess.id);

                    Object.keys(groupedByTargetProcessId).forEach(strProcId => {
                        var group = groupedByTargetProcessId[strProcId],
                            datas = group.map(t => { return {label: t.action.toString()}; }),
                            numId = parseInt(strProcId, 10);
                        this.showProcess(this.graph.processById(numId));
                        this.uiGraph.showTransitions(fromProcess.id, numId, datas);
                    });
                }
            }

            this.updateStatusAreaTransitions(allTransitions[process.id]);
            this.uiGraph.setSelected(process.id.toString());
        }

        private expandBFS(process : CCS.Process, maxDepth : number) : any {
            var result = {}, queue = [[1, process]], depth, qIdx, fromProcess, transitions;

            for (qIdx = 0; qIdx < queue.length; qIdx++) {
                depth = queue[qIdx][0];
                fromProcess = queue[qIdx][1];
                result[fromProcess.id] = transitions = this.succGenerator.getSuccessors(fromProcess.id);

                transitions.forEach(t => {
                    if (!result[t.targetProcess.id] && depth < maxDepth) {
                        queue.push([depth + 1, t.targetProcess]);
                    }
                });
            }

            return result;
        }

        private getDefinitionForProcess(process, visitor) : string {
            if (process instanceof CCS.NamedProcess) {
                return visitor.visit((<CCS.NamedProcess>process).subProcess);
            }

            return visitor.visit(process);
        }

        private updateStatusAreaTransitions(transitions : CCS.Transition[]) : void {
            this.$transitionsTable.empty();

            transitions.forEach(t => {
                var row = $("<tr></tr>");
                var action = $("<td></td>").append(t.action.toString());
                var name = $("<td></td>").append(this.labelFor(t.targetProcess));
                var target = $("<td></td>").append(this.getDefinitionForProcess(t.targetProcess, this.htmlNotationVisitor));
                row.append(action, name, target);
                row.attr("data-target-id", t.targetProcess.id);
                this.$transitionsTable.append(row);
            });
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

            if (targetId) {
                var process = this.graph.processById(targetId);
                this.selectedProcess = process;
                this.expand(process, this.expandDepth);
                this.centerProcess(process);
                this.uiGraph.clearHover();
            }
        }

        private showProcessAsExplored(process : CCS.Process) : void {
            this.uiGraph.getProcessDataObject(process.id).status = "expanded";
        }

        private centerProcess(process : CCS.Process) : void {
            var $container = $("#explorer-canvas");
            var position = this.uiGraph.getPosition(process.id.toString());
            $container.scrollLeft(position.x - ($container.width() / 2));
            $container.scrollTop(position.y - ($container.height() / 2));
        }

        private resize(zoom : number) : void {
            var $container = $("#explorer-canvas");

            var offsetTop = $container.offset().top;
            var offsetBottom = $("#explorer-transitions").height() + 43; // Margin bot + border.

            var availableHeight = window.innerHeight - offsetTop - offsetBottom;

            var width = $container.width();
            var height = Math.max(265, availableHeight);

            $container.height(height);

            this.canvas.width = width * zoom;
            this.canvas.height = height * zoom; // Minimum height 265px.

            this.renderer.resize(this.canvas.width, this.canvas.height);

            if (zoom > 1) {
                $("#explorer-main .input-group").css("right", 30);
                $container.css("overflow", "auto");
                this.centerProcess(this.selectedProcess);
            } else {
                $("#explorer-main .input-group").css("right", 10);
                $container.css("overflow", "hidden");
            }
        }
    }
}

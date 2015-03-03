/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="activity.ts" />
/// <reference path="fullscreen.ts" />
/// <reference path="../../lib/ccs.d.ts" />
/// <reference path="../gui/arbor/arbor.ts" />
/// <reference path="../gui/arbor/renderer.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../../lib/suppressWarnings.d.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="tooltip.ts" />

module Activity {

    import ccs = CCS;
    import ProcessGraphUI = GUI.ProcessGraphUI;
    import ArborGraph = GUI.ArborGraph;
    import TooltipHtmlCCSNotationVisitor = Traverse.TooltipHtmlCCSNotationVisitor;
    import CCSNotationVisitor = Traverse.CCSNotationVisitor;

    function groupBy<T>(arr : T[], keyFn : (T) => any) : any {
        var groupings = Object.create(null),
            key, elem, group;
        for (var i = 0; i < arr.length; i++) {
            elem = arr[i];
            key = keyFn(elem);
            group = groupings[key];
            if (!group) group = groupings[key] = [];
            group.push(elem);
        }
        return groupings;
    }

    export class Explorer extends Activity {
        private project: Project;
        private changed: boolean;
        private canvas;
        private renderer: Renderer;
        private uiGraph: ProcessGraphUI;
        private bindedFns : any = {};
        private graph : ccs.Graph;
        private namedProcesses: string[];
        private succGenerator : ccs.SuccessorGenerator;
        private initialProcessName : string;
        private htmlNotationVisitor : TooltipHtmlCCSNotationVisitor;
        private ccsNotationVisitor : CCSNotationVisitor;
        private expandDepth : number = 1;
        private statusTableContainer;
        private freezeBtn;
        private saveBtn;
        private sourceDefinition;
        private fullscreen : Fullscreen;
        private tooltip : TooltipNotation;

        constructor(container: string, button: string) {
            super(container, button);

            this.project = Project.getInstance();

            this.htmlNotationVisitor = new TooltipHtmlCCSNotationVisitor();
            this.ccsNotationVisitor = new CCSNotationVisitor();

            this.canvas = this.$container.find("#arbor-canvas")[0];
            this.renderer = new Renderer(this.canvas);
            this.uiGraph = new ArborGraph(this.renderer);

            this.statusTableContainer = this.$container.find("#status-table-container")[0];
            this.freezeBtn = this.$container.find("#explorer-freeze-btn")[0];
            this.saveBtn = this.$container.find("#explorer-save-btn")[0];
            this.sourceDefinition = this.$container.find("#explorer-source-definition")[0];
            
            this.fullscreen = new Fullscreen(this.$container.find("#fullscreen-container")[0], this.$container.find("#explorer-fullscreen-btn"), () => this.resize());
            
            $(this.freezeBtn).on("click", () => this.toggleFreeze());
            $(this.saveBtn).on("click", () => this.saveCanvas());

            $(this.statusTableContainer).find("tbody")
                .on("click", "tr", this.onTransitionTableRowClick.bind(this))
                .on("mouseenter", "tr", this.onTransitionTableRowHover.bind(this, true))
                .on("mouseleave", "tr", this.onTransitionTableRowHover.bind(this, false));

            this.tooltip = new TooltipNotation($(this.statusTableContainer));
            
            // Prevent options menu from closing when pressing form elements.
            $(document).on('click', '.yamm .dropdown-menu', e => e.stopPropagation());

            $(document).on("ccs-changed", () => this.changed = true);

            $("#explorer-process-list, input[name=option-collapse], input[name=option-successor], #option-simplify").on("change", () => this.draw());
            $("#option-depth").on("change", () => {
                this.expandDepth = $("#option-depth").val();
                this.draw()
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
            $(window).on("resize", () => this.resize());
            this.resize();
            
            this.fullscreen.onShow();
            
            if (this.changed) {
                this.changed = false;

                this.graph = this.project.getGraph();

                this.namedProcesses = this.graph.getNamedProcesses().reverse();
                var list = $("#explorer-process-list > select").empty();

                for (var i = 0; i < this.namedProcesses.length; i++) {
                    list.append($("<option></option>").append(this.namedProcesses[i]));
                }

                this.draw();
            }
            
            this.tooltip.setGraph(this.graph);

            this.uiGraph.bindCanvasEvents();

            this.uiGraph.setOnSelectListener((processId) => {
                this.expand(this.graph.processById(processId), this.expandDepth);
            });

            this.uiGraph.setHoverOnListener((processId) => {
                this.uiGraph.setHover(processId);
            });

            this.uiGraph.setHoverOutListener(() => {
                this.uiGraph.clearHover();
            });

            this.uiGraph.unfreeze();
        }

        public onHide(): void {
            $(window).off("resize");

            this.fullscreen.onHide();

            this.uiGraph.unbindCanvasEvents();
            this.uiGraph.clearOnSelectListener();
            this.uiGraph.clearHoverOnListener();
            this.uiGraph.clearHoverOutListener();
            this.uiGraph.freeze(); // freeze the physics, when leaving the tab
        }

        private getOptions(): any {
            return {
                process: $("#explorer-process-list :selected").text(),
                depth: $("#option-depth").val(),
                successor: $("input[name=option-successor]:checked").val(),
                collapse: $("input[name=option-collapse]:checked").val(),
                simplify: $("#option-simplify").prop("checked")
            };
        }

        public draw(): void {
            this.clear();
            var options = this.getOptions();
            this.succGenerator = CCS.getSuccGenerator(this.graph, {succGen: options.successor, reduce: options.simplify});
            this.initialProcessName = options.process;
            var initialProcess = this.succGenerator.getProcessByName(this.initialProcessName);
            if (options.collapse != "none") {
                var otherSuccGenerator = CCS.getSuccGenerator(this.graph, {succGen: options.collapse, reduce: options.simplify});
                var collapse = DependencyGraph.getBisimulationCollapse(this.succGenerator, otherSuccGenerator, initialProcess.id, initialProcess.id);
                this.succGenerator = new Traverse.CollapsingSuccessorGenerator(this.succGenerator, collapse);
            }
            this.htmlNotationVisitor.clearCache();
            this.ccsNotationVisitor.clearCache();
            this.expand(this.succGenerator.getProcessByName(this.initialProcessName), options.depth);
        }

        private saveCanvas() {
            $(this.saveBtn).attr("href", this.canvas.toDataURL("image/png"));
            $(this.saveBtn).attr("download", this.initialProcessName + ".png");
        }

        private clear() : void {
            this.uiGraph.clearAll();
        }

        private toggleFreeze() : void {
            var $freezeBtn = $(this.freezeBtn),
                isFreezing = $freezeBtn.text() === "Unfreeze",
                newValueText = isFreezing ? "Freeze" : "Unfreeze",
                doFreeze = !isFreezing;
            $freezeBtn.text(newValueText);
            doFreeze ? this.uiGraph.freeze() : this.uiGraph.unfreeze();
        }

        private showProcess(process : ccs.Process) : void {
            var data;
            if (!process) throw {type: "ArgumentError", name: "Bad argument 'process'"};
            if (this.uiGraph.getProcessDataObject(process.id)) return;
            data = {label: this.labelFor(process), status: "unexpanded"};
            this.uiGraph.showProcess(process.id, data);
        }

        private labelFor(process : ccs.Process) : string {
            return (process instanceof ccs.NamedProcess) ? (<ccs.NamedProcess>process).name : "" + process.id;
        }

        private expand(process : ccs.Process, depth) : void {
            if (!process) throw {type: "ArgumentError", name: "Bad argument 'process'"};

            var allTransitions = this.expandBFS(process, depth);
            
            var isExpanded = false;
            if(this.uiGraph.getProcessDataObject(process.id)){
                isExpanded = this.uiGraph.getProcessDataObject(process.id).status == 'expanded' ? true : false;
            }

            this.updateStatusAreaTransitions(process, allTransitions[process.id]);

            for (var fromId in allTransitions) {
                var fromProcess = this.graph.processById(fromId);
                this.showProcess(fromProcess);
                this.showProcessAsExplored(fromProcess);
                var groupedByTargetProcessId = groupBy(allTransitions[fromId].toArray(), t => t.targetProcess.id);

                Object.keys(groupedByTargetProcessId).forEach(strProcId => {
                    var group = groupedByTargetProcessId[strProcId],
                        datas = group.map(t => { return {label: t.action.toString()}; }),
                        numId = parseInt(strProcId, 10);
                    this.showProcess(this.graph.processById(numId));
                    this.uiGraph.showTransitions(fromProcess.id, numId, datas);
                });
            }

            //Reset freeze button
            if (!isExpanded) {
                $(this.freezeBtn).text("Freeze");
            }
            this.uiGraph.setSelected(process.id.toString());
        }

        private expandBFS(process : ccs.Process, maxDepth) {
            var result = {},
                queue = [[1, process]], //non-emptying array as queue.
                depth, qIdx, fromProcess, transitions;
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
            if (process instanceof ccs.NamedProcess) {
                return visitor.visit((<ccs.NamedProcess>process).subProcess);
            }
            return visitor.visit(process);
        }

        private updateStatusAreaTransitions(fromProcess, transitions : ccs.Transition[]) {
            var body = $(this.statusTableContainer).find("tbody");
            var $sourceDefinition = $(this.sourceDefinition);
            body.empty();

            $sourceDefinition.html(this.labelFor(fromProcess) + " = " + this.getDefinitionForProcess(fromProcess, this.htmlNotationVisitor));
            transitions.forEach(t => {
                var row = $("<tr></tr>");
                var action = $("<td></td>").append(t.action.toString());
                var name = $("<td></td>").append(this.labelFor(t.targetProcess));
                var target = $("<td></td>").append(this.getDefinitionForProcess(t.targetProcess, this.htmlNotationVisitor));
                row.append(action, name, target);
                row.attr("data-target-id", t.targetProcess.id);
                body.append(row);
            });          
        }

        private onTransitionTableRowHover(entering : boolean, event) {
            if (entering) {
                var targetId = $(event.currentTarget).data("targetId");
                this.uiGraph.setHover(targetId);
                $(event.currentTarget).css("background", "rgba(0, 0, 0, 0.07)");
            } else {
                this.uiGraph.clearHover();
                $(event.currentTarget).css("background", "");
            }
        }

        private onTransitionTableRowClick(event) {
            var targetId = $(event.currentTarget).data("targetId");
            if (targetId != undefined) {
                this.expand(this.graph.processById(targetId), this.expandDepth);
                this.uiGraph.clearHover();
            }
        }

        private showProcessAsExplored(process : ccs.Process) : void {
            this.uiGraph.getProcessDataObject(process.id).status = "expanded";
        }

        private resize(): void {
            var width = this.canvas.parentNode.clientWidth;
            var height;
            if (!this.fullscreen.isFullscreen()) {
                var offsetTop = $(this.canvas).offset().top;
                var offsetBottom = $(this.statusTableContainer).height() + 20; // Parent container margin = 20.
                height = Math.max(275, window.innerHeight - offsetTop - offsetBottom);
            } else {
                height = this.canvas.parentNode.clientHeight;
            }
            this.canvas.width = width;
            this.canvas.height = height;
            this.renderer.resize(width, height);
        }
    }
}

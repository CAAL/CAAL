/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="activity.ts" />
/// <reference path="../../lib/ccs.d.ts" />
/// <reference path="../gui/arbor/arbor.ts" />
/// <reference path="../gui/arbor/renderer.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../../lib/suppressWarnings.d.ts" />
/// <reference path="../gui/project.ts" />

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
        private fullScreenContainer;
        private statusTableContainer;
        private freezeBtn;
        private saveBtn;
        private fullscreenBtn;
        private sourceDefinition;

        constructor(container: string, button: string) {
            super(container, button);

            this.project = Project.getInstance();

            this.htmlNotationVisitor = new TooltipHtmlCCSNotationVisitor();
            this.ccsNotationVisitor = new CCSNotationVisitor();

            this.canvas = this.$container.find("#arbor-canvas")[0];
            this.renderer = new Renderer(this.canvas);
            this.uiGraph = new ArborGraph(this.renderer);

            this.fullScreenContainer = this.$container.find("#fullscreen-container")[0];
            this.statusTableContainer = this.$container.find("#status-table-container")[0];
            this.freezeBtn = this.$container.find("#explorer-freeze-btn")[0];
            this.saveBtn = this.$container.find("#explorer-save-btn")[0];
            this.fullscreenBtn = this.$container.find("#explorer-fullscreen-btn")[0];
            this.sourceDefinition = this.$container.find("#explorer-source-definition")[0];

            $(this.freezeBtn).on("click", () => this.toggleFreeze());
            $(this.saveBtn).on("click", () => this.saveCanvas());
            $(this.fullscreenBtn).on("click", this.toggleFullscreen.bind(this));

            $(document).on("fullscreenchange", () => this.fullscreenChanged());
            $(document).on("webkitfullscreenchange", () => this.fullscreenChanged());
            $(document).on("mozfullscreenchange", () => this.fullscreenChanged());
            $(document).on("MSFullscreenChange", () => this.fullscreenChanged());
            
            $(document).on("fullscreenerror", () => this.fullscreenError());
            $(document).on("webkitfullscreenerror", () => this.fullscreenError());
            $(document).on("mozfullscreenerror", () => this.fullscreenError());
            $(document).on("MSFullscreenError", () => this.fullscreenError());

            $(this.statusTableContainer).find("tbody")
                .on("click", "tr", this.onTransitionTableRowClick.bind(this))
                .on("mouseenter", "tr", this.onTransitionTableRowHover.bind(this, true))
                .on("mouseleave", "tr", this.onTransitionTableRowHover.bind(this, false));

            var getCCSNotation = this.ccsNotationForProcessId.bind(this);
            $(this.statusTableContainer).tooltip({
                title: function() {
                    return getCCSNotation($(this).text());
                },
                selector: "span.ccs-tooltip-constant"
            });

            // Prevent options menu from closing when pressing form elements.
            $(document).on('click', '.yamm .dropdown-menu', e => e.stopPropagation());

            $("#explorer-process-list, input[name=option-collapse], #option-simplify").on("change", () => this.draw());
            $("#option-depth").on("change", () => {
                this.expandDepth = $("#option-depth").val();
                this.draw()
            });
        }

        protected checkPreconditions(): boolean {
            var temp = Main.getGraph();
            if (!temp) {
                this.showExplainDialog("Syntax Error", "Your program contains syntax errors.");
                return false;
            } 
            else if (temp.getNamedProcesses().length === 0) {
                this.showExplainDialog("No Named Processes", "There must be at least one named process in the program to explore.");
                return false;
            }

            return true;
        }

        public onShow(configuration?: any): void {
            $(window).on("resize", () => this.resize());
            this.resize();

            if (this.project.getChanged()){
                this.graph = Main.getGraph();
            }

            this.uiGraph.setOnSelectListener((processId) => {
                this.expand(this.graph.processById(processId), this.expandDepth);
            });

            this.uiGraph.setHoverOnListener((processId) => {
                this.uiGraph.setHover(processId);
            });

            this.uiGraph.setHoverOutListener(() => {
                this.uiGraph.clearHover();
            });

            if (this.project.getChanged()) {
                this.namedProcesses = this.graph.getNamedProcesses().reverse();
                var list = $("#explorer-process-list > select").empty();

                for (var i = 0; i < this.namedProcesses.length; i++) {
                    list.append($("<option></option>").append(this.namedProcesses[i]));
                }

                this.draw();
            }
        }

        public onHide(): void {
            $(window).off("resize");

            this.uiGraph.clearOnSelectListener();
            this.uiGraph.clearHoverOnListener();
            this.uiGraph.clearHoverOutListener();
        }

        private getOptions(): any {
            var process = $("#explorer-process-list :selected").text();
            var depth = $("#option-depth").val();
            var collapse = $('input[name=option-collapse]:checked').val();
            var simplify = $("#option-simplify").prop("checked");

            return {process: process, depth: depth, collapse: collapse, simplify: simplify};
        }

        public draw(): void {
            this.clear();
            var options = this.getOptions();
            this.succGenerator = CCS.getSuccGenerator(this.graph, {succGen: "strong", reduce: options.simplify});
            this.initialProcessName = options.process;
            var initialProcess = this.graph.processByName(this.initialProcessName);
            if (options.collapse != "none") {
                var otherSuccGenerator = CCS.getSuccGenerator(this.graph, {succGen: options.collapse, reduce: options.simplify});
                var collapse = DependencyGraph.getBisimulationCollapse(this.succGenerator, otherSuccGenerator, initialProcess.id, initialProcess.id);
                this.succGenerator = new Traverse.CollapsingSuccessorGenerator(this.succGenerator, collapse);
            }
            this.htmlNotationVisitor.clearCache();
            this.ccsNotationVisitor.clearCache();
            this.expand(this.graph.processByName(this.initialProcessName), options.depth);
        }

        private ccsNotationForProcessId(id: string): string {
            var process = this.graph.processByName(id) || this.graph.processById(id),
                text = "Unknown definition";
            if (process) {
                text = this.getDefinitionForProcess(process, this.ccsNotationVisitor);
            }
            return text;
        }

        private isFullscreen(): boolean {
            return !!document.fullscreenElement ||
                   !!document.mozFullScreenElement ||
                   !!document.webkitFullscreenElement ||
                   !!document.msFullscreenElement;
        }
        
        private toggleFullscreen() {
            var fullScreenContainer = this.fullScreenContainer;
            if (!this.isFullscreen()) {
                if (fullScreenContainer.requestFullscreen) {
                    fullScreenContainer.requestFullscreen();
                } else if (fullScreenContainer.msRequestFullscreen) {
                    fullScreenContainer.msRequestFullscreen();
                } else if (fullScreenContainer.mozRequestFullScreen) {
                    fullScreenContainer.mozRequestFullScreen();
                } else if (fullScreenContainer.webkitRequestFullscreen) {
                    fullScreenContainer.webkitRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            }
        }

        private saveCanvas() {
            $(this.saveBtn).attr("href", this.canvas.toDataURL("image/png"));
            $(this.saveBtn).attr("download", this.initialProcessName + ".png");
        }

        private fullscreenChanged() {
            $(this.fullscreenBtn).text(this.isFullscreen() ? "Exit" : "Fullscreen");
            this.resize();
        }
        
        private fullscreenError() {
            console.log("Fullscreen error");
            
            // user might have entered fullscreen and gone out of it, treat as fullscreen changed
            this.fullscreenChanged();
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

                Object.keys(groupedByTargetProcessId).forEach(tProcId => {
                    var group = groupedByTargetProcessId[tProcId],
                        datas = group.map(t => { return {label: t.action.toString()}; });
                    this.showProcess(this.graph.processById(tProcId));
                    this.uiGraph.showTransitions(fromProcess.id, tProcId, datas);
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
            if (targetId) {
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
            if (!this.isFullscreen()) {
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

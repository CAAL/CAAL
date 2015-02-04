/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="activity.ts" />
/// <reference path="../../lib/ccs.d.ts" />
/// <reference path="../gui/arbor/arbor.ts" />
/// <reference path="../gui/arbor/renderer.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../../lib/suppressWarnings.d.ts" />

module Activity {

    import ccs = CCS;
    import ProcessGraphUI = GUI.ProcessGraphUI;
    import ArborGraph = GUI.ArborGraph;
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
        private canvas;
        private renderer: Renderer;
        private uiGraph: ProcessGraphUI;
        private bindedFns : any = {};
        private graph : ccs.Graph;
        private succGenerator : ccs.SuccessorGenerator;
        private initialProcessName : string;
        private notationVisitor : CCSNotationVisitor;
        private expandDepth : number = 1;
        private preExpandDept : number = 1;
        private fullScreenContainer;
        private statusTableContainer;
        private freezeBtn;
        private saveBtn;
        private fullscreenBtn;
        private sourceDefinition;

        constructor(private container, notationVisitor : CCSNotationVisitor) {
            super();
            
            var $container = $(container);

            this.canvas = $container.find("#arbor-canvas")[0];
            this.notationVisitor = notationVisitor;
            this.renderer = new Renderer(this.canvas);
            this.uiGraph = new ArborGraph(this.renderer);

            this.fullScreenContainer = $container.find("#fullscreen-container")[0];
            this.statusTableContainer = $container.find("#status-table-container")[0];
            this.freezeBtn = $container.find("#explorer-freeze-btn")[0];
            this.saveBtn = $container.find("#explorer-save-btn")[0];
            this.fullscreenBtn = $container.find("#explorer-fullscreen-btn")[0];
            this.sourceDefinition = $container.find("#explorer-source-definition")[0];

            $(this.fullscreenBtn).on("click", this.toggleFullscreen.bind(this));
            $(this.saveBtn).on("click", () => this.saveCanvas());

            $(document).on("fullscreenchange", () => this.fullscreenChanged());
            $(document).on("webkitfullscreenchange", () => this.fullscreenChanged());
            $(document).on("mozfullscreenchange", () => this.fullscreenChanged());
            $(document).on("MSFullscreenChange", () => this.fullscreenChanged());
            
            $(document).on("fullscreenerror", () => this.fullscreenError());
            $(document).on("webkitfullscreenerror", () => this.fullscreenError());
            $(document).on("mozfullscreenerror", () => this.fullscreenError());
            $(document).on("MSFullscreenError", () => this.fullscreenError());

            $(this.statusTableContainer).find("tbody").on("click", this.onTransitionTableClick.bind(this));
        }

        private isFullscreen(): boolean {
            return !!document.fullscreenElement || !!document.mozFullScreenElement || !!document.webkitFullscreenElement || !!document.msFullscreenElement;
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
        
        beforeShow(configuration) {
            this.clear();
            this.graph = configuration.graph;
            this.succGenerator = configuration.successorGenerator;
            this.initialProcessName = configuration.initialProcessName;
            this.preExpandDept = configuration.expandDepth;
            this.expandDepth = 1;
            this.notationVisitor.clearCache();
            this.clear();
            this.expand(this.graph.processByName(this.initialProcessName), this.preExpandDept);
        }

        public afterShow(): void {
            this.bindedFns.resize = this.resize.bind(this);
            $(window).on("resize", this.bindedFns.resize);
            
            this.uiGraph.setOnSelectListener((processId) => {
                this.expand(this.graph.processById(processId), this.expandDepth);
            });

            this.uiGraph.setHoverOnListener((processId) => {
                this.uiGraph.setHover(processId);
            });

            this.uiGraph.setHoverOutListener(() => {
                this.uiGraph.clearHover();
            });

            this.uiGraph.unfreeze(); // unfreeze the graph 
            $(this.freezeBtn).text("Freeze"); // and reset the freezeBtn.

            this.bindedFns.freeze = this.toggleFreeze.bind(this);
            $(this.freezeBtn).on("click", this.bindedFns.freeze);
            
            this.resize();
        }

        public afterHide() {
            $(window).unbind("resize", this.bindedFns.resize)
            this.bindedFns.resize = null;
            
            this.uiGraph.unfreeze(); // unfreeze the graph 
            $(this.freezeBtn).text("Freeze"); // and reset the freezeBtn.
            
            $(this.freezeBtn).unbind("click", this.bindedFns.freeze);
            this.uiGraph.clearOnSelectListener();
            this.uiGraph.clearHoverOnListener();
            this.uiGraph.clearHoverOutListener();
            this.graph = null;
            this.succGenerator = null;
        }

        private setOnHoverListener(row : JQuery) : void {
            if(row){
                $(row).hover(() => {
                    var processId = row.data('targetId');
                    this.uiGraph.setHover(processId.toString());

                    $(row).css("background", "rgba(0, 0, 0, 0.07)");
                }, 
                () => {
                    /*clear highlight and hover*/
                    this.uiGraph.clearHover();
                    $(row).css("background", "");
                });
            }
        }


        private setOnClickListener(row : JQuery) : void {
            if(row){
                $(row).on('click', () => {
                    var processId = row.attr('data-target-id');
                    this.expand(this.graph.processById(processId), this.expandDepth);

                    /*clear previous hover*/
                    this.uiGraph.clearHover();
                });
            }
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

        private getDefinitionForProcess(process) : string {
            if (process instanceof ccs.NamedProcess) {
                return this.notationVisitor.visit((<ccs.NamedProcess>process).subProcess);
            }
            return this.notationVisitor.visit(process);
        }

        private updateStatusAreaTransitions(fromProcess, transitions : ccs.Transition[]) {
            var body = $(this.statusTableContainer).find("tbody");
            var $sourceDefinition = $(this.sourceDefinition);
            body.empty();

            $sourceDefinition.text(this.labelFor(fromProcess) + " = " + this.getDefinitionForProcess(fromProcess));
            transitions.forEach(t => {
                var row = $("<tr></tr>");
                var action = $("<td></td>").append(t.action.toString());
                var name = $("<td></td>").append(this.labelFor(t.targetProcess));
                var target = $("<td></td>").append(this.notationVisitor.visit(t.targetProcess));
                row.append(action, name, target);
                row.attr("data-target-id", t.targetProcess.id);
                body.append(row);
                this.setOnHoverListener(row);
            });          
        }

        private onTransitionTableClick(event) {
            var targetId = undefined,
                eventTarget = event.target || event.srcElement;
            while (eventTarget.tagName !== "TR" && eventTarget.tagName !== "TBODY") {
                eventTarget = eventTarget.parentNode;
            }
            //Check if row pressed
            if (eventTarget && eventTarget.tagName === "TR") {
                targetId = eventTarget.dataset.targetId;
            }
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
                height = Math.max(350, window.innerHeight - offsetTop - offsetBottom);
            } else {
                height = this.canvas.parentNode.clientHeight;
            }
            this.canvas.width = width;
            this.canvas.height = height;
            this.renderer.resize(width, height);
        }
    }
}

/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="activity.ts" />
/// <reference path="../ccs/ccs.ts" />
/// <reference path="../gui/arbor/arbor.ts" />
/// <reference path="../gui/arbor/renderer.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../ccs/util.ts" />
/// <reference path="../../lib/suppressWarnings.d.ts" />

module Activity {

    import ccs = CCS;
    import ProcessGraphUI = GUI.ProcessGraphUI;
    import ArborGraph = GUI.ArborGraph;
    import CCSNotationVisitor = Traverse.CCSNotationVisitor;

    function groupBy<T>(arr : T[], keyFn : (T) => any) : any {
        var groupings = {},
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
        private fullscreenContainer;
        private freezeBtn;
        private fullscreenBtn;
        private renderer: Renderer;
        private uiGraph: ProcessGraphUI;
        private bindedResizeFn;
        private bindedFreezeFn;
        private bindedFullscreenFn;
        private graph : ccs.Graph;
        private succGenerator : ccs.SuccessorGenerator;
        private initialProcessName : string;
        private statusTableContainer;
        private notationVisitor : CCSNotationVisitor;
        private expandDepth : number = 1;
        private fullscreen: boolean = false;
        
        constructor(canvas, fullscreenContainer, statusTableContainer, freezeBtn, fullscreenBtn, notationVisitor : CCSNotationVisitor) {
            super();
            this.canvas = canvas;
            this.fullscreenContainer = fullscreenContainer;
            this.statusTableContainer = statusTableContainer;
            this.freezeBtn = freezeBtn;
            this.fullscreenBtn = fullscreenBtn;
            this.notationVisitor = notationVisitor;
            this.renderer = new Renderer(canvas);
            this.uiGraph = new ArborGraph(this.renderer);

            this.bindedFullscreenFn = this.toggleFullscreen.bind(this);
            $(this.fullscreenBtn).on("click", this.bindedFullscreenFn);

            $(document).on("fullscreenchange", () => this.fullscreenChanged());
            $(document).on("webkitfullscreenchange", () => this.fullscreenChanged());
            $(document).on("mozfullscreenchange", () => this.fullscreenChanged());
            $(document).on("MSFullscreenChange", () => this.fullscreenChanged());
        }

        private toggleFullscreen() {
            /*if (this.fullscreenContainer.requestFullscreen) {
                this.fullscreenContainer.requestFullscreen();
            } else if (this.fullscreenContainer.msRequestFullscreen) {
                this.fullscreenContainer.msRequestFullscreen();
            } else if (this.fullscreenContainer.mozRequestFullScreen) {
                this.fullscreenContainer.mozRequestFullScreen();
            } else if (this.fullscreenContainer.webkitRequestFullscreen) {
                this.fullscreenContainer.webkitRequestFullscreen();
            }*/
            if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {
                if (this.fullscreenContainer.requestFullscreen) {
                    this.fullscreenContainer.requestFullscreen();
                } else if (this.fullscreenContainer.msRequestFullscreen) {
                    this.fullscreenContainer.msRequestFullscreen();
                } else if (this.fullscreenContainer.mozRequestFullScreen) {
                    this.fullscreenContainer.mozRequestFullScreen();
                } else if (this.fullscreenContainer.webkitRequestFullscreen) {
                    this.fullscreenContainer.webkitRequestFullscreen();
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

        private fullscreenChanged() {
            this.fullscreen = !this.fullscreen;
            $(this.fullscreenBtn).text(this.fullscreen ? "Exit fullscreen" : "Open fullscreen");
            
            if (!this.fullscreen) {
                this.bindedResizeFn = this.resize.bind(this);
                $(window).on("resize", this.bindedResizeFn);
                
                //this.resize(); // can we trust the above to always resize the canvas?
            } else {
                $(window).unbind("resize", this.bindedResizeFn)
                this.bindedResizeFn = null;
                
                var margin: number = 0,
                    width: number = this.fullscreenContainer.clientWidth - margin*2,
                    height: number = this.fullscreenContainer.clientHeight - margin*2;
                
                this.canvas.width = width;
                this.canvas.height = height;
                this.canvas.style.marginTop = margin+"px";
                this.canvas.style.marginLeft = margin+"px";
                this.canvas.style.marginRight = margin+"px";
                this.canvas.style.marginBottom = margin+"px";
                
                this.renderer.resize(width, height);
            }
        }

        beforeShow(configuration) {
            this.clear();
            this.graph = configuration.graph;
            this.succGenerator = configuration.successorGenerator;
            this.initialProcessName = configuration.initialProcessName;
            this.expandDepth = configuration.expandDepth;
            this.clear();
            this.expand(this.graph.processByName(this.initialProcessName), 1);
        }

        afterShow(): void {
            var that = this;
            this.bindedResizeFn = this.resize.bind(this);
            $(window).on("resize", this.bindedResizeFn);
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
            this.bindedFreezeFn = this.toggleFreeze.bind(this);
            $(this.freezeBtn).on("click", this.bindedFreezeFn);
            this.resize();
        }

        afterHide() {
            $(window).unbind("resize", this.bindedResizeFn)
            this.bindedResizeFn = null;
            this.uiGraph.unfreeze();
            $(this.freezeBtn).unbind("click", this.bindedFreezeFn);
            this.uiGraph.clearOnSelectListener();
            this.graph = null;
            this.succGenerator = null;
        }

        private clear() : void {
            this.uiGraph.clearAll();
        }

        private toggleFreeze() {
            var $freezeBtn = $(this.freezeBtn),
                isFreezing = $freezeBtn.text() === "Unfreeze",
                newValueText = isFreezing ? "Freeze" : "Unfreeze",
                doFreeze = !isFreezing;
            $freezeBtn.text(newValueText);
            doFreeze ? this.uiGraph.freeze() : this.uiGraph.unfreeze();
        }

        private showProcess(process : ccs.Process) {
            var data;
            if (!process) throw {type: "ArgumentError", name: "Bad argument 'process'"};
            if (this.uiGraph.getProcessDataObject(process.id)) return;
            data = {label: this.labelFor(process), status: "unexpanded"};
            this.uiGraph.showProcess(process.id, data);
        }

        private labelFor(process : ccs.Process) : string{
            var label = "S" + process.id;
            if (process instanceof ccs.NamedProcess) {
                label = (<ccs.NamedProcess>process).name;
            }
            return label;
        }

        private expand(process : ccs.Process, depth) {
            if (!process) throw {type: "ArgumentError", name: "Bad argument 'process'"};

            var allTransitions = this.expandBFS(process, depth);
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

        private updateStatusAreaTransitions(fromProcess, transitions : ccs.Transition[]) {
            var body = $(this.statusTableContainer).find("tbody");
            body.empty();

            transitions.forEach(t => {
                var row = $("<tr></tr>");
                var source = $("<td></td>").append(this.labelFor(fromProcess));
                var action = $("<td></td>").append(t.action.toString());
                var name = $("<td></td>").append(this.labelFor(t.targetProcess));
                var target = $("<td></td>").append(this.notationVisitor.visit(t.targetProcess));
                row.append(source, action, name, target);
                body.append(row);
            });          
        }

        private showProcessAsExplored(process : ccs.Process) : void {
            this.uiGraph.getProcessDataObject(process.id).status = "expanded";
        }

        private resize(): void {
            var width = this.canvas.parentNode.clientWidth;
            var offsetTop = $("#arbor-canvas").offset().top;
            var offsetBottom = $(this.statusTableContainer).height() + 20; // Parent container margin = 20.
            var height = Math.max(350, window.innerHeight - offsetTop - offsetBottom);
            this.canvas.width = width;
            this.canvas.height = height;
            this.renderer.resize(width, height);
        }
    }
}

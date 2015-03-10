/// <reference path="../gui/project.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../gui/arbor/arbor.ts" />
/// <reference path="../gui/arbor/renderer.ts" />
/// <reference path="activity.ts" />
/// <reference path="fullscreen.ts" />
/// <reference path="tooltip.ts" />

module Activity {

    import dg = DependencyGraph;

    interface SubActivity {
        configure(configuration : any);
        onShow();
        onHide();
        getUIDom();
    }

    export class HmlGame extends Activity {
        
        private currentSubActivity : SubActivity = null;
        private hmlGameActivity : SubActivity = new HmlGameActivity("#hml-game-container");

        constructor(container : string, button : string) {
            super(container, button);
        }

        onShow(configuration?) {
            configuration = configuration || Object.create(null);
            var type = configuration.type;
            //TODO: Switch activity
            var switchTo = this.hmlGameActivity;
            if (this.currentSubActivity !== switchTo) {
                //TODO: Shutdown previous
            }
            this.currentSubActivity = switchTo;
            //Now have the right activity
            if (configuration) {
                this.currentSubActivity.configure(configuration);
            }
            this.setOptionsDom(this.currentSubActivity);

            this.currentSubActivity.onShow();
        }

        private setOptionsDom(activity : SubActivity) {
            var injecter = $("#hml-game-inject-options")[0];
            while (injecter.firstChild) {
                injecter.removeChild(injecter.firstChild);
            }
            injecter.appendChild(activity.getUIDom());
        }

        onHide() {
            var activity = this.currentSubActivity;
            if (activity) {
                activity.onHide();
            }
        }
    }

    class HmlGameActivity {

        private $container : JQuery;
        private $leftContainer : JQuery;
        private $leftZoom : JQuery;
        private $rightContainer : JQuery;
        private leftCanvas : HTMLCanvasElement;
        private leftRenderer : Renderer;
        private leftGraph : GUI.ArborGraph;
        private project : Project;
        private configuration = {
            processName: undefined,
            formulaId: undefined,
            graph: null,
            succGen: null
        };

        private $processList : JQuery;
        private $formulaList : JQuery;
        private optionsDom;

        /* Todo
    
            How to ensure leftProcess and right formula valid. Or just not draw until selected?
            How to ensure valid configuration
            Detect ccs changes
            Create options
            Add event handling options
            Formula subgui.
            Only allow valid transitions.
        */


        constructor(container : string) {
            this.$container = $(container); 
            var c = this.$container;

            this.project = Project.getInstance();

            this.$leftContainer = c.find("#hml-game-left");
            this.$leftZoom = c.find("#hml-game-zoom-left");

            this.$rightContainer = c.find("#hml-game-right");

            this.leftCanvas = <HTMLCanvasElement> this.$leftContainer.find("canvas")[0];
            this.leftRenderer = new Renderer(this.leftCanvas);
            this.leftGraph = new GUI.ArborGraph(this.leftRenderer);

            this.constructOptionsDom();


            // Use onchange instead of oninput for IE.
            var zoomEvent = (navigator.userAgent.indexOf("MSIE ") > 0 || 
                                !!navigator.userAgent.match(/Trident.*rv\:11\./))
                            ? "change" : "input";
            this.$leftZoom.on(zoomEvent, () => this.resize(this.$leftZoom.val()));

            this.$processList.on("change", () => {
                this.loadGuiConfig(this.configuration);
                this.refresh(this.configuration);
            });
            this.$formulaList.on("change", () => {
                this.loadGuiConfig(this.configuration);
                this.refresh(this.configuration);
            });
        }

        onShow() {
            $(window).on("resize", () => this.resize(this.$leftZoom.val()));
            //TODO
            this.resize(1);
            this.leftGraph.bindCanvasEvents();
        }

        onHide() {
            $(window).off("resize");

            //TODO
            this.leftGraph.unbindCanvasEvents();
        }

        private constructOptionsDom() {
            var domString = '' +
                '<select id="hml-game-type" class="form-control">' +
                    '<option value="strong" selected>Strong Logic</option>' +
                    '<option value="weak">Weak Logic</option>' +
                '</select>' +
                '<select id="hml-game-process" class="form-control"></select>' +
                '<select id="hml-game-formula" class="form-control"></select>' +
                '<div class="btn-group" data-toggle="buttons">' +
                    '<label class="btn btn-default">' +
                        '<input name="player-type" value="attacker" type="radio"> Attacker' +
                    '</label>' +
                    '<label class="btn btn-default active">' +
                        '<input name="player-type" value="defender" type="radio" checked> Defender' +
                    '</label>' +
                '</div>';
            var optionsContainer = document.createElement("div");
            optionsContainer.innerHTML = domString;
            this.optionsDom = optionsContainer;
            this.$processList = $(optionsContainer).find("#hml-game-process");
            this.$formulaList = $(optionsContainer).find("#hml-game-formula");
        }

        getUIDom() {
            return this.optionsDom;
        }

        private getCurrentProcess() : string {
            return this.$processList.val();
        }

        private getCurrentFormula() : string {
            return this.$formulaList.val();
        }

        private setProcesses(processNames, selectedProcessName) {
            this.$processList.empty();
            processNames.forEach(pName => {
                var optionsNode = $("<option></option>").append(pName);
                if (pName === selectedProcessName) {
                    optionsNode.prop("selected", true);
                }
                this.$processList.append(optionsNode);
            });
        }

        private loadGuiConfig(configuration) {
            configuration.processName = this.getCurrentProcess();
            configuration.formulaId = this.getCurrentFormula();
        }

        private loadCurrentConfig(configuration) {
            this.loadGuiConfig(configuration);
            configuration.graph = this.project.getGraph();
            configuration.succGen = CCS.getSuccGenerator(configuration.graph, {succGen: "strong", reduce: false});
        }

        configure(configuration) {
            this.loadCurrentConfig(this.configuration);
            overWriteConf(this.configuration, configuration);
            this.refresh(this.configuration);
        }

        private refresh(configuration) {
            var graph = configuration.graph,
                namedProcesses = graph ? graph.getNamedProcesses().reverse() : [];

            //Process list
            this.setProcesses(namedProcesses, configuration.processName);

            //Process graph
            this.clearProcessGraph(this.leftGraph);
            if (configuration.processName) {
                var process = configuration.succGen.getProcessByName(configuration.processName);
                this.drawProcesses(process, this.leftGraph);
                this.resize(1);
            }

            //Formula list
        }

        private clearProcessGraph(graph : GUI.ProcessGraphUI) : void {
            graph.clearAll();
        }

        private expandBFS(process : CCS.Process, maxDepth) {
            var result = {},
                queue = [[1, process]], //non-emptying array as queue.
                depth, qIdx, fromProcess, transitions;
            for (qIdx = 0; qIdx < queue.length; qIdx++) {
                depth = queue[qIdx][0];
                fromProcess = queue[qIdx][1];
                result[fromProcess.id] = transitions = this.configuration.succGen.getSuccessors(fromProcess.id);
                transitions.forEach(t => {
                    if (!result[t.targetProcess.id] && depth < maxDepth) {
                        queue.push([depth + 1, t.targetProcess]);
                    }
                });
            }
            return result;
        }

        private drawProcesses(process : CCS.Process, graph : GUI.ProcessGraphUI) : void {
            var config = this.configuration;
            var allTransitions = this.expandBFS(process, 1000);

            for (var fromId in allTransitions) {
                var fromProcess = config.graph.processById(fromId);
                this.showProcess(fromProcess, graph);
                var groupedByTargetProcessId = ArrayUtil.groupBy(allTransitions[fromId].toArray(), t => t.targetProcess.id);

                Object.keys(groupedByTargetProcessId).forEach(strProcId => {
                    var group = groupedByTargetProcessId[strProcId],
                        data = group.map(t => { return {label: t.action.toString()}; }),
                        numId = parseInt(strProcId, 10);
                    this.showProcess(config.graph.processById(numId), graph);
                    graph.showTransitions(fromProcess.id, numId, data);
                });
            }

            graph.setSelected(process.id.toString());
        }

        private showProcess(process : ccs.Process, graph : GUI.ProcessGraphUI) : void {
            if (graph.getProcessDataObject(process.id)) return;
            graph.showProcess(process.id, {label: this.labelForProcess(process)});
        }

        private labelForProcess(process : CCS.Process) : string {
            return (process instanceof CCS.NamedProcess) ? (<CCS.NamedProcess> process).name : process.id.toString();
        }

        private resize(leftZoom : number) : void {
            var offsetTop = $("#hml-game-main").offset().top;
            var offsetBottom = $("#hml-game-status").height();

            var availableHeight = window.innerHeight - offsetTop - offsetBottom - 22; // Margin bot + border = 22px.
            
            // Only 10px margin bot in fullscreen.
            // if (this.fullscreen.isFullscreen())
            //     availableHeight += 10;

            // Minimum height 265px.
            var height = Math.max(265, availableHeight);
            this.$leftContainer.height(height);
            this.$rightContainer.height(height);

            if (leftZoom !== null) {
                this.$leftZoom.val(leftZoom.toString());
                this.leftCanvas.width = this.$leftContainer.width() * leftZoom;
                this.leftCanvas.height = height * leftZoom;
                this.leftRenderer.resize(this.leftCanvas.width, this.leftCanvas.height);

                if (leftZoom > 1) {
                    // this.$leftFreeze.css("right", 30);
                    this.$leftContainer.css("overflow", "auto");
                    // this.centerNode(this.dgGame.getCurrentConfiguration().left);
                } else {
                    // this.$leftFreeze.css("right", 10);
                    this.$leftContainer.css("overflow", "hidden");
                }
            }
        }

        private centerNode(process : CCS.Process) : void {
            var position = this.leftGraph.getPosition(process.id.toString());
            this.$leftContainer.scrollLeft(position.x - (this.$leftContainer.width() / 2));
            this.$leftContainer.scrollTop(position.y - (this.$leftContainer.height() / 2));
        }

        toString() {
            return "HML Game Activity";
        }
    }

    function overWriteConf(conf, changes) {
        for (var changeKey in changes) {
            conf[changeKey] = changes[changeKey];
        }
    }
}

/// <reference path="../gui/project.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../gui/widget/zoomable-process-explorer.ts" />
/// <reference path="../gui/arbor/arbor.ts" />
/// <reference path="../gui/arbor/renderer.ts" />
/// <reference path="activity.ts" />
/// <reference path="fullscreen.ts" />
/// <reference path="tooltip.ts" />

module Activity {

    import dg = DependencyGraph;

    interface SubActivity {
        onShow(configuration : any);
        onHide();
        getUIDom();
        getDefaultConfiguration();
    }

    export class HmlGame extends Activity {
        
        private currentSubActivity : SubActivity = null;
        private hmlGameActivity : SubActivity = new HmlGameActivity("#hml-game-main");

        constructor(container : string, button : string) {
            super(container, button);
        }

        onShow(configuration?) {
            // this.addDefaults(configuration);
            var type = "strong";
            if (configuration && configuration.type) {
                type = configuration.type;
            }
            var switchTo = this.hmlGameActivity;
            if (this.currentSubActivity !== switchTo) {
                //TODO: Shutdown previous
            }
            this.currentSubActivity = switchTo;
            //Now have the right activity
            this.setOptionsDom(this.currentSubActivity);
            configuration = configuration || this.currentSubActivity.getDefaultConfiguration();
            this.currentSubActivity.onShow(configuration);

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
    }

    class HmlGameActivity {

        private $container : JQuery;
        private processExplorer = new GUI.Widget.ZoomableProcessExplorer();

        private project : Project;
        
        private configuration = {
            processName: undefined,
            formulaId: undefined,
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
            this.constructOptionsDom();

            this.$processList.on("change", () => {
                this.loadGuiIntoConfig(this.configuration);
                this.refresh(this.configuration);
            });
            this.$formulaList.on("change", () => {
                this.loadGuiIntoConfig(this.configuration);
                this.refresh(this.configuration);
            });

            $("#hml-game-main").append(this.processExplorer.getRootElement());
        }

        onShow(configuration) {
            $(window).on("resize", () => this.resize());
            this.resize();
            this.configure(configuration);
        }

        onHide() {
            $(window).off("resize");
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

        getDefaultConfiguration() : any {
            var configuration = Object.create(null),
                graph = Main.getGraph();
            configuration.succGen = CCS.getSuccGenerator(graph, {succGen: "strong", reduce: false});
            configuration.processName = this.getNamedProcessList()[0];
            configuration.formulaId = "Howdy";
            return configuration;
        }

        private getCurrentProcess() : string {
            return this.$processList.val();
        }

        private getCurrentFormula() : string {
            return this.$formulaList.val();
        }

        private getNamedProcessList() : string[] {
            var namedProcesses = Main.getGraph().getNamedProcesses().slice(0);
            namedProcesses.reverse();
            return namedProcesses;
        }

        private setProcesses(processNames : string[], selectedProcessName? : string) : void {
            this.$processList.empty();
            processNames.forEach(pName => {
                var optionsNode = $("<option></option>").append(pName);
                if (pName === selectedProcessName) {
                    optionsNode.prop("selected", true);
                }
                this.$processList.append(optionsNode);
            });
        }

        private loadGuiIntoConfig(configuration) {
            configuration.processName = this.getCurrentProcess();
            configuration.formulaId = this.getCurrentFormula();
        }

        private configure(configuration) {
            this.configuration = configuration;
            this.setProcesses(this.getNamedProcessList(), configuration.processName);
            //Fix method
            this.refresh(configuration);
        }

        private refresh(configuration) {
            var succGen = configuration.succGen,
                processName = configuration.processName,
                process = succGen.getProcessByName(processName);
            this.processExplorer.setSuccGenerator(succGen);
            this.processExplorer.exploreProcess(process);
        }

        private resize() : void {
            var $processExplorerElem = $(this.processExplorer.getRootElement()),
                explorerOffsetTop = $processExplorerElem.offset().top,
                explorerOffsetBottom = $("#hml-game-status").height();
            var explorerHeight = window.innerHeight - explorerOffsetTop - explorerOffsetBottom - 22;
            explorerHeight = Math.max(explorerHeight, 265);
            this.processExplorer.resize(this.$container.width(), explorerHeight);
        }

        toString() {
            return "HML Game Activity";
        }
    }
}
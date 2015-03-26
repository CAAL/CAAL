/// <reference path="../gui/project.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../gui/widget/zoomable-process-explorer.ts" />
/// <reference path="../gui/widget/transition-table.ts" />
/// <reference path="../gui/widget/hmlformula-selector.ts" />
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

        private setOptionsDom(subActivity : SubActivity) {
            var injecter = $("#hml-game-inject-options")[0];
            while (injecter.firstChild) {
                injecter.removeChild(injecter.firstChild);
            }
            injecter.appendChild(subActivity.getUIDom());
        }

        onHide() {
            var subActivity = this.currentSubActivity;
            if (subActivity) {
                subActivity.onHide();
            }
        }

        protected checkPreconditions(): boolean {
            var graph = Main.getGraph();

            if (!graph) {
                this.showExplainDialog("Syntax Error", "Your program contains one or more syntax errors.");
                return false;
            } else if (graph.graph.getNamedProcesses().length === 0) {
                this.showExplainDialog("No Named Processes", "There must be at least one named process in the program.");
                return false;
            }

            return true;
        }
    }

    class HmlGameActivity {

        private $container : JQuery;
        private processExplorer = new GUI.Widget.ZoomableProcessExplorer();
        private transitionTable = new GUI.Widget.TransitionTable();
        private hmlselector = new GUI.Widget.FormulaSelector();
        private currentProcess : CCS.Process = null;
        private currentFormula : HML.Formula = null
        private currentFormulaSet : HML.FormulaSet = null
        // HMlgamelogic instance is missing.
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
            Create a new selector for hml selections(dis/con-junction)
            be able to switch between the transition table and hml-selector
            Only allow valid transitions.
        */

        constructor(container : string) {
            this.$container = $(container); 

            this.project = Project.getInstance();
            this.constructOptionsDom();

            this.$processList.on("change", () => {
                this.loadGuiIntoConfig(this.configuration);
                this.setCurrentProcFromProcesslist();
                this.configure(this.configuration);
            });
            this.$formulaList.on("change", () => {
                this.loadGuiIntoConfig(this.configuration);
                this.setCurrentFormulaFromFormulalist();
                this.configure(this.configuration);
            });

            $("#hml-game-main").append(this.processExplorer.getRootElement());
            //$("#hml-game-status-right").append(this.transitionTable.getRootElement());
            $("#hml-game-status-right").append(this.hmlselector.getRootElement());

            this.transitionTable.onSelectListener = ((transition) => {
                this.currentProcess = transition.targetProcess;
                this.refresh(this.configuration);
                this.processExplorer.exploreProcess(transition.targetProcess);
                this.processExplorer.focusOnProcess(transition.targetProcess);
            });

            this.hmlselector.onSelectListener = ((hmlformula) => {
                this.currentFormula = hmlformula;
            });
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
            /*Return the HTML for a HML-Game options*/
            return this.optionsDom;
        }

        getDefaultConfiguration() : any {
            /*Return a default configurations*/
            var configuration = Object.create(null),
                graph : ccs.Graph = Main.getGraph().graph;
            configuration.succGen = CCS.getSuccGenerator(graph, {succGen: "strong", reduce: false});
            configuration.processName = this.getNamedProcessList()[0];
            configuration.formulaId = this.getFormulaSetList()[0].getTopFormula().id;
            return configuration;
        }

        private getProcessListValue() : string {
            /*Returns the value from the processlist*/
            return this.$processList.val();
        }

        private getFormulaListValue() : number {
            /*Returns the value(the index of the formulaSet in this.getFormulaSetList()) from the formulalist*/
            return this.$formulaList.val();
        }

        private getSelectedFormulaSet() : HML.FormulaSet {
            return this.getFormulaSetList()[this.getFormulaListValue()];
        }

        private getNamedProcessList() : string[] {
            /*Returns the named processes defined in the CCS-program*/
            var namedProcesses = Main.getGraph().graph.getNamedProcesses().slice(0);
            namedProcesses.reverse();
            return namedProcesses;
        }

        private getFormulaSetList() : HML.FormulaSet[] {
            return Main.getFormulaSets();
        }

        private setFormulas(hmlFormulaSets : HML.FormulaSet[], selectedHMLId : number) : void {
            this.$formulaList.empty();
            var hmlvisitor = new Traverse.HMLNotationVisitor();
            hmlFormulaSets.forEach((hmlFSet, index) => {
                var formulaStr = Traverse.safeHtml(hmlvisitor.visit(hmlFSet.getTopFormula()))
                var optionsNode = $("<option></option>").attr("value", index).append(formulaStr);
                if(hmlFSet.getTopFormula().id === selectedHMLId){
                    optionsNode.prop("selected", true);
                }
                this.$formulaList.append(optionsNode);
            });
        }

        private setProcesses(processNames : string[], selectedProcessName? : string) : void {
            /*Updates the processes in processlist*/
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
            /*Updates the configuration object with new data from processlist and formulalist*/
            configuration.processName = this.getProcessListValue();
            configuration.formulaId = this.getSelectedFormulaSet().getTopFormula().id;
        }

        private setCurrentProcFromProcesslist() : void {
            /*Updates the this.currentProcess with the newly selected process in processlist */
            this.currentProcess = this.configuration.succGen.getProcessByName(this.getProcessListValue());
        }

        private setCurrentFormulaFromFormulalist() : void {
            this.currentFormulaSet = this.getSelectedFormulaSet()
            this.currentFormula = this.currentFormulaSet.getTopFormula();
        }

        private configure(configuration) {
            //This is/should-only-be called for change in either process, formula or succ generator.
            this.configuration = configuration;
            
            /*Fill the dropdown list with infomation*/            
            this.setProcesses(this.getNamedProcessList(), configuration.processName);
            this.setFormulas(this.getFormulaSetList(), configuration.formulaId);
            
            /*Set the currentFormula/Process */
            this.currentProcess = configuration.succGen.getProcessByName(configuration.processName);
            this.currentFormulaSet = this.getSelectedFormulaSet() // Currently selected FormulaSet
            this.currentFormula = this.currentFormulaSet.getTopFormula();

            this.processExplorer.setSuccGenerator(this.configuration.succGen);
            this.refresh(configuration);
        }

        private refresh(configuration) {

            /* E-xplores the currentProcess and updates the transitiontable with its successors transitions*/
            this.processExplorer.exploreProcess(this.currentProcess);
            

            // todo insert if about actionType
            //this.transitionTable.setTransitions(this.configuration.succGen.getSuccessors(this.currentProcess.id).toArray());
            this.hmlselector.setFormula(this.currentFormula, this.currentFormulaSet);

        }

        private resize() : void {
            var $processExplorerCanvasContainer = $(this.processExplorer.getCanvasContainer()),
                explorerOffsetTop = $processExplorerCanvasContainer.offset().top,
                explorerOffsetBottom = $("#hml-game-status").height();
            
           var explorerHeight = window.innerHeight - explorerOffsetTop - explorerOffsetBottom - 22;
                        
            this.processExplorer.resize(this.$container.width(), explorerHeight);
        }

        toString() {
            return "HML Game Activity";
        }
    }

    class HmlGameState {
        constructor(public process : CCS.Process, 
                public formula : HML.Formula, 
                public isMinGame : boolean) {
        }
    }

    enum Player {attacker, defender, judge};
    enum ActionType {transition, formula, variable};
    enum WinReason {minGameCycle, maxGameCycle, falseFormula, trueFormula};

    class Pair<P,Q> {
        constructor(public left : P, public right : Q) {
        }
    }

    class HmlGameLogic {
        
        private state : HmlGameState;
        private previousStates : HmlGameState[] = [];
        private gameIsOver : boolean = false;

        constructor(process, formula) {
            this.state = new HmlGameState(process, formula, true);
        }

        selectedFormula(formula : HML.Formula) {
            // con/dis-junction this is only viable
            // The player selected a formula.
            // Same as selectedTransition
            throw "not implemented"
        }

        selectedTransition(transition : CCS.Transition) {
            // The player selected a transition
            // Push current to previous
            // Check for gameover including min/max cycle.
            throw "not implemented"
        }

        isGameOver() : Pair<Player, WinReason> {
            // returns undefined/null if no winner.
            // otherwise return who won, and why.
            throw "not implemented"
        }

        getNextActionType() : ActionType {
            //Returns whether the next player is to select an action or formula or
            //maybe the judge has to unfold variable.
            throw "not implemented"
        }

        getCurrentPlayer() : Player {
            var attackerMoves = [HML.ConjFormula, HML.StrongExistsFormula, HML.WeakExistsFormula, HML.FalseFormula];
            var defenderMoves = [HML.DisjFormula, HML.StrongForAllFormula, HML.WeakForAllFormula, HML.TrueFormula];
            var judgeMoves = [HML.MinFixedPointFormula, HML.MaxFixedPointFormula, HML.VariableFormula];
            var isPrototypeOfCurrentFormula = (obj) => this.state.formula instanceof obj;

            if (attackerMoves.some(isPrototypeOfCurrentFormula)) return Player.attacker;
            if (defenderMoves.some(isPrototypeOfCurrentFormula)) return Player.defender;
            if (judgeMoves.some(isPrototypeOfCurrentFormula)) return Player.judge;
            throw "Unhandled formula type in getCurrentPlayer";
        }

        getAvailableTransitions() : Pair<CCS.Transition, HML.Formula> {
            //Not sure about interface. they all lead to the same subformula,
            //but the transition may differ.
            throw "not implemented"
        }

        getAvailableFormulas() : HML.Formula[] {
            //Get the possible formulas you can select among
            throw "not implemented"
        }
    }
}
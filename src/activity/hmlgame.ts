/// <reference path="../../lib/util.d.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../gui/widget/zoomable-process-explorer.ts" />
/// <reference path="../gui/widget/transition-table.ts" />
/// <reference path="../gui/widget/hmlformula-selector.ts" />
/// <reference path="../gui/widget/gamelog-widget.ts" />
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
            configuration = configuration || this.currentSubActivity.getDefaultConfiguration();
            this.setOptionsDom(this.currentSubActivity);
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
            var graph = Project.getInstance().getGraph();

            if (!graph) {
                this.showMessageBox("Syntax Error", "Your program contains one or more syntax errors.");
                return false;
            } else if (graph.getNamedProcesses().length === 0) {
                this.showMessageBox("No Named Processes", "There must be at least one named process in the program.");
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
        private gamelog = new GUI.Widget.GameLog();

        private project : Project;
        // private currentProcess : CCS.Process = null;
        // private currentFormula : HML.Formula = null
        // private currentFormulaSet : HML.FormulaSet = null;
        private hmlGameLogic : HmlGameLogic = null;
        private isWeak : boolean;

        private configuration = {
            processName: undefined,
            propertyId: undefined,
            formulaId: undefined,
            // succGen: null
        };

        private $processList : JQuery;
        private $formulaList : JQuery;
        private optionsDom;
        private $restartBtn;
        private fullscreen;
        private tooltip;
        private CCSChanged : boolean;

        private formulaSets;

        private human : Player = null;
        private computer : Player = null;
        private weakSuccGen : CCS.SuccessorGenerator;
        private strongSuccGen : CCS.SuccessorGenerator;
        private graph : any;

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
                this.configure(this.configuration);
            });
            this.$formulaList.on("change", () => {
                this.loadGuiIntoConfig(this.configuration);
                this.configure(this.configuration);
            });

            /*Explorer*/
            $("#hml-game-main").append(this.processExplorer.getRootElement());
            /*Gamelog*/
            $("#hml-game-status-left").append(this.gamelog.getRootElement());
            
            /* Assign the restart button */
            this.$restartBtn = $("#hml-game-restart");
            this.$restartBtn.on("click", () => this.configure(this.configuration));

            this.fullscreen = new Fullscreen($("#hml-game-container")[0], $("#hml-game-fullscreen"), () => this.resize());
            
            this.transitionTable.onSelectListener = ((transition) => {
                this.hmlGameLogic.selectedTransition(transition, (process) => {this.processExplorer.exploreProcess(process); this.processExplorer.focusOnProcess(process);}); // return the new state
                this.refresh();
            });

            this.hmlselector.onSelectListener = ((hmlSubFormula) => {
                this.hmlGameLogic.selectedFormula(hmlSubFormula);
                this.refresh();
            });

            // when the ccs changes, set a flag, so when switching back to the activity we grab the new graph.
            $(document).on("ccs-changed", () => this.CCSChanged = true);

            this.tooltip = new ProcessTooltip($("#hml-game-status"));
            new DataTooltip($("#hml-game-log")); // no need to save instance
        }

        onShow(configuration) { 
            $(window).on("resize", () => this.resize());
            this.fullscreen.onShow();
            this.resize();
            this.formulaSets = this.project.getFormulaSetsForProperties();
            // this.tooltip.setGraph(configuration.succGen.graph);

            if (this.CCSChanged || configuration.type != "default" || this.configuration === null) {
                // if either the CCS has changed, the configuration given is not the default one, 
                // or this.configuration has not yet been initialized, then re-configure everything.
                this.CCSChanged = false;
                // this.tooltip.setGraph(Main.getGraph().graph);
                this.configure(configuration);
            }
        }

        onHide() {
            $(window).off("resize");
        }

        private constructOptionsDom() {
            var domString = '' +
                // '<select id="hml-game-type" class="form-control">' +
                //     '<option value="strong" selected>Strong Logic</option>' +
                //     '<option value="weak">Weak Logic</option>' +
                // '</select>' +
                '<select id="hml-game-process" class="form-control"></select>' +
                '<select id="hml-game-formula" class="form-control"></select>';
                // '<div class="btn-group" data-toggle="buttons">' +
                //     '<label class="btn btn-default">' +
                //         '<input name="player-type" value="attacker" type="radio"> Attacker' +
                //     '</label>' +
                //     '<label class="btn btn-default active">' +
                //         '<input name="player-type" value="defender" type="radio" checked> Defender' +
                //     '</label>' +
                // '</div>';
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
            var configuration = Object.create(null);
            var formulaSets = this.project.getFormulaSetsForProperties()
            /*configuration.strongSuccGen = this.getSuccGenerator("strong");
            configuration.weakSuccGen = this.getSuccGenerator("weak");*/
            configuration.processName = this.getNamedProcessList()[0];
            configuration.propertyId = Object.keys(formulaSets)[0]; //return the first formulaset
            // configuration.formulaSetIndex = this.getSelectedFormulaSetIndex() >= 0 ? this.getSelectedFormulaSetIndex() : 0;
            configuration.formulaId = formulaSets[configuration.propertyId].getTopFormula().id;
            configuration.type = "default";
            return configuration;
        }


        private getProcessListValue() : string {
            /*Returns the value from the processlist*/
            return this.$processList.val();
        }

        private getSelectedFormulaSetId() : number {
            /*Returns the value(the index of the formulaSet in this.getFormulaSetList()) from the formulalist*/
            return parseInt(this.$formulaList.val());
        }

        private getSelectedFormulaSet() : HML.FormulaSet {
            return this.formulaSets[this.getSelectedFormulaSetId()];
        }

        private getNamedProcessList() : string[] {
            /*Returns the named processes defined in the CCS-program*/
            var namedProcesses = this.project.getGraph().getNamedProcesses().slice(0);
            namedProcesses.reverse();
            return namedProcesses;
        }

        private setFormulas(hmlFormulaSets : any, selectedPropertyId : number) : void {
            this.$formulaList.empty();
            
            for (var propId in hmlFormulaSets){
                var hmlvisitor = new Traverse.HMLNotationVisitor();
                var formulaStr = Traverse.safeHtml(hmlvisitor.visit(hmlFormulaSets[propId].getTopFormula()))
                var optionsNode = $("<option></option>").attr("value", propId).append(formulaStr);
                if(parseInt(propId) == selectedPropertyId) {
                    optionsNode.prop("selected", true);
                }
                this.$formulaList.append(optionsNode);
            }
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
            configuration.propertyId = this.getSelectedFormulaSetId();
            configuration.formulaId = this.getSelectedFormulaSet().getTopFormula().id;
            // configuration.strongSuccGen = this.getSuccGenerator("strong");
            // configuration.weakSuccGen = this.getSuccGenerator("weak");
        }

        private configure(configuration) : void {
            //This is/should-only-be called for change in either process, formula or succ generator.
            this.configuration = configuration;

            this.graph = this.project.getGraph();
            this.strongSuccGen = CCS.getSuccGenerator(this.graph, {succGen: "strong", reduce: false});
            this.weakSuccGen = CCS.getSuccGenerator(this.graph, {succGen: "weak", reduce: false});
            /*Fill the dropdown list with infomation*/            
            this.setProcesses(this.getNamedProcessList(), configuration.processName);
            this.setFormulas(this.formulaSets, configuration.propertyId);
            
            /*Set the currentFormula/Process */
            var currentProcess = this.strongSuccGen.getProcessByName(configuration.processName);
            var currentFormulaSet : HML.FormulaSet = this.formulaSets[configuration.propertyId];
            this.hmlselector.setFormulaSet(currentFormulaSet);
            var currentFormula = currentFormulaSet.getTopFormula();

            /* Set graph in the widgets. */
            this.processExplorer.clear();
            this.processExplorer.graph = this.graph;
            this.transitionTable.graph = this.graph;
            this.tooltip.setGraph(this.graph);
            this.processExplorer.succGen = this.strongSuccGen;

            this.processExplorer.exploreProcess(currentProcess); // explore the current selected process
            
            this.hmlGameLogic = new HmlGameLogic(currentProcess, currentFormula, 
                                                 currentFormulaSet, this.strongSuccGen, this.weakSuccGen, this.graph);
            this.hmlGameLogic.setGamelogWriter((gameLogObject) => this.gamelog.printToGameLog(gameLogObject));
            
            this.computer = this.hmlGameLogic.getUniversalWinner();
            this.human = (this.computer === Player.attacker) ? Player.defender : Player.attacker;

            /* Gamelog */
            this.gamelog.reset();
            // print the intro
            var gameIntro = new GUI.Widget.GameLogObject(this.graph)
            gameIntro.setTemplate("You are playing {0} in {1} HML game, and you will lose.")
            gameIntro.addLabel({text: (this.human === Player.defender ? "defender" : "attacker")});
            gameIntro.addLabel({text: (this.isWeak ? "weak" : "strong")});
            this.gamelog.printToGameLog(gameIntro);

            this.refresh();
        }


        private refresh() : void {
            /* Explores the currentProcess and updates the transitiontable with its successors transitions*/
            
            var isGameOver = this.hmlGameLogic.isGameOver(),
            formula = this.hmlGameLogic.state.formula,
            process = this.hmlGameLogic.state.process,
            formulaSet = this.hmlGameLogic.state.formulaSet;

            this.printCurrentConfig(process, formula);
            if (isGameOver) {
                this.setActionWidget() // clear the widget div
                var winner : Player = isGameOver.left;
                var winReason = isGameOver.right;
                this.printGameOver(winner, winReason);
            }
            else {
                var currentPlayer = this.hmlGameLogic.getCurrentPlayer();
                if(currentPlayer === this.computer) {
                    // TODO: make this work (so the computer always will play the correct choice.)
                    this.hmlGameLogic.AutoPlay(this.computer, (process) => {this.processExplorer.exploreProcess(process); this.processExplorer.focusOnProcess(process);});
                    this.refresh();
                } 
                else if(currentPlayer === this.human) {
                    this.prepareGuiForUserAction();
                }
                else if(currentPlayer === Player.judge) {
                    // Judge plays
                    formula = this.hmlGameLogic.JudgeUnfold(formula, formulaSet);
                    this.refresh();
                }
            } 
        }

        private printGameOver(winner : Player, winReason : WinReason) : void {
            /* Gamelog */
            var gameLogObject = new GUI.Widget.GameLogObject(this.graph);
            
            switch (winReason)
            {
                case WinReason.minGameCycle: {
                   gameLogObject.setTemplate("A cycle has been detected. You({0}) {1}!");
                    gameLogObject.addLabel({text: (this.human === Player.attacker) ? "attacker" : "defender"});
                    gameLogObject.addLabel({text: (this.human === winner) ? "win" : "lose"});
                    break;
                }
                case WinReason.maxGameCycle: {
                    gameLogObject.setTemplate("A cycle has been detected. You({0}) {1}!");
                    gameLogObject.addLabel({text: (this.human === Player.attacker) ? "attacker" : "defender"});
                    gameLogObject.addLabel({text: (this.human === winner) ? "win" : "lose"});
                    break;
                }
                case WinReason.trueFormula: {
                    gameLogObject.setTemplate("Reached true formula, {0}({1}) won!");
                    gameLogObject.addLabel({text: (this.computer === winner) ? "the AI" : "you"});
                    gameLogObject.addLabel({text: (winner === Player.attacker) ? "attacker" : "defender"});
                    break;
                }
                case WinReason.falseFormula: {
                    gameLogObject.setTemplate("Reached false formula, {0}({1}) won!");
                    gameLogObject.addLabel({text: (this.computer === winner) ? "the AI" : "you"});
                    gameLogObject.addLabel({text: (winner === Player.attacker) ? "attacker" : "defender"});
                    break;
                }

                case WinReason.stuck: {
                    gameLogObject.setTemplate("{0}({1}) {2} no available transitions. You {3}!");
                    gameLogObject.addLabel({text: (this.computer === winner) ? "You" : "The AI"});
                    gameLogObject.addLabel({text: (winner === Player.attacker) ? "defender" : "attacker"});
                    gameLogObject.addLabel({text: (this.computer === winner) ? "have" : "has"});
                    gameLogObject.addLabel({text: (this.computer === winner) ? "lose" : "win"});
                    break;
                }
                default: {
                    // TODO: Implemente default case
                    console.log("something went wrong");
                }
            }

            // gameLogObject.addLabel({text: gameLogObject.labelForProcess(this.hmlGameLogic.state.process), tag: "<span>", attr: [{name: "class", value: "ccs-tooltip-process"}]})
            // gameLogObject.addLabel({text: gameLogObject.labelForFormula(this.hmlGameLogic.state.formula), tag: "<span>", attr: [{name: "class", value: "monospace"}]});

            gameLogObject.addWrapper({tag: "<p>"/*, attr: [{name: "class", value: "outro"}]*/});
            this.gamelog.printToGameLog(gameLogObject);

        }

        private printCurrentConfig(process : CCS.Process, formula : HML.Formula, isNewRound = true) : void{
            /* Gamelog */
            var gameLogObject = new GUI.Widget.GameLogObject(this.graph);
            
            if(isNewRound)
                gameLogObject.setNewRound(true);
            
            gameLogObject.setTemplate("Current configuration: ({0}, {1}).");
            gameLogObject.addLabel({text: gameLogObject.labelForProcess(process), tag: "<span>", attr: [{name: "class", value: "ccs-tooltip-process"}]})
            gameLogObject.addLabel({text: gameLogObject.labelForFormula(formula), tag: "<span>", attr: [{name: "class", value: "monospace"}]});
            gameLogObject.addWrapper({tag: "<p>"});
            this.gamelog.printToGameLog(gameLogObject);
        }

        private prepareGuiForUserAction() {
            if(this.hmlGameLogic.getNextActionType() === ActionType.transition) {
                this.setActionWidget(this.transitionTable) // set widget to be transition table
                this.transitionTable.setTransitions(this.hmlGameLogic.state.process, this.hmlGameLogic.getAvailableTransitions());
            } 
            else if (this.hmlGameLogic.getNextActionType() === ActionType.formula) {
                this.setActionWidget(this.hmlselector) // set widget to be hml selector
                var successorFormulas = this.hmlGameLogic.getAvailableFormulas(this.hmlGameLogic.state.formulaSet);
                this.hmlselector.setFormula(successorFormulas);
            }
        }

        private setActionWidget(widget = null) : void {
            var injecter = $("#hml-game-status-right")[0];
            while (injecter.firstChild) {
                injecter.removeChild(injecter.firstChild);
            }
            if (widget) {
                injecter.appendChild(widget.getRootElement());
          }
        }

        private resize() : void {
            var $processExplorerCanvasContainer = $(this.processExplorer.getCanvasContainer()),
                explorerOffsetTop = $processExplorerCanvasContainer.offset().top,
                explorerOffsetBottom = $("#hml-game-status").height();
            
            var availableHeight = window.innerHeight - explorerOffsetTop - explorerOffsetBottom - 22;

            // Only 10px margin bot in fullscreen.
            if (this.fullscreen.isFullscreen())
                availableHeight += 10;
                        
            this.processExplorer.resize(this.$container.width(), availableHeight);
        }

        toString() {
            return "HML Game Activity";
        }
    }

    const enum Player {attacker, defender, judge};
    const enum ActionType {transition, formula, variable};
    const enum WinReason {minGameCycle, maxGameCycle, falseFormula, trueFormula, stuck};
    type Modality = HML.WeakExistsFormula | HML.WeakForAllFormula | HML.StrongExistsFormula | HML.StrongForAllFormula;
    type AndOrFormula = HML.DisjFormula | HML.ConjFormula;

    class Pair<P,Q> {
        constructor(public left : P, public right : Q) {
        }
    }

    class HmlGameState {
        constructor(public process : CCS.Process, 
                public formula : HML.Formula,
                public formulaSet : HML.FormulaSet, 
                public isMinGame : boolean) {}

        withProcess(process : CCS.Process) : HmlGameState {
            var result = this.clone();
            result.process = process;
            return result;
        }

        withFormula(formula : HML.Formula) : HmlGameState {
            var result = this.clone();
            result.formula = formula;
            return result;   
        }

        withMinMax(isMinGame : boolean) : HmlGameState {
            var result = this.clone();
            result.isMinGame = isMinGame;
            return result;      
        }

        private clone() : HmlGameState {
            var copy = new HmlGameState(
                this.process,
                this.formula,
                this.formulaSet,
                this.isMinGame
            );
            return copy;
        }

        toString() {
            var hmlNotationVisitor = new Traverse.HMLNotationVisitor();
            var processStr = (this.process instanceof CCS.NamedProcess) ? (<CCS.NamedProcess>this.process).name : this.process.id.toString();
            var formulaStr = hmlNotationVisitor.visit(this.formula);
            var isMinGameStr = this.isMinGame.toString();

            var result = "(" + processStr + "," + formulaStr + "," + isMinGameStr + ")";
            return result;
        }
    }

    class HmlGameLogic {
        public state : HmlGameState;
        private previousStates : HmlGameState[];
        private gameIsOver : boolean = false;
        private writeToGamelog : Function;
        private stopGame : Function;
        private strongSuccGen : CCS.SuccessorGenerator;
        private weakSuccGen : CCS.SuccessorGenerator;

        //private dGraph : dg.PlayableDependencyGraph; //TODO: fix this
        private dGraph : dg.PartialDependencyGraph;
        private dgNode : dg.MuCalculusNode;
        private root : dg.MuCalculusNode;
        private graph : CCS.Graph;
        private marking : dg.LevelMarking;
        private currentDgNodeId : dg.DgNodeId;
        private choiceDgNodeId : dg.DgNodeId;
        private cycleCache;
        private satisfied : boolean = false;


        constructor(process : CCS.Process, formula : HML.Formula, formulaSet : HML.FormulaSet, strongSuccGen : CCS.SuccessorGenerator, weakSuccGen : CCS.SuccessorGenerator, graph : CCS.Graph) {
            this.cycleCache = {};
            this.previousStates = [];
            this.state = new HmlGameState(process, formula, formulaSet, true);
            this.strongSuccGen = strongSuccGen;
            this.weakSuccGen = weakSuccGen;
            this.graph = graph;
            
            // this.round = 0;
            this.currentDgNodeId = 0;
            this.root = new dg.MuCalculusNode(this.state.process, this.state.formula, this.state.isMinGame)
            this.dgNode = this.root,
            this.dGraph = new dg.MuCalculusDG(strongSuccGen, weakSuccGen, formulaSet)
            this.marking = this.solveMuCalculus();
        }

        private solveMuCalculus() : dg.LevelMarking{
            return dg.liuSmolkaLocal2(this.dgNode, this.dGraph);
        }
        
        public getUniversalWinner() : Player {

            return (this.marking.getMarking(this.root) === this.marking.ONE) ? Player.defender : Player.attacker;
        }

        private popModalityFormula(hmlF : Modality) : HML.Formula {
            // this method can only be used on Modality formulas (such as <a>, [a], <<a>>, and [[a]])
            if (hmlF) {
                return hmlF.subFormula;
            }

            throw "Unhandled formula type in popModalityFormula";
        }

        public setGamelogWriter(gamelogger : Function) : void {
            this.writeToGamelog = gamelogger;
        }

        public AutoPlay(player : Player, exploreProcess? : Function) {
            if (player === Player.judge) throw "Judge may not auto play";
            var minimizeLevel = player === Player.defender; //TODO does this makes sense?
            var choice = this.getBestAIChoice(minimizeLevel);
            
            var actionType = this.getNextActionType();
            if (actionType === ActionType.transition) {
                //Find matching transition
                var transition = null;
                this.getAvailableTransitions().forEach(t => {
                    if (t.targetProcess.id === choice.process.id) {
                        transition = t;
                    }
                });
                if (!transition) throw "Missing Transition";
                this.selectedTransition(transition, exploreProcess);
            } else {
                this.selectedFormula(choice.formula);
            }
        }

        public selectedFormula(formula : HML.Formula) : void {
            if (this.gameIsOver) throw "Game has ended";

            var gameLogPlay = new GUI.Widget.GameLogObject(this.graph);
            gameLogPlay.setTemplate("{0} has chosen subformula {1}.")
            gameLogPlay.addWrapper({tag: "<p>"});
            gameLogPlay.addLabel({text: (this.getCurrentPlayer() === Player.attacker ? "Attacker" : "Defender")});
            gameLogPlay.addLabel({text: gameLogPlay.labelForFormula(formula), tag: "<span>", attr: [{name: "class", value: "monospace"}]});
            this.writeToGamelog(gameLogPlay);

            this.getChoices(this.dgNode);

            this.dgNode = this.dgNode.newWithFormula(formula);
            // The player selected a formula.
            this.previousStates.push(this.state);
            this.state = this.state.withFormula(formula);
        }

        public selectedTransition(transition : CCS.Transition, exploreProcess : Function) : void {
            if (this.gameIsOver) throw "Game has ended";          


            var gameLogPlay = new GUI.Widget.GameLogObject(this.graph);
            gameLogPlay.setTemplate("{0} played {1} {2} {3}.");
            gameLogPlay.addWrapper({tag: "<p>"});
            gameLogPlay.addLabel({text: (this.getCurrentPlayer() === Player.attacker ? "Attacker" : "Defender")});
            gameLogPlay.addLabel({text: gameLogPlay.labelForProcess(this.state.process), tag: "<span>", attr: [{name: "class", value: "ccs-tooltip-process"}]});
            if (this.isWeak()) {
                var actionTransition = "=" + transition.action.toString() + "=>";
                gameLogPlay.addLabel({text: actionTransition, tag: "<span>",attr: [{name: "class", value: "ccs-tooltip-data"},
                {name: "data-tooltip", value: Tooltip.strongSequence(<Traverse.WeakSuccessorGenerator>this.weakSuccGen, this.state.process, transition.action, transition.targetProcess)}]});
            } 
            else {
                gameLogPlay.addLabel({text: "-" + transition.action + "->", tag: "<span>", attr: [{name: "class", value: "monospace"}]});
            }
            gameLogPlay.addLabel({text: gameLogPlay.labelForProcess(transition.targetProcess), tag: "<span>", attr: [{name: "class", value: "ccs-tooltip-process"}]});
            this.writeToGamelog(gameLogPlay);

            this.getChoices(this.dgNode);

            var hmlSubF = this.popModalityFormula(<Modality> this.state.formula);
            this.previousStates.push(this.state);
            this.dgNode = this.dgNode.newWithFormula(hmlSubF).newWithProcess(transition.targetProcess);
            this.state = this.state.withFormula(hmlSubF).withProcess(transition.targetProcess);            

            exploreProcess(this.state.process); // explore the process.
        }

        private cycleExists() : boolean {
            var stateStr = this.state.toString()
            if (this.cycleCache[stateStr] != undefined) {
                // cycle detected
                return true;
            } else {
                this.cycleCache[stateStr] = this.state;
                return false;
            }
        }

        public isGameOver() : Pair<Player, WinReason> {
            // returns undefined/null if no winner.
            // otherwise return who won, and why.
            // true/false formula
            if (this.state.formula instanceof HML.FalseFormula) {
                this.gameIsOver = true;
                return new Pair(Player.attacker, WinReason.falseFormula); // attacker win
            } 
            else if (this.state.formula instanceof HML.TrueFormula) {
                this.gameIsOver = true;
                return new Pair(Player.defender, WinReason.trueFormula); // defender win
            }

            //stuck
            var availTranstition = this.getAvailableTransitions();
            if((!availTranstition || availTranstition.length <= 0) && this.getNextActionType() === ActionType.transition) {
                var currentPlayer = this.getCurrentPlayer();
                var winner = (currentPlayer === Player.attacker) ? Player.defender : Player.attacker;
                this.gameIsOver = true;
                return new Pair(winner, WinReason.stuck);
            }

            // infinite run
            if (this.cycleExists()) {
                if (this.state.isMinGame) {
                    // minGame
                    this.gameIsOver = true;
                    return new Pair(Player.attacker, WinReason.minGameCycle);
                } 
                else if (!this.state.isMinGame) {
                    // maxGame
                    this.gameIsOver = true;
                    return new Pair(Player.defender, WinReason.maxGameCycle);
                }
            }

            return null; // no winner
        }

        public getNextActionType() : ActionType {
            // what about true and false?
            var transitionMoves = [HML.StrongForAllFormula, HML.WeakForAllFormula, HML.StrongExistsFormula, HML.WeakExistsFormula];
            var formulaMoves = [HML.DisjFormula, HML.ConjFormula];
            var variableMoves = [HML.MinFixedPointFormula, HML.MaxFixedPointFormula, HML.VariableFormula];
            var isPrototypeOfCurrentFormula = (obj) => this.state.formula instanceof obj;

            if(transitionMoves.some(isPrototypeOfCurrentFormula)) return ActionType.transition;
            if(formulaMoves.some(isPrototypeOfCurrentFormula)) return ActionType.formula;
            if(variableMoves.some(isPrototypeOfCurrentFormula)) return ActionType.variable;
            throw "Unhandled formula type in getNextActionType";
            //Returns whether the next player is to select an action or formula or
        }

        public JudgeUnfold(hml : HML.Formula, hmlFSet : HML.FormulaSet) : HML.Formula {
            if (hml instanceof HML.MinFixedPointFormula) {
                // var describedEdges = this.getChoices(this.dgNode);
                // this.updateCurrentDgNode(hml.id, describedEdges);
                
                this.previousStates.push(this.state);
                this.state = this.state.withFormula(hml.subFormula).withMinMax(true);
                this.dgNode = this.dgNode.newWithFormula(hml.subFormula).newWithMinMax(true);
                return hml.subFormula;
            }
            else if (hml instanceof HML.MaxFixedPointFormula) {
                // var describedEdges = this.getChoices(this.dgNode);
                // this.updateCurrentDgNode(hml.id, describedEdges);
                
                this.previousStates.push(this.state);
                this.state = this.state.withFormula(hml.subFormula).withMinMax(false);
                this.dgNode = this.dgNode.newWithFormula(hml.subFormula).newWithMinMax(false);
                return hml.subFormula;
            } 
            else if (hml instanceof HML.VariableFormula) {
                // var describedEdges = this.getChoices(this.dgNode);
                // this.dgNode = this.dgNode.
                // this.updateCurrentDgNode(hml.id, describedEdges);

                var namedFormula = hmlFSet.formulaByName(hml.variable);
                if (namedFormula) {
                    if (namedFormula instanceof HML.MinFixedPointFormula || namedFormula instanceof HML.MaxFixedPointFormula) {
                        var unfolded = this.JudgeUnfold(namedFormula, hmlFSet);
                        /* Gamelog */
                        var gameLogPlay = new GUI.Widget.GameLogObject(this.graph);
                        gameLogPlay.setTemplate("We have unfolded {0} to {1}.")
                        gameLogPlay.addWrapper({tag: "<p>"});
                        gameLogPlay.addLabel({text: gameLogPlay.labelForFormula(hml), tag:"<span>", attr: [{name: "class", value: "monospace"}]});
                        // gameLogPlay.addLabel({text: " --> ", tag:"<span>", attr: [{name: "class", value: "monospace"}]});
                        gameLogPlay.addLabel({text: gameLogPlay.labelForFormula(unfolded), tag:"<span>", attr: [{name: "class", value: "monospace"}]});
                        this.writeToGamelog(gameLogPlay);

                        return unfolded;
                    }
                }
            }

            throw "Unhandled formula type in JudgeUnfold";
        }

        private updateCurrentDgNode(id : string, describedEdges): void {
            // update the currentDgNode after each play/unfolding.
            for (var descEdge in describedEdges){
                var hyberedge = describedEdges[descEdge];
                //loop through the target nodes, and find the selected subformula.
                //PROBLEM, what if there are two of the same subformula? whould this become a problem?
                for (var i = 0; i < hyberedge.nodeDescriptions.length; i++){
                    var dgNode = hyberedge.nodeDescriptions[i];
                    if(this.getNextActionType() === ActionType.formula || this.getNextActionType() === ActionType.variable) {
                        if (dgNode.formula.id === id){
                            this.currentDgNodeId = dgNode.nodeId;
                        }
                    }
                    else if(this.getNextActionType() === ActionType.transition) {
                        if (dgNode.process === id){
                            this.currentDgNodeId = dgNode.nodeId;
                        }
                    }
                }
            }
        }

        public getCurrentPlayer() : Player {
            var attackerMoves = [HML.ConjFormula, HML.StrongForAllFormula, HML.WeakForAllFormula, HML.FalseFormula];
            var defenderMoves = [HML.DisjFormula, HML.StrongExistsFormula, HML.WeakExistsFormula, HML.TrueFormula];
            var judgeMoves = [HML.MinFixedPointFormula, HML.MaxFixedPointFormula, HML.VariableFormula];
            var isPrototypeOfCurrentFormula = (obj) => this.state.formula instanceof obj;

            if (attackerMoves.some(isPrototypeOfCurrentFormula)) return Player.attacker;
            if (defenderMoves.some(isPrototypeOfCurrentFormula)) return Player.defender;
            if (judgeMoves.some(isPrototypeOfCurrentFormula)) return Player.judge;
            throw "Unhandled formula type in getCurrentPlayer";
        }

        public getAvailableTransitions() : CCS.Transition[] {
            if (this.getNextActionType() === ActionType.transition) {
                var hml = <Modality>this.state.formula;
                
                var allTransitions = null;
                if(this.isWeak()){
                    allTransitions = this.weakSuccGen.getSuccessors(this.state.process.id).toArray();
                } 
                else {
                    allTransitions = this.strongSuccGen.getSuccessors(this.state.process.id).toArray();
                }
                
                var availableTransitions = allTransitions.filter((transition) => hml.actionMatcher.matches(transition.action));
                return availableTransitions;
            }
            return null;
            throw "Unhandled formula type in getAvailableTransitions";
        }

        public isWeak() : boolean { 
            var weakMoves = [HML.WeakForAllFormula, HML.WeakExistsFormula];
            var strongMoves = [HML.StrongForAllFormula, HML.StrongExistsFormula];
            var isPrototypeOfCurrentFormula = (obj) => this.state.formula instanceof obj;

            if(weakMoves.some(isPrototypeOfCurrentFormula)) return true;
            if(strongMoves.some(isPrototypeOfCurrentFormula)) return false;

            throw "Unhandled formula type, in isWeak";
        }

        public getAvailableFormulas(hmlFSet : HML.FormulaSet) : HML.Formula[] {
            if (this.getNextActionType() === ActionType.formula) {            
                var hmlSuccGen = new Traverse.HMLSuccGenVisitor(hmlFSet);
                var formulaSuccessors = hmlSuccGen.visit(this.state.formula);

                return formulaSuccessors;
            }
            return null;
            throw "Unhandled formula type in getAvailableFormulas";
        }

        private getChoices(dgNode : dg.MuCalculusNode = this.dgNode) : any {
            var hyperEdges = this.dGraph.getHyperEdges(dgNode);
            //Due to the construction, all hyperedges are either of the
            //form [ [X], [Y], [Z], ...] or [ [X, Y, Z] ]
            var describedEdges = hyperEdges.map(hyperEdge => {
                //Get information about dg node and add level.
                hyperEdge.forEach(targetNode => {
                    targetNode.level = this.marking.getLevel(targetNode);
                });
                    
                var edgeDescription : any = {level: Infinity, nodeDescriptions: hyperEdge};
                // var max2 = (a, b) => Math.max(a,b);
                //Set max level for each hyperedge description
                edgeDescription.level = hyperEdge.reduce((maxDesc, otherDesc) => {
                    return otherDesc.level > maxDesc.level ? otherDesc : maxDesc;
                }).level;
                
                return edgeDescription;
            });

            // returns the set of hyperedges from where player can choose from.
            return describedEdges;
        }

        private getBestAIChoice(minimizeLevel : boolean) : any {
            var describedEdges = this.getChoices(this.dgNode);
            
            var isBetterFn = minimizeLevel ? ((x, y) => x.level < y.level) : ((x, y) => x.level > y.level);
            //Pick desired hyperedge
            var selectedHyperDescription = ArrayUtil.selectBest(describedEdges, isBetterFn);
            var selectedTargetDescription = ArrayUtil.selectBest(selectedHyperDescription.nodeDescriptions, isBetterFn);

            // this.choiceDgNodeId = selectedTargetDescription.nodeId;
            return selectedTargetDescription;
        }

    }
}
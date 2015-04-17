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
        private gamelog = new GUI.Widget.GameLog();

        private project : Project;
        private currentProcess : CCS.Process = null;
        private currentFormula : HML.Formula = null
        private currentFormulaSet : HML.FormulaSet = null;
        private hmlGameLogic : HmlGameLogic = null;
        private isWeak : boolean;

        private configuration = {
            processName: undefined,
            formulaId: undefined,
            formulaSetIndex: undefined,
            succGen: null
        };

        private $processList : JQuery;
        private $formulaList : JQuery;
        private optionsDom;
        private $restartBtn;
        private fullscreen;

        private human : Player = null;
        private computer : Player = null;

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

            /*Explorer*/
            $("#hml-game-main").append(this.processExplorer.getRootElement());
            /*Gamelog*/
            $("#hml-game-status-left").append(this.gamelog.getRootElement());
            
            /* Assign the restart button */
            this.$restartBtn = $("#hml-game-restart");
            this.$restartBtn.on("click", () => this.configure(this.configuration));

            this.fullscreen = new Fullscreen($("#hml-game-container")[0], $("#hml-game-fullscreen"), () => this.resize());
            
            this.transitionTable.onSelectListener = ((transition) => { 
                var state = this.hmlGameLogic.selectedTransition(transition); // return the new state
                this.currentFormula = state.formula; // has the modality <> [] popped 
                this.currentProcess = state.process;
                this.refresh(this.configuration);
            });

            this.hmlselector.onSelectListener = ((hmlSubFormula) => {
                var state = this.hmlGameLogic.selectedFormula(hmlSubFormula);
                this.currentFormula = state.formula;
                this.currentProcess = state.process; // should remain the same
                this.refresh(this.configuration);
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
            var configuration = Object.create(null),
                graph : ccs.Graph = Main.getGraph().graph;
            configuration.succGen = CCS.getSuccGenerator(graph, {succGen: "strong", reduce: false});
            configuration.processName = this.getNamedProcessList()[0];
            configuration.formulaSetIndex = this.getSelectedFormulaSetIndex() >= 0 ? this.getSelectedFormulaSetIndex() : 0;
            configuration.formulaId = this.getFormulaSetList()[configuration.formulaSetIndex].getTopFormula().id;
            return configuration;
        }

        private getProcessListValue() : string {
            /*Returns the value from the processlist*/
            return this.$processList.val();
        }

        private getSelectedFormulaSetIndex() : number {
            /*Returns the value(the index of the formulaSet in this.getFormulaSetList()) from the formulalist*/
            return parseInt(this.$formulaList.val());
        }

        private getSelectedFormulaSet() : HML.FormulaSet {
            return this.getFormulaSetList()[this.getSelectedFormulaSetIndex()];
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

        private setFormulas(hmlFormulaSets : HML.FormulaSet[], selectecHMLSetIndex : number) : void {
            this.$formulaList.empty();
            hmlFormulaSets.forEach((hmlFSet, index) => {
                var hmlvisitor = new Traverse.HMLNotationVisitor();
                var formulaStr = Traverse.safeHtml(hmlvisitor.visit(hmlFSet.getTopFormula()))
                var optionsNode = $("<option></option>").attr("value", index).append(formulaStr);
                if(index === selectecHMLSetIndex) {
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
            configuration.formulaSetIndex = this.getSelectedFormulaSetIndex();
            configuration.formulaId = this.getSelectedFormulaSet().getTopFormula().id;
        }

        private setCurrentProcFromProcesslist() : void {
            /*Updates the this.currentProcess with the newly selected process in processlist */
            this.currentProcess = this.configuration.succGen.getProcessByName(this.getProcessListValue());
        }

        private setCurrentFormulaFromFormulalist() : void {
            this.currentFormulaSet = this.getSelectedFormulaSet();
            //this.hmlselector.setFormulaSet(this.currentFormulaSet);
            this.currentFormula = this.currentFormulaSet.getTopFormula();
        }

        private configure(configuration) : void {
            //This is/should-only-be called for change in either process, formula or succ generator.
            this.configuration = configuration;
            
            /*Fill the dropdown list with infomation*/            
            this.setProcesses(this.getNamedProcessList(), configuration.processName);
            this.setFormulas(this.getFormulaSetList(), configuration.formulaSetIndex);
            
            /*Set the currentFormula/Process */
            this.currentProcess = configuration.succGen.getProcessByName(configuration.processName);
            this.currentFormulaSet = this.getFormulaSetList()[configuration.formulaSetIndex];
            this.hmlselector.setFormulaSet(this.currentFormulaSet);
            this.currentFormula = this.currentFormulaSet.getTopFormula();

            this.processExplorer.setSuccGenerator(this.configuration.succGen);
            this.isWeak = false;
            this.processExplorer.exploreProcess(this.currentProcess); // explore the current selected process

            this.hmlGameLogic = new HmlGameLogic(this.currentProcess, this.currentFormula, 
                                                 this.currentFormulaSet, configuration.succGen, Main.getGraph().graph);
            this.hmlGameLogic.setGamelogWriter((gameLogObject) => this.gamelog.printToGameLog(gameLogObject));
            
            this.computer = this.hmlGameLogic.getUniversalWinner();
            this.human = (this.computer === Player.attacker) ? Player.defender : Player.attacker;

            /* Gamelog */
            this.gamelog.clear();
            // print the intro
            var gameIntro = new GUI.Widget.GameLogObject()
            gameIntro.setTemplate("You are playing {0} in {1} HML game.")
            gameIntro.addLabel({text: (this.human === Player.defender ? "defender" : "attacker")});
            gameIntro.addLabel({text: (this.isWeak ? "weak" : "strong")});
            this.gamelog.printToGameLog(gameIntro);

            this.refresh(configuration);
        }


        private refresh(configuration) : void {
            /* E-xplores the currentProcess and updates the transitiontable with its successors transitions*/
            
            var isGameOver = this.hmlGameLogic.isGameOver();
            if(isGameOver) {
                this.setActionWidget() // clear the widget div
                var winner : Player = isGameOver.left;
                var winReason = isGameOver.right;
                var gameOver = new GUI.Widget.GameLogObject();

                /* Gamelog */
                if (winReason === WinReason.minGameCycle || winReason === WinReason.maxGameCycle) {
                    gameOver.setTemplate("A cycle has been detected. {0}!");
                    if(winReason === WinReason.minGameCycle){
                        gameOver.addLabel({text: (this.human === winner) ? "You win" : "You lose"})
                    }
                    else{
                        gameOver.addLabel({text: (this.human === winner) ? "You win" : "You lose"})
                    }                 
                }
                else {
                    gameOver.setTemplate("{0} no available transitions. You {1}!");
                    gameOver.addLabel({text: (this.human === winner) ? ((this.computer === Player.defender) ? "Defender has" : "Attacker has") : "You have"});
                    gameOver.addLabel({text: (this.human === winner) ? "win" : "lose"});
                }

                this.gamelog.printToGameLog(gameOver);
            }
            else {
                var currentPlayer = this.hmlGameLogic.getCurrentPlayer();

                /* Gamelog */
                var gameConfig = new GUI.Widget.GameLogObject();
                gameConfig.addHeader({text: "Round 0", tag: "<h4>"});
                gameConfig.setTemplate("Current configuration: ({0}, {1}).");
                gameConfig.addLabel({text: gameConfig.labelForProcess(this.currentProcess), tag: "<span>", attr: [{name: "class", value: "ccs-tooltip-process"}]})
                gameConfig.addLabel({text: gameConfig.labelForFormula(this.currentFormula), tag: "<span>", attr: [{name: "class", value: "monospace"}]});
                gameConfig.addClass("<p>");

                this.gamelog.printToGameLog(gameConfig);

                if(currentPlayer === this.computer) {
                    // this.hmlGameLogic.AutoPlay(this.computer);
                    this.prepareGuiForUserAction();
                } 
                else if(currentPlayer === this.human) {
                    this.prepareGuiForUserAction();
                }
                else if(currentPlayer === Player.judge) {
                    // Judge plays
                    this.currentFormula = this.hmlGameLogic.JudgeUnfold(this.currentFormula, this.currentFormulaSet);
                    this.refresh(this.configuration);
                }
            } 
            
            this.processExplorer.exploreProcess(this.currentProcess);
        }

        private prepareGuiForUserAction() {
            if(this.hmlGameLogic.getNextActionType() === ActionType.transition) {
                this.setActionWidget(this.transitionTable) // set widget to be transition table
                this.transitionTable.setTransitions(this.hmlGameLogic.getAvailableTransitions());
                this.processExplorer.focusOnProcess(this.currentProcess);
            } 
            else if (this.hmlGameLogic.getNextActionType() === ActionType.formula) {
                this.setActionWidget(this.hmlselector) // set widget to be hml selector
                var successorFormulas = this.hmlGameLogic.getAvailableFormulas(this.currentFormulaSet);
                this.hmlselector.setFormula(successorFormulas);
            }
        }

        /*private WriteToGamelog(state : HmlGameState, currentPlayer? : Player) : void {
            
            console.log("Gamelog: ", Gamelogobject);
        }*/

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

    class GameLogObject {
        constructor(public content : string) {
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
                public isMinGame : boolean){}

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
        private state : HmlGameState;
        private previousStates : HmlGameState[] = [];
        private gameIsOver : boolean = false;
        private writeToGamelog : Function;
        private stopGame : Function;
        private succGen : CCS.SuccessorGenerator;
        private dGraph : dg.PlayableDependencyGraph;
        private marking : dg.LevelMarking;
        private satisfied : boolean = false;
        private currentDgNodeId : dg.DgNodeId
        private cycleCache;


        constructor(process : CCS.Process, formula : HML.Formula, formulaSet : HML.FormulaSet, succGen : CCS.SuccessorGenerator, graph : CCS.Graph) {
            this.cycleCache = {};
            this.state = new HmlGameState(process, formula, formulaSet, true);
            this.succGen = succGen;
            
            // this.round = 0;
            this.currentDgNodeId = 0;
            this.dGraph = this.createDependencyGraph(graph, this.state.process, this.state.formula); 
            this.marking = this.createMarking();
        }

        private createDependencyGraph(graph : CCS.Graph, process : CCS.Process, formula : HML.Formula) : dg.PlayableDependencyGraph {
            var strongSuccGen = CCS.getSuccGenerator(graph, {succGen: "strong", reduce: false});
            var weakSuccGen = CCS.getSuccGenerator(graph, {succGen: "weak", reduce: false});
            return new dg.MuCalculusMinModelCheckingDG(strongSuccGen, weakSuccGen, process.id, this.state.formulaSet, formula);
        }

        private createMarking() : dg.LevelMarking {
            var marking = dg.liuSmolkaLocal2(this.currentDgNodeId, this.dGraph);
            this.satisfied = marking.getMarking(0) === marking.ONE;
            return marking;
        }

        public getUniversalWinner() : Player {
            return this.satisfied ? Player.defender : Player.attacker;
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

        public AutoPlay(player : Player) {
            if (player === Player.attacker) {
                var attkChoices = this.dGraph.getAttackerOptions(this.currentDgNodeId);
                var winChoice = this.winningAttack(attkChoices);
            } 
            else if(player === Player.defender) {
                var defChoices = this.dGraph.getDefenderOptions(this.currentDgNodeId);
                var winChoice = this.winningDefend(defChoices);
            } 
            else {
                throw "Unhandled player type in AutoPlay";
            }
        }

        public selectedFormula(formula : HML.Formula) : HmlGameState {
            if(!this.gameIsOver){
                
                /* Gamelog */
                var gameLogPlay = new GUI.Widget.GameLogObject();
                gameLogPlay.setTemplate("{0} has chosen subformula {1}.")
                gameLogPlay.addClass("<p>");
                gameLogPlay.addLabel({text: (this.getCurrentPlayer() === Player.attacker ? "Attacker" : "Defender")});
                gameLogPlay.addLabel({text: gameLogPlay.labelForFormula(formula), tag: "<span>", attr: [{name: "class", value: "monospace"}]});
                this.writeToGamelog(gameLogPlay);

                // The player selected a formula.
                this.previousStates.push(this.state);
                this.state = new HmlGameState(this.state.process, formula, this.state.formulaSet, this.state.isMinGame);
                
                return this.state;
            }

            throw "Game has ended";
        }

        public selectedTransition(transition : CCS.Transition) : HmlGameState {
            // The player selected a transition
            if (!this.gameIsOver) {

                /* Gamelog */
                var gameLogPlay = new GUI.Widget.GameLogObject();
                gameLogPlay.setTemplate("{0} played {1} {2} {3}.");
                gameLogPlay.addClass("<p>");
                gameLogPlay.addLabel({text: (this.getCurrentPlayer() === Player.attacker ? "Attacker" : "Defender")});
                gameLogPlay.addLabel({text: gameLogPlay.labelForProcess(this.state.process), tag: "<span>", attr: [{name: "class", value: "ccs-tooltip-process"}]});
                gameLogPlay.addLabel({text: "-" + transition.action + "->", tag: "<span>", attr: [{name: "class", value: "monospace"}]});
                gameLogPlay.addLabel({text: gameLogPlay.labelForProcess(transition.targetProcess), tag: "<span>", attr: [{name: "class", value: "ccs-tooltip-process"}]});
                this.writeToGamelog(gameLogPlay);

                var hmlSubF = this.popModalityFormula(<Modality> this.state.formula);
                this.previousStates.push(this.state);
                this.state = new HmlGameState(transition.targetProcess, hmlSubF, this.state.formulaSet, this.state.isMinGame);

                return this.state;
            }

            throw "Game has ended";
        }

        private cycleExists() : boolean {
            var stateStr = this.state.toString()
            console.log(stateStr);
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
            
            // infinite run
            if(this.cycleExists()){
                if (this.state.isMinGame) {
                    this.gameIsOver = true;
                    return new Pair(Player.defender, WinReason.minGameCycle);
                } else {
                    this.gameIsOver = true;
                    return new Pair(Player.attacker, WinReason.maxGameCycle);
                }
            }

            // true/false formula
            if(this.state.formula instanceof HML.FalseFormula) {
                this.gameIsOver = true;
                return new Pair(Player.attacker, WinReason.falseFormula); // attacker win
            } 
            else if (this.state.formula instanceof HML.TrueFormula) {
                this.gameIsOver = true;
                return new Pair(Player.defender, WinReason.trueFormula); // defender win
            }

            //stuck
            var availTranstition = this.getAvailableTransitions() 
            if((!availTranstition || availTranstition.length <= 0) && this.getNextActionType() === ActionType.transition) {
                var currentPlayer = this.getCurrentPlayer();
                var winner = (currentPlayer === Player.attacker) ? Player.defender : Player.attacker;
                this.gameIsOver = true;
                return new Pair(winner, WinReason.stuck);
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
                this.previousStates.push(this.state);
                this.state = new HmlGameState(this.state.process, hml.subFormula, this.state.formulaSet, true);
                return hml.subFormula;
            }
            else if (hml instanceof HML.MaxFixedPointFormula) {
                this.previousStates.push(this.state);
                this.state = new HmlGameState(this.state.process, hml.subFormula, this.state.formulaSet, false);
                return hml.subFormula;
            } 
            else if (hml instanceof HML.VariableFormula) {
                var namedFormula = hmlFSet.formulaByName(hml.variable);
                if (namedFormula) {
                    if (namedFormula instanceof HML.MinFixedPointFormula || namedFormula instanceof HML.MaxFixedPointFormula) {
                        var unfolded = this.JudgeUnfold(namedFormula, hmlFSet);
                        /* Gamelog */
                        var gameLogPlay = new GUI.Widget.GameLogObject();
                        gameLogPlay.setTemplate("Judge unfolds {0} {1} {2}.")
                        gameLogPlay.addClass("<p>");
                        gameLogPlay.addLabel({text: gameLogPlay.labelForFormula(hml), tag:"<span>", attr: [{name: "class", value: "monospace"}]});
                        gameLogPlay.addLabel({text: " --> ", tag:"<span>", attr: [{name: "class", value: "monospace"}]});
                        gameLogPlay.addLabel({text: gameLogPlay.labelForFormula(unfolded), tag:"<span>", attr: [{name: "class", value: "monospace"}]});
                        this.writeToGamelog(gameLogPlay);

                        return unfolded;
                    }
                }
            }

            throw "Unhandled formula type in JudgeUnfold";
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
            if(this.getNextActionType() === ActionType.transition) {
                var hml = <Modality>this.state.formula;
                var allTransitions = this.succGen.getSuccessors(this.state.process.id).toArray();
                var availableTransitions = allTransitions.filter((transition) => hml.actionMatcher.matches(transition.action));
                return availableTransitions;
            }
            return null
            throw "Unhandled formula type in getAvailableTransitions";
        }

        public getAvailableFormulas(hmlFSet : HML.FormulaSet) : HML.Formula[] {
            if(this.getNextActionType() === ActionType.formula) {            
                var hmlSuccGen = new Traverse.HMLSuccGenVisitor(hmlFSet);
                var formulaSuccessors = hmlSuccGen.visit(this.state.formula);

                return formulaSuccessors;
            }
            return null;
            throw "Unhandled formula type in getAvailableFormulas";
        }

        private winningDefend(choices : any) : void {
            var choice = this.getWinningDefend(choices);
            // game.play(this, choice.targetProcess, choice.nextNode);
        }

        private winningAttack(choices : any) : void {
            var choice : any = this.getWinningAttack(choices);
            // var move : Move = choice.move == 1 ? Move.Left : Move.Right; // 1: left, 2: right
            
            // game.play(this, choice.targetProcess, choice.nextNode, choice.action, move);
        }

        private getWinningAttack(choices : any) : any {
            if (choices.length == 0)
                throw "No choices for attacker";
            
            var bestCandidateIndex = 0;
            var bestCandidateLevel = Infinity;
            var ownLevel = this.marking.getLevel(this.currentDgNodeId);
            
            choices.forEach((choice, i) => {
                var targetNodeLevel = this.marking.getLevel(choice.nextNode);
                
                if (targetNodeLevel < ownLevel && targetNodeLevel < bestCandidateLevel) {
                    bestCandidateLevel = targetNodeLevel;
                    bestCandidateIndex = i;
                }
            });
            
            return choices[bestCandidateIndex];
        }

        private getWinningDefend(choices : any) : any {
            for (var i = 0; i < choices.length; i++) {
                if (this.marking.getMarking(choices[i].nextNode) === this.marking.ZERO) {
                    return choices[i];
                }
            }
            
            throw "No defender moves";
        }
    }
}
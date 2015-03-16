/// <reference path="../../lib/util.d.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../gui/arbor/arbor.ts" />
/// <reference path="../gui/arbor/renderer.ts" />
/// <reference path="activity.ts" />
/// <reference path="fullscreen.ts" />
/// <reference path="tooltip.ts" />

module Activity {

    import dg = DependencyGraph;

    export class Game extends Activity {
        private project : Project;
        private changed : boolean;
        private graph : CCS.Graph;
        private succGen : CCS.SuccessorGenerator;
        private dgGame : DgGame;
        private fullscreen : Fullscreen;
        private tooltip : Tooltip;
        private timeout : any;
        private $gameType : JQuery;
        private $leftProcessList : JQuery;
        private $rightProcessList : JQuery;
        private $playerType : JQuery;
        private $restart : JQuery;
        private $leftContainer : JQuery;
        private $rightContainer : JQuery;
        private $leftZoom : JQuery;
        private $rightZoom : JQuery;
        private $leftDepth : JQuery;
        private $rightDepth : JQuery;
        private $leftFreeze : JQuery;
        private $rightFreeze : JQuery;
        private leftCanvas : HTMLCanvasElement;
        private rightCanvas : HTMLCanvasElement;
        private leftRenderer: Renderer;
        private rightRenderer : Renderer;
        private leftGraph: GUI.ProcessGraphUI;
        private rightGraph: GUI.ProcessGraphUI;
        
        constructor(container : string, button : string) {
            super(container, button);

            this.project = Project.getInstance();
            this.fullscreen = new Fullscreen($("#game-container")[0], $("#game-fullscreen"), () => this.resize(null, null));
            this.tooltip = new Tooltip($("#game-status"));

            this.$gameType = $("#game-type");
            this.$leftProcessList = $("#game-left-process");
            this.$rightProcessList = $("#game-right-process");
            this.$playerType = $("input[name=player-type]");
            this.$restart = $("#game-restart");
            this.$leftContainer = $("#game-left-canvas");
            this.$rightContainer = $("#game-right-canvas");
            this.$leftZoom = $("#zoom-left");
            this.$rightZoom = $("#zoom-right");
            this.$leftDepth = $("#depth-left");
            this.$rightDepth = $("#depth-right");
            this.$leftFreeze = $("#freeze-left");
            this.$rightFreeze = $("#freeze-right");
            this.leftCanvas = <HTMLCanvasElement> this.$leftContainer.find("canvas")[0];
            this.rightCanvas = <HTMLCanvasElement> this.$rightContainer.find("canvas")[0];

            this.leftRenderer = new Renderer(this.leftCanvas);
            this.rightRenderer = new Renderer(this.rightCanvas);
            this.leftGraph = new GUI.ArborGraph(this.leftRenderer);
            this.rightGraph = new GUI.ArborGraph(this.rightRenderer);

            this.$gameType.on("change", () => this.newGame(true, true));
            this.$leftProcessList.on("change", () => this.newGame(true, false));
            this.$rightProcessList.on("change", () => this.newGame(false, true));
            this.$playerType.on("change", () => this.newGame(false, false));
            this.$restart.on("click", () => this.newGame(false, false));
            this.$rightDepth.on("change", () => this.setDepth(this.dgGame.getCurrentConfiguration().right, this.rightGraph, this.$rightDepth.val(), Move.Right));
            this.$leftFreeze.on("click", (e) => this.toggleFreeze(this.leftGraph, !this.$leftFreeze.data("frozen"), $(e.currentTarget)));
            this.$rightFreeze.on("click", (e) => this.toggleFreeze(this.rightGraph, !this.$rightFreeze.data("frozen"), $(e.currentTarget)));

            // Manually remove focus from depth input when the canvas is clicked.
            $(this.leftCanvas).on("click", () => {if (this.$leftDepth.is(":focus")) this.$leftDepth.blur()});
            $(this.rightCanvas).on("click", () => {if (this.$rightDepth.is(":focus")) this.$rightDepth.blur()});

            this.$leftDepth.on("change", () => {
                this.validateDepth(this.$leftDepth);
                this.setDepth(this.dgGame.getCurrentConfiguration().left, this.leftGraph, this.$leftDepth.val(), Move.Left);
            });

            this.$rightDepth.on("change", () => {
                this.validateDepth(this.$rightDepth);
                this.setDepth(this.dgGame.getCurrentConfiguration().right, this.rightGraph, this.$rightDepth.val(), Move.Right);
            });

            // Use onchange instead of oninput for IE.
            if (navigator.userAgent.indexOf("MSIE ") > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
                this.$leftZoom.on("change", () => this.resize(this.$leftZoom.val(), null));
                this.$rightZoom.on("change", () => this.resize(null, this.$rightZoom.val()));
            } else {
                this.$leftZoom.on("input", () => this.resize(this.$leftZoom.val(), null));
                this.$rightZoom.on("input", () => this.resize(null, this.$rightZoom.val()));
            }

            $(document).on("ccs-changed", () => this.changed = true);
        }

        private setDepth(process : CCS.Process, graph : GUI.ProcessGraphUI, depth : number, move : Move) : void {
            this.clear(graph);
            this.draw(process, graph, depth);
            this.centerNode(process, move);

            if (move === Move.Left)
                this.toggleFreeze(graph, false, this.$leftFreeze);
            else
                this.toggleFreeze(graph, false, this.$rightFreeze);
        }

        private validateDepth(input : JQuery) : void {
            if (!/^[0-9]+$/.test(input.val())) {
                input.val("5");
            }
        }

        private toggleFreeze(graph : GUI.ProcessGraphUI, freeze : boolean, button : JQuery) : void {
            if (freeze) {
                graph.freeze();
                button.find("i").replaceWith("<i class='fa fa-lock fa-lg'></i>");
            } else {
                graph.unfreeze();
                button.find("i").replaceWith("<i class='fa fa-unlock-alt fa-lg'></i>");
            }

            button.data("frozen", freeze);
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
            $(window).on("resize", () => this.resize(this.$leftZoom.val(), this.$rightZoom.val()));
            
            this.fullscreen.onShow();
            
            if (this.changed || configuration) {
                this.changed = false;
                this.graph = this.project.getGraph();
                this.displayOptions();
                this.newGame(true, true, configuration);
            }
            
            this.tooltip.setGraph(this.graph);

            this.leftGraph.setOnSelectListener((processId) => {
                if (this.leftGraph.getProcessDataObject(processId.toString()).status === "unexpanded")
                    this.draw(this.graph.processById(processId), this.leftGraph, this.$leftDepth.val());
            });

            this.rightGraph.setOnSelectListener((processId) => {
                if (this.rightGraph.getProcessDataObject(processId.toString()).status === "unexpanded")
                    this.draw(this.graph.processById(processId), this.rightGraph, this.$rightDepth.val());
            });

            // Ugly copy/paste. Fix later.
            this.leftGraph.setHoverOnListener((processId) => {
                this.timeout = setTimeout(() => {
                    var tooltip = $("#canvas-tooltip-left");
                    var process = this.graph.processById(parseInt(processId));
                    var position = this.leftGraph.getPosition(processId);
                    tooltip.css("top", position.y - 45 - this.$leftContainer.scrollTop());
                    tooltip.css("left", position.x - 10 - this.$leftContainer.scrollLeft());
                    tooltip.html(this.tooltip.ccsNotationForProcessId(processId));
                    tooltip.show();
                }, 1000);
            });

            this.leftGraph.setHoverOutListener(() => {
                clearTimeout(this.timeout);
                $("#canvas-tooltip-left").hide();
            });

            this.rightGraph.setHoverOnListener((processId) => {
                this.timeout = setTimeout(() => {
                    var tooltip = $("#canvas-tooltip-right");
                    var process = this.graph.processById(parseInt(processId));
                    var position = this.rightGraph.getPosition(processId);
                    tooltip.css("top", position.y - 45 - this.$rightContainer.scrollTop());
                    tooltip.css("left", position.x - 10 - this.$rightContainer.scrollLeft());
                    tooltip.html(this.tooltip.ccsNotationForProcessId(processId));
                    tooltip.show();
                }, 1000);
            });

            this.rightGraph.setHoverOutListener(() => {
                clearTimeout(this.timeout);
                $("#canvas-tooltip-right").hide();
            });
            
            this.leftGraph.bindCanvasEvents();
            this.rightGraph.bindCanvasEvents();
        }

        public onHide() : void {
            $(window).off("resize");
            
            this.fullscreen.onHide();

            this.leftGraph.clearOnSelectListener();
            this.rightGraph.clearOnSelectListener();
            this.leftGraph.clearHoverOnListener();
            this.rightGraph.clearHoverOnListener();
            this.leftGraph.clearHoverOutListener();
            this.rightGraph.clearHoverOutListener();

            this.leftGraph.unbindCanvasEvents();
            this.rightGraph.unbindCanvasEvents();
        }

        private displayOptions() : void {
            var processes = this.graph.getNamedProcesses().reverse();
            
            this.$leftProcessList.empty();
            this.$rightProcessList.empty();

            for (var i = 0; i < processes.length; i++) {
                this.$leftProcessList.append($("<option></option>").append(processes[i]));
                this.$rightProcessList.append($("<option></option>").append(processes[i]));
            }

            // Set second option as default selection for the right process.
            this.$rightProcessList.find("option:nth-child(2)").prop("selected", true);
        }

        private getOptions() : any {
            return {
                gameType: this.$gameType.val(),
                leftProcess: this.$leftProcessList.val(),
                rightProcess: this.$rightProcessList.val(),
                playerType: this.$playerType.filter(":checked").val()
            };
        }

        private setOptions(options : any) : void {
            this.$gameType.find("option[value=" + options.gameType + "]").prop("selected", true);

            // Bootstrap radio buttons only support changes via click events.
            // Manually handle .active class.
            this.$playerType.each(function() {
                if ($(this).attr("value") === options.playerType) {
                    $(this).parent().addClass("active");
                } else {
                    $(this).parent().removeClass("active");
                }
            });

            this.$leftProcessList.val(options.leftProcess);
            this.$rightProcessList.val(options.rightProcess);
        }

        private newGame(drawLeft : boolean, drawRight : boolean, configuration? : any) : void {
            var options;

            if (configuration) {
                options = configuration;
                this.setOptions(options);
            } else {
                options = this.getOptions();
            }

            this.succGen = CCS.getSuccGenerator(this.graph, {succGen: "strong", reduce: false});

            if (drawLeft || !this.leftGraph.getNode(this.succGen.getProcessByName(options.leftProcess).id.toString())) {
                this.clear(this.leftGraph);
                this.draw(this.succGen.getProcessByName(options.leftProcess), this.leftGraph, this.$leftDepth.val());
                this.resize(1, null);
                this.toggleFreeze(this.leftGraph, false, this.$leftFreeze);
            }

            if (drawRight || !this.rightGraph.getNode(this.succGen.getProcessByName(options.rightProcess).id.toString())) {
                this.clear(this.rightGraph);
                this.draw(this.succGen.getProcessByName(options.rightProcess), this.rightGraph, this.$rightDepth.val())
                this.resize(null, 1);
                this.toggleFreeze(this.rightGraph, false, this.$rightFreeze);
            }
            
            var attackerSuccessorGenerator : CCS.SuccessorGenerator = CCS.getSuccGenerator(this.graph, {succGen: "strong", reduce: false});
            var defenderSuccessorGenerator : CCS.SuccessorGenerator = CCS.getSuccGenerator(this.graph, {succGen: options.gameType, reduce: false});

            if (this.dgGame !== undefined) {this.dgGame.stopGame()};
            
            this.dgGame = new BisimulationGame(this, this.graph, attackerSuccessorGenerator, defenderSuccessorGenerator, options.leftProcess, options.rightProcess, options.gameType);
            
            var attacker : Player;
            var defender : Player;
            
            if (options.playerType === "defender") {
                attacker = new Computer(PlayType.Attacker);
                defender = new Human(PlayType.Defender, this);
            } else {
                attacker = new Human(PlayType.Attacker, this);
                defender = new Computer(PlayType.Defender);
            }
            
            this.dgGame.setPlayers(attacker, defender);
            this.dgGame.startGame();
        }

        private draw(process : CCS.Process, graph : GUI.ProcessGraphUI, depth : number) : void {
            var allTransitions = this.expandBFS(process, depth);

            for (var fromId in allTransitions) {
                var fromProcess = this.graph.processById(fromId);
                this.showProcess(fromProcess, graph);
                this.showProcessAsExplored(fromProcess, graph);
                var groupedByTargetProcessId = ArrayUtil.groupBy(allTransitions[fromId].toArray(), t => t.targetProcess.id);

                Object.keys(groupedByTargetProcessId).forEach(strProcId => {
                    var group = groupedByTargetProcessId[strProcId],
                        data = group.map(t => {return {label: t.action.toString()}}),
                        numId = parseInt(strProcId, 10);
                    this.showProcess(this.graph.processById(numId), graph);
                    graph.showTransitions(fromProcess.id, numId, data);
                });
            }

            this.highlightNodes();
        }

        private showProcess(process : CCS.Process, graph : GUI.ProcessGraphUI) : void {
            if (graph.getProcessDataObject(process.id)) return;
            graph.showProcess(process.id, {label: this.labelFor(process), status: "unexpanded"});
        }

        private showProcessAsExplored(process : CCS.Process, graph : GUI.ProcessGraphUI) : void {
            graph.getProcessDataObject(process.id).status = "expanded";
        }

        public highlightNodes() : void {
            if (!this.dgGame)
                return;

            var configuration = this.dgGame.getCurrentConfiguration();
            var leftData = this.leftGraph.getProcessDataObject(configuration.left.id.toString());
            var rightData = this.rightGraph.getProcessDataObject(configuration.right.id.toString());

            if (leftData && leftData.status === "unexpanded") {
                this.draw(configuration.left, this.leftGraph, this.$leftDepth.val());
            } else if (rightData && rightData.status === "unexpanded") {
                this.draw(configuration.right, this.rightGraph, this.$rightDepth.val());
            }

            this.leftGraph.setSelected(configuration.left.id.toString());
            this.rightGraph.setSelected(configuration.right.id.toString());
        }

        public highlightChoices(isLeft : boolean, targetId : string) : void {
            if (isLeft) {
                this.leftGraph.setHover(targetId); 
            } else {
                this.rightGraph.setHover(targetId);
            }
        }

        public removeHighlightChoices(isLeft : boolean) : void {
            if(isLeft) {
                this.leftGraph.clearHover();
            } else {
                this.rightGraph.clearHover();
            }
        }

        private clear(graph : GUI.ProcessGraphUI) : void {
            graph.clearAll();
        }

        private expandBFS(process : CCS.Process, maxDepth : number) : any {
            var result = {},
                queue = [[1, process]], //non-emptying array as queue.
                depth, qIdx, fromProcess, transitions;
            for (qIdx = 0; qIdx < queue.length; qIdx++) {
                depth = queue[qIdx][0];
                fromProcess = queue[qIdx][1];
                result[fromProcess.id] = transitions = this.succGen.getSuccessors(fromProcess.id);
                transitions.forEach(t => {
                    if (!result[t.targetProcess.id] && depth < maxDepth) {
                        queue.push([depth + 1, t.targetProcess]);
                    }
                });
            }
            return result;
        }

        private labelFor(process : CCS.Process) : string {
            return (process instanceof CCS.NamedProcess) ? (<CCS.NamedProcess> process).name : process.id.toString();
        }

        public centerNode(process : CCS.Process, move : Move) : void {
            if (move === Move.Left) {
                var position = this.leftGraph.getPosition(process.id.toString());
                this.$leftContainer.scrollLeft(position.x - (this.$leftContainer.width() / 2));
                this.$leftContainer.scrollTop(position.y - (this.$leftContainer.height() / 2));
            } else {
                var position = this.rightGraph.getPosition(process.id.toString());
                this.$rightContainer.scrollLeft(position.x - (this.$rightContainer.width() / 2));
                this.$rightContainer.scrollTop(position.y - (this.$rightContainer.height() / 2));
            }
        }

        private resize(leftZoom : number, rightZoom : number) : void {
            var offsetTop = $("#game-main").offset().top;
            var offsetBottom = $("#game-status").height();

            var availableHeight = window.innerHeight - offsetTop - offsetBottom - 22; // Margin bot + border = 22px.
            
            // Only 10px margin bot in fullscreen.
            if (this.fullscreen.isFullscreen())
                availableHeight += 10;

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
                    $("#game-left .input-group").css("right", 30);
                    this.$leftContainer.css("overflow", "auto");
                    this.centerNode(this.dgGame.getCurrentConfiguration().left, Move.Left);
                } else {
                    $("#game-left .input-group").css("right", 10);
                    this.$leftContainer.css("overflow", "hidden");
                }
            }

            if (rightZoom !== null) {
                this.$rightZoom.val(rightZoom.toString());
                this.rightCanvas.width = this.$rightContainer.width() * rightZoom;
                this.rightCanvas.height = height * rightZoom;
                this.rightRenderer.resize(this.rightCanvas.width, this.rightCanvas.height);

                if (rightZoom > 1) {
                    $("#game-right .input-group").css("right", 30);
                    this.$rightContainer.css("overflow", "auto");
                    this.centerNode(this.dgGame.getCurrentConfiguration().right, Move.Right);
                } else {
                    $("#game-right .input-group").css("right", 10);
                    this.$rightContainer.css("overflow", "hidden");
                }
            }
        }
    }
    
    export enum PlayType { Attacker, Defender }
    export enum Move { Right, Left }
    
    class Abstract {
        protected abstract() : any {
            throw new Error("Abstract method not implemented.");
        }
    }
    
    class DgGame extends Abstract {
        
        protected dependencyGraph : dg.PlayableDependencyGraph;
        protected marking : dg.LevelMarking;
        
        protected gameLog : GameLog = new GameLog();
        
        protected attacker : Player;
        protected defender : Player;
        protected currentWinner : Player;
        
        protected round : number = 1;
        protected lastMove : Move;
        protected lastAction : string;
        protected currentNodeId : dg.DgNodeId = 0; // the DG node id
        
        private cycleCache : any;
        
        constructor(protected gameActivity : Game, protected graph : CCS.Graph,
            protected currentLeft : any, protected currentRight : any) {
            super();
            
            // create the dependency graph
            this.dependencyGraph = this.createDependencyGraph(this.graph, currentLeft, currentRight);
            
            // create markings
            this.marking = this.createMarking();
        }
        
        protected createMarking() : dg.LevelMarking {
            return dg.liuSmolkaLocal2(this.currentNodeId, this.dependencyGraph);
        }
        
        public getRound() : number {
            return this.round;
        }
        
        public isUniversalWinner(player : Player) : boolean {
            // returns true if the player has a universal winning strategy
            return this.getUniversalWinner() === player;
        }
        
        public isCurrentWinner(player : Player) : boolean {
            return this.getCurrentWinner() === player;
        }
        
        public getLastMove() : Move {
            return this.lastMove;
        }
        
        public getLastAction() : string {
            return this.lastAction;
        }
        
        public getCurrentConfiguration() : any {
            return { left: this.currentLeft, right: this.currentRight };
        }
        
        public startGame() : void {
            if (this.attacker == undefined || this.defender == undefined)
                throw "No players in game.";
            this.stopGame();
            this.currentNodeId = 0;
            
            this.cycleCache = {};
            this.cycleCache[this.getConfigurationStr(this.getCurrentConfiguration())] = this.currentNodeId;

            this.gameActivity.highlightNodes();
            this.gameActivity.centerNode(this.currentLeft, Move.Left);
            this.gameActivity.centerNode(this.currentRight, Move.Right);
            
            this.gameLog.printRound(this.round, this.getCurrentConfiguration());
            this.preparePlayer(this.attacker);
        }
        
        public stopGame() : void {
            // tell players to abort their prepared play
            this.attacker.abortPlay();
            this.defender.abortPlay();
        }
        
        public setPlayers(attacker : Player, defender : Player) : void {
            if (attacker.getPlayType() == defender.getPlayType()) {
                throw "Cannot make game with two " + attacker.playTypeStr() + "s";
            }
            else if (attacker.getPlayType() != PlayType.Attacker ||
                defender.getPlayType() != PlayType.Defender) {
                throw "setPlayer(...) : First argument must be attacker and second defender";
            }
            
            this.attacker = attacker;
            this.defender = defender;
            this.currentWinner = this.getUniversalWinner();
        }
        
        protected saveCurrentProcess(process : any, move : Move) : void {
            switch (move)
            {
                case Move.Left : this.currentLeft  = process; break;
                case Move.Right: this.currentRight = process; break;
            }
        }
        
        public play(player : Player, destinationProcess : any, nextNode : dg.DgNodeId, action : string = this.lastAction, move? : Move) : void {
            this.abstract();
        }
        
        protected preparePlayer(player : Player) {
            var choices : any = this.getCurrentChoices(player.getPlayType());
            
            // determine if game is over
            if (choices.length === 0) {
                // the player to be prepared cannot make a move
                // the player to prepare has lost, announce it
                this.gameLog.printWinner((player === this.attacker) ? this.defender : this.attacker);
                
                // stop game
                this.stopGame();
            } else {
                // save the old winner, and then update who wins
                var oldWinner = this.currentWinner
                this.currentWinner = this.getCurrentWinner();
                
                // if winner changed, let the user know
                if (oldWinner !== this.currentWinner)
                    this.gameLog.printWinnerChanged(this.currentWinner);
                
                // tell the player to prepare for his turn
                player.prepareTurn(choices, this);
            }
        }
        
        protected cycleExists() : boolean {
            var configuration = this.getCurrentConfiguration();
            var cacheStr = this.getConfigurationStr(configuration);
            
            if (this.cycleCache[cacheStr] != undefined) {
                // cycle detected
                this.gameLog.printCycleWinner(this.defender);
                this.stopGame();
                
                // clear the cache
                this.cycleCache = {};
                this.cycleCache[cacheStr] = this.currentNodeId;
                return true;
            } else {
                this.cycleCache[cacheStr] = this.currentNodeId;
                return false;
            }
        }
        
        public getConfigurationStr(configuration : any) : string {
            var result = "(";
            
            result += configuration.left instanceof CCS.NamedProcess ? (<CCS.NamedProcess>configuration.left).name : configuration.left.id.toString();
            result += ", ";
            result += configuration.right instanceof CCS.NamedProcess ? (<CCS.NamedProcess>configuration.right).name : configuration.right.id.toString();
            result += ")"

            return result;
        }
        
        public getCurrentChoices(playType : PlayType) : any {
            if (playType == PlayType.Attacker)
                return this.dependencyGraph.getAttackerOptions(this.currentNodeId);
            else
                return this.dependencyGraph.getDefenderOptions(this.currentNodeId);
        }
        
        /* Abstract methods */
        public getUniversalWinner() : Player { return this.abstract(); }
        public getCurrentWinner() : Player { return this.abstract(); }
        public getBestWinningAttack(choices : any) : any { this.abstract(); }
        public getTryHardAttack(choices : any) : any { this.abstract(); }
        public getWinningDefend(choices : any) : any { this.abstract(); }
        public getTryHardDefend(choices : any) : any { this.abstract(); }
        protected createDependencyGraph(graph : CCS.Graph, currentLeft : any, currentRight : any) : dg.PlayableDependencyGraph { return this.abstract(); }
    }

    class BisimulationGame extends DgGame {
        
        private leftProcessName : string;
        private rightProcessName : string;
        private bisimulationDG : Equivalence.BisimulationDG;
        private bisimilar : boolean;
        private gameType : string;
        private attackerSuccessorGen : CCS.SuccessorGenerator;
        private defenderSuccessorGen : CCS.SuccessorGenerator;
        
        constructor(gameActivity : Game, graph : CCS.Graph, attackerSuccessorGen : CCS.SuccessorGenerator, defenderSuccessorGen : CCS.SuccessorGenerator, leftProcessName : string, rightProcessName : string, gameType : string) {
            
            this.leftProcessName = leftProcessName;
            this.rightProcessName = rightProcessName;
            this.gameType = gameType;
            this.attackerSuccessorGen = attackerSuccessorGen;
            this.defenderSuccessorGen = defenderSuccessorGen;
            
            var currentLeft  = graph.processByName(this.leftProcessName);
            var currentRight = graph.processByName(this.rightProcessName);
            
            super(gameActivity, graph, currentLeft, currentRight); // creates dependency graph and marking
        }
        
        public getGameType() : string {
            return this.gameType;
        }
        
        public startGame() : void {
            this.gameLog.printIntro(this.gameType, this.getCurrentConfiguration(), this.getUniversalWinner(), this.attacker);
            super.startGame();
        }
        
        public play(player : Player, destinationProcess : any, nextNode : dg.DgNodeId, action : string = this.lastAction, move? : Move) : void {
            var previousConfig = this.getCurrentConfiguration();
            
            // change the current node id to the next
            this.currentNodeId = nextNode;
            
            if (player.getPlayType() == PlayType.Attacker) {
                var sourceProcess = move === Move.Left ? previousConfig.left : previousConfig.right;
                this.gameLog.printPlay(player, action, sourceProcess, destinationProcess, move, true);

                this.lastAction = action;
                this.lastMove = move;
                
                this.saveCurrentProcess(destinationProcess, this.lastMove);
                this.preparePlayer(this.defender);
            } else {
                // the play is a defense, flip the saved last move
                this.lastMove = this.lastMove === Move.Right ? Move.Left : Move.Right;
                
                var sourceProcess = this.lastMove === Move.Left ? previousConfig.left : previousConfig.right;
                this.gameLog.printPlay(player, action, sourceProcess, destinationProcess, this.lastMove, this.gameType === "strong");
                
                this.saveCurrentProcess(destinationProcess, this.lastMove);

                this.round++;
                this.gameLog.printRound(this.round, this.getCurrentConfiguration());
                
                if (!this.cycleExists())
                    this.preparePlayer(this.attacker);
            }

            this.gameActivity.highlightNodes();
            this.gameActivity.centerNode(destinationProcess, this.lastMove);
        }
        
        public isBisimilar() : boolean {
            return this.bisimilar;
        }
        
        protected createDependencyGraph(graph : CCS.Graph, currentLeft : any, currentRight : any) : dg.PlayableDependencyGraph {
            
            return this.bisimulationDG = new Equivalence.BisimulationDG(this.attackerSuccessorGen, this.defenderSuccessorGen, this.currentLeft.id, this.currentRight.id);
        }
        
        public getUniversalWinner() : Player {
            return this.bisimilar ? this.defender : this.attacker;
        }
        
        public getCurrentWinner() : Player {
            return this.marking.getMarking(this.currentNodeId) === this.marking.ONE ? this.attacker : this.defender;
        }
        
        protected createMarking() : dg.LevelMarking {
            var marking = dg.solveDgGlobalLevel(this.bisimulationDG);
            this.bisimilar = marking.getMarking(0) === marking.ZERO;
            return marking;
        }
        
        public getBestWinningAttack(choices : any) : any {
            if (choices.length == 0)
                throw "No choices for attacker";
            
            var bestCandidateIndex = 0;
            var bestCandidateLevel = Infinity;
            var ownLevel = this.marking.getLevel(this.currentNodeId);
            
            choices.forEach((choice, i) => {
                var targetNodeLevel = this.marking.getLevel(choice.nextNode);
                
                if (targetNodeLevel < ownLevel && targetNodeLevel < bestCandidateLevel) {
                    bestCandidateLevel = targetNodeLevel;
                    bestCandidateIndex = i;
                }
            });
            
            return choices[bestCandidateIndex];
        }
        
        public getTryHardAttack(choices : any) : any {
            // strategy: Play the choice which yields the highest ratio of one-markings on the defenders next choice
            var bestCandidateIndices = [];
            var bestRatio = 0;
            
            choices.forEach((choice, i) => {
                var oneMarkings = 0;
                var defenderChoices = this.bisimulationDG.getDefenderOptions(choice.nextNode);
                
                if (defenderChoices.length > 0) {
                    defenderChoices.forEach( (defendChoice) => {
                        if (this.marking.getMarking(defendChoice.nextNode) === this.marking.ONE)
                            oneMarkings++;
                    });
                    
                    var ratio = oneMarkings / defenderChoices.length;
                    
                    if (ratio > bestRatio) {
                        bestRatio = ratio;
                        bestCandidateIndices = [i];
                    } else if (ratio == bestRatio) {
                        bestCandidateIndices.push(i);
                    }
                } else {
                    bestCandidateIndices = [i];
                }
            });
            
            if (bestRatio == 0) {
                // no-one markings were found, retun random choice
                return choices[this.random(choices.length-1)];
            }
            else {
                // return a random choice between the equally best choices
                return choices[bestCandidateIndices[this.random(bestCandidateIndices.length - 1)]];
            }
        }
        
        public getWinningDefend(choices : any) : any {
            for (var i = 0; i < choices.length; i++) {
                if (this.marking.getMarking(choices[i].nextNode) === this.marking.ZERO) {
                    return choices[i];
                }
            }
            
            throw "No defender moves";
        }
        
        public getTryHardDefend(choices : any) : any {
            // strategy: Play the choice with the highest level
            var bestCandidateIndices = [];
            var bestLevel = 0;
            
            for (var i = 0; i < choices.length; i++) {
                var level = this.marking.getLevel(choices[i].nextNode);
                
                if (level > bestLevel) {
                    bestLevel = level;
                    bestCandidateIndices = [i];
                } else if (level == bestLevel) {
                    bestCandidateIndices.push(i);
                }
            }
            
            if (bestLevel == 0) {
                // if no good levels were found return a random play
                return choices[this.random(choices.length-1)];
            } else {
                // return a random choice between the equally best choices
                return choices[bestCandidateIndices[this.random(bestCandidateIndices.length - 1)]];
            }
        }
        
        private random(max) : number {
            // random integer between 0 and max
            return Math.floor((Math.random() * (max+1)));
        }
    }
    
    class HmlGame extends DgGame {
        
        private processName : string;
        private formula : HML.Formula;
        private formulaSet : HML.FormulaSet;
        
        private satisfied : boolean;
        private hmlDg : dg.MuCalculusMinModelCheckingDG;
        
        constructor(gameActivity : Game, graph : CCS.Graph,
            processName : string, formula : HML.Formula, formulaSet : HML.FormulaSet) {
            
            this.processName = processName;
            this.formula = formula;
            this.formulaSet = formulaSet;
            
            var currentProcess = graph.processByName(this.processName);
            
            super(gameActivity, graph, currentProcess, this.formula);
        }
        
        public isSatisfied() : boolean {
            return this.satisfied;
        }
        
        public getUniversalWinner() : Player {
            return this.satisfied ? this.defender : this.attacker;
        }
        
        public getCurrentWinner() : Player {
            return this.marking.getMarking(this.currentNodeId) === this.marking.ZERO ? this.attacker : this.defender;
        }
        
        protected createDependencyGraph(graph : CCS.Graph, currentLeft : any, currentRight : any) : dg.PlayableDependencyGraph {
            var strongSuccGen = CCS.getSuccGenerator(graph, {succGen: "strong", reduce: false});
            var weakSuccGen = CCS.getSuccGenerator(graph, {succGen: "weak", reduce: false});
            return new dg.MuCalculusMinModelCheckingDG(strongSuccGen, weakSuccGen, currentLeft.id, this.formulaSet, currentRight);
        }
        
        protected createMarking() : dg.LevelMarking {
            var marking = super.createMarking();
            this.satisfied = marking.getMarking(0) === marking.ONE;
            return marking;
        }
        
        public getBestWinningAttack(choices : any) : any {
            return undefined; //TODO
        }
        
        public getTryHardAttack(choices : any) : any {
            return undefined; //TODO
        }
        
        public getWinningDefend(choices : any) : any {
            return undefined; //TODO
        }
        
        public getTryHardDefend(choices : any) : any {
            return undefined; //TODO
        }
    }

    class Player extends Abstract {

        protected gameLog : GameLog = new GameLog();
        
        constructor(private playType : PlayType) {
            super();
        }
        
        public prepareTurn(choices : any, game : DgGame) : void {
            switch (this.playType)
            {
                case PlayType.Attacker: {
                    this.prepareAttack(choices, game);
                    break;
                }
                case PlayType.Defender: {
                    this.prepareDefend(choices, game);
                    break;
                }
            }
        }
        
        public getPlayType() : PlayType {
            return this.playType;
        }
        
        public abortPlay() : void {
            // virtual, override
        }

        public playTypeStr() : string {
            return this.playType == PlayType.Attacker ? "Attacker" : "Defender";
        }

        /* Abstract methods */
        protected prepareAttack(choices : any, game : DgGame) : void { this.abstract(); }
        protected prepareDefend(choices : any, game : DgGame) : void { this.abstract(); }
    }
    
    class Human extends Player {
        
        private $table;
        
        constructor(playType : PlayType, private gameActivity : Game) {
            super(playType);
            
            this.$table = $("#game-transitions-table").find("tbody");
        }
        
        protected prepareAttack(choices : any, game : DgGame) : void {
            this.fillTable(choices, game, true);
            this.gameLog.println("Pick a transition on the left or the right.", "<p class='game-prompt'>");
        }
        
        protected prepareDefend(choices : any, game : DgGame) : void {
            this.fillTable(choices, game, false);
            this.gameLog.println("Pick a transition on the " + ((game.getLastMove() === Move.Left) ? "right." : "left."), "<p class='game-prompt'>");
        }
        
        private fillTable(choices : any, game : DgGame, isAttack : boolean) : void {
            var currentConfiguration = game.getCurrentConfiguration();
            var action : string = game.getLastAction();

            this.$table.empty();
            choices.forEach( (choice) => {
                var row = $("<tr></tr>");
                row.attr("data-target-id", choice.targetProcess.id); // attach targetid on the row

                if (isAttack) {
                    var sourceProcess = choice.move == 1 ? currentConfiguration.left : currentConfiguration.right;

                    var source = this.labelFor(sourceProcess);
                    action = choice.action;
                } else {
                    var sourceProcess = game.getLastMove() == Move.Right ? currentConfiguration.left : currentConfiguration.right;
                    var source = this.labelFor(sourceProcess);
                }
                
                var sourceTd = $("<td id='source'></td>").append(source);
                var actionTd = $("<td id='action'></td>").append(action);
                var targetTd = $("<td id='target'></td>").append(this.labelFor(choice.targetProcess));
                
                // onClick
                $(row).on("click", (event) => {
                    this.clickChoice(choice, game, isAttack);
                });

                // highlight the edge
                $(row).on("mouseenter", (event) => { 
                    this.highlightChoices(choice, game, isAttack, true, event);
                });

                // remove the highlight
                $(row).on("mouseleave", (event) => {
                    this.highlightChoices(choice, game, isAttack, false, event);
                });
                
                row.append(sourceTd, actionTd, targetTd);
                this.$table.append(row);
            });
        }
        
        private labelFor(process : CCS.Process) : JQuery {
            return Tooltip.wrap(process instanceof CCS.NamedProcess ? process.name : process.id.toString());
        }

        private highlightChoices(choice : any, game : DgGame, isAttack : boolean, entering : boolean, event) {
            var move : Move;
            
            if (isAttack) {
                move = choice.move == 1 ? Move.Left : Move.Right; // 1: left, 2: right
            } else {
                move = game.getLastMove() == 1 ? Move.Right : Move.Left // this is flipped because of defender role 
            }

            if (entering) {
                var targetId = $(event.currentTarget).data("targetId");
                if(move === Move.Left) {
                    this.gameActivity.highlightChoices(true, targetId); // highlight the left graph
                } else{
                    this.gameActivity.highlightChoices(false, targetId) // highlight the right graph
                }
                $(event.currentTarget).css("background", "rgba(0, 0, 0, 0.07)"); // color the row
            } else {
                if(move === Move.Left) {
                    this.gameActivity.removeHighlightChoices(true);
                } else{
                    this.gameActivity.removeHighlightChoices(false);
                }
                $(event.currentTarget).css("background", ""); // remove highlight
            }
        }

        private clickChoice(choice : any, game: DgGame, isAttack : boolean) : void {
            this.$table.empty();
            if (isAttack) {
                var move : Move = choice.move == 1 ? Move.Left : Move.Right; // 1: left, 2: right
                game.play(this, choice.targetProcess, choice.nextNode, choice.action, move);
            }
            else {
                game.play(this, choice.targetProcess, choice.nextNode);
            }
            this.gameActivity.removeHighlightChoices(true); // remove highlight from both graphs
            this.gameActivity.removeHighlightChoices(false); // remove highlight from both graphs
        }
        
        public abortPlay() : void {
            this.$table.empty();
        }
    }
    
    // such ai
    class Computer extends Player {
        
        static Delay : number = 1500;
        
        private delayedPlay;
        
        constructor(playType : PlayType) {
            super(playType);
        }
        
        public abortPlay() : void {
            clearTimeout(this.delayedPlay);
        }
        
        protected prepareAttack(choices : any, game : DgGame) : void {
            // select strategy
            if (game.isCurrentWinner(this))
                this.delayedPlay = setTimeout( () => this.winningAttack(choices, game), Computer.Delay);
            else
                this.delayedPlay = setTimeout( () => this.losingAttack(choices, game), Computer.Delay);
        }
        
        protected prepareDefend(choices : any, game : DgGame) : void {
            // select strategy
            if (game.isCurrentWinner(this))
                this.delayedPlay = setTimeout( () => this.winningDefend(choices, game), Computer.Delay);
            else
                this.delayedPlay = setTimeout( () => this.losingDefend(choices, game), Computer.Delay);
        }
        
        private losingAttack(choices : any, game : DgGame) : void {
            var tryHardChoice = game.getTryHardAttack(choices);
            var move : Move = tryHardChoice.move == 1 ? Move.Left : Move.Right; // 1: left, 2: right
            game.play(this, tryHardChoice.targetProcess, tryHardChoice.nextNode, tryHardChoice.action, move);
        }
        
        private winningAttack(choices : any, game : DgGame) : void {
            var choice : any = game.getBestWinningAttack(choices);
            var move : Move = choice.move == 1 ? Move.Left : Move.Right; // 1: left, 2: right
            
            game.play(this, choice.targetProcess, choice.nextNode, choice.action, move);
        }
        
        private losingDefend(choices : any, game : DgGame) : void {
            var tryHardChoice = game.getTryHardDefend(choices);
            game.play(this, tryHardChoice.targetProcess, tryHardChoice.nextNode);
        }
        
        private winningDefend(choices : any, game : DgGame) : void {
            var choice = game.getWinningDefend(choices);
            game.play(this, choice.targetProcess, choice.nextNode);
        }
    }

    class GameLog {
        private $log : JQuery;

        constructor() {
            this.$log = $("#game-log");
            this.$log.empty();
        }

        public println(line: string, wrapper? : string) : void {
            if (wrapper) {
                this.$log.append($(wrapper).append(line));
            } else {
                this.$log.append(line);
            }

            this.$log.scrollTop(this.$log[0].scrollHeight);;
        }

        public render(template : string, context : any) : string {
            for (var i in context) {
                var current = context[i].text;

                if (context[i].tag) {
                    current = $(context[i].tag).append(current);

                    for (var j in context[i].attr) {
                        current.attr(context[i].attr[j].name, context[i].attr[j].value);
                    }

                    template = template.replace("{" + i + "}", current[0].outerHTML);
                } else {
                    template = template.replace("{" + i + "}", current);
                }
            }

            return template;
        }

        public removeLastPrompt() : void {
            this.$log.find(".game-prompt").last().remove();
        }

        public printRound(round : number, configuration : any) : void {
            this.println("Round " + round, "<h4>");
            this.printConfiguration(configuration);
        }

        public printConfiguration(configuration : any) : void {
            var template = "Current configuration: ({1}, {2}).";

            var context = {
                1: {text: this.labelFor(configuration.left), tag: "<span>", attr: [{name: "class", value: "ccs-tooltip-constant"}]},
                2: {text: this.labelFor(configuration.right), tag: "<span>", attr: [{name: "class", value: "ccs-tooltip-constant"}]}
            }

            this.println(this.render(template, context), "<p>");
        }

        public printPlay(player : Player, action : string, source : CCS.Process, destination : CCS.Process, move : Move, isStrongMove : boolean) : void {
            var template = "{1} played {2} {3}{4}{5} {6} on the {7}.";

            var context = {
                1: {text: (player instanceof Computer) ? player.playTypeStr() : "You"},
                2: {text: this.labelFor(source), tag: "<span>", attr: [{name: "class", value: "ccs-tooltip-constant"}]},
                3: {text: isStrongMove ? "-" : "=", tag: "<span>", attr: [{name: "class", value: "monospace"}]},
                4: {text: action, tag: "<span>", attr: [{name: "class", value: "monospace"}]},
                5: {text: isStrongMove ? "->" : "=>", tag: "<span>", attr: [{name: "class", value: "monospace"}]},
                6: {text: this.labelFor(destination), tag: "<span>", attr: [{name: "class", value: "ccs-tooltip-constant"}]},
                7: {text: (move === Move.Left) ? "left" : "right"}
            };

            if (player instanceof Human) {
                this.removeLastPrompt();
            }

            this.println(this.render(template, context), "<p>");
        }

        public printWinner(winner : Player) : void {
            var template = "{1} no available transitions. You {2}!";

            var context = {
                1: {text: (winner instanceof Computer) ? "You have" : (winner.getPlayType() === PlayType.Attacker) ? "Defender has" : "Attacker has"},
                2: {text: (winner instanceof Computer) ? "lose" : "win"}
            };

            this.println(this.render(template, context), "<p class='outro'>");
        }

        public printCycleWinner(defender : Player) : void {
            var template = "A cycle has been detected. {1}!";

            var context = {
                1: {text: (defender instanceof Human) ? "You win" : "You lose"}
            };

            this.println(this.render(template, context), "<p class='outro'>");
        }
        
        public printWinnerChanged(winner : Player) : void {
            this.println("You made a bad move. " + winner.playTypeStr() + " now has a winning strategy.", "<p>");
        }

        public printIntro(gameType : string, configuration : any, winner : Player, attacker : Player) : void {
            var template = "You are playing {1} in {2} bisimulation game.";

            var context = {
                1: {text: (attacker instanceof Computer ? "defender" : "attacker")},
                2: {text: gameType},
            }

            this.println(this.render(template, context), "<p class='intro'>");

            if (winner instanceof Human){
                this.println("You have a winning strategy.", "<p class='intro'>");
            } else {
                this.println(winner.playTypeStr() + " has a winning strategy. You are going to lose.", "<p class='intro'>");
            }
        }

        private capitalize(str : string) : string {
            return str.charAt(0).toUpperCase() + str.slice(1);
        }

        private labelFor(process : CCS.Process) : string {
            return (process instanceof CCS.NamedProcess) ? (<CCS.NamedProcess> process).name : process.id.toString();
        }
    }
}

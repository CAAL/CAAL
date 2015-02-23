/// <reference path="../gui/project.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../gui/arbor/arbor.ts" />
/// <reference path="../gui/arbor/renderer.ts" />
/// <reference path="activity.ts" />
/// <reference path="../../lib/suppressWarnings.d.ts" />

module Activity {

    import dg = DependencyGraph;

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

    export class Game extends Activity {
        private project : Project;
        private changed : boolean;
        private graph : CCS.Graph;
        private succGen : CCS.SuccessorGenerator;
        private $gameType : JQuery;
        private $playerType : JQuery;
        private $leftProcessList : JQuery;
        private $rightProcessList : JQuery;
        private $fullscreenBtn : JQuery;
        private $fullScreenContainer;
        private $leftContainer : JQuery;
        private $rightContainer : JQuery;
        private $leftZoom : JQuery;
        private $rightZoom : JQuery;
        private leftCanvas : HTMLCanvasElement;
        private rightCanvas : HTMLCanvasElement;
        private leftRenderer: Renderer;
        private rightRenderer : Renderer;
        private leftGraph: GUI.ProcessGraphUI;
        private rightGraph: GUI.ProcessGraphUI;
        private dgGame : DgGame;
        private ccsNotationVisitor = new Traverse.CCSNotationVisitor();
        
        constructor(container : string, button : string) {
            super(container, button);

            this.project = Project.getInstance();

            this.$gameType = $("#game-type");
            this.$playerType = $("input[name=player-type]");
            this.$leftProcessList = $("#game-left-process");
            this.$rightProcessList = $("#game-right-process");
            this.$leftContainer = $("#game-left-canvas");
            this.$rightContainer = $("#game-right-canvas");
            this.$fullscreenBtn = $("#game-fullscreen");
            this.$fullScreenContainer = $("#game-container")[0];
            this.$leftZoom = $("#zoom-left");
            this.$rightZoom = $("#zoom-right");
            this.leftCanvas = <HTMLCanvasElement> this.$leftContainer.find("canvas")[0];
            this.rightCanvas = <HTMLCanvasElement> this.$rightContainer.find("canvas")[0];

            this.leftRenderer = new Renderer(this.leftCanvas);
            this.rightRenderer = new Renderer(this.rightCanvas);
            this.leftGraph = new GUI.ArborGraph(this.leftRenderer);
            this.rightGraph = new GUI.ArborGraph(this.rightRenderer);

            this.$gameType.on("change", () => this.newGame(true, true));
            this.$playerType.on("change", () => this.newGame(false, false));
            this.$leftProcessList.on("change", () => this.newGame(true, false));
            this.$rightProcessList.on("change", () => this.newGame(false, true));
            this.$fullscreenBtn.on("click", () => this.toggleFullscreen());
            
            this.$leftContainer.add(this.$rightContainer).on("scroll", () => this.positionSliders());
            this.$leftZoom.on("input", () => this.zoom(this.$leftZoom.val(), "left"));
            this.$rightZoom.on("input", () => this.zoom(this.$rightZoom.val(), "right"));

            $(document).on("ccs-changed", () => this.changed = true);
            
            // Set tooltip handler
            var getCCSNotation = this.ccsNotationForProcessId.bind(this);
            $("#game-status").tooltip({
                title: function() {
                    var process = $(this).text();
                    return process + " = " + getCCSNotation(process);
                },
                selector: "span.ccs-tooltip-constant"
            });
        }
        
        private isFullscreen(): boolean {
            return !!document.fullscreenElement ||
                   !!document.mozFullScreenElement ||
                   !!document.webkitFullscreenElement ||
                   !!document.msFullscreenElement;
        }
        
        private toggleFullscreen() {
            if (!this.isFullscreen()) {
                if (this.$fullScreenContainer.requestFullscreen) {
                    this.$fullScreenContainer.requestFullscreen();
                } else if (this.$fullScreenContainer.msRequestFullscreen) {
                    this.$fullScreenContainer.msRequestFullscreen();
                } else if (this.$fullScreenContainer.mozRequestFullScreen) {
                    this.$fullScreenContainer.mozRequestFullScreen();
                } else if (this.$fullScreenContainer.webkitRequestFullscreen) {
                    this.$fullScreenContainer.webkitRequestFullscreen();
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
            this.$fullscreenBtn.text(this.isFullscreen() ? "Exit" : "Fullscreen");
            this.resize();
        }
        
        private fullscreenError() {
            console.log("Fullscreen error");
            
            // user might have entered fullscreen and gone out of it, treat as fullscreen changed
            this.fullscreenChanged();
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
        
        private ccsNotationForProcessId(id : string): string {
            var process = this.graph.processById(id) || this.graph.processByName(id),
                text = "Unknown definition";
                
            if (process) {
                if (process instanceof ccs.NamedProcess)
                    text = this.ccsNotationVisitor.visit((<ccs.NamedProcess>process).subProcess);
                else
                    text = this.ccsNotationVisitor.visit(process);
            }
            return text;
        }
        
        public onShow(configuration? : any) : void {
            $(window).on("resize", () => {
                this.resize();
                this.zoom(this.$leftZoom.val(), "left");
                this.zoom(this.$rightZoom.val(), "right");
            });
            
            $(document).on("fullscreenchange", () => this.fullscreenChanged());
            $(document).on("webkitfullscreenchange", () => this.fullscreenChanged());
            $(document).on("mozfullscreenchange", () => this.fullscreenChanged());
            $(document).on("MSFullscreenChange", () => this.fullscreenChanged());
            
            $(document).on("fullscreenerror", () => this.fullscreenError());
            $(document).on("webkitfullscreenerror", () => this.fullscreenError());
            $(document).on("mozfullscreenerror", () => this.fullscreenError());
            $(document).on("MSFullscreenError", () => this.fullscreenError());

            if (this.changed || configuration) {
                this.changed = false;
                this.resize();
                this.graph = this.project.getGraph();
                this.displayOptions();
                this.newGame(true, true, configuration);
            }
        }

        public onHide() : void {
            $(window).off("resize");
            
            $(document).off("fullscreenchange");
            $(document).off("webkitfullscreenchange");
            $(document).off("mozfullscreenchange");
            $(document).off("MSFullscreenChange");
            
            $(document).off("fullscreenerror");
            $(document).off("webkitfullscreenerror");
            $(document).off("mozfullscreenerror");
            $(document).off("MSFullscreenError");
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
                playerType: this.$playerType.filter(":checked").val(),
                leftProcess: this.$leftProcessList.val(),
                rightProcess: this.$rightProcessList.val()
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

            this.succGen = CCS.getSuccGenerator(this.graph, {succGen: options.gameType, reduce: true});

            if (drawLeft) {this.draw(this.graph.processByName(options.leftProcess), this.leftGraph, "left")}
            if (drawRight) {this.draw(this.graph.processByName(options.rightProcess), this.rightGraph, "right")}
            
            var attackerSuccessorGenerator : CCS.SuccessorGenerator = CCS.getSuccGenerator(this.graph, {succGen: "strong", reduce: false});
            var defenderSuccessorGenerator : CCS.SuccessorGenerator = CCS.getSuccGenerator(this.graph, {succGen: options.gameType, reduce: false});

            if (this.dgGame != undefined) {this.dgGame.stopGame()};
            
            this.dgGame = new BisimulationGame(this, this.graph, attackerSuccessorGenerator, defenderSuccessorGenerator, options.leftProcess, options.rightProcess, options.gameType);
            
            var attacker : Player;
            var defender : Player;
            
            if (options.playerType === "defender") {
                attacker = new Computer(PlayType.Attacker);
                defender = new Human(PlayType.Defender);
            } else {
                attacker = new Human(PlayType.Attacker);
                defender = new Computer(PlayType.Defender);
            }
            
            this.dgGame.setPlayers(attacker, defender);
            this.dgGame.startGame();
        }

        /*private draw(process : CCS.Process, graph : GUI.ProcessGraphUI) : void {
            this.resize();

            this.$leftZoom.val("1");
            this.$rightZoom.val("1");

            this.clear(graph);

            var allTransitions = this.expandBFS(process, 1000);

            for (var sourceId in allTransitions) {
                graph.showProcess(sourceId, {label: this.labelFor(this.graph.processById(sourceId))});

                allTransitions[sourceId].forEach(t => {
                    graph.showProcess(t.targetProcess.id, {label: this.labelFor(this.graph.processById(t.targetProcess.id))});
                    graph.showTransitions(sourceId, t.targetProcess.id, [{label: t.action.toString()}]);
                });
            }

            graph.setSelected(process.id.toString());
        }*/

        // Use this for now. Needs refactor.
        private draw(process : CCS.Process, graph : GUI.ProcessGraphUI, side : string) : void {
            this.clear(graph);
            this.zoom(1, side)

            var allTransitions = this.expandBFS(process, 1000);

            for (var fromId in allTransitions) {
                var fromProcess = this.graph.processById(fromId);
                this.showProcess(fromProcess, graph);
                var groupedByTargetProcessId = groupBy(allTransitions[fromId].toArray(), t => t.targetProcess.id);

                Object.keys(groupedByTargetProcessId).forEach(tProcId => {
                    var group = groupedByTargetProcessId[tProcId],
                        data = group.map(t => { return {label: t.action.toString()}; });
                    this.showProcess(this.graph.processById(tProcId), graph);
                    graph.showTransitions(fromProcess.id, tProcId, data);
                });
            }

            graph.setSelected(process.id.toString());
        }

        private showProcess(process : ccs.Process, graph : GUI.ProcessGraphUI) : void {
            var data;
            if (!process) throw {type: "ArgumentError", name: "Bad argument 'process'"};
            if (graph.getProcessDataObject(process.id)) return;
            data = {label: this.labelFor(process)};
            graph.showProcess(process.id, data);
        }

        public highlightNodes() : void {
            var conf = this.dgGame.getCurrentConfiguration();
            this.leftGraph.setSelected(conf.left.id.toString());
            this.rightGraph.setSelected(conf.right.id.toString());
        }

        public hightlightChoices(isLeft : boolean, targetId : string) : void {
            if (isLeft) {
                this.leftGraph.setHover(targetId); 
            } else {
                this.rightGraph.setHover(targetId);
            }
        }

        public removeHightlightChoices(isLeft : boolean){
            if(isLeft) {
                this.leftGraph.clearHover();
            } else {
                this.rightGraph.clearHover();
            }
        }

        private clear(graph : GUI.ProcessGraphUI) : void {
            graph.clearAll();
        }

        private expandBFS(process : CCS.Process, maxDepth) {
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

        private zoom(value : number, side : string) : void {
            if (side === "left") {
                this.$leftZoom.val(value.toString());
                this.leftCanvas.width = (this.$leftContainer.width() - 20) * value;
                this.leftCanvas.height = (this.$leftContainer.height() - 20) * value;
                this.leftRenderer.resize(this.leftCanvas.width, this.leftCanvas.height);
                if (value > 1) {this.centerNode(this.dgGame.getCurrentConfiguration().left, Move.Left);}
            } else {
                this.$rightZoom.val(value.toString());
                this.rightCanvas.width = (this.$rightContainer.width() - 20) * value;
                this.rightCanvas.height = (this.$rightContainer.height() - 20) * value;
                this.rightRenderer.resize(this.rightCanvas.width, this.rightCanvas.height);
                if (value > 1) {this.centerNode(this.dgGame.getCurrentConfiguration().right, Move.Right);}
            }
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

        private positionSliders() : void {
            this.$leftZoom.css("top", this.$leftContainer.scrollTop() + 10);
            this.$leftZoom.css("left", this.$leftContainer.scrollLeft() + 10);
            this.$rightZoom.css("top", this.$rightContainer.scrollTop() + 10);
            this.$rightZoom.css("left", this.$rightContainer.scrollLeft() + 10);
        }

        private resize() : void {
            var offsetTop = $("#game-main").offset().top + 20;
            var offsetBottom = $("#game-status").height() + 3; // + border.

            var availableHeight = window.innerHeight - offsetTop - offsetBottom;
            
            if (this.isFullscreen())
                availableHeight += 10;

            // Minimum height 275 px.
            this.$leftContainer.height(Math.max(275, availableHeight));
            this.$rightContainer.height(Math.max(275, availableHeight));

            // Container height - 20 scrollbar size. 20px should be a safe value.
            this.leftCanvas.width = (this.$leftContainer.width() - 20);
            this.rightCanvas.width = (this.$rightContainer.width() - 20);
            this.leftCanvas.height = (this.$leftContainer.height() - 20);
            this.rightCanvas.height = (this.$rightContainer.height() - 20);

            this.leftRenderer.resize(this.leftCanvas.width, this.leftCanvas.height);
            this.rightRenderer.resize(this.rightCanvas.width, this.rightCanvas.height);
        }
    }
    
    
    export enum PlayType { Attacker, Defender }
    export enum Move { Right, Left }

    class DgGame {
        
        protected dependencyGraph : dg.DependencyGraph;
        protected marking : dg.LevelMarking;
        
        private htmlNotationVisitor : Traverse.TooltipHtmlCCSNotationVisitor;
        // private htmlNotationVisitor : Traverse.CCSNotationVisitor;
        
        protected gameLog : GameLog = new GameLog();
        
        protected attacker : Player;
        protected defender : Player;
        private step : number = 0;
        
        protected lastMove : Move;
        protected lastAction : string;
        protected currentNodeId : any = 0; // the DG node id
        
        private cycleCache : any;
        
        constructor(private gameActivity : Game, protected graph : CCS.Graph,
            attackerSuccessorGen : CCS.SuccessorGenerator, defenderSuccesorGen : CCS.SuccessorGenerator,
            protected currentLeft : any, protected currentRight : any) {
            
            this.htmlNotationVisitor = new Traverse.TooltipHtmlCCSNotationVisitor();
            //this.htmlNotationVisitor = new Traverse.CCSNotationVisitor();
            
            // create the dependency graph
            this.dependencyGraph = this.createDependencyGraph(this.graph, attackerSuccessorGen, defenderSuccesorGen, currentLeft, currentRight);
            
            // create markings
            this.marking = this.createMarking();
        }
        
        public getRound() : number {
            return this.step / 2 + 1;
        }
        
        public getUniversalWinner() : Player {
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        public isUniversalWinner(player : Player) : boolean {
            // returns true if the player has a universal winning strategy
            return this.getUniversalWinner() === player;
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
        
        public getBestWinningAttack(choices : any) : any {
            // consider adding this method to DepedencyGraph interface
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        public getTryHardAttack(choices : any) : any {
            // consider adding this method to DepedencyGraph interface
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        public getWinningDefend(choices : any) : any {
            // consider adding this method to DepedencyGraph interface
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        public getTryHardDefend(choices : any) : any {
            // consider adding this method to DepedencyGraph interface
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        public getCurrentChoices(playType : PlayType) : any {
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        public startGame() : void {
            if (this.attacker == undefined || this.defender == undefined)
                throw "No players in game.";
            this.stopGame();
            this.currentNodeId = 0;
            this.step = 0;
            
            this.cycleCache = {};
            this.cycleCache[this.getConfigurationStr(this.getCurrentConfiguration())] = this.currentNodeId;

            this.gameActivity.highlightNodes();
            
            this.preparePlayer(this.attacker);
        }
        
        public stopGame() : void {
            // tell players to abort their prepared play
            this.attacker.abortPlay();
            this.defender.abortPlay();
        }
        
        public setPlayers(attacker : Player, defender : Player) {
            if (attacker.getPlayType() == defender.getPlayType()) {
                throw "Cannot make game with two " + attacker.playTypeStr() + "s";
            }
            else if (attacker.getPlayType() != PlayType.Attacker ||
                defender.getPlayType() != PlayType.Defender) {
                throw "setPlayer(...) : First argument must be attacker and second defender";
            }
            
            this.attacker = attacker;
            this.defender = defender;
        }
        
        protected createDependencyGraph(graph : CCS.Graph, attackerSuccessorGen : CCS.SuccessorGenerator, defenderSuccesorGen : CCS.SuccessorGenerator, currentLeft : any, currentRight : any) : dg.DependencyGraph { // abstract
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        protected createMarking() : dg.LevelMarking { // abstract
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        private saveCurrentProcess(process : any, move : Move) : void {
            switch (move)
            {
                case Move.Left : this.currentLeft  = process; break;
                case Move.Right: this.currentRight = process; break;
            }
        }
        
        public play(player : Player, destinationProcess : any, nextNode : any, action : string = this.lastAction, move? : Move) {
            
            this.step++;
            var previousConfig = this.getCurrentConfiguration();
            
            // change the current node id to the next
            this.currentNodeId = nextNode;
            
            if (player.getPlayType() == PlayType.Attacker) {
                var sourceProcess = move == Move.Left ? previousConfig.left : previousConfig.right;
                this.gameLog.printPlay(player, action, sourceProcess, destinationProcess, move);

                this.lastAction = action;
                this.lastMove = move;
                
                this.saveCurrentProcess(destinationProcess, this.lastMove);
                this.preparePlayer(this.defender);
            } else {
                // the play is a defense, flip the saved last move
                this.lastMove = this.lastMove == Move.Right ? Move.Left : Move.Right;
                
                var sourceProcess = this.lastMove == Move.Left ? previousConfig.left : previousConfig.right;
                this.gameLog.printPlay(player, action, sourceProcess, destinationProcess, this.lastMove);
                
                this.saveCurrentProcess(destinationProcess, this.lastMove);
                
                if (!this.cycleExists())
                    this.preparePlayer(this.attacker);
            }

            this.gameActivity.highlightNodes();
            this.gameActivity.centerNode(destinationProcess, this.lastMove);
        }

        public highlightChoices(isLeft : boolean, targetId : string) : void {
            this.gameActivity.hightlightChoices(isLeft, targetId);
        }

        public removeHightlightChoices(isLeft : boolean) : void {
            this.gameActivity.removeHightlightChoices(isLeft);
        }
        
        private preparePlayer(player : Player) {
            var choices : any = this.getCurrentChoices(player.getPlayType());
            
            if (choices.length === 0) {
                // the player to be prepared cannot make a move
                // the player to prepare has lost, announce it
                this.gameLog.printWinner((player === this.attacker) ? this.defender : this.attacker);
                
                // stop game
                this.stopGame();
            } else {
                // tell the player to prepare for his turn
                player.prepareTurn(choices, this);
            }
        }
        
        private cycleExists() : boolean {
            var configuration = this.getCurrentConfiguration();
            var cacheStr = this.getConfigurationStr(configuration);
            
            if (this.cycleCache[cacheStr] != undefined) {
                // cycle detected
                this.gameLog.printCycleWinner(configuration, this.defender);
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
    }

    class BisimulationGame extends DgGame {
        
        private leftProcessName : string;
        private rightProcessName : string;
        private bisimulationDG : dg.BisimulationDG;
        private bisimilar : boolean;
        private gameType : string;
        
        constructor(gameActivity : Game, graph : CCS.Graph, attackerSuccessorGen : CCS.SuccessorGenerator, defenderSuccesorGen : CCS.SuccessorGenerator, leftProcessName : string, rightProcessName : string, gameType : string) {
            // stupid compiler
            this.leftProcessName = leftProcessName;
            this.rightProcessName = rightProcessName;
            this.gameType = gameType;
            
            var currentLeft  = graph.processByName(this.leftProcessName);
            var currentRight = graph.processByName(this.rightProcessName);
            
            super(gameActivity, graph, attackerSuccessorGen, defenderSuccesorGen, currentLeft, currentRight); // creates dependency graph and marking
        }
        
        public startGame() : void {
            this.gameLog.printIntro(this.gameType, this.getCurrentConfiguration(), this.getUniversalWinner(), this.attacker);
            super.startGame();
        }
        
        public isBisimilar() : boolean {
            return this.bisimilar;
        }
        
        protected createDependencyGraph(graph : CCS.Graph, attackerSuccessorGen : CCS.SuccessorGenerator, defenderSuccesorGen : CCS.SuccessorGenerator, currentLeft : any, currentRight : any) : dg.DependencyGraph {
            
            return this.bisimulationDG = new dg.BisimulationDG(attackerSuccessorGen, defenderSuccesorGen, this.currentLeft.id, this.currentRight.id);
        }
        
        public getUniversalWinner() : Player {
            return this.bisimilar ? this.defender : this.attacker;
        }
        
        protected createMarking() : dg.LevelMarking {
            var marking : dg.LevelMarking = dg.solveDgGlobalLevel(this.dependencyGraph);
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
        
        public getCurrentChoices(playType : PlayType) : any {
            if (playType == PlayType.Attacker)
                return this.bisimulationDG.getAttackerOptions(this.currentNodeId);
            else
                return this.bisimulationDG.getDefenderOptions(this.currentNodeId);
        }
        
        private random(max) : number {
            // random integer between 0 and max
            return Math.floor((Math.random() * (max+1)));
        }
    }

    class Player { // abstract

        protected gameLog : GameLog = new GameLog();
        
        constructor(private playType : PlayType) {
            
        }
        
        public prepareTurn(choices : any, game : DgGame) : void {
            // input list of processes
            if (this.playType === PlayType.Attacker) {
                this.gameLog.printRound(game.getRound());
                this.gameLog.printConfiguration(game.getCurrentConfiguration());
            } else {
            }

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
        
        protected prepareAttack(choices : any, game : DgGame) : void {
            throw "Abstract method. Not implemented.";
        }
        
        protected prepareDefend(choices : any, game : DgGame) : void {
            throw "Abstract method. Not implemented.";
        }
        
        public abortPlay() : void {
            // empty, override
        }
        
        public playTypeStr() : string {
            return this.playType == PlayType.Attacker ? "Attacker" : this.playType == PlayType.Defender ? "Defender" : "unknown";
        }
    }
    
    class Human extends Player {
        
        private htmlNotationVisitor = new Traverse.TooltipHtmlCCSNotationVisitor();
        private $table;
        
        constructor(playType : PlayType) {
            super(playType);
            
            this.$table = $("#game-transitions-table").find("tbody");
        }
        
        protected prepareAttack(choices : any, game : DgGame) : void {
            this.fillTable(choices, game, true);
            this.gameLog.println("Pick a transition from left or right.");
        }
        
        protected prepareDefend(choices : any, game : DgGame) : void {
            this.fillTable(choices, game, false);
            this.gameLog.println("Pick a transition from " + ((game.getLastMove() === Move.Left) ? "right." : "left."));
        }
        
        private fillTable(choices : any, game : DgGame, isAttack : boolean) : void {
            var currentConfiguration = game.getCurrentConfiguration();
            var source : string;
            var action : string = game.getLastAction();
            
            if (!isAttack) {
                var sourceProcess = game.getLastMove() == Move.Right ? currentConfiguration.left : currentConfiguration.right;
                source = this.labelFor(sourceProcess);
            }
            
            this.$table.empty();
            choices.forEach( (choice) => {
                var row = $("<tr></tr>");
                row.attr("data-target-id", choice.targetProcess.id); // attach targetid on the row

                if (isAttack) {
                    var sourceProcess = choice.move == 1 ? currentConfiguration.left : currentConfiguration.right;
                    source = this.labelFor(sourceProcess);
                    action = choice.action;
                }
                
                var sourceTd = $("<td id='source'></td>").append(source);
                var actionTd = $("<td id='action'></td>").append(action);
                var targetTd = $("<td id='target'></td>").append(this.labelFor(choice.targetProcess));
                
                // onClick
                $(row).on("click", (event) => {
                    this.clickChoice(choice, game, isAttack);
                });

                // hightlight the edge
                $(row).on("mouseenter", (event) => { 
                    this.hightlightChoices(choice, game, isAttack, true, event);
                });

                // remove the highlight
                $(row).on("mouseleave", (event) => {
                    this.hightlightChoices(choice, game, isAttack, false, event);
                });
                
                row.append(sourceTd, actionTd, targetTd);
                this.$table.append(row);
            });
        }
        
        private labelFor(process : CCS.Process) : string {
            if (process instanceof CCS.NamedProcess)
                return this.htmlNotationVisitor.visit(process);
            else 
                // return process.id.toString();
                return '<span class="ccs-tooltip-constant">' + process.id + '</span>';
        }

        private hightlightChoices(choice : any, game : DgGame, isAttack : boolean, entering : boolean, event) {
            var move : Move;
            
            if (isAttack) {
                move = choice.move == 1 ? Move.Left : Move.Right; // 1: left, 2: right
            } else {
                move = game.getLastMove() == 1 ? Move.Right : Move.Left // this is flipped because of defender role 
            }

            if (entering) {
                var targetId = $(event.currentTarget).data("targetId");
                if(move === Move.Left) {
                    game.highlightChoices(true, targetId); // hightlight the left graph
                } else{
                    game.highlightChoices(false, targetId) // hightlight the right graph
                }
                $(event.currentTarget).css("background", "rgba(0, 0, 0, 0.07)"); // color the row
            } else {
                if(move === Move.Left) {
                    game.removeHightlightChoices(true);
                } else{
                    game.removeHightlightChoices(false);
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
            game.removeHightlightChoices(true); // remove highlight from both graphs
            game.removeHightlightChoices(false); // remove highlight from both graphs
        }
        
        public abortPlay() : void {
            this.$table.empty();
        }
    }

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
            if (game.isUniversalWinner(this))
                this.delayedPlay = setTimeout( () => this.winningAttack(choices, game), Computer.Delay);
            else
                this.delayedPlay = setTimeout( () => this.losingAttack(choices, game), Computer.Delay);
        }
        
        protected prepareDefend(choices : any, game : DgGame) : void {
            // select strategy
            if (game.isUniversalWinner(this))
                this.delayedPlay = setTimeout( () => this.winningDefend(choices, game), Computer.Delay);
            else
                this.delayedPlay = setTimeout( () => this.losingDefend(choices, game), Computer.Delay);
        }
        
        private losingAttack(choices : any, game : DgGame) : void {
            // var random : number = this.random(choices.length - 1);
            // var move : Move = choices[random].move == 1 ? Move.Left : Move.Right; // 1: left, 2: right
            // game.play(this, choices[random].targetProcess, choices[random].nextNode, choices[random].action, move);
            
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
            // var random : number = this.random(choices.length - 1);
            // game.play(this, choices[random].targetProcess, choices[random].nextNode);
            
            var tryHardChoice = game.getTryHardDefend(choices);
            game.play(this, tryHardChoice.targetProcess, tryHardChoice.nextNode);
        }
        
        private winningDefend(choices : any, game : DgGame) : void {
            var choice = game.getWinningDefend(choices);
            game.play(this, choice.targetProcess, choice.nextNode);
        }
    }

    class GameLog {
        
        private htmlNotationVisitor = new Traverse.TooltipHtmlCCSNotationVisitor();
        private $log : JQuery;
        
        constructor() {
            this.$log = $("#game-log");
            this.$log.empty();
        }
        
        public print(msg : string) : void {
            this.$log.append(msg);
            this.$log.scrollTop(this.$log[0].scrollHeight);
        }
        
        public println(msg : string) : void {
            this.print("<p>" + msg + "</p>");
        }
        
        public printRound(round : number) : void {
            this.$log.append("<h4>Round " + Math.floor(round) + "</h4>");
        }

        public printConfiguration(conf : any) {
            this.println("Current configuration: (<span class=\"transition\">" + this.labelFor(conf.left) +
                "</span>, <span class=\"transition\">" + this.labelFor(conf.right) + "</span>).");
        }

        public printPlayerType(attacker : Player) {
            if (attacker instanceof Computer)
                this.print('<p class="intro">You are playing as defender.</p>');
            else
                this.print('<p class="intro">You are playing as attacker.</p>');
        }

        public printPlay(player : Player, action : string, source : CCS.Process, destination : CCS.Process, move : Move) : void {
            
            var who = player instanceof Computer ? player.playTypeStr() : "You";

            this.println(who + " played (<span class=\"transition\">" + this.labelFor(source) +
                "</span>, <span class=\"transition\">" + action +
                "</span>, <span class=\"transition\">" + this.labelFor(destination) + "</span>) on " + (move == Move.Left ? "left" : "right") + ".");
        }

        public printWinner(winner : Player) : void {
            if (winner instanceof Computer) {
                this.print('<p class="outro">You have no available transitions. You lose!</p>');
            } else {
                var loser = (winner.getPlayType() === PlayType.Attacker) ? "Defender" : "Attacker";
                this.print('<p class="outro">' + loser + " has no available transitions. You win!</p>");
            }
        }
        
        public printCycleWinner(configuration : any, defender : Player) : void {
            this.print('<p class="outro">A cycle has been detected. ' + ((defender instanceof Human) ? "You win!" : "You lose!") + "</p>");
        }
        
        public printIntro(gameType : string, configuration : any, winner : Player, attacker : Player) : void {
            this.print('<p class="intro">You are playing a ' + gameType + " bisimulation game starting from (<span class=\"transition\">" + this.labelFor(configuration.left) +
                "</span>, <span class=\"transition\">" + this.labelFor(configuration.right) + "</span>).</p>");
            
            this.printPlayerType(attacker);
            
            if (winner instanceof Human){
                this.print('<p class="intro">You have a winning strategy.</p>');
            } else {
                this.print('<p class="intro">' + winner.playTypeStr() + ' has a winning strategy. You are going to lose.</p>');
            }
        }
        
        private labelFor(process : CCS.Process) : string {
            if (process instanceof CCS.NamedProcess)
                return this.htmlNotationVisitor.visit(process);
            else 
                // return process.id.toString();
                return '<span class="ccs-tooltip-constant">' + process.id + '</span>';
        }
    }
}

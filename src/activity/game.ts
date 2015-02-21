/// <reference path="../../lib/d3.d.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../gui/arbor/arbor.ts" />
/// <reference path="../gui/arbor/renderer.ts" />
/// <reference path="activity.ts" />

module Activity {

    import dg = DependencyGraph;

    export class Game extends Activity {
        private project : Project;
        private graph : CCS.Graph;
        private succGen : CCS.SuccessorGenerator;
        private $gameType : JQuery;
        private $playerType : JQuery;
        private $leftProcessList : JQuery;
        private $rightProcessList : JQuery;
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
        private dgGame : BisimulationGame; // make generic with DgGame isntead of BisimulationGame
        
        constructor(container : string, button : string) {
            super(container, button);

            this.project = Project.getInstance();

            this.$gameType = $("#game-type");
            this.$playerType = $("input[name=player-type]");
            this.$leftProcessList = $("#game-left-process");
            this.$rightProcessList = $("#game-right-process");
            this.$leftContainer = $("#game-left-canvas");
            this.$rightContainer = $("#game-right-canvas");
            this.$leftZoom = $("#zoom-left");
            this.$rightZoom = $("#zoom-right");
            this.leftCanvas = <HTMLCanvasElement> this.$leftContainer.find("canvas")[0];
            this.rightCanvas = <HTMLCanvasElement> this.$rightContainer.find("canvas")[0];

            this.leftRenderer = new Renderer(this.leftCanvas);
            this.rightRenderer = new Renderer(this.rightCanvas);
            this.leftGraph = new GUI.ArborGraph(this.leftRenderer);
            this.rightGraph = new GUI.ArborGraph(this.rightRenderer);

            // Temporary fix.
            this.$leftContainer.find("canvas").off("mousedown");
            this.$leftContainer.find("canvas").off("mousemove");
            this.$rightContainer.find("canvas").off("mousedown");
            this.$rightContainer.find("canvas").off("mousemove");

            this.$gameType.add(this.$leftProcessList).add(this.$rightProcessList).on("input", () => this.newGame());
            this.$leftZoom.add(this.$rightZoom).on("input", () => this.resize(this.$leftZoom.val(), this.$rightZoom.val()));
        }

        public onShow(configuration? : any) : void {
            $(window).on("resize", () => this.resize());
            this.resize();

            if (this.project.getChanged()) {
                this.graph = this.project.getGraph();
                this.displayOptions();
                this.newGame();
            }
        }

        public onHide() : void {
            $(window).off("resize");
            this.dgGame.stopGame();
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

        private newGame() : void {
            this.resize();

            this.$leftZoom.val("1");
            this.$rightZoom.val("1");

            var options = this.getOptions();
            this.succGen = CCS.getSuccGenerator(this.graph, {succGen: options.gameType, reduce: true});
            this.draw(this.graph.processByName(options.leftProcess), this.leftGraph);
            this.draw(this.graph.processByName(options.rightProcess), this.rightGraph);
            
            this.makeDgGame(options);
        }
        
        private makeDgGame(options : any) {
            if (this.dgGame != undefined)
                this.dgGame.stopGame();
            
            var attackerSuccessorGenerator : CCS.SuccessorGenerator = CCS.getSuccGenerator(this.graph, {succGen: "strong", reduce: false});
            var defenderSuccessorGenerator : CCS.SuccessorGenerator = CCS.getSuccGenerator(this.graph, {succGen: options.gameType, reduce: false});
            
            this.dgGame = new BisimulationGame(this.graph, attackerSuccessorGenerator, defenderSuccessorGenerator, options.leftProcess, options.rightProcess);
            
            var attacker : Player;
            var defender : Player;
            
            // TODO make human player
            if (this.dgGame.isBisimilar()) {
                defender = new Computer(Player.Player1Color, this.dgGame, PlayType.Defender);
                attacker = new Computer(Player.Player2Color, this.dgGame, PlayType.Attacker);
            } else {
                defender = new Computer(Player.Player1Color, this.dgGame, PlayType.Defender);
                attacker = new Computer(Player.Player2Color, this.dgGame, PlayType.Attacker);
            }
            
            this.dgGame.setPlayers(attacker, defender);
            this.dgGame.startGame();
        }

        private draw(process : CCS.Process, graph : GUI.ProcessGraphUI) : void {
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
        }

        private clear(graph : GUI.ProcessGraphUI) : void {
            graph.clearAll();
        }

        private expandBFS(process : ccs.Process, maxDepth) {
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

        private labelFor(process : ccs.Process) : string {
            return (process instanceof ccs.NamedProcess) ? process.name : "" + process.id;
        }

        private centerNode(process : string, graph : GUI.ProcessGraphUI, container : JQuery) : void {
            var position = graph.getPosition(process);
            container.scrollLeft(position.x - (container.width() / 2));
            container.scrollTop(position.y - (container.height() / 2));
        }

        private resize(leftZoom : number = 1, rightZoom : number = 1) : void {
            var offsetTop = $("#game-main").offset().top;
            var offsetBottom = $("#game-log").height();

            // Height = Total - (menu + options) - log - (margin + border).
            // Minimum size 275 px.
            var availableHeight = window.innerHeight - offsetTop - offsetBottom - 42;

            var width = this.$leftContainer.width();

            if (availableHeight < 275) {
                this.$leftContainer.height(275);
                this.$rightContainer.height(275);
            } else if (availableHeight < width) {
                this.$leftContainer.height(availableHeight);
                this.$rightContainer.height(availableHeight);
            } else {
                this.$leftContainer.height(width);
                this.$rightContainer.height(width);
            }

            this.leftCanvas.width = (this.$leftContainer.width() - 17) * leftZoom; // (Width - border) * zoom
            this.rightCanvas.width = (this.$rightContainer.width() - 17) * rightZoom; // (Width - border) * zoom
            this.leftCanvas.height = (this.$leftContainer.height() - 17) * leftZoom;
            this.rightCanvas.height = (this.$rightContainer.height() - 17) * rightZoom;

            this.leftRenderer.resize(this.leftCanvas.width, this.leftCanvas.height);
            this.rightRenderer.resize(this.rightCanvas.width, this.rightCanvas.height);
        }
    }
    
    
    enum PlayType { Attacker, Defender }
    enum Move { Right, Left }

    class DgGame {
        
        protected dependencyGraph : dg.DependencyGraph;
        protected marking : dg.LevelMarking;
        
        //private htmlNotationVisitor : Traverse.TooltipHtmlCCSNotationVisitor;
        private htmlNotationVisitor : Traverse.CCSNotationVisitor;
        
        private gameLog : GameLog = new GameLog(true);
        
        protected attacker : Player;
        protected defender : Player;
        private round : number = 1;
        private step : number = 0;
        
        protected lastMove : Move;
        protected lastAction : string;
        protected currentNodeId : any = 0;
        
        constructor(protected graph : CCS.Graph, attackerSuccessorGen : CCS.SuccessorGenerator, defenderSuccesorGen : CCS.SuccessorGenerator) {
            //this.htmlNotationVisitor = new Traverse.TooltipHtmlCCSNotationVisitor();
            this.htmlNotationVisitor = new Traverse.CCSNotationVisitor();
            
            // create the dependency graph
            this.dependencyGraph = this.createDependencyGraph(this.graph, attackerSuccessorGen, defenderSuccesorGen);
            
            // create markings
            this.marking = this.createMarking();
        }
        
        public getRound() : number {
            return this.round;
        }
        
        public getMarking(nodeId : any = undefined) : any {
            return this.marking.getMarking(nodeId);
        }
        
        public getProcessById(id : any) : any {
            return this.graph.processById(id);
        }
        
        public getDependencyGraph() : dg.DependencyGraph {
            return this.dependencyGraph;
        }
        
        public getWinner() : Player {
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        public isWinner(player : Player) : boolean {
            return this.getWinner() === player;
        }
        
        public getLastMove() : Move {
            return this.lastMove;
        }
        
        public getBestWinningAttack() : any {
            // consider adding this method to DepedencyGraph interface
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        public getWinningDefend() : any {
            // consider adding this method to DepedencyGraph interface
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        public getCurrentChoices(player : Player) : any {
            // consider adding this method to DepedencyGraph interface
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        public startGame() : void {
            if (this.attacker == undefined || this.defender == undefined)
                throw "No players in game.";
            this.currentNodeId = 0;
            
            this.attacker.prepareTurn();
        }
        
        public stopGame() : void {
            // tell players to abort their prepared play
            this.attacker.abortPlay();
            this.defender.abortPlay();
            
            //TODO consider rendering the dgGame unplayable now
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
        
        protected createDependencyGraph(graph : CCS.Graph, attackerSuccessorGen : CCS.SuccessorGenerator, defenderSuccesorGen : CCS.SuccessorGenerator) : dg.DependencyGraph { // abstract
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        protected createMarking() : dg.LevelMarking { // abstract
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        public play(player : Player, destinationProcess : any, nextNode : any, action : string = this.lastAction, move? : Move) {
            this.step++;
            var destinationHtml : string = this.htmlNotationVisitor.visit(destinationProcess);
            
            // change the current node id to the next
            this.currentNodeId = nextNode;
            
            if (player == this.attacker) {
                this.gameLog.printRound(this.step / 2 + 1);
                this.gameLog.printPlay(player, action, destinationHtml);
                
                this.lastAction = action;
                this.lastMove = move;
                
                if (this.hasPlayerLost(this.defender)) {
                    this.gameLog.printWinner(this.attacker);
                    this.stopGame();
                } else {
                    // tell the other player to prepare for their turn
                    this.defender.prepareTurn();
                }
            } else {
                this.gameLog.printPlay(player, action, destinationHtml);
                
                // if the play is a defense, then flip the saved last move
                this.lastMove = this.lastMove == Move.Right ? Move.Left : Move.Right;
                
                if (this.hasPlayerLost(this.attacker)) {
                    this.gameLog.printWinner(this.defender);
                    this.stopGame();
                } else {
                    // tell the other player to prepare for their turn
                    this.attacker.prepareTurn();
                }
            }
        }
        
        private hasPlayerLost(player : Player) : boolean {
            var choices : any = this.getCurrentChoices(player);
            return choices.length === 0;
        }
    }

    class BisimulationGame extends DgGame {
        
        private leftProcessName : string;
        private rightProcessName : string;
        private bisimulationDG : dg.BisimulationDG;
        private bisimilar : boolean;
        
        constructor(graph : CCS.Graph, attackerSuccessorGen : CCS.SuccessorGenerator, defenderSuccesorGen : CCS.SuccessorGenerator, leftProcessName : string, rightProcessName : string) {
            // stupid compiler
            this.leftProcessName = leftProcessName;
            this.rightProcessName = rightProcessName;
            
            super(graph, attackerSuccessorGen, defenderSuccesorGen); // creates dependency graph and marking
        }
        
        public isBisimilar() : boolean {
            return this.bisimilar;
        }
        
        protected createDependencyGraph(graph : CCS.Graph, attackerSuccessorGen : CCS.SuccessorGenerator, defenderSuccesorGen : CCS.SuccessorGenerator) : dg.DependencyGraph {
            var leftProcess : any  = graph.processByName(this.leftProcessName);
            var rightProcess : any = graph.processByName(this.rightProcessName);
            
            return this.bisimulationDG = new dg.BisimulationDG(attackerSuccessorGen, defenderSuccesorGen, leftProcess.id, rightProcess.id);
        }
        
        public getWinner() : Player {
            return this.bisimilar ? this.defender : this.attacker;
        }
        
        protected createMarking() : dg.LevelMarking {
            var marking : dg.LevelMarking = dg.solveDgGlobalLevel(this.dependencyGraph);
            this.bisimilar = marking.getMarking(0) === marking.ZERO;
            return marking;
        }
        
        public getBestWinningAttack() : any {
            return this.bisimulationDG.getAttackerChoice(this.currentNodeId, this.marking);
        }
        
        public getWinningDefend() : any {
            return this.bisimulationDG.getDefenderChoice(this.currentNodeId, this.marking);
        }
        
        public getCurrentChoices(player : Player) : any {
            if (player == this.attacker)
                return this.bisimulationDG.getAttackerOptions(this.currentNodeId);
            else
                return this.bisimulationDG.getDefenderOptions(this.currentNodeId);
        }
    }

    class Player { // abstract
        
        static Player1Color : string = "#e74c3c";
        static Player2Color : string = "#2980b9";
        static HumanColor : string = Player.Player1Color;
        static ComputerColor : string = Player.Player2Color;
        
        constructor(protected playerColor : string, protected game: DgGame, private playType : PlayType) {
            
        }
        
        public prepareTurn() : void {
            // input list of processes
            switch (this.playType)
            {
                case PlayType.Attacker: {
                    this.prepareAttack();
                    break;
                }
                case PlayType.Defender: {
                    this.prepareDefend();
                    break;
                }
            }
        }
        
        public getColor() : string {
            return this.playerColor;
        }
        
        public getPlayType() : PlayType {
            return this.playType;
        }
        
        protected prepareAttack() : void {
            throw "Abstract method. Not implemented.";
        }
        
        protected prepareDefend() : void {
            throw "Abstract method. Not implemented.";
        }
        
        public abortPlay() : void {
            // empty, override
        }
        
        public playTypeStr() : string {
            return this.playType == PlayType.Attacker ? "ATTACKER" : this.playType == PlayType.Defender ? "DEFENDER" : "UNKNOWN";
        }
    }
    
    class Human extends Player {
        
        constructor(playerColor : string, game : DgGame, playType : PlayType) {
            super(playerColor, game, playType);
        }
        
        protected prepareAttack() : void {
            var choices = this.game.getCurrentChoices(this);
            // clickHandler on choices
        }
        
        protected prepareDefend() : void {
            var choices = this.game.getCurrentChoices(this);
            // clickHandler on choices
        }
        
        public abortPlay() : void {
            // optional override, delete if you feel like it
        }
    }

    class Computer extends Player {
        
        static Delay : number = 2000;
        
        private delayedPlay;
        
        constructor(playerColor : string, game: DgGame, playType : PlayType) {
            super(playerColor, game, playType);
        }
        
        public abortPlay() : void {
            clearTimeout(this.delayedPlay);
        }
        
        protected prepareAttack() : void {
            // select strategy
            if (this.game.isWinner(this))
                this.delayedPlay = setTimeout( () => this.winningAttack(), Computer.Delay);
            else
                this.delayedPlay = setTimeout( () => this.losingAttack(), Computer.Delay);
        }
        
        protected prepareDefend() : void {
            // select strategy
            if (this.game.isWinner(this))
                this.delayedPlay = setTimeout( () => this.winningDefend(), Computer.Delay);
            else
                this.delayedPlay = setTimeout( () => this.losingDefend(), Computer.Delay);
        }
        
        private losingAttack() : void {
            // play random
            var choices = this.game.getCurrentChoices(this);
            var random : number = this.random(choices.length);
            
            var move : Move = choices[random].move == 1 ? Move.Left : Move.Right; // 1: left, 2: right
            
            this.game.play(this, choices[random].targetProcess, choices[random].nextNode, choices[random].action, move);
        }
        
        private winningAttack() : void {
            var choice : any = this.game.getBestWinningAttack();
            var move : Move = choice.move == 1 ? Move.Left : Move.Right; // 1: left, 2: right
            
            this.game.play(this, choice.targetProcess, choice.nextNode, choice.action, move);
        }
        
        private losingDefend() : void {
            // play random
            var choices = this.game.getCurrentChoices(this);
            var random : number = this.random(choices.length);
            
            this.game.play(this, choices[random].targetProcess, choices[random].nextNode);
        }
        
        private winningDefend() : void {
            var choice = this.game.getWinningDefend();
            this.game.play(this, choice.targetProcess, choice.nextNode);
        }
        
        private random(max) : number {
            // random number between 0 and max
            return Math.floor((Math.random() * max));
        }
    }

    class GameLog {
        
        private $list : any;
        
        constructor(private printConsole : boolean = false) {
            this.$list = $("#game-console").find("ul");
            this.$list.empty();
        }
        
        public print(line : string, margin : number = 0) : void {
            if (this.printConsole) {
                var marginStr : string = "";
                for (var i = 0; i < margin/5; i++)
                    marginStr += " ";
                console.log(marginStr + line);
            }
                
            this.$list.append("<li style='margin-left: " + margin + "px'>" + line + "</li>");
        }
        
        public printRound(round : number) : void {
            this.print("Round " + Math.floor(round) + ":");
        }
        
        public printPlay(player : Player, action : string, destination : string) : void {
            this.print(this.getColoredPlayer(player) + ": " + "--- "+action+" --->   " + destination, 20);
        }
        
        public printWinner(winner : Player) : void {
            this.print(this.getColoredPlayer(winner) + " wins.");
        }
        
        private getColoredPlayer(player : Player) : string {
            return player.playTypeStr();
            // return "<span style='color: "+player.getColor()+"'>" + player.playTypeStr() + "</span>";
        }
    }
}

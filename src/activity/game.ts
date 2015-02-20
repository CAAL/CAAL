/// <reference path="../../lib/d3.d.ts" />
/// <reference path="../../lib/tinyscrollbar/jquery.tinyscrollbar.d.ts" />
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
        private leftCanvas : HTMLCanvasElement;
        private rightCanvas : HTMLCanvasElement;
        private leftRenderer: Renderer;
        private rightRenderer : Renderer;
        private leftGraph: GUI.ProcessGraphUI;
        private rightGraph: GUI.ProcessGraphUI;

        constructor(container : string, button : string) {
            super(container, button);

            this.project = Project.getInstance();

            this.$gameType = $("#game-type");
            this.$playerType = $("input[name=player-type]");
            this.$leftProcessList = $("#game-left-process");
            this.$rightProcessList = $("#game-right-process");
            this.$leftContainer = $("#game-left-canvas");
            this.$rightContainer = $("#game-right-canvas");

            this.leftCanvas = <HTMLCanvasElement> $("#game-left-canvas > canvas")[0];
            this.rightCanvas = <HTMLCanvasElement> $("#game-right-canvas > canvas")[0];
            this.leftRenderer = new Renderer(this.leftCanvas);
            this.rightRenderer = new Renderer(this.rightCanvas);
            this.leftGraph = new GUI.ArborGraph(this.leftRenderer, {repulsion: 100, stiffness: 800, friction: 0.5});
            this.rightGraph = new GUI.ArborGraph(this.rightRenderer, {repulsion: 100, stiffness: 800, friction: 0.5});

            this.$gameType.add(this.$playerType).add(this.$leftProcessList).add(this.$rightProcessList).on("change", () => this.newGame());
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
            var options = this.getOptions();
            this.succGen = CCS.getSuccGenerator(this.graph, {succGen: options.gameType, reduce: true});
            this.draw(this.graph.processByName(options.leftProcess), this.leftGraph);
            this.draw(this.graph.processByName(options.rightProcess), this.rightGraph);
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

        private resize() : void {
            this.$leftContainer.height(this.$leftContainer.width());
            this.$rightContainer.height(this.$leftContainer.width());
        }
    }
    
    
    enum PlayType { Attacker, Defender }
    enum Move { Right, Left }

    class DgGame {
        
        protected dependencyGraph : dg.DependencyGraph;
        protected marking : dg.LevelMarking;
        
        private htmlNotationVisitor : Traverse.TooltipHtmlCCSNotationVisitor;
        private gameLog : GameLog = new GameLog();
        
        protected attacker : Player;
        protected defender : Player;
        private round : number = 1;
        private step : number = 0;
        
        protected lastMove : Move;
        protected lastAction : string;
        protected currentNodeId : any;
        
        constructor(protected graph : CCS.Graph, attackerSuccessorGen : CCS.SuccessorGenerator, defenderSuccesorGen : CCS.SuccessorGenerator) {
            // set start node
            this.currentNodeId = 0;
            
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
            return this.getWinner() == player;
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
            
            this.attacker.prepareTurn();
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
        
        public play(player : Player, destinationProcess : any, action : string = this.lastAction, move? : Move) {
            this.step++;
            
            var destinationHtml : string = this.htmlNotationVisitor.visit(destinationProcess);
            
            if (player == this.attacker) {
                this.gameLog.printRound(this.step / 2 + 1);
                this.gameLog.printPlay(player, action, destinationHtml);
                
                this.lastAction = action;
                this.lastMove = move;
                
                // tell the other player to prepare for their turn
                this.defender.prepareTurn();
            } else {
                this.gameLog.printPlay(player, action, destinationHtml);
                
                // if the play is a defense, then flip the saved last move
                this.lastMove = this.lastMove == Move.Right ? Move.Left : Move.Right;
                
                // tell the other player to prepare for their turn
                this.attacker.prepareTurn();
            }
            
            // change the current node id to the one played
            this.currentNodeId = destinationProcess.id;
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
            var marking : dg.LevelMarking;// = dg.liuSmolkaLocal2(0, this.bisimulationDG);
            this.bisimilar = marking.getMarking(0) === marking.ONE;
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
    }

    class Computer extends Player {
        
        static Delay : number = 2000;
        
        constructor(playerColor : string, game: DgGame, playType : PlayType) {
            super(playerColor, game, playType);
        }
        
        protected prepareAttack() : void {
            // select strategy
            if (this.game.isWinner(this))
                setTimeout( () => this.winningAttack(), Computer.Delay);
            else
                setTimeout( () => this.losingAttack(), Computer.Delay);
        }
        
        protected prepareDefend() : void {
            // select strategy
            if (this.game.isWinner(this))
                setTimeout( () => this.winningDefend(), Computer.Delay);
            else
                setTimeout( () => this.losingDefend(), Computer.Delay);
        }
        
        private losingAttack() : void {
            // play random
            var choices = this.game.getCurrentChoices(this);
            var random : number = this.random(choices.length);
            
            var move : Move = choices[random].move == 1 ? Move.Left : Move.Right; // 1: left, 2: right
            
            this.game.play(this, choices[random].targetProcess, choices[random].action, move);
        }
        
        private winningAttack() : void {
            var choice : any = this.game.getBestWinningAttack();
            var move : Move = choice.move == 1 ? Move.Left : Move.Right; // 1: left, 2: right
            
            this.game.play(this, choice.targetProcess, choice.action, move);
        }
        
        private losingDefend() : void {
            // play random
            var choices = this.game.getCurrentChoices(this);
            var random : number = this.random(choices.length);
            
            this.game.play(this, choices[random].targetProcess);
        }
        
        private winningDefend() : void {
            var choice = this.game.getWinningDefend();
            this.game.play(this, choice.targetProcess);
        }
        
        private random(max) : number {
            // random number between 0 and max
            return Math.floor((Math.random() * max));
        }
    }

    class GameLog {
        
        private $list : any;
        
        constructor() {
            this.$list = $("#game-console").find("ul");
            this.$list.empty();
        }
        
        public print(line : string, margin : number = 0) : void {
            this.$list.append("<li style='margin-left: " + margin + "px'>" + line + "</li>");
        }
        
        public printRound(round : number) : void {
            this.print("Round " + Math.floor(round) + ":");
        }
        
        public printPlay(player : Player, action : string, destination : string) : void {
            this.print("<span style='color: "+player.getColor()+"'>" + player.playTypeStr() + "</span>: " + "--- "+action+" --->   " + destination, 20);
        }
    }
}

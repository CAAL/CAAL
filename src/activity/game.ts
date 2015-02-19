/// <reference path="../../lib/d3.d.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../gui/arbor/arbor.ts" />
/// <reference path="../gui/arbor/renderer.ts" />
/// <reference path="activity.ts" />

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
        private graph : CCS.Graph;
        private succGen : CCS.SuccessorGenerator;
        private $gameType : JQuery;
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

            this.$gameType.add(this.$leftProcessList).add(this.$rightProcessList).on("change", () => this.newGame());
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
                leftProcess: this.$leftProcessList.val(),
                rightProcess: this.$rightProcessList.val()
            };
        }

        private newGame() : void {
            var options = this.getOptions();
            this.succGen = CCS.getSuccGenerator(this.graph, {succGen: options.gameType, reduce: true});
            this.expand(this.graph.processByName(options.leftProcess));
        }

        private expand(process : ccs.Process) : void {
            var allTransitions = this.expandBFS(process, 1000);

            for (var fromId in allTransitions) {
                var fromProcess = this.graph.processById(fromId);
                this.showProcess(fromProcess);
                var groupedByTargetProcessId = groupBy(allTransitions[fromId].toArray(), t => t.targetProcess.id);

                Object.keys(groupedByTargetProcessId).forEach(tProcId => {
                    var group = groupedByTargetProcessId[tProcId],
                        datas = group.map(t => { return {label: t.action.toString()}; });
                    this.showProcess(this.graph.processById(tProcId));
                    this.leftGraph.showTransitions(fromProcess.id, tProcId, datas);
                });
            }
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

        private showProcess(process : ccs.Process) : void {
            var data;
            if (!process) throw {type: "ArgumentError", name: "Bad argument 'process'"};
            if (this.leftGraph.getProcessDataObject(process.id)) return;
            data = {label: this.labelFor(process), status: "unexpanded"};
            this.leftGraph.showProcess(process.id, data);
        }

        private showProcessAsExplored(process : ccs.Process) : void {
            this.leftGraph.getProcessDataObject(process.id).status = "expanded";
        }

        private labelFor(process : ccs.Process) : string {
            return (process instanceof ccs.NamedProcess) ? (<ccs.NamedProcess>process).name : "" + process.id;
        }

        private resize() : void {
            var offsetTop = $("#game-main").offset().top;
            var offsetBottom = $("#game-log").height();

            /*var leftWidth = this.$leftContainer.width();
            var rightWidth = this.$rightContainer.width();*/

            // Height = Total - (menu + options) - log - (margin + border).
            // Minimum size 275 px.
            var height = Math.max(275, window.innerHeight - offsetTop - offsetBottom - 43);
            this.$leftContainer.height(height);
            this.$rightContainer.height(height);

            /*this.leftCanvas.width = leftWidth;
            this.leftCanvas.height = height;
            this.rightCanvas.width = rightWidth;
            this.rightCanvas.height = height;

            this.leftRenderer.resize(leftWidth, height);
            this.rightRenderer.resize(rightWidth, height);*/
        }
    }
    
    enum PlayType { Attacker, Defender }
    enum Move { Right, Left }

    class Game2 {
        
        protected dependencyGraph : dg.DependencyGraph;
        protected marking : any;
        
        private htmlNotationVisitor : Traverse.TooltipHtmlCCSNotationVisitor;
        private gameLog : GameLog = new GameLog();
        
        protected attacker : Player;
        protected defender : Player;
        private round : number = 1;
        private step : number = 0;
        
        protected lastMove : Move;
        protected lastAction : string;
        protected currentNodeId : any; // TODO
        
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
            if (nodeId == undefined)
                return this.marking;
            else
                return this.marking.getMarking(nodeId);
        }
        
        public getProcessById(id : any) : any {
            return this.graph.processById(id);
        }
        
        public getConstructData(nodeId : any) : any {
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        public getWinner() : Player {
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        public isWinner(player : Player) : boolean {
            return this.getWinner() == player;
        }
        
        public isZero(nodeId : any) {
            return this.marking.getMarking(nodeId) === this.marking.ZERO;
        }
        
        public isOne(nodeId : any) {
            return this.marking.getMarking(nodeId) === this.marking.ONE;
        }
        
        public getLastMove() : Move {
            return this.lastMove;
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
        
        protected createMarking() : any { // abstract
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
        
        public getHyperedges(nodeId : any) : any {
            return this.dependencyGraph.getHyperEdges(nodeId);
        }
        
        public getCurrentHyperedges() : any {
            return this.getHyperedges(this.currentNodeId);
        }
    }

    class BisimulationGame extends Game2 {
        
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
        
        public getConstructData(nodeId : any) : any {
            return this.bisimulationDG.constructData[nodeId];
        }
        
        protected createDependencyGraph(graph : CCS.Graph, attackerSuccessorGen : CCS.SuccessorGenerator, defenderSuccesorGen : CCS.SuccessorGenerator) : dg.DependencyGraph {
            var leftProcess : any  = graph.processByName(this.leftProcessName);
            var rightProcess : any = graph.processByName(this.rightProcessName);
            
            return this.bisimulationDG = new dg.BisimulationDG(defenderSuccesorGen, leftProcess.id, rightProcess.id);
        }
        
        public getWinner() : Player {
            return this.bisimilar ? this.defender : this.attacker;
        }
        
        protected createMarking() : any {
            var marking : any;// = dg.liuSmolkaLocal2(0, this.bisimulationDG);
            this.bisimilar = marking.getMarking(0) === marking.ONE;
            return marking;
        }
    }

    class Player { // abstract
        
        static Player1Color : string = "#e74c3c";
        static Player2Color : string = "#2980b9";
        static HumanColor : string = Player.Player1Color;
        static ComputerColor : string = Player.Player2Color;
        
        constructor(protected playerColor : string, protected game: Game2, private playType : PlayType) {
            
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
        
        constructor(playerColor : string, game : Game2, playType : PlayType) {
            super(playerColor, game, playType);
        }
        
        protected prepareAttack() : void {
            // clickHandler
        }
        
        protected prepareDefend() : void {
            // clickHandler
        }
    }

    class Computer extends Player {
        
        static Delay : number = 2000;
        
        constructor(playerColor : string, game: Game2, playType : PlayType) {
            super(playerColor, game, playType);
        }
        
        protected prepareAttack() : void {
            // select the best play style
            if (this.game.isWinner(this))
                setTimeout( () => this.winningAttack(), Computer.Delay);
            else
                setTimeout( () => this.losingAttack(), Computer.Delay);
        }
        
        protected prepareDefend() : void {
            // select the best play style
            if (this.game.isWinner(this))
                setTimeout( () => this.winningDefend(), Computer.Delay);
            else
                setTimeout( () => this.losingDefend(), Computer.Delay);
        }
        
        private losingAttack() : void {
            // TODO
        }
        
        private winningAttack() : void {
            var hyperedges : any = this.game.getCurrentHyperedges();
            
            var edge : any;
            var allOne : boolean = false;
            
            for (var i : number = 0; i < hyperedges.length && !allOne; i++) {
                edge = hyperedges[i];
                allOne = true;
                
                for (var j : number = 0; j < edge.length; j++) {
                    if (this.game.getMarking(edge[j]) !== this.game.isOne(edge[j])) {
                        allOne = false;
                        break;
                    }
                }
            }
            
            if (!allOne)
                throw "Computer: *cry*, cant make clever attack.";
            
            var data : any = this.game.getConstructData(edge[0]);
            var action : string = data[1].toString();
            
            var move : Move;
            var processToPlay : any;
            
            if (data[0] == 1) { // left
                move = Move.Left;
                processToPlay = this.game.getProcessById(data[2]);
            } else if (data[0] == 2) { // right
                move = Move.Right;
                processToPlay = this.game.getProcessById(data[3]);
            }
            
            this.game.play(this, processToPlay, action, move);
        }
        
        private losingDefend() : void {
            // TODO
        }
        
        private winningDefend() : void {
            var hyperedges : any = this.game.getCurrentHyperedges();
            var data : any;
            
            for (var i : number = 0; i < hyperedges.length; i++) {
                var edge = hyperedges[i];
                
                for (var j : number = 0; j < edge.length; j++) {
                    if (this.game.isZero(this.game.getMarking(edge[j]))) {
                        data = this.game.getConstructData(edge[0]);
                        break;
                    }
                }
            }
                
            var processToPlay : any;
            
            if (this.game.getLastMove() == Move.Left)
                processToPlay = this.game.getProcessById(data[2]);
            else
                processToPlay = this.game.getProcessById(data[1]);
            
            this.game.play(this, processToPlay);
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

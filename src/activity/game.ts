/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="activity.ts" />
/// <reference path="../../lib/ccs.d.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../gui/trace.ts" />
/// <reference path="../main.ts" />

module Activity {

    import ccs = CCS;
    import dgMod = DependencyGraph;

    enum PlayType {Attacker, Defender};
    
    export class BisimulationGame extends Activity {
        
        static ComputerDealy: number = 500;
        
        private snapCanvas: SnapCanvas;
        private graph: CCS.Graph;
        private dependencyGraph: dgMod.BisimulationDG;
        private leftProcess;
        private rightProcess;
        private succGen: ccs.SuccessorGenerator;
        private marking;
        private isBisimilar;

        private delayedPlayTimeout;

        private leftProcessName: string;
        private rightProcessName: string;

        private lastMove = "";
        private lastAction;

        private CCSNotation;

        private snapGame: SnapGame;
        
        private boundClick;
        private gameConsole;
        
        constructor(private canvas, private actionsTable) {
            super();
            
            this.leftProcessName;
            this.rightProcessName;
            this.CCSNotation = new Traverse.CCSNotationVisitor();
        }

        beforeShow(configuration): void {
            /* Trace / Snap */
            traceWidth = this.canvas.clientWidth;
            traceHeight = this.canvas.clientHeight;

            this.leftProcessName = configuration.processNameA;
            this.rightProcessName = configuration.processNameB;

            this.succGen = configuration.successorGenerator;

            if (configuration.isWeakSuccessorGenerator)
                this.snapGame = new SnapGame(this.leftProcessName, this.rightProcessName, TraceType.Double);
            else
                this.snapGame = new SnapGame(this.leftProcessName, this.rightProcessName, TraceType.Single);

            /* Snap canvas drawing */
            this.snapCanvas = new SnapCanvas("#"+this.canvas.id, traceWidth, traceHeight);
            this.snapCanvas.addDrawable(this.snapGame);
            
            this.graph = configuration.graph;
            
            this.leftProcess = this.graph.processByName(this.leftProcessName);
            this.rightProcess = this.graph.processByName(this.rightProcessName);

            this.dependencyGraph = new dgMod.BisimulationDG(this.succGen, this.leftProcess.id, this.rightProcess.id);

            // Run liuSmolka algorithm to check for bisimilarity and get a marked dependency graph.
            this.marking = dgMod.liuSmolkaLocal2(0, this.dependencyGraph);
            
            this.gameConsole = $("#game-console");
            
            this.gameConsole.find("ul").empty();
            this.gameConsole.css("max-height", "100px");
            this.gameConsole.scrollTop($("#game-console")[0].scrollHeight);
        }
        
        beforeHide(): void {
            clearTimeout(this.delayedPlayTimeout);
        }
        
        public resizeCanvas() {
            if (this.snapCanvas == undefined)
                return;
            
            var traceWidth = this.canvas.clientWidth || this.canvas.parentNode.clientWidth;
            var traceHeight = this.canvas.clientHeight || this.canvas.parentNode.clientHeight;
            this.snapCanvas.setSize(traceWidth, traceHeight);
        }
        
        afterShow(): void {
            this.resizeCanvas();
            
            if (this.marking.getMarking(0) === this.marking.ONE) {
                // The processes are NOT bisimilar. Take attacker role.
                this.printToLog("You are playing as <span style='color: "+SnapGame.PlayerColor+"'>DEFENDER</span> and you will lose.");
                this.isBisimilar = false;
                this.selectEdgeMarkedOne(this.dependencyGraph.getHyperEdges(0));
                
            } else if (this.marking.getMarking(0) === this.marking.ZERO) {
                // The processes ARE bisimilar. Take defender role.
                this.printToLog("You are playing as <span style='color: "+SnapGame.PlayerColor+"'>ATTACKER</span> and you will lose.");
                this.isBisimilar = true;
                this.updateTable(0);
            }
            
            this.boundClick = this.clickConsole.bind(this);
            this.gameConsole.on("click", this.boundClick);

            this.gameConsole.hover( () => {
                $("#game-console").css("background", "rgba(0, 0, 0, 0.07)");
            }, 
            () => {
                // clear highlight
                $("#game-console").css("background", "");
            });
        }
        
        afterHide() {
            this.gameConsole.unbind("click", this.boundClick);
            this.boundClick = null;
        }
        
        private clickConsole() {
            if( this.gameConsole.css("max-height") === "none" ) {
                this.gameConsole.css("max-height", "100px");
                this.gameConsole.scrollTop($(this)[0].scrollHeight);
            } else {
                this.gameConsole.css("max-height", "none");
            }
        }
        
        private setOnHoverListener(row) {
            if(row){
                $(row).hover(() => {
                    $(row).css("background", "rgba(0, 0, 0, 0.07)");
                }, 
                             () => {
                                 // clear highlight
                                 $(row).css("background", "");
                             });
            }
        }


        
        private setOnClickListener(row, data?) {
            if(row){
                $(row).on('click', (event) => {

                    var destination =  row.find("#destination").html();
                    var action = row.find("#action").html();
                    
                    if (this.isBisimilar) {

                        this.lastMove = (data[0] == 1 ? "LEFT" : data[0] == 2 ? "RIGHT" : "");

                        if (this.lastMove === "LEFT") {
                            this.snapGame.playLeft(action, destination, false);
                            
                        } else if (this.lastMove === "RIGHT") {
                            this.snapGame.playRight(action, destination, false);
                        }

                        this.snapCanvas.draw();
                        this.printPlayer(PlayType.Attacker, action, destination);
                        
                        this.emptyTable();
                        
                        this.delayedPlayTimeout = setTimeout(() => this.selectEdge(this.isBisimilar, row.find("#nodeid").html(), action), BisimulationGame.ComputerDealy);
                        //this.selectEdgeMarkedZero(this.dependencyGraph.getHyperEdges(row.find("#nodeid").html()), action);
                        
                    } else if (!this.isBisimilar) {
                        if(this.lastMove == "RIGHT") {
                            this.snapGame.playLeft(action, destination, false);
                        } else if(this.lastMove == "LEFT") {
                            this.snapGame.playRight(action, destination, false);
                        }

                        this.snapCanvas.draw();
                        this.printPlayer(PlayType.Defender, action, destination);

                        this.emptyTable();

                        this.delayedPlayTimeout = setTimeout(() => this.selectEdge(this.isBisimilar, row.find("#nodeid").html()), BisimulationGame.ComputerDealy);
                        //this.selectEdgeMarkedOne(this.dependencyGraph.getHyperEdges(row.find("#nodeid").html()));
                    }
                    event.preventDefault();
                });
            }
        }
        
        private selectEdge(bisimilar: boolean, nodeidHtml, action?) {
            if (bisimilar)
                this.selectEdgeMarkedZero(this.dependencyGraph.getHyperEdges(nodeidHtml), action);
            else
                this.selectEdgeMarkedOne(this.dependencyGraph.getHyperEdges(nodeidHtml));
        }
        
        private selectEdgeMarkedZero(hyperEdges, action) {
            for (var i=0; i < hyperEdges.length; i++) {
                var edge = hyperEdges[i];
                for (var j=0; j < edge.length; j++) {
                    if (this.marking.getMarking(edge[j]) === this.marking.ZERO) {
                        var data = this.dependencyGraph.constructData[edge[0]];

                        if(this.lastMove === "LEFT") {
                            var destination =  this.CCSNotation.visit(this.graph.processById(data[2]));
                            this.snapGame.playRight(action, destination, true);
                        } else if(this.lastMove === "RIGHT") {
                            var destination =  this.CCSNotation.visit(this.graph.processById(data[1]));
                            this.snapGame.playLeft(action, destination, true);
                        }
                        
                        this.snapCanvas.draw();
                        this.printComputer(PlayType.Defender, action, destination);

                        this.updateTable(edge.slice(0)[0]);
                        return;
                    }
                }
            }

            throw "One of the targets must be marked ZERO";
        }

        private selectEdgeMarkedOne(hyperEdges) {
            for (var i=0; i < hyperEdges.length; i++) {
                var edge = hyperEdges[i];
                var allOne = true;
                for (var j=0; j < edge.length; j++) {
                    if (this.marking.getMarking(edge[j]) !== this.marking.ONE) {
                        allOne = false;
                        break;
                    }
                }
                if (allOne) {
                    var data = this.dependencyGraph.constructData[edge[0]];
                    var action = data[1].toString();

                    if(data[0] == 1) { // Left
                        var destination =  this.CCSNotation.visit(this.graph.processById(data[2]));
                        this.snapGame.playLeft(action, destination, true);
                        
                    } else if(data[0] == 2) { // Right
                        var destination =  this.CCSNotation.visit(this.graph.processById(data[3]));
                        this.snapGame.playRight(action, destination, true);
                    }
                    
                    this.snapCanvas.draw();
                    this.printComputer(PlayType.Attacker, action, destination);
                    
                    this.lastMove = (data[0] == 1 ? "LEFT" : data[0] == 2 ? "RIGHT" : "");
                    this.updateTable(edge.slice(0)[0], data[1].toString());
                    return;
                }
            }
            throw "All targets must have been marked ONE for at least one target set";
        }
        
        // empties the table and returns it
        private emptyTable() {
            var table = $(this.actionsTable).find("tbody");
            table.empty();
            return table;
        }
        
        private updateTable(node, transition?) {
            var table = this.emptyTable();

            var hyperEdges = this.dependencyGraph.getHyperEdges(node);

            for (var i = 0; i < hyperEdges.length; i++) {
                var edge = hyperEdges[i];
                
                if (edge.length === 0) {
                    if (!this.isBisimilar)
                        this.printToLog("You have no more valid transitions. <span style='color: "+SnapGame.ComputerColor+"'>ATTACKER</span> wins.");
                    break;
                }
                
                var data = this.dependencyGraph.constructData[edge[0]];

                var row = $("<tr></tr>");
                var nodeid = $("<td id='nodeid'></td>").append(edge[0]);
                nodeid.css({display: "none"});
                
                var LTS, action, destination;
                
                if (this.isBisimilar) {
                    
                    LTS = $("<td id='LTS'></td>").append(data[0] == 2 ? this.rightProcessName : data[0] == 1 ? this.leftProcessName : "ERROR" );
                    action = $("<td id='action'></td>").append(data[1].toString());
                    destination = $("<td id='destination'></td>").append(
                        this.CCSNotation.visit(this.graph.processById(data[2])));

                    this.setOnClickListener(row, data);

                } else if (!this.isBisimilar) {
                    
                    LTS = $("<td id='LTS'></td>").append(this.lastMove ? this.rightProcessName : this.lastMove ? this.leftProcessName : "ERROR" );
                    action = $("<td id='action'></td>").append(transition);
                    destination = $("<td id='destination'></td>").append(
                        this.CCSNotation.visit(
                            (this.lastMove == "LEFT" ? this.graph.processById(data[2]) :
                             this.lastMove == "RIGHT" ? this.graph.processById(data[3]):
                             undefined )
                        ));

                    this.setOnClickListener(row);
                }
                
                this.setOnHoverListener(row);
                
                row.append(LTS, action, destination, nodeid);
                table.append(row);
            }
        }

        private printComputer(playType: PlayType, action: string, destination: string) {
            if (playType == PlayType.Attacker)
                this.printRound(SnapGame.StepCounter / 2 + 1);
            
            this.printToLog("<span style='color: "+SnapGame.ComputerColor+"'>" + this.playTypeStr(playType) + "</span>: " + "--- "+action+" --->   " + destination, 20);
        }
        
        private printPlayer(playType: PlayType, action: string, destination: string) {
            if (playType == PlayType.Attacker)
                this.printRound(SnapGame.StepCounter / 2 + 1);
                
            this.printToLog("<span style='color: "+SnapGame.PlayerColor+"'>" + this.playTypeStr(playType) + "</span>: " + "--- "+action+" --->   " + destination, 20);
        }
        
        private printRound(round: number) {
            this.printToLog("Round " + Math.floor(round) + ":");
        }
        
        private printToLog(text: string, margin: number = 0) {
            var list = $("#game-console > ul");
            list.append("<li style='margin-left: " + margin + "px'>"+text+"</li>");
            this.gameConsole.scrollTop(this.gameConsole[0].scrollHeight);
        }
        
        private playTypeStr(playType: PlayType): string {
            return playType == PlayType.Attacker ? "ATTACKER" : playType == PlayType.Defender ? "DEFENDER" : "UNKNOWN";
        }
    }
    
}
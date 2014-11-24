/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="activity.ts" />
/// <reference path="../ccs/ccs.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../ccs/util.ts" />
/// <reference path="../ccs/depgraph.ts" />
/// <reference path="../gui/trace.ts" />
/// <reference path="../main.ts" />

module Activity {

    import ccs = CCS;
    import dgMod = DependencyGraph;

    export class BisimulationGame extends Activity {
        private snapCanvas: SnapCanvas;
        private graph: CCS.Graph;
        private dependencyGraph: dgMod.BisimulationDG;
        private leftProcess;
        private rightProcess;
        private succGen: ccs.SuccessorGenerator;
        private marking;
        private isBisimilar;

        private leftProcessName: string;
        private rightProcessName: string;

        private lastMove = "";
        private lastAction;

        private CCSNotation;

        private snapGame: SnapGame;
        
        constructor(private canvas, private actionsTable) {
            super();
            
            this.leftProcessName = "Protocol";
            this.rightProcessName = "Spec";
            this.CCSNotation = new Traverse.CCSNotationVisitor();
        }

        beforeShow(configuration): void {
            /* Trace / Raphael */
            traceWidth = this.canvas.clientWidth;
            traceHeight = this.canvas.clientHeight;

            this.snapGame = new SnapGame("Protocol", "Spec");

            /* Raphael canvas drawing */
            this.snapCanvas = new SnapCanvas("#"+this.canvas.id, traceWidth, traceHeight);
            this.snapCanvas.addDrawable(this.snapGame);
            
            
            this.graph = Main.getGraph(); // use configuration instead
            this.succGen = Main.getWeakSuccGenerator(this.graph); // use configuration instead
            
            this.leftProcess = this.graph.processByName(this.leftProcessName);
            this.rightProcess = this.graph.processByName(this.rightProcessName);

            this.dependencyGraph = new dgMod.BisimulationDG(this.succGen, this.leftProcess.id, this.rightProcess.id);

            // Run liuSmolka algorithm to check for bisimilarity and get a marked dependency graph.
            this.marking = dgMod.liuSmolkaLocal2(0, this.dependencyGraph);

            if (this.marking.getMarking(0) === this.marking.ONE) {
                // The processes are NOT bisimilar. Take attacker role.
                this.isBisimilar = false;
                this.selectEdgeMarkedOne(this.dependencyGraph.getHyperEdges(0));
                
            } else if (this.marking.getMarking(0) === this.marking.ZERO) {
                // The processes ARE bisimilar. Take defender role.
                this.isBisimilar = true;
                this.updateTable(0);
                //this.selectEdgeMarkedZero(this.dependencyGraph.getHyperEdges(0));
                
            }

        }
        
        public resizeCanvas() {
            var traceWidth = this.canvas.clientWidth;
            var traceHeight = this.canvas.clientHeight;
            this.snapCanvas.setSize(traceWidth, traceHeight);
        }
        
        afterShow(): void {
            this.resizeCanvas();
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
                $(row).on('click', () => {

                    if (this.isBisimilar) {

                        this.lastMove = (data[0] == 1 ? "LEFT" : data[0] == 2 ? "RIGHT" : "");

                        if (this.lastMove === "LEFT") {
                            var destination =  row.find("#destination").html();
                            var action = row.find("#action").html();
                            this.snapGame.playLeft(action, destination, true);
                            this.snapCanvas.draw();
                            
                        } else if (this.lastMove === "RIGHT") {
                            var destination =  row.find("#destination").html();
                            var action = row.find("#action").html();
                            this.snapGame.playRight(action, destination, true);
                            this.snapCanvas.draw();
                        }

                        this.selectEdgeMarkedZero(this.dependencyGraph.getHyperEdges(row.find("#nodeid").html()), action);
                        
                        
                    } else if (!this.isBisimilar) {
                        if(this.lastMove == "RIGHT") {
                            var destination =  row.find("#destination").html();
                            var action = row.find("#action").html();
                            this.snapGame.playLeft(action, destination, false);
                            this.snapCanvas.draw();
                            // Right
                        } else if(this.lastMove == "LEFT") {
                            var destination =  row.find("#destination").html();
                            var action = row.find("#action").html();
                            this.snapGame.playRight(action, destination, false);
                            this.snapCanvas.draw();
                        }

                        this.selectEdgeMarkedOne(this.dependencyGraph.getHyperEdges(row.find("#nodeid").html()));
                        
                    }
                    
                });
            }
        }
            

        private selectEdgeMarkedZero(hyperEdges, action) {
            for (var i=0; i < hyperEdges.length; i++) {
                var edge = hyperEdges[i];
                for (var j=0; j < edge.length; j++) {
                    if (this.marking.getMarking(edge[j]) === this.marking.ZERO) {
                        var data = this.dependencyGraph.constructData[edge[0]];

                        // Left
                        if(this.lastMove === "LEFT") {
                            var destination =  this.CCSNotation.visit(this.graph.processById(data[2]));
                            this.snapGame.playRight(action, destination, false);
                            this.snapCanvas.draw();
                            // Right
                        } else if(this.lastMove === "RIGHT") {
                            var destination =  this.CCSNotation.visit(this.graph.processById(data[1]));
                            this.snapGame.playLeft(action, destination, false);
                            this.snapCanvas.draw();
                        }

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

                    // Left
                    if(data[0] == 1) {
                        var destination =  this.CCSNotation.visit(this.graph.processById(data[2]));
                        this.snapGame.playLeft(action, destination, true);
                        this.snapCanvas.draw();
                        // Right
                    } else if(data[0] == 2) {
                        var destination =  this.CCSNotation.visit(this.graph.processById(data[3]));
                        this.snapGame.playRight(action, destination, true);
                        this.snapCanvas.draw();
                    }
                    
                    this.lastMove = (data[0] == 1 ? "LEFT" : data[0] == 2 ? "RIGHT" : "");
                    this.updateTable(edge.slice(0)[0], data[1].toString());
                    return;
                }
            }
            throw "All targets must have been marked ONE for at least one target set";
        }
        
        private updateTable(node, transition?) {
            var table = $(this.actionsTable).find("tbody");
            table.empty();

            var hyperEdges = this.dependencyGraph.getHyperEdges(node);

            if (this.isBisimilar) {

                for (var i = 0; i < hyperEdges.length; i++) {
                    var edge = hyperEdges[i];
                    if (edge.length === 0)
                        break;

                    var data = this.dependencyGraph.constructData[edge[0]];

                    var row = $("<tr></tr>");
                    var nodeid = $("<td id='nodeid'></td>").append(edge[0]);
                    nodeid.css({display: "none"});
                    var LTS = $("<td id='LTS'></td>").append(data[0] == 2 ? this.rightProcessName : data[0] == 1 ? this.leftProcessName : "ERROR" );
                    var action = $("<td id='action'></td>").append(data[1].toString());
                    var destination = $("<td id='destination'></td>").append(
                        this.CCSNotation.visit(this.graph.processById(data[2])));

                    this.setOnHoverListener(row);
                    this.setOnClickListener(row, data);

                    row.append(LTS, action, destination, nodeid);
                    table.append(row);

                }

            } else if (!this.isBisimilar) {

                for (var i = 0; i< hyperEdges.length; i++) {
                    var edge = hyperEdges[i];
                    if(edge.length === 0)
                        break;
                    
                    var data = this.dependencyGraph.constructData[edge[0]];

                    var row = $("<tr></tr>");
                    var nodeid = $("<td id='nodeid'></td>").append(edge[0]);
                    nodeid.css({display: "none"});
                    var LTS = $("<td id='LTS'></td>").append(this.lastMove ? this.rightProcessName : this.lastMove ? this.leftProcessName : "ERROR" );
                    var action = $("<td id='action'></td>").append(transition);
                    var destination = $("<td id='destination'></td>").append(
                        this.CCSNotation.visit(
                            (this.lastMove == "LEFT" ? this.graph.processById(data[2]) :
                             this.lastMove == "RIGHT" ? this.graph.processById(data[3]):
                             "ERROR" )
                        ));

                    this.setOnHoverListener(row);
                    this.setOnClickListener(row);

                    row.append(LTS, action, destination, nodeid);
                    table.append(row);
                    
                }

            }
            
        }
        
    }
    
}
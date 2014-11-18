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

        private leftProcessName: string;
        private rightProcessName: string;
        
        constructor(private canvas, private actionsTable) {
            super();
            
            this.leftProcessName = "Protocol";
            this.rightProcessName = "Spec";
        }

        beforeShow(configuration): void {
            /* Trace / Raphael */
            traceWidth = this.canvas.clientWidth;
            traceHeight = this.canvas.clientHeight;

            /* Raphael canvas drawing */
            this.snapCanvas = new SnapCanvas("#"+this.canvas.id, traceWidth, traceHeight);
            
            
            
            this.graph = Main.getGraph(); // use configuration instead
            this.succGen = Main.getStrictSuccGenerator(this.graph); // use configuration instead
            
            this.leftProcess = this.graph.processByName(this.leftProcessName);
            this.rightProcess = this.graph.processByName(this.rightProcessName);

            this.dependencyGraph = new dgMod.BisimulationDG(this.succGen, this.leftProcess.id, this.rightProcess.id);

            // Run liuSmolka algorithm to check for bisimilarity and get a marked dependency graph.
            this.marking = dgMod.liuSmolkaLocal2(0, this.dependencyGraph);

            if (this.marking.getMarking(0) === this.marking.ONE && this.graph) {
                var traces = this.dependencyGraph.findDivergentTrace(this.marking)
                console.log("Left does: ");
                console.log(this.prettyPrintTrace(this.graph, traces.left));
                console.log("Right does: ");
                console.log(this.prettyPrintTrace(this.graph, traces.right));
            }
            
            this.updateTable();
        }
        
        public resizeCanvas() {
            var traceWidth = this.canvas.clientWidth;
            var traceHeight = this.canvas.clientHeight;
            this.snapCanvas.setSize(traceWidth, traceHeight);
        }
        
        afterShow(): void {
            this.resizeCanvas();
        }

        private prettyPrintTrace(graph, trace) {
            var notation = new Traverse.CCSNotationVisitor(),
            stringParts = [];
            for (var i=0; i < trace.length; i++) {
                if (i % 2 == 1) stringParts.push("---- " + trace[i].toString() + " ---->");
                else stringParts.push(notation.visit(graph.processById(trace[i])));
            }
            return stringParts.join("\n\t");
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

        private setOnClickListener(row) {
            if(row){
                $(row).on('click', () => {
                    //var processName = $(row).children()[2].innerHTML;
                    
                });
            }
        }
        
        private updateTable() {
            var hyperEdges = this.dependencyGraph.getHyperEdges(0);
            
            console.log(hyperEdges);
            
            for (var i = 0; i< hyperEdges.length; i++) {
                
            }
        }
    }
    
}
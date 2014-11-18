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
        private graph;
        private dependencyGraph;
        private leftProcess;
        private rightProcess;
        private succGen;
        private marking;

        constructor(private snapCanvas: SnapCanvas, private leftProcessName, private rightProcessName) {
            super();
        }

        afterShow(): void {
            this.graph = Main.getGraph();
            this.succGen = Main.getStrictSuccGenerator(this.graph);
            
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
        
    }
    
}
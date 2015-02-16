/// <reference path="../../lib/d3.d.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="activity.ts" />

module Activity {

    export class Game extends Activity {
        private project : Project;
        private graph : ccs.Graph;
        private succGen : ccs.SuccessorGenerator;
        private leftTree : D3.Layout.TreeLayout;
        private rightTree : D3.Layout.TreeLayout;

        constructor(container : string, button : string) {
            super(container, button);

            this.project = Project.getInstance();
            this.leftTree = d3.layout.tree().size([200, 200]);
            this.rightTree = d3.layout.tree().size([200, 200]);
            var diagonal = d3.svg.diagonal()
                           .projection(function(d) { return [d.x, d.y]; });
        }

        protected checkPreconditions(): boolean {
            this.graph = Main.getGraph();

            if (!this.graph) {
                this.showExplainDialog("Syntax Error", "Your program contains syntax errors.");
                return false;
            }

            if (this.graph.getNamedProcesses().length === 0) {
                this.showExplainDialog("No Named Processes", "There must be at least one named process in the program to explore.");
                return false;
            }

            return true;
        }

        public onShow(configuration? : any) : void {
            //if (this.project.getChanged()) {
                var graph = this.project.getGraph();
                CCSParser.parse(Project.getInstance().getCCS(), {ccs: CCS, graph: graph});
                this.succGen = CCS.getSuccGenerator(graph, {succGen: "strong", reduce: false});
                console.log(this.succGen.getSuccessors(graph.processByName("Peterson").id).toArray());
            //}
        }

        public onHide() : void {
            
        }

        private draw() : void {

        }
    }

}
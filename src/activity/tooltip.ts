module Activity {

    export class Tooltip {
        private $container : JQuery;
        private visitor : Traverse.CCSNotationVisitor;
        private graph : CCS.Graph;

        constructor($container : JQuery) {
            this.$container = $container;
            this.visitor = new Traverse.CCSNotationVisitor();

            var getCCSNotation = this.ccsNotationForProcessId.bind(this);

            this.$container.tooltip({
                title: function() {
                    var process = $(this).text();
                    return process + " = " + getCCSNotation(process);
                },
                selector: "span.ccs-tooltip-constant"
            });
        }

        private ccsNotationForProcessId(id : string) : string {
            var process = this.graph.processByName(id) || this.graph.processById(parseInt(id, 10));

            if (process) {
                if (process instanceof ccs.NamedProcess)
                    var text = this.visitor.visit((<ccs.NamedProcess>process).subProcess);
                else
                    var text = this.visitor.visit(process);
            }

            return text;
        }

        public setGraph(graph : CCS.Graph) : void {
            this.graph = graph;
            this.visitor.clearCache();
        }

        static wrap(text : string) : JQuery {
            return $("<span>").attr("class", "ccs-tooltip-constant").append(text);
        }
    }

}

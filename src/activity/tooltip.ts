
module Activity {
    export class TooltipNotation {
        
        private tooltipConstant = "ccs-tooltip-constant";
        private graph : CCS.Graph;
        private $container : JQuery;
        private ccsNotationVisitor = new Traverse.CCSNotationVisitor();
        
        constructor($container : JQuery) {
            this.$container = $container;
            
            var getCCSNotation = this.ccsNotationForProcessId.bind(this);
            
            this.$container.tooltip({
                title: function() {
                    var process : string = $(this).text();
                    return process + " = " + getCCSNotation(process);
                },
                selector: "span.ccs-tooltip-constant"
            });
        }
        
        public setGraph(graph : CCS.Graph) : void {
            this.graph = graph;
            this.ccsNotationVisitor.clearCache();
        }
        
        private ccsNotationForProcessId(id : string) : string {
            var process = this.graph.processByName(id) || this.graph.processById(parseInt(id, 10));
            var text = "Unknown definition";
            
            if (process) {
                if (process instanceof ccs.NamedProcess)
                    text = this.ccsNotationVisitor.visit((<ccs.NamedProcess>process).subProcess);
                else
                    text = this.ccsNotationVisitor.visit(process);
            }
            return text;
        }
        
        static GetSpan(content : string) : string {
            return '<span class="ccs-tooltip-constant">' + content + '</span>';
        }
    }
}
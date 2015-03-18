module Tooltip {
    export var Tooltips = {
        "collapse-none": "Do not collapse the labelled transition system.",
        "collapse-strong": "Collapse all processes that are strongly bisimilar (∼) into a single process.",
        "collapse-weak": "Collapse all processes that are weakly bisimilar (≈) into a single process.",
        "simplify": "Simplify processes by applying structural congruence.",
        "depth": "Set the unfolding depth of the labelled transition system.",
        "freeze": "Lock/unlock the current location of states.",
        "save-image": "Export the labelled transition system."
    }

    export function addTooltips() {
        //Non delegating since these tooltips only cover static elements.
        $("[data-tooltip]").tooltip({
            title: function() {
                return Tooltips[this.dataset.tooltip];
            },
            delay: {
                "show": 500,
                "hide": 100
            }
        });
    }
}

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
                    return getCCSNotation(process);
                },
                selector: "span.ccs-tooltip-constant"
            });
        }

        public ccsNotationForProcessId(name : string) : string {
            var process = this.graph.processByName(name) || this.graph.processById(parseInt(name, 10));

            if (process) {
                if (process instanceof ccs.NamedProcess) {
                    name = process.name;
                    var text = this.visitor.visit((<ccs.NamedProcess>process).subProcess);
                } else {
                    var text = this.visitor.visit(process);
                }
            }

            return name + " = " + text;
        }

        public setGraph(graph : CCS.Graph) : void {
            this.graph = graph;
            this.visitor.clearCache();
        }
        
        // used for matching process names/ids globally
        static wrapProcess(text : string) : JQuery {
            return $("<span>").attr("class", "ccs-tooltip-constant").append(text);
        }
        
        static wrap(text : string) : JQuery {
            return $("<span>").attr("class", "ccs-tooltip").append(text);
        }
        
        static setTooltip($element : JQuery, text : string) : JQuery {
            $element.tooltip({title: text});
            return $element;
        }
    }
}

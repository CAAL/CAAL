/// <reference path="../main.ts" />
/// <reference path="../ccs/depgraph.ts" />

module Property {
    export interface Property {
        verify(): void;
        toHTML(): JQuery;
    }

    export class Equivalence {
        public satisfiable: boolean;
        public firstProcess: string;
        public secondProcess: string;

        public constructor(firstProcess: string, secondProcess: string) {
            this.satisfiable = null;
            this.firstProcess = firstProcess;
            this.secondProcess = secondProcess;
        }
    }

    export class StrongBisimulation extends Equivalence implements Property {
        public constructor(firstProcess: string, secondProcess: string) {
            super(firstProcess, secondProcess);
        }

        public verify(): void {
            var graph = Main.getGraph();
            var succGen = Main.getStrictSuccGenerator(graph);
            var first = graph.processByName(this.firstProcess);
            var second = graph.processByName(this.secondProcess);
            this.satisfiable = DependencyGraph.isBisimilar(succGen, first.id, second.id);
        }

        public toHTML(): JQuery {
            var row = $("<tr></tr>");

            var satisfiableString;
            if (this.satisfiable) {satisfiableString = "<i class=\"fa fa-check\"></i>"}
            else if (this.satisfiable === false) {satisfiableString = "<i class=\"fa fa-times\"></i>"}
            else {satisfiableString = "<i class=\"fa fa-question\"></i>"}

            row.append($("<td class=\"text-center\"></td>").append(satisfiableString));
            row.append($("<td></td>").append(this.firstProcess + " ~~ " + this.secondProcess));
            row.append($("<td class=\"text-center\"></td>").append("<input type=\"checkbox\">"));
            return row;
        }
    }
}
  
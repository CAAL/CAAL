/// <reference path="../main.ts" />
/// <reference path="../ccs/depgraph.ts" />

module Property {
    export class Property {
        private static counter: number = 0;
        private id: number;
        public satisfiable: boolean;

        public constructor() {
            this.satisfiable = null;
            this.id = Property.counter;
            Property.counter++;
        }

        public getId(): number {
            return this.id;
        }

        public getSatisfiable(): string {
            if (this.satisfiable === null) {return "<i class=\"fa fa-question\"></i>"}
            else if (this.satisfiable) {return "<i class=\"fa fa-check\"></i>"}
            else {return "<i class=\"fa fa-times\"></i>"}
        }

        public getDescription(): string {throw "Not implemented"}
        public verify(): void {throw "Not implemented"}
    }

    export class Equivalence extends Property {
        public firstProcess: string;
        public secondProcess: string;

        public constructor(firstProcess: string, secondProcess: string) {
            super();
            this.firstProcess = firstProcess;
            this.secondProcess = secondProcess;
        }

        public getFirstProcess(): string {
            return this.firstProcess;
        }

        public setFirstProcess(firstProcess: string): void {
            this.firstProcess = firstProcess;
        }

        public getSecondProcess(): string {
            return this.secondProcess;
        }

        public setSecondProcess(secondProcess: string): void {
            this.secondProcess = secondProcess;
        }
    }

    export class StrongBisimulation extends Equivalence {
        public constructor(firstProcess: string, secondProcess: string) {
            super(firstProcess, secondProcess);
        }

        public getDescription(): string {
            return this.firstProcess + " ~ " + this.secondProcess;
        }

        public verify(): void {
            var graph = Main.getGraph();
            var succGen = Main.getStrictSuccGenerator(graph);
            var first = graph.processByName(this.firstProcess);
            var second = graph.processByName(this.secondProcess);
            this.satisfiable = DependencyGraph.isBisimilar(succGen, first.id, second.id);
        }
    }

    export class WeakBisimulation extends Equivalence {
        public constructor(firstProcess: string, secondProcess: string) {
            super(firstProcess, secondProcess);
        }

        public getDescription(): string {
            return this.firstProcess + " ~~ " + this.secondProcess;
        }

        public verify(): void {
            var graph = Main.getGraph();
            var succGen = Main.getWeakSuccGenerator(graph);
            var first = graph.processByName(this.firstProcess);
            var second = graph.processByName(this.secondProcess);
            this.satisfiable = DependencyGraph.isBisimilar(succGen, first.id, second.id);
        }
    }

    export class HML extends Property {
        private process: string;
        private formula: string;

        public constructor(process: string, formula: string) {
            super();
            this.process = process;
            this.formula = formula;
        }

        public getProcess(): string {
            return this.process;
        }

        public setProcess(process: string): void {
            this.process = process;
        }

        public getFormula(): string {
            return this.formula;
        }

        public setFormula(formula: string): void {
            this.formula = formula;
        }

        public getDescription(): string {
            var escaped = this.formula.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return this.process + " |= " + escaped;
        }

        public verify(): void {
            var graph = Main.getGraph();
            var succGen = Main.getStrictSuccGenerator(graph);
            var process = graph.processByName(this.process);
            var formulaSet = HMLParser.parse(this.formula, {ccs: ccs, hml: hml});
            var formula = formulaSet.getAllFormulas()[0];
            this.satisfiable = DependencyGraph.solveMuCalculus(formulaSet, formula, succGen, process.id);
        }
    }
}
  
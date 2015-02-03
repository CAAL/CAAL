/// <reference path="../main.ts" />
/// <reference path="../ccs/depgraph.ts" />

module Property {

    function getWorker() : Worker {
        var worker = new Worker("lib/workers/verifier.js");
        worker.addEventListener("error", (error) => {
            console.log("Verifier Worker Error at line " + error.lineno +
                " in " + error.filename + ": " + error.message);
        }, false);
        return worker;
    }

    export class Property {
        private static counter: number = 0;
        private id: number;
        public satisfiable: boolean;
        public worker;

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

        protected invalidateStatus(): void {
            this.satisfiable = null;
        }

        public abortVerification(): void {
            this.worker.terminate();
        }

        public getDescription(): string {throw "Not implemented by subclass"}
        public toJSON(): any {throw "Not implemented by subclass"}
        public verify(callback: () => any): void {throw "Not implemented by subclass"}
    }

    export class Equivalence extends Property {
        public firstProcess: string;
        public secondProcess: string;

        public constructor(options: any) {
            super();
            this.firstProcess = options.firstProcess;
            this.secondProcess = options.secondProcess;
        }

        public getFirstProcess(): string {
            return this.firstProcess;
        }

        public setFirstProcess(firstProcess: string): void {
            this.firstProcess = firstProcess;
            this.invalidateStatus();
        }

        public getSecondProcess(): string {
            return this.secondProcess;
        }

        public setSecondProcess(secondProcess: string): void {
            this.secondProcess = secondProcess;
            this.invalidateStatus();
        }
    }

    export class StrongBisimulation extends Equivalence {
        public constructor(options: any) {
            super(options);
        }

        public getDescription(): string {
            return this.firstProcess + " ~ " + this.secondProcess;
        }

        public toJSON(): any {
            return {
                type: "StrongBisimulation",
                options: {
                    firstProcess: this.firstProcess,
                    secondProcess: this.secondProcess
                }
            };
        }

        public verify(callback): void {
            var program = Main.getProgram();
            this.worker = getWorker();
            this.worker.postMessage({
                type: "program",
                program: program
            });
            this.worker.postMessage({
                type: "isStronglyBisimilar",
                leftProcess: this.firstProcess,
                rightProcess: this.secondProcess
            });
            this.worker.addEventListener("message", event => {
                this.satisfiable = (typeof event.data.result === "boolean") ? event.data.result : null;
                this.worker.terminate();
                this.worker = null;
                callback();
            });
        }
    }

    export class WeakBisimulation extends Equivalence {
        public constructor(options: any) {
            super(options);
        }

        public getDescription(): string {
            return this.firstProcess + " ≈ " + this.secondProcess;
        }

        public toJSON(): any {
            return {
                type: "WeakBisimulation",
                options: {
                    firstProcess: this.firstProcess,
                    secondProcess: this.secondProcess
                }
            };
        }

        public verify(callback): void {
            var program = Main.getProgram();
            this.worker = getWorker();
            this.worker.postMessage({
                type: "program",
                program: program
            });
            this.worker.postMessage({
                type: "isWeaklyBisimilar",
                leftProcess: this.firstProcess,
                rightProcess: this.secondProcess
            });
            this.worker.addEventListener("message", event => {
                this.satisfiable = (typeof event.data.result === "boolean") ? event.data.result : null;
                this.worker.terminate();
                this.worker = null;
                callback();
            });
        }
    }

    export class HML extends Property {
        private process: string;
        private formula: string;

        public constructor(options: any) {
            super();
            this.process = options.process;
            this.formula = options.formula;
        }

        public getProcess(): string {
            return this.process;
        }

        public setProcess(process: string): void {
            this.process = process;
            this.invalidateStatus();
        }

        public getFormula(): string {
            return this.formula;
        }

        public setFormula(formula: string): void {
            this.formula = formula;
            this.invalidateStatus();
        }

        public getDescription(): string {
            var escaped = this.formula.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return this.process + " ⊧ " + escaped;
        }

        public toJSON(): any {
            return {
                type: "HML",
                options: {
                    process: this.process,
                    formula: this.formula
                }
            };
        }

        public verify(callback): void {
            var program = Main.getProgram();
            this.worker = getWorker();
            this.worker.postMessage({
                type: "program",
                program: program
            });
            this.worker.postMessage({
                type: "checkFormula",
                processName: this.process,
                useStrict: false,
                formula: this.formula
            });
            this.worker.addEventListener("message", event => {
                this.satisfiable = (typeof event.data.result === "boolean") ? event.data.result : null;
                this.worker.terminate();
                this.worker = null;
                callback();
            });
        }
    }
}
  
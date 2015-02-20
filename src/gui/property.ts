/// <reference path="../main.ts" />
/// <reference path="../../lib/ccs.d.ts" />

enum PropertyStatus {statisfied, unstatisfied, invalid, unknown};

module Property {

    function getWorker(callback? : Function) : Worker {
        var worker = new Worker("lib/workers/verifier.js");
        worker.addEventListener("error", (error) => {
            console.log("Verifier Worker Error at line " + error.lineno +
                " in " + error.filename + ": " + error.message);
        }, false);
        return worker;
    }

    export class Property {
        // statisfied = check-mark, unstatisfied = cross, invalid = yellow triangle, unknown = question mark
        private static counter: number = 0;
        private id: number;
        public status: PropertyStatus;
        public worker;
        public statistics = {elapsedTime: null};

        public constructor(status: PropertyStatus = PropertyStatus.unknown) {
            this.status = status;
            this.id = Property.counter;
            Property.counter++;
        }

        public getId(): number {
            return this.id;
        }

        public getStatus(): PropertyStatus {
            return this.status;
        }

        public getStatusIcon(): string {
            if (this.status === PropertyStatus.unknown) {
                return "<i class=\"fa fa-question\"></i>"
            }
            else if (this.status === PropertyStatus.statisfied) {
                return "<i class=\"fa fa-check\"></i>"
            }
            else if (this.status === PropertyStatus.unstatisfied) {
                return "<i class=\"fa fa-times\"></i>"
            }
            else if (this.status === PropertyStatus.invalid) {
                return "<i class=\"fa fa-exclamation-triangle\"></i>"
            }
        }

        public setInvalidateStatus() : void {
            this.status = PropertyStatus.invalid;
        }

        public setUnknownStatus(): void {
            this.status = PropertyStatus.unknown;
        }

        public abortVerification(): void {
            this.worker.terminate();
        }

        public getDescription(): string {throw "Not implemented by subclass"}
        public toJSON(): any {throw "Not implemented by subclass"}
        public verify(callback: () => any): void {throw "Not implemented by subclass"}

        protected isReadyForVerifcation() : boolean {throw "Not implemented by subclass"}
    }

    export class Equivalence extends Property {
        public firstProcess: string;
        public secondProcess: string;

        public constructor(options: any, status: PropertyStatus = PropertyStatus.unknown) {
            super(status);
            this.firstProcess = options.firstProcess;
            this.secondProcess = options.secondProcess;
        }

        public getFirstProcess(): string {
            return this.firstProcess;
        }

        public setFirstProcess(firstProcess: string): void {
            this.firstProcess = firstProcess;
            this.setUnknownStatus();
        }

        public getSecondProcess(): string {
            return this.secondProcess;
        }

        public setSecondProcess(secondProcess: string): void {
            this.secondProcess = secondProcess;
            this.setUnknownStatus();
        }
        /**
         * Check whether both process(first and second) is defined, and it exists in the CCS program.
         * And property status must not be invalid.
         * @return {boolean} if true, everything is defined.
         */
        protected isReadyForVerifcation() : boolean {
            var isReady = true;
            
            if(!this.getFirstProcess() && !this.getSecondProcess()) {
                isReady = false;
            } 
            else {
                // if they are defined check whether they are defined in the CCS-program
                var processList = Main.getGraph().getNamedProcesses()
                if (processList.indexOf(this.getFirstProcess()) === -1 || processList.indexOf(this.getSecondProcess()) === -1) {
                    this.setInvalidateStatus();
                    isReady = false;
                }
            }

            if(this.status === PropertyStatus.invalid) { 
                isReady = false;
            }

            return isReady
        }
    }

    export class StrongBisimulation extends Equivalence {
        public constructor(options: any, status: PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }

        public getDescription(): string {
            return this.firstProcess + " &#8764; " + this.secondProcess;
        }

        public toJSON(): any {
            return {
                type: "StrongBisimulation",
                status: this.status,
                options: {
                    firstProcess: this.firstProcess,
                    secondProcess: this.secondProcess
                }
            };
        }

        public verify(callback : Function): void {
            var isReady = this.isReadyForVerifcation() 
            if (isReady) {
                var program = Main.getProgram();
                this.worker = getWorker(callback); /*on error*/
                this.worker.postMessage({
                    type: "program",
                    program: program
                });
                this.worker.postMessage({
                    type: "isStronglyBisimilar",
                    leftProcess: this.firstProcess,
                    rightProcess: this.secondProcess
                });
                this.worker.addEventListener("error", (error) => {
                    /*display tooltip with error*/
                    this.setInvalidateStatus();
                    callback(this.status)
                }, false);
                this.worker.addEventListener("message", event => {
                    console.log(event.data.result);
                    var res = (typeof event.data.result === "boolean") ? event.data.result : PropertyStatus.unknown;
                    if (res === true) {
                        this.status = PropertyStatus.statisfied;
                    }
                    else if (res === false) {
                        this.status = PropertyStatus.unstatisfied; 
                    }
                    else {
                        this.status = res;
                    }
                    this.worker.terminate();
                    this.worker = null;
                    callback(this.status); /* verification ended */
                });
            } else {
                // something is not defined or syntax error
                console.log("something is wrong, please check the property");
                callback(this.status); /*verification ended*/
            }
        }
    }

    export class WeakBisimulation extends Equivalence {
        public constructor(options: any, status: PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }

        public getDescription(): string {
            return this.firstProcess + " &#8776; " + this.secondProcess;
        }

        public toJSON(): any {
            return {
                type: "WeakBisimulation",
                status: this.status,
                options: {
                    firstProcess: this.firstProcess,
                    secondProcess: this.secondProcess
                }
            };
        }

        public verify(callback : Function): void {
            var isReady = this.isReadyForVerifcation();
            if (isReady) {
                var program = Main.getProgram();
                this.worker = getWorker(callback);
                this.worker.postMessage({
                    type: "program",
                    program: program
                });
                this.worker.postMessage({
                    type: "isWeaklyBisimilar",
                    leftProcess: this.firstProcess,
                    rightProcess: this.secondProcess
                });
                this.worker.addEventListener("error", (error) => {
                    /*display tooltip with error*/
                    this.setInvalidateStatus();
                    callback(this.status)
                }, false);
                this.worker.addEventListener("message", event => {
                    var res = (typeof event.data.result === "boolean") ? event.data.result : PropertyStatus.unknown;
                    if (res === true) {
                        this.status = PropertyStatus.statisfied;
                    }
                    else if (res === false) {
                        this.status = PropertyStatus.unstatisfied; 
                    }
                    else {
                        this.status = res;
                    }
                    this.worker.terminate();
                    this.worker = null;
                    callback(this.status); /* verification ended */
                });
            } else {
                // something is not defined or syntax error
                console.log("something is wrong, please check the property");
                callback(this.status); /*verification ended*/
            }
        }
    }

    export class HML extends Property {
        private process: string;
        private formula: string;

        public constructor(options: any, status: PropertyStatus = PropertyStatus.unknown) {
            super(status);
            this.process = options.process;
            this.formula = options.formula;
        }

        public getProcess(): string {
            return this.process;
        }

        public setProcess(process: string): void {
            this.process = process;
            this.setUnknownStatus(); /*When setting a new process, we don't know the result yet*/
        }

        public getFormula(): string {
            return this.formula;
        }

        public setFormula(formula: string): void {
            this.formula = formula;
            this.setUnknownStatus(); /*When setting a new formula, we don't know the result yet*/
        }

        public getDescription(): string {
            var escaped = this.formula.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return this.process + " &#8872; " + escaped;
        }

        public toJSON(): any {
            return {
                type: "HML",
                status: this.status,
                options: {
                    process: this.process,
                    formula: this.formula
                }
            };
        }
        /**
         * Checks whehter the process is defined, and the property is not invalid, and the HML syntactically correct.
         * @return {boolean} if true everything is defined correctly.
         */
        protected isReadyForVerifcation() : boolean {
            var isReady = true;

            if (!this.getProcess()) {
                isReady = false;
            } else {
                // if they are defined check whether they are defined in the CCS-program
                var processList = Main.getGraph().getNamedProcesses()
                if (processList.indexOf(this.getProcess()) === -1 ) {
                    isReady = false;
                }
            }

            /**
             * HML syntax check (simple)
             * complete syntax check are done by the worker, it will post a error if the hml syntax did not parse. 
             */
            if(!this.formula || this.formula === "") {
                this.setInvalidateStatus();
                isReady = false;
            }
            
            return isReady
        }

        public verify(callback : Function): void {
            var isReady = this.isReadyForVerifcation() 
            console.log("Property isReady: ", isReady);
            if (isReady) {
                var program = Main.getProgram();
                this.worker = getWorker(callback);
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
                this.worker.addEventListener("error", (error) => {
                    /* HML syntax error */
                    this.setInvalidateStatus();
                    callback(this.status) 
                }, false);
                this.worker.addEventListener("message", event => {
                    console.log(event.data.result);
                    var res = (typeof event.data.result === "boolean") ? event.data.result : PropertyStatus.unknown;
                    if (res === true) {
                        this.status = PropertyStatus.statisfied;
                    }
                    else if (res === false) {
                        this.status = PropertyStatus.unstatisfied; 
                    }
                    else {
                        this.status = res;
                    }
                    this.worker.terminate();
                    this.worker = null;
                    callback(this.status); /* verification ended */
                });
            } else {
                // something is not defined or syntax error
                console.log("something is wrong, please check the property");
                callback(this.status); /*verification ended*/
            }
        }
    }
}
  

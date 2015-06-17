/// <reference path="../main.ts" />
/// <reference path="../../lib/ccs.d.ts" />

// satisfied = check-mark, unsatisfied = cross, invalid = yellow triangle, unknown = question mark
enum PropertyStatus {satisfied, unsatisfied, invalid, unknown};

module Property {

    export function createProperty(propertyType : string, options : any) : Property {
        var status = options.status ? options.status : PropertyStatus.unknown;
        options["propertyType"] = propertyType;

        switch (propertyType)
        {
            case "bisimulation":
                return options.type === "strong" ? new StrongBisimulation(options, status) : new WeakBisimulation(options, status);
            case "simulation":
                return options.type === "strong" ? new StrongSimulation(options, status) : new WeakSimulation(options, status);
            case "simulationequivalence":
                return null;
            case "traceinclusion":
                return options.type === "strong" ? new StrongTraceInclusion(options, status) : new WeakTraceInclusion(options, status);
            case "traceequivalence":
                return options.type === "strong" ? new StrongTraceEq(options, status) : new WeakTraceEq(options, status);
            case "hml":
                return new HML(options, status);
            default:
                throw "Unknown property type";
        }
    }

    export class Property {
        protected project : Project;
        private static counter : number = 0;
        private id : number;
        protected status : PropertyStatus;
        protected worker;
        private error : string = "";
        private timer : number;
        private elapsedTime : string;
        private $timeCell : JQuery;
        private $row : JQuery;

        public icons = {
            "checkmark": $("<i class=\"fa fa-check-circle text-success\"></i>"),
            "cross": $("<i class=\"fa fa-times-circle text-danger\"></i>"),
            "triangle": $("<i class=\"fa fa-exclamation-triangle text-danger\"></i>"),
            "questionmark" : $("<i class=\"fa fa-question-circle\"></i>")
        }

        public constructor(status : PropertyStatus = PropertyStatus.unknown) {
            this.project = Project.getInstance();
            this.status = status;
            this.id = Property.counter;
            Property.counter++;
        }

        public getId() : number {
            return this.id;
        }

        public getStatus() : PropertyStatus {
            return this.status;
        }

        public getRow() : JQuery {
            return this.$row;
        }

        public setRow($row : JQuery) : void {
            this.$row = $row;
        }

        public setTimeCell($timeCell : JQuery) : void {
            this.$timeCell = $timeCell;
        }

        public getElapsedTime() : string {
            return this.elapsedTime;
        }

        public startTimer() { 
            var startTime = new Date().getTime();

            var updateTimer = () => {
                this.elapsedTime = new Date().getTime() - startTime + "ms";
                this.$timeCell.text(this.elapsedTime);
            }

            this.timer = setInterval(updateTimer, 25);
        }

        public stopTimer() {
            clearInterval(this.timer);
        }

        public getStatusIcon() : JQuery {
            switch (this.status) {
                case PropertyStatus.unknown:
                    return this.icons.questionmark;
                case PropertyStatus.satisfied:
                    return this.icons.checkmark;
                case PropertyStatus.unsatisfied:
                    return this.icons.cross;
                case PropertyStatus.invalid:
                    return this.icons.triangle;
            }
        }

        public setInvalidateStatus(error? : string) : void {
            this.error = error;
            this.status = PropertyStatus.invalid;
        }

        public setUnknownStatus() : void {
            this.status = PropertyStatus.unknown;
        }

        public abortVerification() : void {
            this.worker.terminate();
            this.worker = null;
            this.stopTimer();
            this.setUnknownStatus();
        }
        
        public verify(callback : Function) : void {
            if (!this.isReadyForVerification()) {
                console.log("something is wrong, please check the property");
                callback(this);
                return;
            }
            
            this.startTimer();
            
            var program = this.project.getCCS();
            var inputMode = InputMode[this.project.getInputMode()];
            this.worker = new Worker("lib/workers/verifier.js");
            
            this.worker.postMessage({
                type: "program",
                program: program,
                inputMode: inputMode
            });
            
            this.worker.postMessage(this.getWorkerMessage());
            
            this.worker.addEventListener("error", (error) => {
                this.worker.terminate();
                this.worker = null;
                this.setInvalidateStatus(error.message);
                this.stopTimer();
                callback(this);
            }, false);
            
            this.worker.addEventListener("message", event => {
                this.workerFinished(event, callback);
            });
        }
        
        protected workerFinished(event : any, callback : Function) : void {
            this.worker.terminate();
            this.worker = null; 
            
            this.onWorkerFinished(event);
            
            this.stopTimer();
            callback(this); /* verification ended */
        }
        
        protected onWorkerFinished(event : any) : void {
            var res = (typeof event.data.result === "boolean") ? event.data.result : PropertyStatus.unknown;
            if (res === true) {
                this.status = PropertyStatus.satisfied;
            }
            else if (res === false) {
                this.status = PropertyStatus.unsatisfied; 
            }
            else {
                this.status = res;
            }
        }
        
        protected getWorkerMessage() : any { throw "Not implemented by subclass"; }
        public getDescription() : string { throw "Not implemented by subclass"; }
        public toJSON() : any { throw "Not implemented by subclass"; }
        protected isReadyForVerification() : boolean { throw "Not implemented by subclass"; }
    }
    
    export class HML extends Property {
        private process : string;
        private definitions : string;
        private topFormula : string;

        public constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(status);
            this.process = options.process;
            this.definitions = options.definitions;
            this.topFormula = options.topFormula;
        }

        public getProcess() : string {
            return this.process;
        }

        public setProcess(process : string) : void {
            this.process = process;
            this.setUnknownStatus();
        }

        public getTopFormula() : string {
            return this.topFormula;
        }

        public setTopFormula(formula : string) : void {
            this.topFormula = formula;
            this.setUnknownStatus();
        }

        public getDefinitions() : string {
            return this.definitions;
        }

        public setDefinitions(formula : string) : void {
            this.definitions = formula;
            this.setUnknownStatus();
        }

        public getDescription() : string {
            var escaped = this.topFormula.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return this.process + " &#8872; " + escaped;
        }

        public toJSON() : any {
            return {
                type: "HML",
                status: this.status,
                options : {
                    process: this.process,
                    definitions: this.definitions,
                    topFormula: this.topFormula
                }
            };
        }
        /**
         * Checks whehter the process is defined, and the property is not invalid, and the HML syntactically correct.
         * @return {boolean} if true everything is defined correctly.
         */
        protected isReadyForVerification() : boolean {
            var isReady = true;
            var error = "";
            if (!this.getProcess()) {
                isReady = false;
                error = "There is no process selected.";
            } else {
                // if they are defined check whether they are defined in the CCS-program
                var processList = this.project.getGraph().getNamedProcesses()
                if (processList.indexOf(this.getProcess()) === -1 ) {
                    error = "The processes selected is not defined in the CCS program.";
                    isReady = false;
                }
            }

            /**
             * HML syntax check (simple)
             * complete syntax check are done by the worker, it will post a error if the hml syntax did not parse. 
             */
            if(!this.topFormula || this.topFormula === "") {
                error = "Formula is not defined.";
                isReady = false;
            }

            if(!isReady){
                this.setInvalidateStatus(error);
            }
            
            return isReady;
        }

        protected getWorkerMessage() : any {
            return {
                type: "checkFormula",
                processName: this.process,
                useStrict: false,
                definitions: this.definitions,
                formula: this.topFormula
            };
        }
    }
    
    export class Relation extends Property {
        public propertyType;
        public firstProcess : string;
        public secondProcess : string;
        public type : string;
        public time : string;

        public constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(status);

            this.propertyType = options.propertyType;
            this.firstProcess = options.firstProcess;
            this.secondProcess = options.secondProcess;
            this.type = options.type;
            this.time = options.time;
        }

        public getPropertyType() : string {
            return this.propertyType;
        }

        public getFirstProcess() : string {
            return this.firstProcess;
        }

        public setFirstProcess(firstProcess : string) : void {
            this.firstProcess = firstProcess;
            this.setUnknownStatus();
        }

        public getSecondProcess() : string {
            return this.secondProcess;
        }

        public setSecondProcess(secondProcess : string) : void {
            this.secondProcess = secondProcess;
            this.setUnknownStatus();
        }

        public getType() : string {
            return this.type;
        }

        public setType(type : string) : void {
            this.type = type;
        }
        
        public getTime() : string {
            return this.time;
        }
        
        public setTime(time : string) : void {
            this.time = time;
        }
        
        protected getTimeSubscript() : string {
            if (this.project.getInputMode() === InputMode.CCS) {
                return "";
            } else {
                return "<sub>" + (this.time === "untimed" ? "u" : "t") + "</sub>";
            }
        }
        
        public toJSON() : any {
            return {
                type: this.getClassName(),
                status: this.status,
                time: this.time,
                options : {
                    firstProcess: this.firstProcess,
                    secondProcess: this.secondProcess
                }
            };
        }
        
        protected getWorkerMessage() : any {
            return {
                type: this.getWorkerHandler(),
                time: this.time,
                leftProcess: this.firstProcess,
                rightProcess: this.secondProcess
            };
        }
        
        /**
         * Check whether both process(first and second) is defined, and it exists in the CCS program.
         * And property status must not be invalid.
         * @return {boolean} if true, everything is defined.
         */
        protected isReadyForVerification() : boolean {
            var isReady = true;
            var error = "";

            if(!this.getFirstProcess() && !this.getSecondProcess()) {
                isReady = false;
                error = "Two processes must be selected"
            } else {
                // if they are defined check whether they are defined in the CCS-program
                var processList = this.project.getGraph().getNamedProcesses()
                if (processList.indexOf(this.getFirstProcess()) === -1 || processList.indexOf(this.getSecondProcess()) === -1) {
                    isReady = false;
                    error = "One of the processes is not defined in the CCS program."
                }
            }

            if(!isReady) { 
                this.setInvalidateStatus(error);
            }

            return isReady
        }

        protected getClassName() : string { throw "Not implemented by class"; }
        protected getWorkerHandler() : string { throw "Not implemented by subclass"; }
    }

    export class StrongBisimulation extends Relation {
        public constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }

        public generateDistinguishingFormula(generationEnded : Function) : void {
            // start the worker, and make the worker generationEnded with the result.
            var program = this.project.getCCS();
            this.worker = new Worker("lib/workers/verifier.js");
            
            this.worker.postMessage({
                type: "program",
                program: program,
                inputMode: InputMode[this.project.getInputMode()]
            });
            
            this.worker.postMessage({
                type: "findDistinguishingFormula",
                leftProcess: this.getFirstProcess(),
                rightProcess: this.getSecondProcess(),
                succGenType: "strong"
            });
            
            this.worker.addEventListener("error", (error) => {
                this.worker.terminate();
                this.worker = null;
                this.setInvalidateStatus(error.message);
                this.stopTimer();
                generationEnded();
            }, false);
            
            this.worker.addEventListener("message", event => {
                this.worker.terminate();
                this.worker = null; 
                
                if (!event.data.result.isBisimilar) { //this should be false, for there to be distinguishing formula
                    this.status = PropertyStatus.satisfied;
                    var properties = {
                        firstProperty : new HML({process: this.firstProcess, topFormula: event.data.result.formula, definitions: ""}),
                        secondProperty : new HML({process: this.secondProcess, topFormula: event.data.result.formula, definitions: ""})
                    }

                    generationEnded(properties);
                    // this.verifyHml(event.data.result.formula);
                } else {
                    this.setInvalidateStatus("The two selected processes are bisimilar, and no distinguishing formula exists.");
                    this.stopTimer()
                    generationEnded();
                }
            });
        }

        public getDescription() : string {
            return this.firstProcess + " &#8764;" + super.getTimeSubscript() + " " + this.secondProcess;
        }

        public getClassName() : string {
            return "StrongBisimulation";
        }

        protected getWorkerHandler() : string {
            return "isStronglyBisimilar";
        }
    }

    export class WeakBisimulation extends Relation {
        public constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }

        public generateDistinguishingFormula(generationEnded : Function) : void {
            // start the worker, and make the worker generationEnded with the result.
            var program = this.project.getCCS();
            this.worker = new Worker("lib/workers/verifier.js");
            
            this.worker.postMessage({
                type: "program",
                program: program,
                inputMode: InputMode[this.project.getInputMode()]
            });
            
            this.worker.postMessage({
                type: "findDistinguishingFormula",
                leftProcess: this.getFirstProcess(),
                rightProcess: this.getSecondProcess(),
                succGenType: "weak"
            });
            
            this.worker.addEventListener("error", (error) => {
                this.worker.terminate();
                this.worker = null;
                this.setInvalidateStatus(error.message);
                this.stopTimer();
                generationEnded();
            }, false);
            
            this.worker.addEventListener("message", event => {
                this.worker.terminate();
                this.worker = null; 
                
                if (!event.data.result.isBisimilar) { //this should be false, for there to be distinguishing formula
                    this.status = PropertyStatus.satisfied;
                    var properties = {
                        firstProperty : new HML({process: this.firstProcess, topFormula: event.data.result.formula, definitions: ""}),
                        secondProperty : new HML({process: this.secondProcess, topFormula: event.data.result.formula, definitions: ""})
                    }

                    generationEnded(properties);
                    // this.verifyHml(event.data.result.formula);
                } else {
                    this.setInvalidateStatus("The two selected processes are bisimilar, and no distinguishing formula exists.");
                    this.stopTimer()
                    generationEnded();
                }
            });
        }

        public getDescription() : string {
            return this.firstProcess + " &#8776;" + super.getTimeSubscript() + " " + this.secondProcess;
        }
        
        public getClassName() : string {
            return "WeakBisimulation";
        }

        protected getWorkerHandler() : string {
            return "isWeaklyBisimilar";
        }
    }
    
    export class StrongSimulation extends Relation {
        public constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }

        public getDescription() : string {
            return this.firstProcess + " sim<sub>&#8594;" + super.getTimeSubscript() +"</sub> " + this.secondProcess;
        }
        
        public getClassName() : string {
            return "StrongSimulation";
        }

        protected getWorkerHandler() : string {
            return "isStronglySimilar";
        }
    }
    
    export class WeakSimulation extends Relation {
        public constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }

        public getDescription() : string {
            return this.firstProcess + " sim<sub>&#8658;" + super.getTimeSubscript() + "</sub> " + this.secondProcess;
        }
        
        public getClassName() : string {
            return "WeakSimulation";
        }

        protected getWorkerHandler() : string {
            return "isWeaklySimilar";
        }
    }
    
    export class StrongTraceEq extends Relation {
        constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }
        
        public getDescription() : string {
            return "Traces<sub>&#8594;" + super.getTimeSubscript() + "</sub>(" + this.firstProcess + ") = Traces<sub>&#8594;" + super.getTimeSubscript() + "</sub>(" + this.secondProcess + ")";
        }
        
        public getClassName() : string {
            return "StrongTraceEq";
        }

        protected getWorkerHandler() : string {
            return "isStronglyTraceEq";
        }
    }

    export class WeakTraceEq extends Relation {
        constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }
        
        public getDescription() : string {
            return "Traces<sub>&#8658;" + super.getTimeSubscript() + "</sub>(" + this.firstProcess + ") = Traces<sub>&#8658;" + super.getTimeSubscript() + "</sub>(" + this.secondProcess + ")";
        }
        
        public getClassName() : string {
            return "WeakTraceEq";
        }

        protected getWorkerHandler() : string {
            return "isWeaklyTraceEq";
        }
    }
    
    export class DistinguishingFormula extends Property {
        protected time : string;
        protected firstHMLProperty : Property.HML;
        protected secondHMLProperty : Property.HML;
        private isexpanded : boolean = true;
        
        private childPropertiesToVerify = [];
        private currentVerifyingProperty = null;
        protected verificationEndedCallback : Function = null;
        
        public constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(status);
            
            this.time = options.time;
            this.firstHMLProperty = new HML(options.firstHMLProperty);
            this.secondHMLProperty = new HML(options.secondHMLProperty);
        }

        public getTime() : string {
            return this.time;
        }
        
        public setTime(time : string) : void {
            this.time = time;
        }

        public isExpanded(){
            return this.isexpanded;
        }

        public setExpanded(isExpanded : boolean){
            this.isexpanded = isExpanded
        }

        public getFirstProcess() : string{
            return this.firstHMLProperty.getProcess();
        }

        public setFirstProcess(firstProcess: string) : void {
            this.firstHMLProperty.setProcess(firstProcess);
            this.setUnknownStatus();
            this.clearFormulas();
        }

        public getSecondProcess() : string {
            return this.secondHMLProperty.getProcess();
        }

        public setSecondProcess(secondProcess: string) : void {
            this.secondHMLProperty.setProcess(secondProcess);
            this.setUnknownStatus();
            this.clearFormulas();
        }

        private clearFormulas() {
            this.firstHMLProperty.setTopFormula("");
            this.firstHMLProperty.setDefinitions("");
            this.secondHMLProperty.setTopFormula("");
            this.secondHMLProperty.setDefinitions("");
        }

        public getFirstHML() : Property.HML {
            return this.firstHMLProperty;
        }

        public getSecondHML() : Property.HML {
            return this.secondHMLProperty;
        }

        protected verifyHml(formula : string) : void {
            this.firstHMLProperty.setTopFormula(formula);
            this.secondHMLProperty.setTopFormula(formula);
            
            this.childPropertiesToVerify.push(this.firstHMLProperty);
            this.childPropertiesToVerify.push(this.secondHMLProperty);
            
            this.doNextVerification();
        }

        private doNextVerification() {
            if (!this.currentVerifyingProperty && this.childPropertiesToVerify.length > 0) {
                var property = this.childPropertiesToVerify.shift();
                this.currentVerifyingProperty = property;
                
                // verify the property, and have the callback start the next.
                property.verify(() => {
                    this.currentVerifyingProperty = null;
                    this.doNextVerification();
                });
            } else {
                this.stopTimer();
                this.verificationEndedCallback();
            }
        }
    }

    export class TraceInclusion extends DistinguishingFormula {
        public time : string;
        
        constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
            
            this.time = options.time;
        }
        
        public getTime() : string {
            return this.time;
        }
        
        public setTime(time : string) : void {
            this.time = time;
        }
        
        protected getTimeSubscript() : string {
            if (this.project.getInputMode() === InputMode.CCS)
                return "";
            else
                return "<sub>" + (this.time === "untimed" ? "u" : "t") + "</sub>";
        }
        
        public toJSON() : any {
            return {
                type: this.getClassName(),
                status: this.status,
                time: this.time,
                options: {
                    firstHMLProperty: this.firstHMLProperty.toJSON().options,
                    secondHMLProperty: this.secondHMLProperty.toJSON().options
                }
            };
        }
        
        protected isReadyForVerification() : boolean {
            var isReady = true;
            var error = "";
            if(!this.getFirstProcess() && !this.getSecondProcess()) {
                isReady = false;
                error = "Two processes must be selected"
            } else {
                // if they are defined check whether they are defined in the CCS-program
                var processList = this.project.getGraph().getNamedProcesses()
                if (processList.indexOf(this.getFirstProcess()) === -1 || processList.indexOf(this.getSecondProcess()) === -1) {
                    error = "One of the processes selected is not defined in the CCS program."
                    isReady = false;
                }
            }

            // if is not ready invalidate the property
            if (!isReady) {
                this.setInvalidateStatus(error);
            }
            return isReady;
        }
        
        protected getWorkerMessage() : any {
            return {
                time: this.time,
                type: this.getWorkerHandler(),
                leftProcess: this.firstHMLProperty.getProcess(),
                rightProcess: this.secondHMLProperty.getProcess()
            };
        }
        
        protected workerFinished(event : any, callback : Function) : void {
            this.worker.terminate();
            this.worker = null; 
            
            var goodResult = event.data.result.isTraceIncluded;
            
            if (goodResult === false) {
                this.status = PropertyStatus.unsatisfied;
                this.verificationEndedCallback = callback;
                this.verifyHml(event.data.result.formula);
            } else if(goodResult === true) {
                this.status = PropertyStatus.satisfied;
                this.stopTimer()
                callback();
            }
        }
        
        public getClassName() : string { throw "Not implemented by subclass"; }
        protected getWorkerHandler() : string { throw "Not implemented by subclass"; }
    }
    
    export class StrongTraceInclusion extends TraceInclusion {
        constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }
        
        public getDescription() : string {
            return "Traces<sub>&#8594;" + super.getTimeSubscript() + "</sub>(" + this.getFirstProcess() + ") &sube; Traces<sub>&#8594;" + super.getTimeSubscript() + "</sub>(" + this.getSecondProcess() + ")";
        }
        
        public getClassName() : string {
            return "StrongTraceInclusion";
        }

        protected getWorkerHandler() : string {
            return "isStronglyTraceIncluded";
        }
    }

    export class WeakTraceInclusion extends TraceInclusion {
        constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }
        
        public getDescription() : string {
            return "Traces<sub>&#8658;" + super.getTimeSubscript() + "</sub>(" + this.getFirstProcess() + ") &sube; Traces<sub>&#8658;" + super.getTimeSubscript() + "</sub>(" + this.getSecondProcess() + ")";
        }
        
        public getClassName() : string {
            return "WeakTraceInclusion";
        }

        protected getWorkerHandler() : string {
            return "isWeaklyTraceIncluded";
        }
    }

    export class DistinguishingBisimulationFormula extends DistinguishingFormula {
        
        private succGenType : string;
        
        public constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
            
            this.succGenType = options.succGenType;
        }
        
        public getDescription() : string {
            var type = (this.succGenType === "strong") ? "Strong" : "Weak"; 
            return type + " distinguishing formula for: " + this.firstHMLProperty.getProcess() + " and " + this.secondHMLProperty.getProcess();
        }
        
        public toJSON() : any {
            return {
                type: "DistinguishingBisimulationFormula",
                status: this.status,
                time: this.time,
                options : {
                    firstHMLProperty: this.firstHMLProperty.toJSON().options,
                    secondHMLProperty: this.secondHMLProperty.toJSON().options,
                    succGenType: this.succGenType
                }
            };
        }
        
        /**
         * Check whether both process(first and second) is defined, and it exists in the CCS program.
         * And property status must not be invalid.
         * @return {boolean} if true, everything is defined.
         */
        protected isReadyForVerification() : boolean {
            var isReady = true;
            var error = "";
            if(!this.getFirstProcess() && !this.getSecondProcess()) {
                isReady = false;
                error = "Two processes must be selected"
            } else {
                // if they are defined check whether they are defined in the CCS-program
                var processList = this.project.getGraph().getNamedProcesses()
                if (processList.indexOf(this.getFirstProcess()) === -1 || processList.indexOf(this.getSecondProcess()) === -1) {
                    error = "One of the processes selected is not defined in the CCS program."
                    isReady = false;
                }
            }

            // if they are clearly bisimilar then do nothing..
            if (this.getFirstProcess() === this.getSecondProcess()) {
                error = "The two selected processes are bisimilar, and no distinguishing formula exists.";
                isReady = false;
            }

            // if is not ready invalidate the property
            if (!isReady) {
                this.setInvalidateStatus(error);
            }
            return isReady;
        }
        
        protected getWorkerMessage() : any {
            return {
                time: this.time,
                type: "findDistinguishingFormula",
                leftProcess: this.firstHMLProperty.getProcess(),
                rightProcess: this.secondHMLProperty.getProcess(),
                succGenType: this.succGenType
            };
        }
        
        protected workerFinished(event : any, callback : Function) : void {
            this.worker.terminate();
            this.worker = null; 
            
            if (!event.data.result.isBisimilar) { //this should be false, for there to be distinguishing formula
                this.status = PropertyStatus.satisfied;
                this.verificationEndedCallback = callback;
                this.verifyHml(event.data.result.formula);
            } else {
                this.setInvalidateStatus("The two selected processes are bisimilar, and no distinguishing formula exists.");
                this.stopTimer()
                callback();
            }
        }
    }
}

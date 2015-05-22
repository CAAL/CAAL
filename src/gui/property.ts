/// <reference path="../main.ts" />
/// <reference path="../../lib/ccs.d.ts" />

// satisfied = check-mark, unsatisfied = cross, invalid = yellow triangle, unknown = question mark
enum PropertyStatus {satisfied, unsatisfied, invalid, unknown};

module Property {
    export class Property {
        protected project : Project;
        private static counter : number = 0;
        private id : number;
        protected status : PropertyStatus;
        protected worker;
        private statistics = {elapsedTime: null};
        protected tdStatus;
        private clockInterval;
        private startTime;
        private error : string = "";
        protected toolMenuOptions = {};
        protected rowClickHandlers = {};

        public icons = {
            "play" : $("<i class=\"fa fa-play\"></i>"),
            "trash" : $("<i class=\"fa fa-trash\"></i>"),
            "checkmark": $("<i class=\"fa fa-check\"></i>"),
            "cross": $("<i class=\"fa fa-times\"></i>"),
            "triangle": $("<i class=\"fa fa-exclamation-triangle\"></i>"),
            "questionmark" : $("<i class=\"fa fa-question\"></i>"),
            "plus" : $("<i class=\"fa fa-plus-square\"></i>"),
            "minus" : $("<i class='fa fa-minus-square'></i>")
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

        protected getToolMenu() {
            var toolmenu = $("<div class=\"btn-group\"></div>");
            var btn = $("<button id=\"toolmenu-btn\" type=\"button\" data-toggle=\"dropdown\" class=\"property-btn btn btn-default btn-xs dropdown-toggle\"></button>");
            var dots = $("<i class=\"fa fa-ellipsis-v\"></i>")
            var list = $("<ul id=\"toolmenu\" class=\"dropdown-menu\"></ul>")

            for (var key in this.toolMenuOptions) {
                if(this.toolMenuOptions[key].click != null){
                    var identifier = this.toolMenuOptions[key].id.replace("#", "") // replace the # with nothing, otherwise jquery will not find it later.
                    list.append("<li><a id=\""+identifier+"\">"+this.toolMenuOptions[key].label+"</a></li>")
                }
            }

            // if no element in the lists, just disable it.
            if(list[0].childElementCount === 0) {
                btn.addClass("disabled");
            }

            btn.append(dots);
            toolmenu.append(btn);
            toolmenu.append(list);
            return toolmenu;
        }

        public setToolMenuOptions(menuOptions : Object) {
            for (var key in menuOptions) {
                this.toolMenuOptions[key] = menuOptions[key];
            }
        }

        public setRowClickHandlers(rowHandlers : Object) {
            for (var key in rowHandlers){
                this.rowClickHandlers[key] = rowHandlers[key];
            }
        }

        public startTimer() { 
            this.startTime = new Date().getTime();
            var updateTimer = () => {
                var elapsedTime = new Date().getTime() - this.startTime;
                this.tdStatus.text(elapsedTime + "ms");
            }

            this.clockInterval = setInterval(updateTimer, 100);
        }

        public stopTimer() {
            this.statistics.elapsedTime = (this.startTime) ? new Date().getTime() - this.startTime : 0;
            clearInterval(this.clockInterval);
        }

        public onStatusHover(property) {
            if (this.status === PropertyStatus.satisfied || this.status === PropertyStatus.unsatisfied){
                return property.statistics.elapsedTime + " ms";
            } 
            else if(this.status === PropertyStatus.invalid) {
                return this.error;
            }
        }

        public getStatusIcon() : JQuery {
            if (this.status === PropertyStatus.unknown) {
                return this.icons.questionmark;
            }
            else if (this.status === PropertyStatus.satisfied) {
                return this.icons.checkmark;
            }
            else if (this.status === PropertyStatus.unsatisfied) {
                return this.icons.cross;
            }
            else if (this.status === PropertyStatus.invalid) {
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
            this.stopTimer(); // if aborted stop the time
            this.setUnknownStatus();
        }

        public toTableRow() : any[] {
            var row = $("<tr id='"+this.getId()+"'></tr>");
            var toolmenu = this.getToolMenu()
            var collapseBtn = $("<button id=\"property-collapse-btn\" type=\"button\" class=\"property-btn btn btn-default btn-xs\"></button>")
            var collapse = $("<td id=\"tdCollapse\" class=\"text-center\"></td>").append(collapseBtn.hide());
            //var statusBtn = $("<button id=\"property-status-btn\" type=\"button\" class=\"property-btn btn btn-default btn-xs\"></button>").append(this.getStatusIcon());
            this.tdStatus = $("<td id=\"property-status-btn\" class=\"text-center\"></td>").append(this.getStatusIcon());
            var tdDescription = $("<td id=\"property-description-btn\"></td>").append(this.getDescription());
            var btnVerify = $("<button id=\"property-verify-btn\" type=\"button\" class=\"property-btn btn btn-default btn-xs\"></button>").append(this.icons.play);
            var tdVerify = $("<td id=\"tdVerify\" class=\"text-center\"></td>").append(btnVerify);
            var tdToolMenu = $("<td id=\"tdToolmenu\" class=\"text-center\"></td>").append(toolmenu);
            row.append(collapse, this.tdStatus, tdDescription, tdVerify, tdToolMenu);

            this.tdStatus.tooltip({
                title: this.onStatusHover(this),
                selector: '.fa-check, .fa-times, .fa-exclamation-triangle'
            });

            
            /*Row click handlers*/
            for (var rowHandler in this.rowClickHandlers){
                var rowElement = row.find(this.rowClickHandlers[rowHandler].id);
                if(this.rowClickHandlers[rowHandler]) {
                    rowElement.on("click", {property:this}, this.rowClickHandlers[rowHandler].click);
                }
            }

            /*Tool menu options*/
            for (var tooloption in this.toolMenuOptions){
                var toolMenuOption = toolmenu.find(this.toolMenuOptions[tooloption].id);
                if(this.toolMenuOptions[tooloption]) {
                    toolMenuOption.on("click", {property:this}, this.toolMenuOptions[tooloption].click);
                }
            }

            return [row];
        }
        
        public verify(callback : Function) : void {
            if (!this.isReadyForVerification()) {
                console.log("something is wrong, please check the property");
                callback();
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
                callback();
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
            callback(); /* verification ended */
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
            this.setUnknownStatus(); /*When setting a new process, we don't know the result yet*/
        }

        public getTopFormula() : string {
            return this.topFormula;
        }

        public setTopFormula(formula : string) : void {
            this.topFormula = formula;
            this.setUnknownStatus(); /*When setting a new formula, we don't know the result yet*/
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
    
    export class Equivalence extends Property { // equivalence is a bad name, it also covers preorders
        public firstProcess : string;
        public secondProcess : string;
        public time : string;

        public constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(status);
            
            this.time = options.time;
            this.firstProcess = options.firstProcess;
            this.secondProcess = options.secondProcess;
        }
        
        public getTime() : string {
            return this.time;
        }
        
        public setTime(time : string) : void {
            this.time = time;
        }
        
        public getFirstProcess() : string {
            return this.firstProcess;
        }

        public setFirstProcess(firstProcess: string) : void {
            this.firstProcess = firstProcess;
            this.setUnknownStatus();
        }

        public getSecondProcess() : string {
            return this.secondProcess;
        }

        public setSecondProcess(secondProcess: string) : void {
            this.secondProcess = secondProcess;
            this.setUnknownStatus();
        }
        
        public toJSON() : any {
            return {
                type: this.getType(),
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
        
        public getType() : string { throw "Not implemented by subclass"; }
        protected getWorkerHandler() : string { throw "Not implemented by subclass"; }
    }

    export class StrongBisimulation extends Equivalence {
        public constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }

        public getDescription() : string {
            return this.firstProcess + " &#8764; " + this.secondProcess;
        }

        public getType() : string {
            return "StrongBisimulation";
        }

        protected getWorkerHandler() : string {
            return "isStronglyBisimilar";
        }
    }

    export class WeakBisimulation extends Equivalence {
        public constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }

        public getDescription() : string {
            return this.firstProcess + " &#8776; " + this.secondProcess;
        }
        
        public getType() : string {
            return "WeakBisimulation";
        }

        protected getWorkerHandler() : string {
            return "isWeaklyBisimilar";
        }
    }
    
    export class StrongSimulation extends Equivalence {
        public constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }

        public getDescription() : string {
            return this.firstProcess + " sim<sub>&#8594;</sub> " + this.secondProcess;
        }
        
        public getType() : string {
            return "StrongSimulation";
        }

        protected getWorkerHandler() : string {
            return "isStronglySimilar";
        }
    }
    
    export class WeakSimulation extends Equivalence {
        public constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }

        public getDescription() : string {
            return this.firstProcess + " sim<sub>&#8658;</sub> " + this.secondProcess;
        }
        
        public getType() : string {
            return "WeakSimulation";
        }

        protected getWorkerHandler() : string {
            return "isWeaklySimilar";
        }
    }
    
    export class StrongTraceEq extends Equivalence {
        constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }
        
        public getDescription() : string {
            return "Traces<sub>&#8594;</sub>(" + this.firstProcess + ") = Traces<sub>&#8594;</sub>(" + this.secondProcess + ")";
        }
        
        public getType() : string {
            return "StrongTraceEq";
        }

        protected getWorkerHandler() : string {
            return "isStronglyTraceEq";
        }
    }

    export class WeakTraceEq extends Equivalence {
        constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }
        
        public getDescription() : string {
            return "Traces<sub>&#8658;</sub>(" + this.firstProcess + ") = Traces<sub>&#8658;</sub>(" + this.secondProcess + ")";
        }
        
        public getType() : string {
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

        private getCollapseState() : JQuery {
            if (this.isExpanded()) {
                return this.icons.minus;
            }
            else {
                return this.icons.plus;
            }
        }

        public toTableRow() : any {
            var result = super.toTableRow();

            /* Add the collapse button */

            var collapseBtn = result[0].find(this.rowClickHandlers["collapse"].id);
            collapseBtn.show();
            collapseBtn.append(this.getCollapseState())
            
            if(this.isExpanded() /*&& this.firstHMLProperty.getFormula() !== "" && this.secondHMLProperty.getFormula() !== ""*/) {
                var rowHandlers = {} 
                rowHandlers["verify"] = this.rowClickHandlers["verify"];

                this.firstHMLProperty.setRowClickHandlers(rowHandlers);
                //this.firstHMLProperty.toolMenuOptions["Play"].click = this.onPlayGame;
                var firstRow = this.firstHMLProperty.toTableRow();
                result.push(firstRow);
                
                this.secondHMLProperty.setRowClickHandlers(rowHandlers);
                //this.secondHMLProperty.toolMenuOptions["Play"].click = this.onPlayGame;
                var secondRow = this.secondHMLProperty.toTableRow();
                result.push(secondRow);
            }

            return result;
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
    
    export class TraceInclusion extends DistinguishingFormula {
        constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }
        
        public toJSON() : any {
            return {
                type: this.getType(),
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
        
        public getType() : string { throw "Not implemented by subclass"; }
        protected getWorkerHandler() : string { throw "Not implemented by subclass"; }
    }
    
    export class StrongTraceInclusion extends TraceInclusion {
        constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }
        
        public getDescription() : string {
            return "Traces<sub>&#8594;</sub>(" + this.getFirstProcess() + ") &sube; Traces<sub>&#8594;</sub>(" + this.getSecondProcess() + ")";
        }
        
        public getType() : string {
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
            return "Traces<sub>&#8658;</sub>(" + this.getFirstProcess() + ") &sube; Traces<sub>&#8658;</sub>(" + this.getSecondProcess() + ")";
        }
        
        public getType() : string {
            return "WeakTraceInclusion";
        }

        protected getWorkerHandler() : string {
            return "isWeaklyTraceIncluded";
        }
    }
}
  

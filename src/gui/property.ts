/// <reference path="../main.ts" />
/// <reference path="../../lib/ccs.d.ts" />

// satisfied = check-mark, unsatisfied = cross, invalid = yellow triangle, unknown = question mark
enum PropertyStatus {satisfied, unsatisfied, invalid, unknown};

module Property {

    function getWorker() : Worker {
        var worker = new Worker("lib/workers/verifier.js");
        // worker.addEventListener("error", (error) => {
        //     console.log("Verifier Worker Error at line " + error.lineno +
        //         " in " + error.filename + ": " + error.message);
        // }, false);
        return worker;
    }

    export class Property {
        private static counter: number = 0;
        private id: number;
        public status: PropertyStatus;
        public worker;
        public statistics = {elapsedTime: null};
        public onVerify : Function;
        //public onStatusHover : Function = () => {return""}; /*it is not allowed to be null?*/
        public onToolMenuClick : Function;
        public onPlayGame : Function;
        protected tdStatus;
        protected clockInterval;
        protected startTime;
        protected error : string = "";

        public toolMenuOptions = {
            "edit":{
                id:"property-edit",
                label: "Edit",
                click: null
            }, 
            "delete":{
                id: "property-delete",
                label: "Delete",
                click: null
            },
            "play":{
                id: "property-playgame",
                label: "Play",
                click: null
            }
        };

        public rowClickHandlers = {
            "collapse" : {
                id:"property-collapse",
                click : null,
            },
            "description" : {
                id : "property-description",
                click : null
            },
            "status" : {
                id : "property-status",
                click : null
            },
            "verify" : {
                id : "property-verify",
                click : null
            }
        }

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

        protected getToolMenu(){
            var toolmenu = $("<div class=\"btn-group\"></div>");
            var btn = $("<button id=\"toolmenu-btn\" type=\"button\" data-toggle=\"dropdown\" class=\"btn btn-default btn-xs dropdown-toggle\"></button>");
            var dots = $("<span class=\"fa fa-ellipsis-v\"></span>")
            var list = $("<ul id=\"toolmenu\" class=\"dropdown-menu\"></ul>")

            for (var key in this.toolMenuOptions) {
                if(this.toolMenuOptions[key].click != null){
                    list.append("<li><a id=\""+this.toolMenuOptions[key].id+"\">"+this.toolMenuOptions[key].label+"</a></li>")
                } /* else {
                    list.append("<li class=\"disabled\"><a id=\""+this.toolMenuOptions[key].id+"\">"+this.toolMenuOptions[key].label+"</a></li>")
                }*/
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

        public setToolMenuOptions(menuOptions : Object){
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

        public getStatusIcon(): JQuery {
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

        public setUnknownStatus(): void {
            this.status = PropertyStatus.unknown;
        }

        public abortVerification(): void {
            this.worker.terminate();
            this.worker = null;
            this.stopTimer(); // if aborted stop the time
            this.setUnknownStatus();
        }

        public toTableRow() : any[] {
            var row = $("<tr id='"+this.getId()+"'></tr>");
            var toolmenu = this.getToolMenu()

            var collapse = $("<td id=\"property-collapse\" class=\"text-center\"></td>");
            this.tdStatus = $("<td id=\"property-status\" class=\"text-center\"></td>").append(this.getStatusIcon());
            var tdDescription = $("<td id=\"property-description\"></td>").append(this.getDescription());
            var tdVerify = $("<td id=\"property-verify\" class=\"text-center\"></td>").append(this.icons.play);
            var tdToolMenu = $("<td id=\"property-toolmenu\" class=\"text-center\"></td>").append(toolmenu);
            row.append(collapse, this.tdStatus, tdDescription, tdVerify, tdToolMenu);

            this.tdStatus.tooltip({
                title: this.onStatusHover(this),
                selector: '.fa-check, .fa-times, .fa-exclamation-triangle'
            });

            
            /*Row click handlers*/
            for (var rowHandler in this.rowClickHandlers){
                var rowElement = row.find("#"+this.rowClickHandlers[rowHandler].id);
                if(this.rowClickHandlers[rowHandler].click) {
                    rowElement.on("click", {property:this}, this.rowClickHandlers[rowHandler].click);
                }
            }

            /*Tool menu options*/
            for (var tooloption in this.toolMenuOptions){
                var toolMenuOption = toolmenu.find("#" + this.toolMenuOptions[tooloption].id);
                if(this.toolMenuOptions[tooloption].click !== null) {
                    toolMenuOption.on("click", {property:this}, this.toolMenuOptions[tooloption].click);
                }
            }

            return [row];
        }

        public getDescription(): string {throw "Not implemented by subclass"}
        public toJSON(): any {throw "Not implemented by subclass"}
        public verify(callback: () => any, queProperties? :() => any): void {throw "Not implemented by subclass"}
        protected isReadyForVerification() : boolean {throw "Not implemented by subclass"}
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
        
        public toJSON(): any {
            return {
                type: this.getType(),
                status: this.status,
                options: {
                    firstProcess: this.firstProcess,
                    secondProcess: this.secondProcess
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
                var processList = Main.getGraph().getNamedProcesses()
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
        
        public verify(callback : Function) : void {
            if (!this.isReadyForVerification()) {
                console.log("something is wrong, please check the property");
                callback()
                return;
            }
            
            this.startTimer();
            var program = Main.getProgram();
            this.worker = getWorker();
            this.worker.postMessage({
                type: "program",
                program: program
            });
            this.worker.postMessage({
                type: this.getWorkerHandler(),
                leftProcess: this.firstProcess,
                rightProcess: this.secondProcess
            });
            this.worker.addEventListener("error", (error) => {
                /*display tooltip with error*/
                this.setInvalidateStatus(error.message);
                this.stopTimer();
                callback()
            }, false);
            this.worker.addEventListener("message", event => {
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
                this.worker.terminate();
                this.worker = null; 
                this.stopTimer()
                callback(); /* verification ended */
            });
        }
        
        public getType() : string {throw "Not implemented by subclass"}
        protected getWorkerHandler() : string {throw "Not implemented by subclass"}
    }

    export class StrongBisimulation extends Equivalence {
        public constructor(options: any, status: PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }

        public getDescription(): string {
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
        public constructor(options: any, status: PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }

        public getDescription(): string {
            return this.firstProcess + " &#8776; " + this.secondProcess;
        }
        
        public getType() : string {
            return "WeakBisimulation";
        }

        protected getWorkerHandler() : string {
            return "isWeaklyBisimilar";
        }
    }

    export class StrongTraceInclusion extends Equivalence {
        constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }
        
        public getDescription() : string {
            return this.firstProcess + " &#8849;<sub>S</sub> " + this.secondProcess;
        }
        
        public getType() : string {
            return "StrongTraceInclusion";
        }

        protected getWorkerHandler() : string {
            return "isStronglyTraceIncluded";
        }
    }

    export class WeakTraceInclusion extends Equivalence {
        constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }
        
        public getDescription() : string {
            return this.firstProcess + " &#8849;<sub>W</sub> " + this.secondProcess;
        }
        
        public getType() : string {
            return "WeakTraceInclusion";
        }

        protected getWorkerHandler() : string {
            return "isWeaklyTraceIncluded";
        }
    }

    export class StrongTraceEq extends Equivalence {
        constructor(options : any, status : PropertyStatus = PropertyStatus.unknown) {
            super(options, status);
        }
        
        public getDescription() : string {
            return "Traces<sub>S</sub>(" + this.firstProcess + ") = Traces<sub>S</sub>(" + this.secondProcess + ")";
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
            return "Traces<sub>W</sub>(" + this.firstProcess + ") = Traces<sub>W</sub>(" + this.secondProcess + ")";
        }
        
        public getType() : string {
            return "WeakTraceEq";
        }

        protected getWorkerHandler() : string {
            return "isWeaklyTraceEq";
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
        protected isReadyForVerification() : boolean {
            var isReady = true;
            var error = ""
            if (!this.getProcess()) {
                isReady = false;
                error = "There is no process selected.";
            } else {
                // if they are defined check whether they are defined in the CCS-program
                var processList = Main.getGraph().getNamedProcesses()
                if (processList.indexOf(this.getProcess()) === -1 ) {
                    error = "The processes selected is not defined in the CCS program.";
                    isReady = false;
                }
            }

            /**
             * HML syntax check (simple)
             * complete syntax check are done by the worker, it will post a error if the hml syntax did not parse. 
             */
            if(!this.formula || this.formula === "") {
                error = "Formula is not defined.";
                isReady = false;
            }

            if(!isReady){
                this.setInvalidateStatus(error)
            }
            
            return isReady
        }

        public verify(callback : Function): void {
            if(!this.isReadyForVerification){
                // something is not defined or syntax error
                callback()
                console.log("something is wrong, please check the property");
                return;
            }

            this.startTimer();
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
            this.worker.addEventListener("error", (error) => {
                /* HML syntax error */
                this.worker.terminate();
                this.worker = null;

                this.setInvalidateStatus(error.message);
                this.stopTimer();
                callback()
            }, false);
            this.worker.addEventListener("message", event => {
                this.worker.terminate();
                this.worker = null;

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

                this.stopTimer()
                callback()
            });
        }
    }

    export class DistinguishingFormula extends Property {
        public firstHMLProperty: Property.HML;
        public secondHMLProperty: Property.HML;
        public distinguishingFormula : string;
        private isexpanded : boolean = true;
        
        private childPropertiesToVerify = [];
        private currentVerifyingProperty = null;
        private verificationEndedCallback : Function = null;
        
        public constructor(options: any, status: PropertyStatus = PropertyStatus.unknown) {
            super(status);
            this.firstHMLProperty = new HML(options.firstHMLProperty);
            this.secondHMLProperty = new HML(options.secondHMLProperty);
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

        public setFirstProcess(firstProcess: string): void {
            this.firstHMLProperty.setProcess(firstProcess)
            this.clearFormulas()
        }

        public getSecondProcess() : string {
            return this.secondHMLProperty.getProcess();
        }

        public setSecondProcess(secondProcess: string): void {
            this.secondHMLProperty.setProcess(secondProcess)
            this.clearFormulas()
        }

        private clearFormulas(){
            this.firstHMLProperty.setFormula("")
            this.secondHMLProperty.setFormula("")
        }

        public getFirstHML() : Property.HML {
            return this.firstHMLProperty;
        }

        public getSecondHML() : Property.HML {
            return this.secondHMLProperty;
        }

        public getDescription(): string {
            return "Distinguishing formula for: " + this.firstHMLProperty.getProcess() + " and " + this.secondHMLProperty.getProcess();
        }

        public toJSON(): any {
            return {
                type: "DistinguishingFormula",
                status: this.status,
                options: {
                    firstHMLProperty: this.firstHMLProperty.toJSON().options,
                    secondHMLProperty: this.secondHMLProperty.toJSON().options
                }
            };
        }

        private getCollapseState(): JQuery {
            if (this.isExpanded()) {
                return this.icons.minus;
            }
            else {
                return this.icons.plus;
            }
        }

        public toTableRow() : any {
            var result = super.toTableRow();

            //this.tdStatus.on("click", {property: this}, this.rowClickHandlers.status);
            result[0].find("#property-collapse").append(this.getCollapseState());
            
            if(this.isExpanded() /*&& this.firstHMLProperty.getFormula() !== "" && this.secondHMLProperty.getFormula() !== ""*/) {
                var rowHandlers = {verify: null};
                rowHandlers.verify = this.rowClickHandlers.verify;

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
                var processList = Main.getGraph().getNamedProcesses()
                if (processList.indexOf(this.getFirstProcess()) === -1 || processList.indexOf(this.getSecondProcess()) === -1) {
                    error = "One of the processes selected is not defined in the CCS program."
                    isReady = false;
                }
            }

            // if they are clearly bisimular then do nothing..
            if (this.getFirstProcess() === this.getSecondProcess()) {
                error = "The two selected processes are bisimular, and no distinguishing formula exists.";
                isReady = false;
            }

            // if is not ready invalidate the property
            if (!isReady) {
                this.setInvalidateStatus(error);
            }
            return isReady;
        }  

        public verificationEnded(){
            this.currentVerifyingProperty = null;
            this.doNextVerification();
        }

        private verifyChildren(childProperties : any[]): void {
            this.queuePropertiesToVerification(childProperties);
            this.doNextVerification();
        }

        public queuePropertiesToVerification(properties : Property.Property[]) {
            properties.forEach((property) => this.childPropertiesToVerify.push(property));
        }

        private doNextVerification() {
            if (!this.currentVerifyingProperty && this.childPropertiesToVerify.length > 0) {
                var property = this.childPropertiesToVerify.shift();
                this.currentVerifyingProperty = property;
                property.verify(this.verificationEnded.bind(this));
            } else {
                // verification has ended
                this.stopTimer();
                this.verificationEndedCallback();
            }
        }

        public verify(callback : Function): void {
            this.verificationEndedCallback = callback;
            if(!this.isReadyForVerification()) {
                // invalidate will be set in isReadyForVerification
                console.log("something is wrong, please check the property");
                callback()
                return;
            }
            this.startTimer()
            var program = Main.getProgram();
            this.worker = getWorker();
            this.worker.postMessage({
                type: "program",
                program: program
            });
            this.worker.postMessage({
                type: "findDistinguishingFormula",
                leftProcess: this.firstHMLProperty.getProcess(),
                rightProcess: this.secondHMLProperty.getProcess()
            });
            this.worker.addEventListener("error", (error) => {
                /*display tooltip with error*/
                this.worker.terminate();
                this.worker = null;

                this.setInvalidateStatus(error.message);
                this.stopTimer()
                callback()
            }, false);
            this.worker.addEventListener("message", event => {
                this.worker.terminate();
                this.worker = null;

                var goodResult = !event.data.result.isBisimilar; //this should be false, for there to be distinguishing formula
                if (goodResult) {
                    this.status = PropertyStatus.satisfied;
                    var formula = event.data.result.formula;
                    this.firstHMLProperty.setFormula(formula);
                    this.secondHMLProperty.setFormula(formula);
                    this.verifyChildren([this.firstHMLProperty, this.secondHMLProperty]); // verify the two HML children.
                } else {
                    this.setInvalidateStatus("The two selected processes are bisimular, and no distinguishing formula exists.")
                    this.stopTimer()
                    callback();
                }
            });
        }
    }
}
  

/// <reference path="../main.ts" />
/// <reference path="../../lib/ccs.d.ts" />

// satisfied = check-mark, unsatisfied = cross, invalid = yellow triangle, unknown = question mark
enum PropertyStatus {satisfied, unsatisfied, invalid, unknown};

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
        private static counter: number = 0;
        private id: number;
        public status: PropertyStatus;
        public worker;
        public statistics = {elapsedTime: null};
        public onStatusClick : Function;
        public onVerify : Function;
        //public onStatusHover : Function = () => {return""}; /*it is not allowed to be null?*/
        public onToolMenuClick : Function;
        public onPlayGame : Function;
        protected tdStatus;
        protected clockInterval;
        protected startTime;

        public toolMenuOptions = {
                "Edit":{
                    id:"property-edit",
                    label: "Edit",
                    click: null
                }, 
                "Delete":{
                    id: "property-delete",
                    label: "Delete",
                    click: null
                },
                "Play":{
                    id: "property-playgame",
                    label: "Play",
                    click: null
                }
            };


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
            var toolmenu = $("<div class=\"btn-group\"><button type=\"button\" data-toggle=\"dropdown\" class=\"btn btn-default btn-xs dropdown-toggle\"><span class=\"fa fa-ellipsis-v\"></span></button></div>");
            var list = $("<ul id=\"toolmenu\" class=\"dropdown-menu\"></ul>")

            for (var key in this.toolMenuOptions) {
                if(this.toolMenuOptions[key].click){
                    list.append("<li><a id=\""+this.toolMenuOptions[key].id+"\">"+this.toolMenuOptions[key].label+"</a></li>")
                } else {
                    list.append("<li class=\"disabled\"><a id=\""+this.toolMenuOptions[key].id+"\">"+this.toolMenuOptions[key].label+"</a></li>")
                }
            }

            toolmenu.append(list);
            return toolmenu;
        }

        public setToolMenuOptions(menuOptions : Object){
            for (var key in menuOptions) {
                this.toolMenuOptions[key] = menuOptions[key];
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
            return property.statistics.elapsedTime + " ms";
        }

        public getStatusIcon(): string {
            if (this.status === PropertyStatus.unknown) {
                return "<i class=\"fa fa-question\"></i>"
            }
            else if (this.status === PropertyStatus.satisfied) {
                return "<i class=\"fa fa-check\"></i>"
            }
            else if (this.status === PropertyStatus.unsatisfied) {
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

        public toTableRow() : any[] {
            var row = $("<tr id='"+this.getId()+"'></tr>");
            var del = $("<i class=\"fa fa-trash\"></i>");
            var verify = $("<i class=\"fa fa-play\"></i>");
            var toolmenu = this.getToolMenu()

            this.tdStatus = $("<td id='property-status' class=\"text-center\"></td>").append(this.getStatusIcon());
            var tdDescription = $("<td id='property-description'></td>").append(this.getDescription());
            var tdVerify = $("<td id='property-verify' class=\"text-center\"></td>").append(verify);
            var tdToolMenu = $("<td id='property-toolmenu' class=\"text-center\"></td>").append(toolmenu);
            row.append(this.tdStatus, tdDescription, tdVerify, tdToolMenu);

            this.tdStatus.tooltip({
                title: this.onStatusHover(this),
                selector: '.fa-check'
            });
            
            var toolmenuPlay = row.find("a#property-playgame");
            var toolmenuEdit = row.find("a#property-edit");
            var toolmenuDelete = row.find("a#property-delete");

            this.tdStatus.on("click",        {property: this},  (e) => this.toolMenuOptions["Play"].click(e));
            tdDescription.on("click",   {property: this}, (e) =>  this.toolMenuOptions["Edit"].click(e));
            tdVerify.on("click",        {property: this}, (e) => this.onVerify(e));

            /*Tool menu options*/
            toolmenuPlay.on("click",    {property: this},  (e) => this.toolMenuOptions["Play"].click(e));
            toolmenuEdit.on("click",    {property: this}, (e) => this.toolMenuOptions["Edit"].click(e));
            toolmenuDelete.on("click",  {property: this},  (e) => this.toolMenuOptions["Delete"].click(e));
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
        /**
         * Check whether both process(first and second) is defined, and it exists in the CCS program.
         * And property status must not be invalid.
         * @return {boolean} if true, everything is defined.
         */
        protected isReadyForVerification() : boolean {
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
            var isReady = this.isReadyForVerification() 
            if (isReady) {
                this.startTimer()
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
                    this.stopTimer();
                    callback(this.status)
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
                    callback(this.status); /* verification ended */
                });
            } else {
                // something is not defined or syntax error
                console.log("something is wrong, please check the property");
                this.stopTimer()
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
            var isReady = this.isReadyForVerification();
            if (isReady) {
                this.startTimer()
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
                    this.stopTimer()
                    callback(this.status)
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
                    callback(this.status); /* verification ended */
                });
            } else {
                // something is not defined or syntax error
                console.log("something is wrong, please check the property");
                this.stopTimer()
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
        protected isReadyForVerification() : boolean {
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
            var isReady = this.isReadyForVerification() 
            if (isReady) {
                this.startTimer();
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
                    this.stopTimer();
                    callback(this.status) 
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
                    callback(this.status); /* verification ended */
                });
            } else {
                // something is not defined or syntax error
                this.stopTimer()
                callback(this.status); /* verification ended */
                throw "something is wrong, please check the property";
            }
        }
    }

    export class DistinguishingFormula extends Property {
        public firstHMLProperty: Property.HML;
        public secondHMLProperty: Property.HML;
        public distinguishingFormula : string;
        private isexpanded : boolean = true;
        


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
        }

        public getSecondProcess() : string {
            return this.secondHMLProperty.getProcess();
        }

        public setSecondProcess(secondProcess: string): void {
            this.secondHMLProperty.setProcess(secondProcess)
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

        public getStatusIcon(): string {
            if (this.isExpanded()) {
                return "<i class='fa fa-minus-square'></i>"
            }
            else {
                return "<i class='fa fa-plus-square'></i>";
            }
        }

        public toTableRow() : any {
            var result = [];
            var rowHeader = $("<tr id=\""+this.getId()+"\" class=\"distinguishing-header\"></tr>");

            var del = $("<i class='fa fa-trash'></i>");
            var toolmenu = this.getToolMenu();
            var verify = $("<i class=\"fa fa-play\"></i>");

            this.tdStatus = $("<td id=\"property-status\" class=\"text-center\"></td>").append(this.getStatusIcon());
            var tdDescription = $("<td id=\"property-description\"></td>").append(this.getDescription());
            var tdVerify = $("<td id=\"property-verify\" class=\"text-center\"></td>").append(verify);
            var tdToolMenu = $("<td id=\"property-toolmenu\" class=\"text-center\"></td>").append(toolmenu);
            rowHeader.append(this.tdStatus, tdDescription, tdVerify, tdToolMenu);
            result.push(rowHeader);

            if(this.isExpanded() /*&& this.firstHMLProperty.getFormula() !== "" && this.secondHMLProperty.getFormula() !== ""*/) {
                this.firstHMLProperty.onVerify = this.onVerify;
                //this.firstHMLProperty.toolMenuOptions["Play"].click = this.onPlayGame;
                var firstRow = this.firstHMLProperty.toTableRow();
                result.push(firstRow);
                
                this.secondHMLProperty.onVerify = this.onVerify;
                //this.secondHMLProperty.toolMenuOptions["Play"].click = this.onPlayGame;
                var secondRow = this.secondHMLProperty.toTableRow();
                result.push(secondRow);
            }

            this.tdStatus.tooltip({
                title: this.onStatusHover(this),
                selector: '.fa-check'
            });

            var toolmenuPlay = rowHeader.find("a#property-playgame");
            var toolmenuEdit = rowHeader.find("a#property-edit");
            var toolmenuDelete = rowHeader.find("a#property-delete");
            
            this.tdStatus.on("click",    {property: this},  (e) => this.onStatusClick(e));
            tdDescription.on("click",   {property: this}, (e) =>  this.toolMenuOptions["Edit"].click(e));
            tdVerify.on("click",    {property: this},  (e) => this.onVerify(e));

            /*Tool menu options*/
            toolmenuPlay.on("click",    {property: this},  (e) => this.toolMenuOptions["Play"].click(e));
            toolmenuEdit.on("click",    {property: this}, (e) => this.toolMenuOptions["Edit"].click(e));
            toolmenuDelete.on("click",  {property: this},  (e) => this.toolMenuOptions["Delete"].click(e));

            return result;
        }

        /**
         * Check whether both process(first and second) is defined, and it exists in the CCS program.
         * And property status must not be invalid.
         * @return {boolean} if true, everything is defined.
         */
        protected isReadyForVerification() : boolean {
            ///TODO: Fix this
            return true;
        }

        public verify(callback : Function, queProperties : Function): void {
            var isReady = this.isReadyForVerification() 
            if (isReady) {
                this.startTimer()
                var program = Main.getProgram();
                this.worker = getWorker(callback);
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
                    this.setInvalidateStatus();
                    this.stopTimer()
                    callback(this.status)
                }, false);
                this.worker.addEventListener("message", event => {
                    var goodResult = !event.data.result.isBisimilar;
                    this.status = goodResult ? PropertyStatus.unknown : PropertyStatus.invalid;
                    if (goodResult ) {
                        var formula = event.data.result.formula;
                        this.firstHMLProperty.setFormula(formula);
                        this.secondHMLProperty.setFormula(formula);
                        queProperties([this.firstHMLProperty, this.secondHMLProperty]);
                    }
                    this.worker.terminate();
                    this.worker = null;

                    this.stopTimer()
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
  

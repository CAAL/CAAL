/// <reference path="ccs.ts" />

module TCCS {
    
    export interface TCCSProcessDispatchHandler<T> extends CCS.ProcessDispatchHandler<T> {
        dispatchDelayPrefixProcess(process : DelayPrefixProcess, ... args) : T
    }

    export class DelayPrefixProcess implements CCS.Process {
        constructor(public id : CCS.ProcessId, public delay : Delay, public nextProcess : CCS.Process) {
        }
        dispatchOn<T>(dispatcher : TCCSProcessDispatchHandler<T>) : T {
            return dispatcher.dispatchDelayPrefixProcess(this);
        }
        toString() {
            return "Delay(" + this.delay.toString() + ")";
        }
    }
    
    export class Delay {
        private delay : number;
        
        constructor(delay : number) {
            this.delay = delay;
        }
        
        public getDelay() : number {
            return this.delay;
        }
        
        public toString() {
            return this.delay.toString();
        }
    }
    
    export class TCCSGraph extends CCS.Graph {
        constructor() {
            super();
            this.unguardedRecursionChecker = new Traverse.TCCSUnguardedRecursionChecker();
        }
        
        private newDelayPrefixProcess(delay : Delay, nextProcess : CCS.Process) {
            var key = "." + delay.getDelay() + "." + nextProcess.id;
            var existing = this.structural[key];
            if (!existing) {
                existing = this.structural[key] = new DelayPrefixProcess(this.nextId++, delay, nextProcess);
                this.processes[existing.id] = existing;
            }
            return existing;
        }
        
        public newDelayPrefixProcesses(delays : Delay[], nextProcess : CCS.Process) {
            var next = nextProcess;
            for (var i = 0; i < delays.length; i++) {
                next = this.newDelayPrefixProcess(delays[i], next);
            }
            return this.processes[this.nextId-1];
        }
    }
}
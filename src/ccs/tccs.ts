/// <reference path="ccs.ts" />

module TCCS {
    
    export interface TccsProcessDispatchHandler<T> extends CCS.ProcessDispatchHandler<T> {
        dispatchDelayPrefixProcess(process : DelayPrefixProcess, ... args) : T
    }

    export class DelayPrefixProcess implements CCS.Process {
        constructor(public id : CCS.ProcessId, public delay : Delay, public nextProcess : CCS.Process) {
        }
        dispatchOn<T>(dispatcher : TccsProcessDispatchHandler<T>) : T {
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
        
        getDelay() : number {
            return this.delay;
        }
    }
    
    export class TccsGraph extends CCS.Graph {
        
        newDelayPrefixProcess(delay : Delay, nextProcess : CCS.Process) {
            // var key = "." + delay.getDelay() + "." + nextProcess.id;
            return this.processes[this.nextId] = new DelayPrefixProcess(this.nextId++, delay, nextProcess);
        }
    }
}
/// <reference path="ccs.ts" />

module TCCS {
    
    export interface TCCSProcessDispatchHandler<T> extends CCS.ProcessDispatchHandler<T> {
        dispatchDelayPrefixProcess(process : DelayPrefixProcess, ... args) : T;
    }

    export class DelayPrefixProcess implements CCS.Process {
        constructor(public id : CCS.ProcessId, public delay : Delay, public nextProcess : CCS.Process) {
        }
        public dispatchOn<T>(dispatcher : TCCSProcessDispatchHandler<T>) : T {
            return dispatcher.dispatchDelayPrefixProcess(this);
        }
        public toString() {
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

        public equals(other : Delay) {
            return this.delay === other.getDelay();
        }
        
        public toString() {
            return this.delay.toString();
        }
    }

    export class DelayTransition implements CCS.Transition {

        constructor(public delay : Delay, public targetProcess : CCS.Process) {
        }

        equals(other : DelayTransition) {
            return (this.delay.equals(other.delay) &&
                    this.targetProcess.id == other.targetProcess.id);
        }

        toString() {
            if (this.targetProcess instanceof CCS.NamedProcess) {
                return this.delay.toString() + "->" + (<CCS.NamedProcess>this.targetProcess).name;
            }
            return this.delay.toString() + "->" + this.targetProcess.id;
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

    export class StrictSuccessorGenerator extends CCS.StrictSuccessorGenerator implements TCCSProcessDispatchHandler<CCS.TransitionSet> {

        dispatchSummationProcess(process : CCS.SummationProcess) {
            var transitionSet = this.cache[process.id];
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new CCS.TransitionSet();
                var hasTau = false;

                process.subProcesses.forEach(subProcess => {
                    if (subProcess instanceof CCS.ActionPrefixProcess && subProcess.action.toString() === "tau")
                        hasTau = true;
                });
                
                process.subProcesses.forEach(subProcess => {
                    if (!hasTau || !(subProcess instanceof DelayPrefixProcess)) {
                        transitionSet.unionWith(subProcess.dispatchOn(this));
                    }
                });

                return transitionSet;
            }
        }

        dispatchDelayPrefixProcess(process : TCCS.DelayPrefixProcess) {
            var transitionSet = this.cache[process.id];
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new CCS.TransitionSet([new DelayTransition(process.delay, process.nextProcess)]);
            }
            return transitionSet;
        }
        
    }
}

module Traverse {
    export class TCCSLabelledBracketNotation extends Traverse.LabelledBracketNotation implements CCS.ProcessVisitor<string>, TCCS.TCCSProcessDispatchHandler<void> {
        public dispatchDelayPrefixProcess(process : TCCS.DelayPrefixProcess) {
            this.stringPieces.push("[DelayPrefix");
            this.stringPieces.push(process.delay + ".");
            process.nextProcess.dispatchOn(this);
            this.stringPieces.push("]");
        }
    }
    
    export class TCCSNotationVisitor extends Traverse.CCSNotationVisitor implements CCS.ProcessVisitor<string>, TCCS.TCCSProcessDispatchHandler<string> {
        public dispatchDelayPrefixProcess(process : TCCS.DelayPrefixProcess) {
            var result = this.cache[process.id],
            subStr;
            if (!result) {
                subStr = process.nextProcess.dispatchOn(this);
                subStr = wrapIfInstanceOf(subStr, process.nextProcess, [CCS.SummationProcess, CCS.CompositionProcess]);
                result = this.cache[process.id] = process.delay.toString() + "." + subStr;
            }
            return result;
        }
    }
    
    export class TCCSProcessTreeReducer extends Traverse.ProcessTreeReducer implements CCS.ProcessVisitor<CCS.Process>, TCCS.TCCSProcessDispatchHandler<CCS.Process> {
        
        constructor(private tccsgraph : TCCS.TCCSGraph) {
            super(tccsgraph);
        }
        
        public dispatchDelayPrefixProcess(process : TCCS.DelayPrefixProcess) {
            var resultProcess = this.cache[process.id];
            
            if (!resultProcess) {
                var nextProcess : CCS.Process = process.nextProcess;
                var resultDelay : number = process.delay.getDelay();
                
                // ɛ(d).ɛ(d').P => ɛ(d+d').P
                while (nextProcess instanceof TCCS.DelayPrefixProcess) {
                    var nextDelayProcess : TCCS.DelayPrefixProcess = <TCCS.DelayPrefixProcess>nextProcess;
                    resultDelay += nextDelayProcess.delay.getDelay();
                    nextProcess = nextDelayProcess.nextProcess;
                }
                
                if (resultDelay === 0) {
                    // ɛ(0).P => P
                    resultProcess = this.cache[process.id] = nextProcess.dispatchOn(this);
                } else {
                    nextProcess = nextProcess.dispatchOn(this);
                    resultProcess = this.cache[process.id] = this.tccsgraph.newDelayPrefixProcesses([new TCCS.Delay(resultDelay)], nextProcess);
                }
            }
            
            return resultProcess;
        }
    }
}

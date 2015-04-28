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

        public constructor(public delay : Delay, public targetProcess : CCS.Process) {
        }

        public equals(other : CCS.Transition) {
            if (!(other instanceof DelayTransition)) {
                return false;
            }
            
            return (this.delay.equals(other.delay) && this.targetProcess.id == other.targetProcess.id);
        }

        public toString() {
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

        constructor(protected tccsgraph : TCCSGraph, cache?) {
            super(tccsgraph, cache);
        }
        
        public dispatchNullProcess(process : CCS.NullProcess) : CCS.TransitionSet {
            var transitionSet = this.cache[process.id];
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new CCS.TransitionSet([new DelayTransition(new Delay(1), process)]);
            }
            return transitionSet;
        }
        
        public dispatchSummationProcess(process : CCS.SummationProcess) : CCS.TransitionSet {
            var transitionSet = this.cache[process.id];
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new CCS.TransitionSet();

                var hasTau = false;
                var hasDelay = false;

                process.subProcesses.forEach(subProcess => {
                    if (subProcess instanceof CCS.ActionPrefixProcess && subProcess.action.toString() === "tau") {
                        hasTau = true;
                    }

                    if (subProcess instanceof DelayPrefixProcess) {
                        hasDelay = true;
                    }
                });
                
                if (!hasTau && hasDelay) { // Delay the entire summation
                    var processes = [];

                    process.subProcesses.forEach(subProcess => {
                        if (subProcess instanceof DelayPrefixProcess) {
                            processes.push(subProcess.nextProcess);
                        } else {
                            processes.push(subProcess);
                        }
                    });

                    var summation = this.graph.newSummationProcess(processes);
                    transitionSet.add(new DelayTransition(new Delay(1), summation));
                }
                
                process.subProcesses.forEach(subProcess => {
                    if (!(subProcess instanceof DelayPrefixProcess)) {
                        transitionSet.unionWith(subProcess.dispatchOn(this));
                    }
                });

                return transitionSet;
            }
        }

        public dispatchCompositionProcess(process : CCS.CompositionProcess) : CCS.TransitionSet {
            var transitionSet = this.cache[process.id];

            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new CCS.TransitionSet();
                var subTransitionSets = process.subProcesses.map(subProc => subProc.dispatchOn(this));
                var hasTau = false;
                var hasDelay = false;

                //COM3s
                for (var i=0; i < subTransitionSets.length-1; i++) {
                    for (var j=i+1; j < subTransitionSets.length; j++) {
                        //For each pairs in  P1 | P2 | P3 | P4, find COM3 transitions.
                        var left = subTransitionSets[i];
                        var right = subTransitionSets[j];

                        left.forEach(leftTransition => {
                            right.forEach(rightTransition => {
                                if (!(leftTransition instanceof DelayTransition) && !(rightTransition instanceof DelayTransition)) {
                                    if(leftTransition.action.getLabel() === "tau" || rightTransition.action.getLabel() === "tau") {
                                        hasTau = true;
                                    }
                                    if (leftTransition.action.getLabel() === rightTransition.action.getLabel() &&
                                        leftTransition.action.isComplement() !== rightTransition.action.isComplement()) {
                                        hasTau = true;

                                        var targetSubprocesses = process.subProcesses.slice(0);

                                        targetSubprocesses[i] = leftTransition.targetProcess;
                                        targetSubprocesses[j] = rightTransition.targetProcess;

                                        transitionSet.add(new CCS.ActionTransition(new CCS.Action("tau", false), this.graph.newCompositionProcess(targetSubprocesses)));
                                    }
                                } else {
                                    hasDelay = true;
                                }
                            });
                        });
                    }
                }

                if (!hasTau && hasDelay) {
                    var processes = [];

                    process.subProcesses.forEach(subProcess => {
                        if (subProcess instanceof DelayPrefixProcess) {
                            processes.push(subProcess.nextProcess);
                        } else {
                            processes.push(subProcess);
                        }
                    });

                    var composition = this.graph.newCompositionProcess(processes);
                    transitionSet.add(new DelayTransition(new Delay(1), composition));
                }

                //COM1/2s
                subTransitionSets.forEach( (subTransitionSet, index) => {
                    subTransitionSet.forEach(subTransition => {
                        if (!(subTransition instanceof DelayTransition)) {
                            var targetSubprocesses = process.subProcesses.slice(0);
                            //Only the index of the subprocess will have changed.
                            targetSubprocesses[index] = subTransition.targetProcess;
                            transitionSet.add(new CCS.ActionTransition(subTransition.action.clone(), this.graph.newCompositionProcess(targetSubprocesses)));
                        }
                    });
                });
            }

            return transitionSet;
        }
        
        public dispatchActionPrefixProcess(process : CCS.ActionPrefixProcess) {
            var transitionSet = this.cache[process.id];
            if (!transitionSet) {
                transitionSet = super.dispatchActionPrefixProcess(process);
                if (process.action.toString() !== "tau")
                    transitionSet.add(new DelayTransition(new Delay(1), process));
            }
            return transitionSet;
        }

        public dispatchDelayPrefixProcess(process : TCCS.DelayPrefixProcess) : CCS.TransitionSet {
            var transitionSet = this.cache[process.id];
            if (!transitionSet) {
                if (process.delay.getDelay() > 1) {
                    var newDelay = new Delay(process.delay.getDelay() - 1);
                    var newDelayProcess = this.tccsgraph.newDelayPrefixProcesses([newDelay], process.nextProcess);
                    transitionSet = new CCS.TransitionSet([new DelayTransition(newDelay, newDelayProcess)]);
                } else if (process.delay.getDelay() === 1) {
                    transitionSet = new CCS.TransitionSet([new DelayTransition(process.delay, process.nextProcess)]);
                } else {
                    // this should never happen
                    transitionSet = process.nextProcess.dispatchOn(this);
                    throw "DelayPrefixProcess of delay 0";
                }
                this.cache[process.id] = transitionSet;
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
    
    export class TCCSUnguardedRecursionChecker extends Traverse.UnguardedRecursionChecker implements TCCS.TCCSProcessDispatchHandler<boolean> {
        public dispatchDelayPrefixProcess(process : TCCS.DelayPrefixProcess) {
            return false;
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

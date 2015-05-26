/// <reference path="ccs.ts" />

module TCCS {
    
    export interface ProcessDispatchHandler<T> extends CCS.ProcessDispatchHandler<T> {
        dispatchDelayPrefixProcess(process : DelayPrefixProcess, ... args) : T;
    }

    export class DelayPrefixProcess implements CCS.Process {
        private ccs : string;
        constructor(public delay : Delay, public nextProcess : CCS.Process) {
        }
        public dispatchOn<T>(dispatcher : ProcessDispatchHandler<T>) : T {
            return dispatcher.dispatchDelayPrefixProcess(this);
        }
        public toString() {
            if (this.ccs) return this.ccs;
            return this.ccs = "." + this.delay.toString() + "." + this.nextProcess.toString();
        }
        get id() {
            return this.toString();
        }
    }
    
    export class Delay extends CCS.Action { // treat delays like actions
        private delay : number;
        
        constructor(delay : number) {
            // Let all delays be named 'Delay' so they all equal each other.
            // No matter how big a delay, they can always delay by one.
            super("Delay", false);
            
            this.delay = delay;
        }
        
        public getDelay() : number {
            return this.delay;
        }
        
        public toString() {
            return this.delay.toString();
        }

        public clone() {
            return new Delay(this.delay);
        }
    }

    export class DelayTransition extends CCS.Transition {

        public constructor(public delay : Delay, targetProcess : CCS.Process) {
            super(delay, targetProcess);
        }

        public equals(other : CCS.Transition) {
            if (!(other instanceof DelayTransition)) {
                return false;
            }
            
            return (this.delay.equals((<DelayTransition>other).delay) && this.targetProcess.id === other.targetProcess.id);
        }

        public toString() {
            if (this.targetProcess instanceof CCS.NamedProcess) {
                return this.delay.toString() + "->" + (<CCS.NamedProcess>this.targetProcess).name;
            }
            return this.delay.toString() + "->" + this.targetProcess.id;
        }
    }

    
    export class Graph extends CCS.Graph {
        constructor() {
            super();
            this.unguardedRecursionChecker = new Traverse.TCCSUnguardedRecursionChecker();
        }
        
        public newDelayPrefixProcess(delay : Delay, nextProcess : CCS.Process) {
            var result = new DelayPrefixProcess(delay, nextProcess);
            return this.processes[result.id] = result;
        }
    }

    export class StrictSuccessorGenerator extends CCS.StrictSuccessorGenerator implements ProcessDispatchHandler<CCS.TransitionSet> {
        
        private tauFoundCache;
        private delaySuccessor : DelaySuccessor;
        
        constructor(protected tccsgraph : Graph, cache?) {
            super(tccsgraph, cache);
            this.tauFoundCache = {};
            this.delaySuccessor = new DelaySuccessor(tccsgraph);
        }
        
        // use most of super to create Transitions, identify if process can do tau,
        // if process cannot do tau then create a delay successor (there can only be one).
        public getSuccessors(processId : CCS.ProcessId) : CCS.TransitionSet {
            var process = this.graph.processById(processId);
            
            var result = this.cache[process.id] = process.dispatchOn(this)
            if (this.tauFoundCache[process.id] === false) {
                // Clone the result. We don't want to cache delay transitions, because it
                // gives wrong results, and we already have a cache inside the DelaySuccesor.
                result = result.clone();
                result.add(this.delaySuccessor.visit(process));
            }
            
            return result;
        }
        
        private checkTransitionsForTau(process : CCS.Process, transitions : CCS.TransitionSet) : void {
            if (!this.tauFoundCache[process.id]) {
                var canDoTau = false;
                transitions.forEach(transition => {
                    if (transition.action.getLabel() === "tau") {
                        canDoTau = true;
                    }
                });
                this.tauFoundCache[process.id] = canDoTau;
            }
        }
        
        public dispatchNullProcess(process : CCS.NullProcess) : CCS.TransitionSet {
            var result = super.dispatchNullProcess(process);
            if (!this.tauFoundCache[process.id]) {
                this.tauFoundCache[process.id] = false;
            }
            return result;
        }

        public dispatchNamedProcess(process : CCS.NamedProcess) : CCS.TransitionSet {
            var result = super.dispatchNamedProcess(process);
            if (!this.tauFoundCache[process.id]) {
                this.tauFoundCache[process.id] = this.tauFoundCache[process.subProcess.id];
            }
            return result;
        }
        
        public dispatchSummationProcess(process : CCS.SummationProcess) : CCS.TransitionSet {
            var result = super.dispatchSummationProcess(process);
            this.checkTransitionsForTau(process, result);
            return result;
        }
        
        public dispatchCompositionProcess(process : CCS.CompositionProcess) : CCS.TransitionSet {
            var result = super.dispatchCompositionProcess(process);
            this.checkTransitionsForTau(process, result);
            return result;
        }
        
        public dispatchActionPrefixProcess(process : CCS.ActionPrefixProcess) : CCS.TransitionSet {
            var result = super.dispatchActionPrefixProcess(process);
            this.checkTransitionsForTau(process, result);
            return result;
        }
        
        public dispatchRestrictionProcess(process : CCS.RestrictionProcess) {
            var transitionSet = this.cache[process.id],
                subTransitionSet;
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new CCS.TransitionSet();
                subTransitionSet = process.subProcess.dispatchOn(this).clone();
                subTransitionSet.applyRestrictionSet(process.restrictedLabels);
                subTransitionSet.forEach(transition => {
                    var newRestriction = this.graph.newRestrictedProcess(transition.targetProcess, process.restrictedLabels);
                    if (transition instanceof DelayTransition) {
                        transitionSet.add(new DelayTransition(transition.delay.clone(), newRestriction));
                    } else if (transition instanceof CCS.Transition) {
                        transitionSet.add(new CCS.Transition(transition.action.clone(), newRestriction));
                    }
                });
                this.tauFoundCache[process.id] = this.tauFoundCache[process.subProcess.id];
            }
            return transitionSet;
        }

        public dispatchRelabellingProcess(process : CCS.RelabellingProcess) {
            var transitionSet = this.cache[process.id],
                subTransitionSet;
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new CCS.TransitionSet();
                subTransitionSet = process.subProcess.dispatchOn(this).clone();
                subTransitionSet.applyRelabelSet(process.relabellings);
                subTransitionSet.forEach(transition => {
                    var newRelabelling = this.graph.newRelabelingProcess(transition.targetProcess, process.relabellings);
                    if (transition instanceof DelayTransition) {
                        transitionSet.add(new DelayTransition(transition.delay.clone(), newRelabelling));
                    } else if (transition instanceof CCS.Transition) {
                        transitionSet.add(new CCS.Transition(transition.action.clone(), newRelabelling));
                    }
                });
                this.tauFoundCache[process.id] = this.tauFoundCache[process.subProcess.id];
            }
            return transitionSet;
        }
        
        public dispatchDelayPrefixProcess(process : TCCS.DelayPrefixProcess) : CCS.TransitionSet {
            var result = this.cache[process.id];
            if (!result) {
                this.cache[process.id] = result = new CCS.TransitionSet(); // yields no action transition
                this.tauFoundCache[process.id] = false;
            }
            return result;
        }
    }
    
    export class DelaySuccessor implements CCS.ProcessVisitor<DelayTransition>, ProcessDispatchHandler<CCS.Process> {
        
        private graph : Graph;
        private cache;
        private delayFoundCache;
        
        constructor(graph : Graph) {
            this.graph = graph;
            this.cache = {};
            this.delayFoundCache = {}
        }
        
        // assumes process cannot do tau
        public visit(process : CCS.Process) : DelayTransition {
            var targetProcess : CCS.Process;
            this.cache[process.id] = targetProcess = process.dispatchOn(this);
            if (this.delayFoundCache[process.id] === false) {
                return new DelayTransition(new Delay(1), process); // self-loop
            } else {
                return new DelayTransition(new Delay(1), targetProcess);
            }
        }
        
        public dispatchNullProcess(process : CCS.NullProcess) : CCS.Process {
            var result = this.cache[process.id];
            if (!result) {
                result = this.cache[process.id] = process;
                this.delayFoundCache[process.id] = false;
            }
            return result;
        }
        
        public dispatchNamedProcess(process : CCS.NamedProcess) : CCS.Process {
            var result = this.cache[process.id];
            if (!result) {
                result = this.cache[process.id] = process.subProcess.dispatchOn(this);
                this.delayFoundCache[process.id] = this.delayFoundCache[process.subProcess.id];
            }
            return result;
        }
        
        public dispatchSummationProcess(process : CCS.SummationProcess) : CCS.Process {
            var result = this.cache[process.id];
            if (!result) {
                // assume we cannot do tau
                var newSubProcesses = [];
                var delayFound = false;
                process.subProcesses.forEach(subProcess => {
                    newSubProcesses.push(subProcess.dispatchOn(this));
                    if (!delayFound && this.delayFoundCache[subProcess.id])
                        delayFound = true;
                });
                if (delayFound) {
                    this.cache[process.id] = result = this.graph.newSummationProcess(newSubProcesses);
                } else {
                    this.cache[process.id] = result = process;
                }
                this.delayFoundCache[process.id] = delayFound;
            }
            return result;
        }
        
        public dispatchCompositionProcess(process : CCS.CompositionProcess) : CCS.Process {
            var result = this.cache[process.id];
            if (!result) {
                // assume we cannot do tau
                var newSubProcesses = [];
                var delayFound = false;
                process.subProcesses.forEach(subProcess => {
                    newSubProcesses.push(subProcess.dispatchOn(this));
                    if (!delayFound && this.delayFoundCache[subProcess.id])
                        delayFound = true;
                });
                if (delayFound) {
                    this.cache[process.id] = result = this.graph.newCompositionProcess(newSubProcesses);
                } else {
                    this.cache[process.id] = result = process;
                }
                this.delayFoundCache[process.id] = delayFound;
            }
            return result;
        }
        
        public dispatchActionPrefixProcess(process : CCS.ActionPrefixProcess) : CCS.Process {
            var result = this.cache[process.id];
            if (!result) { // assume we cannot do tau
                result = this.cache[process.id] = process;
                this.delayFoundCache[process.id] = false;
            }
            return result;
        }
        
        public dispatchRestrictionProcess(process : CCS.RestrictionProcess) : CCS.Process {
            var result = this.cache[process.id];
            if (!result) {
                var newProcess = process.subProcess.dispatchOn(this);
                var delayFound = this.delayFoundCache[process.subProcess.id];
                if (delayFound) {
                    this.cache[process.id] = result = this.graph.newRestrictedProcess(newProcess, process.restrictedLabels);
                } else {
                    this.cache[process.id] = result = process;
                }
                this.delayFoundCache[process.id] = delayFound;
            }
            return result;
        }
        
        public dispatchRelabellingProcess(process : CCS.RelabellingProcess) : CCS.Process {
            var result = this.cache[process.id];
            if (!result) {
                var newProcess = process.subProcess.dispatchOn(this);
                var delayFound = this.delayFoundCache[process.subProcess.id];
                if (delayFound) {
                    this.cache[process.id] = result = this.graph.newRelabelingProcess(newProcess, process.relabellings);
                } else {
                    this.cache[process.id] = result = process;
                }
                this.delayFoundCache[process.id] = delayFound;
            }
            return result;
        }
        
        public dispatchDelayPrefixProcess(process : DelayPrefixProcess) : CCS.Process {
            var result = this.cache[process.id];
            if (!result) {
                if (process.delay.getDelay() > 1) {
                    var newDelay = new Delay(process.delay.getDelay() - 1);
                    this.cache[process.id] = result = this.graph.newDelayPrefixProcess(newDelay, process.nextProcess);
                    this.delayFoundCache[process.id] = true;
                } else if (process.delay.getDelay() === 1) {
                    this.cache[process.id] = result = process.nextProcess;
                    this.delayFoundCache[process.id] = true;
                } else {
                    throw "DelayPrefixProcess of delay 0";
                }
            }
            return result;
        }
    }
}

module Traverse {
    export class TCCSLabelledBracketNotation extends Traverse.LabelledBracketNotation implements CCS.ProcessVisitor<string>, TCCS.ProcessDispatchHandler<void> {
        public dispatchDelayPrefixProcess(process : TCCS.DelayPrefixProcess) {
            this.stringPieces.push("[DelayPrefix");
            this.stringPieces.push(process.delay + ".");
            process.nextProcess.dispatchOn(this);
            this.stringPieces.push("]");
        }
    }
    
    export class TCCSNotationVisitor extends Traverse.CCSNotationVisitor implements CCS.ProcessVisitor<string>, TCCS.ProcessDispatchHandler<string> {
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
    
    export class TCCSUnguardedRecursionChecker extends Traverse.UnguardedRecursionChecker implements TCCS.ProcessDispatchHandler<boolean> {
        public dispatchDelayPrefixProcess(process : TCCS.DelayPrefixProcess) {
            return false;
        }
    }
    
    export class TCCSProcessTreeReducer extends Traverse.ProcessTreeReducer implements CCS.ProcessVisitor<CCS.Process>, TCCS.ProcessDispatchHandler<CCS.Process> {
        
        constructor(private tccsgraph : TCCS.Graph) {
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
                    resultProcess = this.cache[process.id] = this.tccsgraph.newDelayPrefixProcess(new TCCS.Delay(resultDelay), nextProcess);
                }
            }
            
            return resultProcess;
        }
    }
    
    export class UntimedSuccessorGenerator extends Traverse.AbstractingSuccessorGenerator {
        constructor(strictSuccGenerator : CCS.SuccessorGenerator, cache?) {
            super(new TCCS.Delay(1), false, strictSuccGenerator, cache);
        }
    }
}

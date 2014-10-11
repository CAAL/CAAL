
module CCS {

    export interface Process {
        id : number;
        dispatchOn<T>(dispatcher : ProcessDispatchHandler<T>) : T;
    }

    export interface ProcessDispatchHandler<T> {
        dispatchNullProcess(process : NullProcess, ... args) : T
        dispatchNamedProcess(process : NamedProcess, ... args) : T
        dispatchSummationProcess(process : SummationProcess, ... args) : T
        dispatchCompositionProcess(process : CompositionProcess, ... args) : T
        dispatchActionPrefixProcess(process : ActionPrefixProcess, ... args) : T
        dispatchRestrictionProcess(process : RestrictionProcess, ... args) : T
        dispatchRelabellingProcess(process : RelabellingProcess, ... args) : T
    }

    export interface ProcessVisitor<T> {
        visit(process : Process) : T;
    }



    // export interface PostOrderDispatchHandler<T> extends ProcessDispatchHandler<T> {
    //     dispatchNullProcess(process : NullProcess) : T;
    //     dispatchNamedProcess(process : NamedProcess, result : T) : T;
    //     dispatchSummationProcess(process : SummationProcess, leftResult : T, rightResult : T) : T;
    //     dispatchCompositionProcess(process : CompositionProcess, leftResult : T, rightResult : T) : T;
    //     dispatchActionPrefixProcess(process : ActionPrefixProcess, processResult : T) : T;
    //     dispatchRestrictionProcess(process : RestrictionProcess, processResult : T) : T;
    //     dispatchRelabellingProcess(process : RelabellingProcess, processResult : T) : T;
    // }

    export class NullProcess implements Process {
        constructor(public id : number) {
        }
        dispatchOn<T>(dispatcher : ProcessDispatchHandler<T>) : T {
            return dispatcher.dispatchNullProcess(this);
        }
        toString() {
            return "NullProcess";
        }
    }

    export class NamedProcess implements Process {
        constructor(public id : number, public name : string, public subProcess : Process) {
        }
        dispatchOn<T>(dispatcher : ProcessDispatchHandler<T>) : T {
            return dispatcher.dispatchNamedProcess(this);
        }
        toString() {
            return "NamedProcess(" + this.name +")";
        }
    }

    export class SummationProcess implements Process {
        constructor(public id : number, public leftProcess : Process, public rightProcess : Process) {
        }
        dispatchOn<T>(dispatcher : ProcessDispatchHandler<T>) : T {
            return dispatcher.dispatchSummationProcess(this);
        }
        toString() {
            return "Summation";
        }
    }

    export class CompositionProcess implements Process {
        constructor(public id : number, public leftProcess : Process, public rightProcess : Process) {
        }
        dispatchOn<T>(dispatcher : ProcessDispatchHandler<T>) : T {
            return dispatcher.dispatchCompositionProcess(this);
        }
        toString() {
            return "Composition";
        }
    }

    export class ActionPrefixProcess implements Process {
        constructor(public id : number, public action : Action, public nextProcess : Process) {
        }
        dispatchOn<T>(dispatcher : ProcessDispatchHandler<T>) : T {
            return dispatcher.dispatchActionPrefixProcess(this);
        }
        toString() {
            return "Action(" + this.action.toString() + ")";
        }
    }

    export class RestrictionProcess implements Process {
        constructor(public id : number, public subProcess : Process, public restrictedLabels : LabelSet) {
        }
        dispatchOn<T>(dispatcher : ProcessDispatchHandler<T>) : T {
            return dispatcher.dispatchRestrictionProcess(this);
        }
        toString() {
            return "Restriction";
        }
    }

    export class RelabellingProcess implements Process {
        constructor(public id : number, public subProcess : Process, public relabellings : RelabellingSet) {
        }
        dispatchOn<T>(dispatcher : ProcessDispatchHandler<T>) : T {
            return dispatcher.dispatchRelabellingProcess(this);
        }
        toString() {
            return "Relabelling";
        }
    }

    export class Action {
        constructor(public label : string, public isComplement : boolean) {
            if (label === "tau" && isComplement) {
                throw new Error("tau has no complement");
            }
        }
        equals(other : Action) {
            return this.label === other.label &&
                this.isComplement === other.isComplement;
        }
        toString() {
            return (this.isComplement ? "!" : "") + this.label;
        }
        clone() {
            return new Action(this.label, this.isComplement);
        }
    } 

    export class Graph {
        nextId : number = 1;
        private nullProcess = new NullProcess(0);
        private cache : any = {};
        private processes = {0: this.nullProcess};
        private namedProcesses = {}

        constructor() {
            this.cache.structural = {}; //used structural sharing
            this.cache.successors = {};
        }

        newNamedProcess(processName : string, process : Process) {
            var namedProcess = this.namedProcesses[processName];
            if (!namedProcess) {
                namedProcess = this.namedProcesses[processName] = new NamedProcess(this.nextId++, processName, process);
                this.processes[namedProcess.id] = namedProcess;
            }
            if (!namedProcess.subProcess) {
                namedProcess.subProcess = process;
            }
            return namedProcess;
        }

        referToNamedProcess(processName : string) {
            var namedProcess = this.namedProcesses[processName];
            if (!namedProcess) {
                //Null will be fixed, by newNamedProcess
                namedProcess = this.namedProcesses[processName] = new NamedProcess(this.nextId++, processName, null);
                this.processes[namedProcess.id] = namedProcess;
            }
            return namedProcess;
        }

        getNullProcess() {
            return this.nullProcess;
        }

        newActionPrefixProcess(action : Action, nextProcess : Process) {
            var key = "." + action.toString() + nextProcess.id;
            var existing = this.cache.structural[key];
            if (!existing) {
                existing = this.cache.structural[key] = new ActionPrefixProcess(this.nextId++, action, nextProcess);
            }
            this.processes[existing.id] = existing;
            return existing;
        }

        newSummationProcess(left : Process, right : Process) {
            var temp, key, existing;
            //Ensure left.id <= right.id
            if (left.id > right.id) {
                temp = left;
                left = right;
                right = temp;
            }
            key = "+" + left.id + "," + right.id;
            existing = this.cache.structural[key];
            if (!existing) {
                existing = this.cache.structural[key] = new SummationProcess(this.nextId++, left, right);
                this.processes[existing.id] = existing;
            }
            return existing;
        }

        newCompositionProcess(left : Process, right : Process) {
            var temp, key, existing;
            //Ensure left.id <= right.id
            if (right.id > left.id) {
                temp = left;
                left = right;
                right = temp;
            }
            key = "|" + left.id + "," + right.id;
            existing = this.cache.structural[key];
            if (!existing) {
                existing = this.cache.structural[key] = new CompositionProcess(this.nextId++, left, right);
                this.processes[existing.id] = existing;
            }
            return existing;
        }

        newRestrictedProcess(process, restriction : LabelSet) {
            //For now return just new instead of structural sharing
            var existing = new RestrictionProcess(this.nextId++, process, restriction);
            this.processes[existing.id] = existing;
            return existing;
        }

        newRelabelingProcess(process, relabellings : RelabellingSet) {
            //Same as reasoning as restriction
            var existing = new RelabellingProcess(this.nextId++, process, relabellings);
            this.processes[existing.id] = existing;
            return existing;
        }

        processById(id) {
            return this.processes[id] || null;
        }

        processByName(name : string) {
            return this.namedProcesses[name] || null;
        }

        getNamedProcesses() {
            return Object.keys(this.namedProcesses);
        }
    }

    export class RelabellingSet {
        private froms = [];
        private tos = [];

        constructor(relabellings? : {from: string; to: string}[]) {
            if (relabellings) {
                relabellings.forEach( (relabel) => {
                    if (relabel.from !== "tau" && relabel.to !== "tau") {
                        this.froms.push(relabel.from);
                        this.tos.push(relabel.to);
                    }
                });
            }
        }

        clone() : RelabellingSet {
            var result = new RelabellingSet();
            result.froms = this.froms.slice();
            result.tos = this.tos.slice();
            return result;
        }

        forEach(f : (from : string, to : string) => void, thisObject?) {
            for (var i = 0, max = this.froms.length; i < max; i++) {
                f.call(thisObject, this.froms[i], this.tos[i]);
            }
        }

        hasRelabelForLabel(label : string ) : boolean {
            return this.froms.indexOf(label) !== -1;
        }

        toLabelForFromLabel(label : string) : string {
            var index = this.froms.indexOf(label),
                result = null;
            if (index >= 0) {
                result = this.tos[index];
            }
            return result;
        }

        toString() : string {
            return "RelabellingSet";
        }
    }

    export class LabelSet {
        private labels : string[] = [];

        constructor(labels) {
            this.addLabels(labels);
        }

        public clone() {
            return new LabelSet(this.labels);
        }

        public toArray() : string[] {
            return this.labels.slice(0);
        }

        private addLabels(labels) {
            for (var i = 0, max = labels.length; i < max; i++) {
                var label = labels[i];
                if (this.labels.indexOf(label) === -1) this.labels.push(label);
            }
        }

        private removeLabels(labels) {
            for (var i = 0, max = labels.length; i < max; i++){
                var label = labels[i];
                var index = this.labels.indexOf(label);
                if (index !== -1) {
                    this.labels.splice(index, 1);
                }
            }
        }

        add(labels) {
            var result = this.clone();
            result.addLabels(labels);
            return result;
        }

        remove(labels) {
            var result = this.clone();
            result.removeLabels(labels);
            return result;
        }

        contains(label) : boolean {
            return this.labels.indexOf(label) !== -1;
        }

        union(set : LabelSet) : LabelSet {
            return this.add(set.labels);
        }

        difference(set : LabelSet) : LabelSet {
            return this.remove(set.labels);
        }

        empty() : boolean {
            return this.count() === 0;
        }

        count() : number {
            return this.labels.length;
        }

        forEach(f : (label : string) => void, thisObject?) {
            this.labels.forEach(f, thisObject);
        }

        toString() {
            return "LabelSet";
        }
    }

    /*
        Represents the order of an in-order traversal.
    */
    export class InorderStruct {
        constructor(public before : Process[], public process : Process, public after : Process[]) {
        }
    }

    export class Transition {
        constructor(public action : Action, public targetProcess : Process) {
        }
        equals(other : Transition) {
            //TODO: look into targetProcessId and reductions
            return (this.action.equals(other.action) &&
                    this.targetProcess.id == other.targetProcess.id);
        }
        hash() {
            if (this.targetProcess instanceof NamedProcess) {
                return this.action.toString() + "->" + (<NamedProcess>this.targetProcess).name;
            }
            return this.action.toString() + "->" + this.targetProcess.id;
        }
        toString() {
            return this.hash();
        }
    }

    export class TransitionSet {
        private transitions = {};
        constructor(transitions?) {
            if (transitions) {
                transitions.forEach(this.addTransition, this);
            }
        }

        public mergeInto(tSet : TransitionSet) : TransitionSet {
            for (var hashKey in tSet.transitions) {
                tSet.transitions[hashKey].forEach(this.addTransition, this);
            }
            return this;
        }

        public clone() {
            var result = new TransitionSet([]);
            for (var hashKey in this.transitions) {
                this.transitions[hashKey].forEach(result.addTransition, result);
            }
            return result;
        }

        private hashsetArray(hash) {
            var hashSet = this.transitions[hash];
            if (!hashSet) {
                hashSet = [];
                this.transitions[hash] = hashSet;
            }
            return hashSet;
        }

        addTransition(transition) {
            var hash = transition.hash(),
                existingHashset = this.hashsetArray(hash);
            for (var i = 0; i < existingHashset.length; i++) {
                if (existingHashset[i].equals(transition)) return;
            }
            existingHashset.push(transition);
            return this;
        }

        removeInPlace(labels : LabelSet) {
            for (var hashKey in this.transitions) {
                this.transitions[hashKey] = this.transitions[hashKey].filter(t => !labels.contains(t.action.label));
                if (this.transitions[hashKey].length === 0) {
                    delete this.transitions[hashKey];
                }
            }
            return this;
        }

        relabelInPlace(relabels : RelabellingSet) {
            for (var hashKey in this.transitions) {
                this.transitions[hashKey].forEach(t => {
                    if (relabels.hasRelabelForLabel(t.label)) {
                        t.label = relabels.toLabelForFromLabel(t.label);
                    }
                });
                if (this.transitions[hashKey].length === 0) {
                    delete this.transitions[hashKey];
                }
            }
        }

        forEach(f : (transition : Transition) => any) {
            for (var hashKey in this.transitions) {
                this.transitions[hashKey].forEach(f);
            }
        }
    }

    export class SuccessorGenerator implements ProcessVisitor<TransitionSet>, ProcessDispatchHandler<TransitionSet> {

        constructor(public graph : Graph, public cache?) {
            this.cache = cache || {};
        }

        visit(process : Process) : TransitionSet {
            //Move recursive calling into loop with stack here
            //if overflow becomes an issue.
            return this.cache[process.id] = process.dispatchOn(this);
        }

        dispatchNullProcess(process : NullProcess) {
            var transitionSet = this.cache[process.id];
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new TransitionSet();
            }
            return transitionSet;
        }

        dispatchNamedProcess(process : NamedProcess) {
            var transitionSet = this.cache[process.id];
            if (!transitionSet) {
                //Assume nothing, then figure it out when subprocess successors are known.
                this.cache[process.id] = new TransitionSet();
                transitionSet = this.cache[process.id] = process.subProcess.dispatchOn(this).clone();
            }
            return transitionSet;
        }

        dispatchSummationProcess(process : SummationProcess) {
            var transitionSet = this.cache[process.id],
                leftTransitions, rightTransitions;
            if (!transitionSet) {
                leftTransitions = process.leftProcess.dispatchOn(this);
                rightTransitions = process.rightProcess.dispatchOn(this);
                transitionSet = this.cache[process.id] = leftTransitions.clone().mergeInto(rightTransitions);
            }
            return transitionSet;
        }

        dispatchCompositionProcess(process : CompositionProcess) {
            var transitionSet = this.cache[process.id],
                leftSet, rightSet;
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new TransitionSet();
                leftSet = process.leftProcess.dispatchOn(this);
                rightSet = process.rightProcess.dispatchOn(this);
                
                leftSet.forEach(leftTransition => {
                    //COM1
                    transitionSet.addTransition(new Transition(leftTransition.action.clone(),
                        this.graph.newCompositionProcess(leftTransition.targetProcess, process.rightProcess)));

                    rightSet.forEach(rightTransition => {
                        //COM2
                        transitionSet.addTransition(new Transition(rightTransition.action.clone(),
                            this.graph.newCompositionProcess(process.leftProcess, rightTransition.targetProcess)));

                        //COM3
                        if (leftTransition.action.label === rightTransition.action.label &&
                            leftTransition.action.isComplement !== rightTransition.action.isComplement) {
                            transitionSet.addTransition(new Transition(new Action("tau", false),
                                this.graph.newCompositionProcess(leftTransition.targetProcess, rightTransition.targetProcess)));
                        }
                    });
                });
            }
            return transitionSet;
        }

        dispatchActionPrefixProcess(process : ActionPrefixProcess) {
            var transitionSet = this.cache[process.id];
            if (!transitionSet) {
                process.nextProcess.dispatchOn(this).clone();
                transitionSet = this.cache[process.id] = new TransitionSet([new Transition(process.action, process.nextProcess)]);
            }
            return transitionSet;
        }

        dispatchRestrictionProcess(process : RestrictionProcess) {
            var transitionSet = this.cache[process.id],
                subTransitionSet;
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new TransitionSet();
                subTransitionSet = process.subProcess.dispatchOn(this).clone();
                subTransitionSet.removeInPlace(process.restrictedLabels);
                subTransitionSet.forEach(transition => {
                    var newRestriction = this.graph.newRestrictedProcess(transition.targetProcess, process.restrictedLabels.clone());
                    transitionSet.addTransition(new Transition(transition.action.clone(), newRestriction));
                });
            }
            return transitionSet;
        }

        dispatchRelabellingProcess(process : RelabellingProcess) {
            var transitionSet = this.cache[process.id],
                subTransitionSet;
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new TransitionSet();
                subTransitionSet = process.subProcess.dispatchOn(this).clone();
                subTransitionSet.relabelInPlace(process.relabellings);
                subTransitionSet.forEach(transition => {
                    var newRelabelling = this.graph.newRelabelingProcess(transition.targetProcess, process.relabellings.clone());
                    transitionSet.addTransition(new Transition(transition.action.clone(), newRelabelling));
                });
            }
            return transitionSet;
        }
    }
}

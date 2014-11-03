/// <reference path="unguarded_recursion.ts" />

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
        private label : string;
        private complement : boolean;
        
        constructor(label : string, isComplement : boolean) {
            if (label === "tau" && isComplement) {
                throw new Error("tau has no complement");
            }
            this.label = label;
            this.complement = isComplement;
        }

        getLabel() : string {
            return this.label;
        }

        isComplement() : boolean {
            return this.complement;
        }

        equals(other : Action) {
            return this.label === other.label &&
                this.complement === other.complement;
        }
        toString() {
            return (this.complement ? "'" : "") + this.label;
        }
        clone() {
            return new Action(this.label, this.complement);
        }
    } 

    interface Error {
        name : string;
        message : string;
    }

    export class Graph {
        nextId : number = 1;
        private nullProcess = new NullProcess(0);
        private cache : any = {};
        private processes = {0: this.nullProcess};
        private namedProcesses = {}
        private constructErrors = [];
        private definedSets = {};
        private allSets = []; //We never remove.. Use index as id.
        private allRelabellings = []; //Same as allSets

        constructor() {
            this.cache.structural = {}; //used structural sharing
            this.cache.successors = {};
        }

        newNamedProcess(processName : string, process : Process) {
            var namedProcess = this.namedProcesses[processName];
            if (!namedProcess) {
                namedProcess = this.namedProcesses[processName] = new NamedProcess(this.nextId++, processName, process);
                this.processes[namedProcess.id] = namedProcess;
            } else if (!namedProcess.subProcess) {
                namedProcess.subProcess = process;
            } else {
                this.constructErrors.push({name: "DuplicateProcessDefinition",
                    messsage: "Duplicate definition of process '" + processName + "'"});
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

        newRestrictedProcess(process, restrictedLabels : LabelSet) {
            //For now return just new instead of structural sharing
            var key, existing;
            restrictedLabels = this.getOrInsertLabelSet(restrictedLabels);
            key = "\\" + process.id + "," + this.indexOfLabelSet(restrictedLabels);
            existing = this.cache.structural[key];
            if (!existing) {
                existing = this.cache.structural[key] = new RestrictionProcess(this.nextId++, process, restrictedLabels);
                this.processes[existing.id] = existing;
            }
            return existing;
        }

        newRestrictedProcessOnSetName(process, setName) {
            var labelSet = this.definedSets[setName];
            if (!labelSet) {
                this.constructErrors.push({name: "UndefinedSet", message: "Set '" + setName + "' has not been defined"});
                //Fallback for empty set
                labelSet = this.getOrInsertLabelSet(new LabelSet([]));
            }
            return this.newRestrictedProcess(process, labelSet);
        }

        newRelabelingProcess(process, relabellings : RelabellingSet) {
            var key, existing;
            relabellings = this.getOrInsertRelabellingSet(relabellings);
            key = "[" + process.id + "," + this.indexOfRelabellingSet(relabellings);
            existing = this.cache.structural[key];
            if (!existing) {
                existing = this.cache.structural[key] = new RelabellingProcess(this.nextId++, process, relabellings);
                this.processes[existing.id] = existing;
            }
            return existing;
        }

        defineNamedSet(name, labelSet : LabelSet) {
            if (this.definedSets[name]) {
                this.constructErrors.push({name: "DuplicateSetDefinition", message: "Set '" + name + "' has already been defined"});
            }
            this.definedSets[name] = this.getOrInsertLabelSet(labelSet);;
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

        getErrors() {
            var errors = this.constructErrors.slice(0);
            //Add undefined processes
            var addUndefinedProcesses = () => {
                var processName, process;
                for (processName in this.namedProcesses) {
                    process = this.namedProcesses[processName];
                    if (!process.subProcess) {
                        errors.push({name: "UndefinedProcess",
                            message: "Process '" + processName + "' has no definition"});
                    }
                }
            }
            var addUnguardedRecursionErrors = () => {
                var checker = new Traverse.UnguardedRecursionChecker(),
                    processNames = Object.keys(this.namedProcesses),
                    processes = processNames.map(name => this.namedProcesses[name]),
                    unguardedProcesses = checker.findUnguardedProcesses(processes);
                unguardedProcesses.forEach(process => {
                    errors.push({name: "UnguardedProcess", message: "Process '" + process.name + "' has unguarded recursion"});
                });
            }
            addUndefinedProcesses();
            //Unguarded recursion checking requires all processes to defined.
            if (errors.length === 0) addUnguardedRecursionErrors();
            return errors;
        }

        private getOrInsertLabelSet(labelSet : LabelSet) : LabelSet {
            return this.getOrInsertObjectInArray(labelSet, this.allSets);
        }

        private getOrInsertRelabellingSet(relabellings : RelabellingSet) : RelabellingSet {
            return this.getOrInsertObjectInArray(relabellings, this.allRelabellings);
        }

        private indexOfLabelSet(labelSet : LabelSet) : number {
            return this.indexInArrayUsingEquals(labelSet, this.allSets);
        }

        private indexOfRelabellingSet(relabellings : RelabellingSet) : number {
            return this.indexInArrayUsingEquals(relabellings, this.allRelabellings);
        }

        private getOrInsertObjectInArray<T>(object : T, array : T[]) : T {
            var index = this.indexInArrayUsingEquals<T>(object, array),
                result = object;
            if (index === -1) {
                array.push(object);
            } else {
                result = array[index];
            }
            return result;
        }

        private indexInArrayUsingEquals<T>(object : T, array : T[]) : number {
            var current;
            for (var i = 0; i < array.length; i++) {
                current = array[i];
                if (current.equals(object)) {
                    return i;
                }
            }
            return -1;
        }
    }

    export class RelabellingSet {
        private froms = [];
        private tos = [];

        constructor(relabellings : {from: string; to: string}[]) {
            relabellings.forEach( (relabel) => {
                if (relabel.from === "tau" || relabel.to === "tau") {
                    throw new Error("Cannot relabel from or to tau");
                }
                this.froms.push(relabel.from);
                this.tos.push(relabel.to);
            });
            this.froms.sort();
            this.tos.sort();
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

        equals(other : RelabellingSet) {
            for (var i = 0; i < this.froms.length; i++) {
                if (this.froms[i] !== other.froms[i]) return false;
                if (this.tos[i] !== other.tos[i]) return false;
            }
            return true;
        }

        toString() : string {
            return "RelabellingSet";
        }
    }

    /*
        Always modifies inplace. Clone gives shallow clone
    */
    export class LabelSet {
        private labels : string[] = [];

        constructor(labels : string[]) {
            var temp = labels.slice(0), 
                cur, next;
            if (temp.length > 0) {
                temp.sort();
                //Don't add the first of duplicates
                cur = temp[0];
                for (var i=1; i < temp.length; i++) {
                    next = temp[i];
                    if (cur !== next) {
                        this.labels.push(cur);
                    }
                    cur = next;
                }
                //Add the last
                this.labels.push(cur);
            }
        }

        toArray() : string[] {
            return this.labels.slice(0);
        }

        contains(label : string) : boolean {
            return this.labels.indexOf(label) !== -1;
        }

        empty() : boolean {
            return this.count() === 0;
        }

        count() : number {
            return this.labels.length;
        }

        forEach(f : (label : string) => void, thisObject?) {
            for (var i = 0, max = this.labels.length; i < max; i++){
                f(this.labels[i]);
            }
        }

        equals(other : LabelSet) {
            var myLabels = this.labels,
                otherLabels = other.labels;
            if (myLabels.length !== other.labels.length) return false;
            for (var i = 0; i < myLabels.length; i++) {
                if (myLabels[i] !== otherLabels[i]) return false;
            }
            return true;
        }

        union(other : LabelSet) : LabelSet {
            return LabelSet.Union(this, other);
        }

        static Union(... sets : LabelSet[]) {
            var result = new LabelSet([]),
                si, li, curSet;
            for (si = 0; si < sets.length; si++) {
                curSet = sets[si];
                for (li = 0; li < curSet.labels.length; li++) {
                    if (!result.contains(curSet.labels[li])) {
                        result.labels.push(curSet.labels[li]);
                    }
                }
            }
            result.labels.sort();
            return result;
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

    /*
        Always modifies inplace. Clone gives shallow clone
    */
    export class Transition {
        constructor(public action : Action, public targetProcess : Process) {
        }
        equals(other : Transition) {
            return (this.action.equals(other.action) &&
                    this.targetProcess.id == other.targetProcess.id);
        }
        toString() {
            if (this.targetProcess instanceof NamedProcess) {
                return this.action.toString() + "->" + (<NamedProcess>this.targetProcess).name;
            }
            return this.action.toString() + "->" + this.targetProcess.id;
        }
    }

    export class TransitionSet {
        private transitions = [];

        constructor(transitions?) {
            if (transitions) {
                this.addAll(transitions);
            }
        }

        add(transition : Transition) {
            var allCurrent = this.transitions;
            for (var i = 0, max = allCurrent.length; i < max; i++){
                if (transition.equals(allCurrent[i])) break;
            }
            allCurrent.push(transition);
            return this;
        }

        addAll(transitions : Transition[]) {
            for (var i = 0, max = transitions.length; i < max; i++){
                this.add(transitions[i]);
            }
        }

        unionWith(tSet : TransitionSet) : TransitionSet {
            this.addAll(tSet.transitions);
            return this;
        }

        clone() : TransitionSet {
            return new TransitionSet(this.transitions);
        }

        count() : number {
            return this.transitions.length;
        }

        applyRestrictionSet(labels : LabelSet) : TransitionSet {
            var count = this.transitions.length,
                allCurrent = this.transitions,
                i = 0;
            while (i < count) {
                if (labels.contains(allCurrent[i].action.label)) {
                    allCurrent[i] = allCurrent[--count];
                } else {
                    ++i;
                }
            }
            allCurrent.length = count;
            return this;
        }

        applyRelabelSet(relabels : RelabellingSet) : void {
            var allCurrent = this.transitions,
                newLabel,
                transition;
            for (var i = 0, max = allCurrent.length; i < max; i++) {
                transition = allCurrent[i];
                if (relabels.hasRelabelForLabel(transition.action.label)) {
                    newLabel = relabels.toLabelForFromLabel(transition.action.label);
                    transition.action = new Action(newLabel, transition.action.isComplement());
                }
            }
        }

        forEach(f : (transition : Transition) => any) {
            for (var i = 0, max = this.transitions.length; i < max; i++){
                f(this.transitions[i]);
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
                transitionSet = this.cache[process.id] = leftTransitions.clone().unionWith(rightTransitions);
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
                    transitionSet.add(new Transition(leftTransition.action.clone(),
                        this.graph.newCompositionProcess(leftTransition.targetProcess, process.rightProcess)));

                    //COM3
                    rightSet.forEach(rightTransition => {
                        if (leftTransition.action.label === rightTransition.action.label &&
                            leftTransition.action.isComplement() !== rightTransition.action.isComplement()) {
                            transitionSet.add(new Transition(new Action("tau", false),
                                this.graph.newCompositionProcess(leftTransition.targetProcess, rightTransition.targetProcess)));
                        }
                    });
                });
                //COM2
                rightSet.forEach(rightTransition => {
                    transitionSet.add(new Transition(rightTransition.action.clone(),
                    this.graph.newCompositionProcess(process.leftProcess, rightTransition.targetProcess)));
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
                subTransitionSet.applyRestrictionSet(process.restrictedLabels);
                subTransitionSet.forEach(transition => {
                    var newRestriction = this.graph.newRestrictedProcess(transition.targetProcess, process.restrictedLabels);
                    transitionSet.add(new Transition(transition.action.clone(), newRestriction));
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
                subTransitionSet.applyRelabelSet(process.relabellings);
                subTransitionSet.forEach(transition => {
                    var newRelabelling = this.graph.newRelabelingProcess(transition.targetProcess, process.relabellings);
                    transitionSet.add(new Transition(transition.action.clone(), newRelabelling));
                });
            }
            return transitionSet;
        }
    }
}

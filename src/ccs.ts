
export interface Node {
    id : number;
    inorderStructure() : InorderStruct;
    dispatchOn<T>(dispatcher : NodeDispatchHandler<T>, args) : T;
}

export interface NodeDispatchHandler<T> {
    dispatchProgram(node : Program, ... args : T[]) : T
    dispatchNullProcess(node : NullProcess, ... args : T[]) : T
    dispatchAssignment(node : Assignment, ... args : T[]) : T
    dispatchSummation(node : Summation, ... args : T[]) : T
    dispatchComposition(node : Composition, ... args : T[]) : T
    dispatchAction(node : Action, ... args : T[]) : T
    dispatchRestriction(node : Restriction, ... args : T[]) : T
    dispatchRelabelling(node : Relabelling, ... args : T[]) : T
    dispatchConstant(node : Constant, ... args : T[]) : T
}

export interface PostOrderDispatchHandler<T> extends NodeDispatchHandler<T> {
    dispatchProgram(node : Program, ... assignResults : T[]) : T;
    dispatchNullProcess(node : NullProcess) : T;
    dispatchAssignment(node : Assignment, result : T) : T;
    dispatchSummation(node : Summation, leftResult : T, rightResult : T) : T;
    dispatchComposition(node : Composition, leftResult : T, rightResult : T) : T;
    dispatchAction(node : Action, processResult : T) : T;
    dispatchRestriction(node : Restriction, processResult : T) : T;
    dispatchRelabelling(node : Relabelling, processResult : T) : T;
    dispatchConstant(node : Constant) : T;
}

export class Program implements Node {
    constructor(public id : number, public assignments : Assignment[]) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([], this, this.assignments);
    }
    dispatchOn<T>(dispatcher : NodeDispatchHandler<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchProgram.apply(dispatcher, args);
    }
    toString() {
        return "Program";
    }
}

export class NullProcess implements Node {
    constructor(public id : number) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([], this, []);
    }
    dispatchOn<T>(dispatcher : NodeDispatchHandler<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchNullProcess.apply(dispatcher, args);
    }
    toString() {
        return "NullProcess";
    }
}

export class Assignment implements Node {
    constructor(public id : number, public variable : string, public process : Node) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([], this, [this.process]);
    }
    dispatchOn<T>(dispatcher : NodeDispatchHandler<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchAssignment.apply(dispatcher, args);
    }
    toString() {
        return "Assignment(" + this.variable + ")";
    }
}

export class Summation implements Node {
    constructor(public id : number, public left : Node, public right : Node) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([this.left], this, [this.right]);
    }
    dispatchOn<T>(dispatcher : NodeDispatchHandler<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchSummation.apply(dispatcher, args);
    }
    toString() {
        return "Summation";
    }
}

export class Composition implements Node {
    constructor(public id : number, public left : Node, public right : Node) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([this.left], this, [this.right]);
    }
    dispatchOn<T>(dispatcher : NodeDispatchHandler<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchComposition.apply(dispatcher, args);
    }
    toString() {
        return "Composition";
    }
}

export class Action implements Node {
    constructor(public id : number, public label : string, public complement : boolean, public next : Node) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([], this, [this.next]);
    }
    dispatchOn<T>(dispatcher : NodeDispatchHandler<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchAction.apply(dispatcher, args);
    }
    toString() {
        return "Action(" + (this.complement ? "!" : "") + this.label + ")";
    }
}

export class Restriction implements Node {
    constructor(public id : number, public process : Node, public restrictedLabels : LabelSet) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([], this, [this.process]);
    }
    dispatchOn<T>(dispatcher : NodeDispatchHandler<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchRestriction.apply(dispatcher, args);
    }
    toString() {
        return "Restriction";
    }
}

export class Relabelling implements Node {
    constructor(public id : number, public process : Node, public relabellings : RelabellingSet) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([], this, [this.process]);
    }
    dispatchOn<T>(dispatcher : NodeDispatchHandler<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchRelabelling.apply(dispatcher, args);
    }
    toString() {
        return "Relabelling";
    }
}

export class Constant implements Node {
    constructor(public id : number, public constant : string) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([], this, []);
    }
    dispatchOn<T>(dispatcher : NodeDispatchHandler<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchConstant.apply(dispatcher, args);
    }
    toString() {
        return "Constant(" + this.constant + ")";
    }
}

export class Graph {
    nextId : number = 0;
    nodes = {};
    constantNodes = {};
    public root : Program;

    constructor() {
    }

    create(constructor, ... args) : Node {
        var boundConstructor = constructor.bind.apply(constructor, [null, this.nextId++].concat(args)),
            node = new boundConstructor();
        this.nodes[node.id] = node;

        if (node instanceof Constant) {
            this.constantNodes[node.constant] = node;
        } else if (node instanceof Program) {
            this.root = <Program>node;
        }

        return node;
    }

    getUid() {
        return this.nextId++;
    }

    nodeById(id) {
        return this.nodes[id] || null;
    }

    assignmentByVariable(constant) {
        var assignments = this.root.assignments;
        for (var i = 0, max = assignments.length; i < max; i++){
            if (assignments[i].variable === constant) {
                return assignments[i];
            }
        }
        return null;
    }

    constantByVariable(constant) {
        return this.constantNodes[constant] || null;
    }
}

export function postOrderTransform<T>(node : Node, dispatchHandler : PostOrderDispatchHandler<T>) : T {
    function handleNode(node : Node) {
        var is = node.inorderStructure();
        var beforeResults = is.before.map(handleNode);
        var afterResults = is.after.map(handleNode);
        var args = beforeResults.concat(afterResults);
        var thisResult = node.dispatchOn(dispatchHandler, args);
        return thisResult;
    }
    return handleNode(node);
}


export function conditionalPostOrderTransform(node : Node, dispatchHandler : NodeDispatchHandler<void>, predicate : (n : Node) => boolean) {
    function handleNode(node : Node) {
        if (predicate(node)) {
            var is = node.inorderStructure();
            is.before.map(handleNode);
            is.after.map(handleNode);
            node.dispatchOn(dispatchHandler, []);
        }
    }
    handleNode(node);
}

export class RelabellingSet {
    private froms = [];
    private tos = [];
    constructor(relabellings : {from: string; to: string}[]) {
        relabellings.forEach( (relabel) => {
            if (relabel.from !== "tau" && relabel.to !== "tau") {
                this.froms.push(relabel.from);
                this.tos.push(relabel.to);
            }
        });
    }
    forEach(f : (from : string, to : string) => void, thisObject?) {
        for (var i = 0, max = this.froms.length; i < max; i++) {
            f.call(thisObject, this.froms[i], this.tos[i]);
        }
    }
    hasRelabelForLabel(label : string ) {
        return this.froms.indexOf(label) !== -1;
    }
    toLabelForFromLabel(label : string) {
        var index = this.froms.indexOf(label),
            result = null;
        if (index >= 0) {
            result = this.tos[index];
        }
        return result;
    }
    toString() {
        return "RelabellingSet";
    }
}

export class LabelSet {
    private labels = [];

    constructor(labels) {
        this.addLabels(labels);
    }

    private clone() {
        return new LabelSet(this.labels);
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

    contains(label) : boolean {
        return this.labels.indexOf(label) !== -1;
    }

    remove(labels) {
        var result = this.clone();
        result.removeLabels(labels);
        return result;
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
    constructor(public before : Node[], public node : Node, public after : Node[]) {
    }
}

export class Transition {
    constructor(public label : string, public complement : boolean, public targetProcessId : number) {
        //Prevents accidentally creating two taus.
        if (label === "tau") complement = false;
    }
    equals(transition : Transition) {
        //TODO: look into targetProcessId and reductions
        return (this.label === transition.label &&
            this.complement === transition.complement &&
            this.targetProcessId === transition.targetProcessId);
    }
    hash() {
        return (this.complement ? "!" : "") + this.label + "->" + this.targetProcessId;
    }
}

export class TransitionSet {
    private transitions = {};
    constructor(transitions?) {
        if (transitions) {
            transitions.forEach(this.addInto, this);
        }
    }

    public mergeInto(tSet : TransitionSet) : TransitionSet {
        for (var hashKey in tSet.transitions) {
            tSet.transitions[hashKey].forEach(this.addInto, this);
        }
        return this;
    }

    public clone() {
        var result = new TransitionSet([]);
        for (var hashKey in this.transitions) {
            this.transitions[hashKey].forEach(result.addInto, result);
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

    addInto(transition) {
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
            this.transitions[hashKey] = this.transitions[hashKey].filter(t => !labels.contains(t.label));
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

export class SuccessorGenerator implements NodeDispatchHandler<void> {
    /*
        Should only run for nodes for which we don't know the successors,
    */

    constructor(public cache, public graph) {
    }

    dispatchProgram(node : Program) {
        var all = new TransitionSet();
        node.assignments.forEach((assignment) => {
            all.mergeInto(this.cache[assignment.id]);
        });
        this.cache[node.id] = all;
    }
    dispatchNullProcess(node : NullProcess) {
        this.cache[node.id] = [];
    }

    dispatchAssignment(node : Assignment) {
        //This is  P = Q
        //Our result is the same, but need to fix the constant node
        //since we didn't know the result at the time.
        var constantNode = this.graph.constantByVariable(node.variable);
        this.cache[constantNode.id] = this.cache[node.process.id].clone();
        this.cache[node.id] = this.cache[node.process.id].clone();
    }

    dispatchSummation(node : Summation) {
        this.cache[node.id] = this.cache[node.left.id].clone().mergeInto(this.cache[node.right.id]);
    }

    dispatchComposition(node : Composition) {
        var left = this.cache[node.left.id],
            right = this.cache[node.right.id],
            resultSet = new TransitionSet();
        //These loops could be merged into one....
        //COM1
        left.forEach(leftTransition => {
            var leftResult = this.graph.nodeById(leftTransition.targetProcessId);
            var resultComposition = this.graph.create(Composition, leftResult, node.right);
            resultSet.addInto(new Transition(leftTransition.label, leftTransition.complement, resultComposition.id));
        });
    
        // //COM2
        right.forEach(rightTransition => {
            var rightResult = this.graph.nodeById(rightTransition.targetProcessId);
            var resultComposition = this.graph.create(Composition, node.left, rightResult);
            resultSet.addInto(new Transition(rightTransition.label, rightTransition.complement, resultComposition.id));
        });

        // //COM3
        left.forEach(leftTransition => {
            right.forEach(rightTransition => {
                if (leftTransition.label === rightTransition.label &&
                    leftTransition.complement !== rightTransition.complement) {
                    var leftResult = this.graph.nodeById(leftTransition.targetProcessId);
                    var rightResult = this.graph.nodeById(rightTransition.targetProcessId);
                    var resultComposition = this.graph.create(Composition, leftResult, rightResult);
                    resultSet.addInto(new Transition("tau", false, resultComposition.id));
                }                
            });
        });
        this.cache[node.id] = resultSet;
    }

    dispatchAction(node : Action) {
        var actionTransition = new Transition(node.label, node.complement, node.next.id);
        this.cache[node.id] = new TransitionSet([actionTransition]);
    }

    dispatchRestriction(node : Restriction) {
        var subResults = this.cache[node.process.id].clone(),
            result = new TransitionSet();
        subResults.removeInPlace(node.restrictedLabels);
        subResults.forEach(t => {
            var subNode = this.graph.nodeById(t.targetProcessId);
            var restrictedNode = this.graph.create(Restriction, subNode, node.restrictedLabels);
            result.addInto(new Transition(t.label, t.complement, restrictedNode.id));
        });
        this.cache[node.id] = result;
    }

    dispatchRelabelling(node : Relabelling) {
        var result = this.cache[node.process.id].clone();
        result.relabelInPlace(node.relabellings);
        this.cache[node.id] = result;
    }

    dispatchConstant(node : Constant) {
        //TODO: Look into this
        //Assume none for now.. Assignment will fix this
        if (!this.cache[node.id]) {
            this.cache[node.id] = new TransitionSet();
        }
    }
}
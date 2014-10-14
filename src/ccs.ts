
export interface Node {
    id? : number;
    inorderStructure() : InorderStruct;
    dispatchOn<T>(dispatcher : NodeDispatcher<T>, args) : T;
}

export interface NodeDispatcher<T> {
    dispatchProgram(node : Program, assignResults : T[]) : T;
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
    constructor(public assignments : Assignment[]) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([], this, this.assignments);
    }
    dispatchOn<T>(dispatcher : NodeDispatcher<T>, args) : T {
        args = [this, args];
        return dispatcher.dispatchProgram.apply(dispatcher, args);
    }
}

export class NullProcess implements Node {
    inorderStructure() : InorderStruct {
        return new InorderStruct([], this, []);
    }
    dispatchOn<T>(dispatcher : NodeDispatcher<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchNullProcess.apply(dispatcher, args);
    }
    toString() {
        return "NullProcess";
    }
}

export class Assignment implements Node {
    constructor(public variable : string, public process : Node) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([], this, [this.process]);
    }
    dispatchOn<T>(dispatcher : NodeDispatcher<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchAssignment.apply(dispatcher, args);
    }
    toString() {
        return "Assignment(" + this.variable + ")";
    }
}

export class Summation implements Node {
    constructor(public left : Node, public right : Node) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([this.left], this, [this.right]);
    }
    dispatchOn<T>(dispatcher : NodeDispatcher<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchSummation.apply(dispatcher, args);
    }
    toString() {
        return "Summation";
    }
}

export class Composition implements Node {
    constructor(public left : Node, public right : Node) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([this.left], this, [this.right]);
    }
    dispatchOn<T>(dispatcher : NodeDispatcher<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchComposition.apply(dispatcher, args);
    }
    toString() {
        return "Composition";
    }
}

export class Action implements Node {
    constructor(public label : string, public complement : boolean, public next : Node) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([], this, [this.next]);
    }
    dispatchOn<T>(dispatcher : NodeDispatcher<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchAction.apply(dispatcher, args);
    }
    toString() {
        return "Action(" + (this.complement ? "!" : "") + this.label + ")";
    }
}

export class Restriction implements Node {
    constructor(public process : Node, public restrictedLabels : LabelSet) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([], this, [this.process]);
    }
    dispatchOn<T>(dispatcher : NodeDispatcher<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchRestriction.apply(dispatcher, args);
    }
    toString() {
        return "Restriction";
    }
}

export class Relabelling implements Node {
    constructor(public process : Node, public relabellings : RelabellingSet) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([], this, [this.process]);
    }
    dispatchOn<T>(dispatcher : NodeDispatcher<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchRelabelling.apply(dispatcher, args);
    }
    toString() {
        return "Relabelling";
    }
}

export class Constant implements Node {
    constructor(public constant : string) {
    }
    inorderStructure() : InorderStruct {
        return new InorderStruct([], this, []);
    }
    dispatchOn<T>(dispatcher : NodeDispatcher<T>, args) : T {
        args = [this].concat(args);
        return dispatcher.dispatchConstant.apply(dispatcher, args);
    }
    toString() {
        return "Constant(" + this.constant + ")";
    }
}

export function postOrderTraversal<T>(node : Node, dispatcher : NodeDispatcher<T>) : T {
    function handleNode(node : Node) {
        var is = node.inorderStructure();
        var beforeResults = is.before.map(handleNode);
        var afterResults = is.after.map(handleNode);
        var args = beforeResults.concat(afterResults);
        var thisResult = node.dispatchOn(dispatcher, args);
        return thisResult;
    }
    return handleNode(node);
}

export class RelabellingSet {
    private relabelsDict = {};
    constructor(relabellings : {from: string; to: string}[]) {
        relabellings.forEach( (relabel) => {
            this.relabelsDict[relabel.from] = relabel.to;
        });
    }
    forEach(f : (from : string, to : string) => void, thisObject?) {
        for (var k in this.relabelsDict) {
            f.call(thisObject, k, this.relabelsDict[k]);
        }
    }
    toString() {
        return "RelabellingSet";
    }
}

export class LabelSet {
    private bitmap = {};
    private mcount : number = 0;
    constructor(labels) {
        labels.forEach(this.add, this);
    }
    add(label) {
        this.bitmap[label] = true;
        this.mcount++;
        return this;
    }
    remove(label) {
        delete this.bitmap[label];
        this.mcount--;
        return this;
    }
    union(set : LabelSet) {
        for (var label in set.bitmap) {
            this.add(label);
        }
        return this;
    }
    difference(set : LabelSet) {
        for (var label in set) {
            this.remove(label);
        }
        return this;
    }
    empty() : boolean {
        return this.count() === 0;
    }
    count() : number {
        return this.mcount;
    }
    forEach(f : (label : string) => void, thisObject?) {
        for (var k in this.bitmap) {
            f.call(thisObject, k);
        }
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

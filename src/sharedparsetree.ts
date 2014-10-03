import ccs = require("./ccs");

//Bottom up we add existing subtrees.
//Any subtree in any node is replaced by
//its existing definition.

export class SharedParseTreeTraverser implements ccs.NodeDispatcher<ccs.Node> {

    private nextId : number = 1;
    idMap = {};
    constantMap = {};
    structureMap = {};

    dispatchProgram(node : ccs.Program, assignResults : ccs.Node[]) : ccs.Node {
        this.setId(node, this.nextId++);
        return node;
    }
    dispatchNullProcess(node : ccs.NullProcess) : ccs.Node {
        if (!this.idMap[0]) this.setId(node, 0);
        return this.idMap[0]; 
    }
    dispatchAssignment(node : ccs.Assignment, result : ccs.Node) : ccs.Node {
        node.process = result;
        return this.ensureStructId(node, "=" + node.variable + "," + node.process.id);
    }
    dispatchSummation(node : ccs.Summation, leftResult : ccs.Node, rightResult : ccs.Node) : ccs.Node {
        if (leftResult.id <= rightResult.id) {
            node.left = leftResult;
            node.right = rightResult;
        } else {
            node.left = rightResult;
            node.right = leftResult;
        }
        return this.ensureStructId(node, "+" + node.left.id + "," + node.right.id);
    }
    dispatchComposition(node : ccs.Composition, leftResult : ccs.Node, rightResult : ccs.Node) : ccs.Node {
        if (leftResult.id <= rightResult.id) {
            node.left = leftResult;
            node.right = rightResult;
        } else {
            node.left = rightResult;
            node.right = leftResult;
        }
        return this.ensureStructId(node, "|" + node.left.id + "," + node.right.id);
    }
    dispatchAction(node : ccs.Action, processResult : ccs.Node) : ccs.Node {
        node.next = processResult;
        var result =  this.ensureStructId(node, "." + (node.complement ? "!" : "") + node.label + "." + node.next.id);
        return result;
    }
    dispatchRestriction(node : ccs.Restriction, processResult : ccs.Node) : ccs.Node {
        node.process = processResult;
        //Same as relabelling
        this.setId(node, this.nextId++);
        return node;
    }
    dispatchRelabelling(node : ccs.Relabelling, processResult : ccs.Node) : ccs.Node {
        node.process = processResult;
        //TODO: match on relabel sets
        //For now any relabelling is unique
        this.setId(node, this.nextId++);
        return node;
    }
    dispatchConstant(node : ccs.Constant) : ccs.Node {
        if (!this.constantMap[node.constant]) {
            this.constantMap[node.constant] = node;
            this.setId(node, this.nextId++);
        }
        return this.constantMap[node.constant];
    }

    private setId(node, id) {
        node.id = id;
        this.idMap[id] = node;
    }

    private ensureStructId(node, structId) : ccs.Node {
        //Are we lacking id but our structure already is recorded?
        //Then use the existing structure to ensure unique entry.
        if (!node.id && this.structureMap[structId]) {
            return this.idMap[this.structureMap[structId]];
        }
        if (!node.id) this.setId(node, this.nextId++);
        this.structureMap[structId] = node.id;
        return node;
    }
}

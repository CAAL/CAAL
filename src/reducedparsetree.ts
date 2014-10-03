// <reference path="ccs.ts" />
import ccs = require("./ccs");

export class ReducedParseTreeTraverser implements ccs.NodeDispatcher<ccs.Node> {
    dispatchProgram(node : ccs.Program, assignResults : ccs.Node[]) : ccs.Node {
        node.assignments = <ccs.Assignment[]>assignResults;
        return node;
    }
    dispatchNullProcess(node : ccs.NullProcess) : ccs.Node {
        return node;
    }
    dispatchAssignment(node : ccs.Assignment, result : ccs.Node) : ccs.Node {
        node.process = result;
        return node;
    }
    dispatchSummation(node : ccs.Summation, leftResult : ccs.Node, rightResult : ccs.Node) : ccs.Node {
        node.left = leftResult;
        node.right = rightResult;
        if (node.left instanceof ccs.NullProcess) return node.right; // 0 + P => 0
        if (node.right instanceof ccs.NullProcess) return node.left; // P + 0 => P
        if (node.left.id === node.right.id) return leftResult; // P + P => P
        return node;
    }
    dispatchComposition(node : ccs.Composition, leftResult : ccs.Node, rightResult : ccs.Node) : ccs.Node {
        node.left = leftResult;
        node.right = rightResult;
        if (node.left instanceof ccs.NullProcess) return node.right; // 0 | P => 0
        if (node.right instanceof ccs.NullProcess) return node.left; // P | 0 => P
        // DISABLED ---- if (node.left.id === node.right.id) return node.left; // P | P => P  --- ASK THE MAN
        return node;
    }
    dispatchAction(node : ccs.Action, processResult : ccs.Node) : ccs.Node {
        node.next = processResult;
        return node;
    }
    dispatchRestriction(node : ccs.Restriction, processResult : ccs.Node) : ccs.Node {
        node.process = processResult;
        // (P \ L1) \L2 => P \ (L1 Union L2)
        if (node.process instanceof ccs.Restriction) {
            var subRestriction = <ccs.Restriction>node.process;
            subRestriction.restrictedLabels.union(node.restrictedLabels);
            node = subRestriction;
        }
        // 0 \ L => 0
        if (node.process instanceof ccs.NullProcess) {
            return node.process;
        }
        if (node.restrictedLabels.empty()) {
            return node.process;
        }
        return node;
    }
    dispatchRelabelling(node : ccs.Relabelling, processResult : ccs.Node) : ccs.Node {
        node.process = processResult;
        if (node.process instanceof ccs.NullProcess) return node.process; // 0 [f] => 0
        return node;
    }
    dispatchConstant(node : ccs.Constant) : ccs.Node {
        return node;
    }
}

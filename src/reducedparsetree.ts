import ccs = require("./ccs");

// <reference path="ccs.ts" />
export class ReducedParseTree extends ccs.PostOrder {
    
    private isRightOf(node, parent): boolean {
        return parent.right == node;
    }
    
    public visitSummation(node, parent) {
        // reduce the tree, only one fix is eligible here
        if (this.removeUnnecessaryNullprocess(node, parent)) { }
        else if (this.removeUnnecessaryDuplicate(node, parent)) { }
    }
    
    public visitComposition(node, parent) {
        this.removeUnnecessaryNullprocess(node, parent)
    }
    
    private removeUnnecessaryNullprocess(node, parent): boolean {
        // if either left or right is NullProcess, then we can replace the Composition node with the other
        if (node.right.type == ccs.CCSNode.NullProcess) {
            // if node is to the right of parent, then overwrite parent.right
            if (this.isRightOf(node, parent))
                parent.right = node.left;
            else
                parent.left = node.left;
            return true;
        } else if (node.left.type == ccs.CCSNode.NullProcess) {
            // if node is to the right of parent, then overwrite parent.right
            if (this.isRightOf(node, parent))
                parent.right = node.right;
            else
                parent.left = node.right;
            return true;
        } else {
            return false;
        }
    }
    
    private removeUnnecessaryDuplicate(node, parent): boolean {
        if (node.right == node.left) {
            parent = node.right;
            return true;
        } else {
            return false;
        }
    }
}
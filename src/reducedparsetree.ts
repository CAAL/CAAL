import ccs = require("./ccs");

export class ReducedParseTree extends ccs.PostOrder {
    
    constructor(tree) {
        super(); // required in derived classes :(
        // build cache first TODO: make sure cache not already build?
        //new ccs.CachePrefixAndRepr().postOrderVisit(tree);
        
        this.postOrderVisit(tree);
    }
    
    private isRightOf(node, parent) : boolean {
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
    
    private removeUnnecessaryNullprocess(node, parent) : boolean {
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
    
    private removeUnnecessaryDuplicate(node, parent) : boolean {
        if (node.right == node.left) {
            parent = node.right;
            return true;
        } else {
            return false;
        }
    }
    
    public visitRelabelling(node, parent) {
        if (this.reduceNullProcess(node,parent)) {
            return; // nothing more to reduce
        }
        //TODO remove relabelling actions which isn't part of the process
    }
    
    public visitRestriction(node, parent) {
        if (node.process.type == ccs.CCSNode.Parenthesis && node.process.process.type == ccs.CCSNode.Restriction) {
            // rule: (P\L_1) \ L_2 = P\(L_1 union L_2)
            node.labels = this.union(node.labels, node.process.process.labels);
            
            // replace this node's sibling with its sibling's sibling's sibling (yeah that's right)
            this.overwriteParentSibling(node.process.process.process, node);
        }
        
        if (this.reduceNullProcess(node, parent)) {
            return; // nothing more to reduce
        }
    }
    
    private overwriteParentSibling(node, parent) {
        if      (parent.right   != undefined) parent.right   = node;
        else if (parent.next    != undefined) parent.next    = node;
        else if (parent.process != undefined) parent.process = node;
    }
    
    private reduceNullProcess(node, parent) : boolean {
        if (node.process.type == ccs.CCSNode.NullProcess) {
            this.overwriteParentSibling(node.process, parent);
            return true;
        }
        return false;
    }
    
    private union(setA, setB) { // save function in some global scope?
        var result = setA.slice(0);
        for (var i = 0; i < setB.length; i++){
            if (setA.indexOf(setB[i]) === -1){
                result.push(setB[i]);
            }
        }
        return result;
    }
    
    public visitParenthesis(node, parent) {
        if (node.process.type == ccs.CCSNode.Parenthesis) {
            // means we have double parenthesis, which is unnecessary
            this.overwriteParentSibling(node.process, parent);
            
            // the node becomes the nested parenthesis' node
            node = node.process;
            
            // there can only be this one nested parenthesis in the siblings, because we go bottom up
        }
        
    }
}



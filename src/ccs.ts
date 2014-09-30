export enum CCSNode {
    Program,
    NullProcess,
    Assignment,
    Summation,
    Composition,
    Action,
    Restriction,
    Relabelling,
    Parenthesis,
    Constant
}

export interface Visitor {
    //visitProgram(node);
    visitNullProcess(node, parent);
    visitAssignment(node, parent);
    visitSummation(node, parent);
    visitComposition(node, parent);
    visitAction(node, parent);
    visitRestriction(node, parent);
    visitRelabelling(node, parent);
    visitParenthesis(node, parent);
    visitConstant(node, parent);
}

export class PostOrder implements Visitor {
    private parentStack;
    private lastNodeVisited = undefined;
    
    private stackPeek(stack) {
        return stack[stack.length - 1];
    }
    
    // source: http://www.geeksforgeeks.org/iterative-postorder-traversal-using-stack/
    public postOrderVisit(root) {
        if (root == undefined)
            return;
        
        this.parentStack = [];
        var right;
        var node = (root.type == CCSNode.Assignment) ? root.right : root;
        
        // put the assignment on the stack, which means that it will be the last on to be visited
        // the assignment's left side is ignored
        if (root.type == CCSNode.Assignment)
            this.parentStack.push(root);
        
        do {
            // move to the leftmost node
            while(node != undefined) {
                right = node.next || node.process || node.right;
                
                // push node's right child and then node to stack
                if (right != undefined)
                    this.parentStack.push(right);
                this.parentStack.push(node);
                
                // set node as node's left child
                node = node.left;
            }
            
            // pop and item from stack and set it as node
            node = this.parentStack.pop();
            
            right = node.next || node.process || node.right;
            
            //if the popped item has a right child and the right child is not
            // processed yet, then make sure right child is processed before node
            if (right != undefined && this.stackPeek(this.parentStack) == right) {
                this.parentStack.pop(); // remove right child from stack
                this.parentStack.push(node); // push node back to stack
                node = right;
            }
            else { // else print node's data and set node as null
                this.visit(node, this.stackPeek(this.parentStack));
                node = undefined;
            }
        } while(this.parentStack.length != 0);
    }
    
    private visit(node, parent) {
        switch (node.type) {
            /*case node.Program:
                this.visitor.visitProgram(node);*/
            case CCSNode.NullProcess:
                this.visitNullProcess(node, parent);
                break;
            case CCSNode.Assignment:
                this.visitAssignment(node, parent);
                break;
            case CCSNode.Summation:
                this.visitSummation(node, parent);
                break;
            case CCSNode.Composition:
                this.visitComposition(node, parent);
                break;
            case CCSNode.Action:
                this.visitAction(node, parent);
                break;
            case CCSNode.Restriction:
                this.visitRestriction(node, parent);
                break;
            case CCSNode.Relabelling:
                this.visitRelabelling(node, parent);
                break;
            case CCSNode.Parenthesis:
                this.visitParenthesis(node, parent);
                break;
            case CCSNode.Constant:
                this.visitConstant(node, parent);
                break;
            default:
                console.log(node, parent);
                throw "This should not happen " + node.type;
        }
    }
    
    /* Override these methods in sub classes */
    public visitNullProcess(node, parent) { }
    public visitAssignment(node, parent) { }
    public visitSummation(node, parent) { }
    public visitComposition(node, parent) { }
    public visitAction(node, parent) { }
    public visitRestriction(node, parent) { }
    public visitRelabelling(node, parent) { }
    public visitParenthesis(node, parent) { }
    public visitConstant(node, parent) { }
}

export class CachePrefixAndRepr extends PostOrder {

    private union(setA, setB) {
        var result = setA.slice(0);
        for (var i = 0; i < setB.length; i++){
            if (setA.indexOf(setB[i]) === -1){
                result.push(setB[i]);
            }
        }
        return result;
    }

    private difference(setA, setB) {
        var result = [];
        for (var i = 0; i < setA.length; i++) {
            if (setB.indexOf(setA[i]) === -1) {
                result.push(setA[i]);
            }
        }
        return result;
    }

    visitNullProcess(node, parent) {
        node.repr = "0";
        node.acts = [];
    }
    visitAssignment(node, parent) {
        node.repr = node.left + " = " + node.right.repr;
    }
    visitSummation(node, parent) {
        node.repr = node.left.repr + " + " + node.right.repr;
        node.acts = this.union(node.left.acts, node.right.acts);
    }
    visitComposition(node, parent) {
        node.repr = node.left.repr + " | " + node.right.repr;
        //Todo acts, partial
        node.acts = this.union(node.left.acts, node.right.acts);
    }
    visitAction(node, parent) {
        var linedLabel = (node.complement ? "!" : "");
        node.repr = linedLabel + node.label + "." + node.next.repr;
        node.acts = [linedLabel +  node.label];
    }
    visitRestriction(node, parent) {
        node.repr = node.process.repr + " \\ {" + node.labels.join(',') + "}";
        node.acts = this.difference(node.process.acts, node.labels);
    }
    visitRelabelling(node, parent) {
        //Todo
        //Acts partial
        node.acts = node.process.acts;
    }
    visitParenthesis(node, parent) {
        node.repr = "(" + node.process.repr + ")";
        node.acts = node.process.acts;
    }
    visitConstant(node, parent) {
        node.repr = node.constant;
        //Todo acts
    }
}

export enum CCSNode {
    Program,
    NullProcess,
    Assignment,
    Summation,
    Composition,
    Action,
    Restriction,
    Relabeling,
    Parenthesis,
    Constant
}

export interface Visitor {
    //visitProgram(node);
    visitNullProcess(node);
    visitAssignment(node);
    visitSummation(node);
    visitComposition(node);
    visitAction(node);
    visitRestriction(node);
    visitRelabeling(node);
    visitParenthesis(node);
    visitConstant(node);
}

export class PostOrder implements Visitor {
    parentStack;
    lastNodeVisited = undefined;
    
    stackPeek(stack) {
        return stack[stack.length - 1];
    }
    
    postOrderVisit(root) {
        if (root == undefined)
            return;
        
        this.parentStack = [];
        var right;
        
        do {
            // move to the leftmost node
            while(root != undefined) {
                right = root.next || root.process || root.right;
                right = undefined;
                // push root's right child and then root to stack
                if (right != undefined)
                    this.parentStack.push(right);
                this.parentStack.push(root);
                
                // set root as root's left child
                root = root.left;
            }
            
            // pop and item from stack and set it as root
            root = this.parentStack.pop();
            
            right = root.next || root.process || root.right;
            
            //if the popped item has a right child and the right child is not
            // processed yet, then make sure right child is processed before root
            if (right != undefined && this.stackPeek(this.parentStack) == right) {
                this.parentStack.pop(); // remove right child from stack
                this.parentStack.push(root); // push root back to stack
                root = right;
            }
            else { // else print root's data and set root as null
                this.visit(root);
                root = undefined;
            }
        } while(this.parentStack.length != 0);
    }
    
    visit(blop) {
        var node = CCSNode;
        
        switch (blop.type) {
            /*case node.Program:
                this.visitor.visitProgram(blop);*/
            case node.NullProcess:
                this.visitNullProcess(blop);
                break;
            case node.Assignment:
                this.visitAssignment(blop);
                break;
            case node.Summation:
                this.visitSummation(blop);
                break;
            case node.Composition:
                this.visitComposition(blop);
                break;
            case node.Action:
                this.visitAction(blop);
                break;
            case node.Restriction:
                this.visitRestriction(blop);
                break;
            case node.Relabeling:
                this.visitRelabeling(blop);
                break;
            case node.Parenthesis:
                this.visitParenthesis(blop);
                break;
            case node.Constant:
                this.visitConstant(blop);
                break;
            default:
                console.log(blop);
                throw "This should not happen " + blop.type;
        }
    }
    
    /* Override these methods in sub classes */
    visitNullProcess(node) { }
    visitAssignment(node) { }
    visitSummation(node) { }
    visitComposition(node) { }
    visitAction(node) { }
    visitRestriction(node) { }
    visitRelabeling(node) { }
    visitParenthesis(node) { }
    visitConstant(node) { }
}

export class SharedParseTree extends PostOrder {
    visitAction() {
        console.log("GREAT SUCCESS");
    }
}

export class ReducedParseTree extends PostOrder {

}







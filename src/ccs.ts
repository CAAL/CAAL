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

//Bottom up we add existing subtrees.
//Any subtree in any node is replaced by
//its existing definition.
export class SharedParseTree extends PostOrder {
    map;
    constructor(map) {
        super();
        this.map = map || new NodeMap();
    }

    visitNullProcess(node) {
        this.map.acquireIdForNode(node);
    }

    visitAssignment(node) {
        node.right = this.map.getById(node.right.id);
        this.map.acquireIdForNode(node);
    }
    visitSummation(node) {
        node.left = this.map.getById(node.left.id);
        node.right = this.map.getById(node.right.id);
        if (node.left.id > node.right.id) {
            //Swap
            var temp = node.left;
            node.left = node.right;
            node.right = temp;
        }
        this.map.acquireIdForNode(node);
    }
    visitComposition(node) {
        //Reuse
        this.visitSummation(node);
    }
    visitAction(node) {
        node.next = this.map.getById(node.next.id);
        this.map.acquireIdForNode(node);
    }
    visitRestriction(node) {
        node.process = this.map.getById(node.process.id);
        this.map.acquireIdForNode(node);
    }
    visitRelabeling(node) {
        node.process = this.map.getById(node.process.id);
        this.map.acquireIdForNode(node);
    }
    visitParenthesis(node) {
        node.process = this.map.getById(node.process.id);
        this.map.acquireIdForNode(node);
    }
    visitConstant(node) {
        node.process = this.map.getById(node.process.id);
        this.map.acquireIdForNode(node);
    }
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

    visitNullProcess(node) {
        node.repr = "0";
        node.acts = [];
    }
    visitAssignment(node) {
        node.repr = node.left + " = " + node.right.repr;
    }
    visitSummation(node) {
        node.repr = node.left.repr + " + " + node.right.repr;
        node.acts = this.union(node.left.acts, node.right.acts);
    }
    visitComposition(node) {
        node.repr = node.left.repr + " | " + node.right.repr;
        //Todo acts, partial
        node.acts = this.union(node.left.acts, node.right.acts);
    }
    visitAction(node) {
        var linedLabel = (node.complement ? "!" : "");
        node.repr = linedLabel + node.label + "." + node.next.repr;
        node.acts = [linedLabel +  node.label];
    }
    visitRestriction(node) {
        node.repr = node.process.repr + " \\ {" + node.labels.join(',') + "}";
        node.acts = this.difference(node.process.acts, node.labels);
    }
    visitRelabeling(node) {
        //Todo
        //Acts partial
        node.acts = node.process.acts;
    }
    visitParenthesis(node) {
        node.repr = "(" + node.process.repr + ")";
        node.acts = node.process.acts;
    }
    visitConstant(node) {
        node.repr = node.constant;
        //Todo acts
    }
}

export class NodeMap {
    nodeIds = {};
    //This contain a path for the syntax to an id, e.g.:  nodeStructure[CCSNode.Summation][p.id][q.id] = id.
    nodeStructure = {};
    nextId = 1;

    constructor( ) {
    }

    getById(id) {
        return this.nodeIds[id] || null;
    }

    acquireIdForNode(node) {
        var newId = this.acquireId(node);
        node.id = newId;
        if (!this.nodeIds[newId]) this.nodeIds[newId] = node;
    }

    private acquireId(node) {
         switch (node.type) {
            case CCSNode.Program:
                //TODO
                throw "Not implemented here (yet)";
            case CCSNode.NullProcess:
                return 0;
            case CCSNode.Assignment:
                return this.nextId++;
            case CCSNode.Summation:
                return this.acquireIdByStructure([CCSNode.Summation, node.left.id, node.right.id]);
            case CCSNode.Composition:
                return this.acquireIdByStructure([CCSNode.Composition, node.left.id, node.right.id]);
            case CCSNode.Action:
                return this.acquireIdByStructure([CCSNode.Action, node.next.id, node.label, node.complement]);
            case CCSNode.Restriction:
                return this.nextId++;
            case CCSNode.Relabeling:
                return this.nextId++;
            case CCSNode.Parenthesis:
                return this.acquireIdByStructure([CCSNode.Parenthesis, node.process.id]);
            case CCSNode.Constant:
                return this.acquireIdByStructure([CCSNode.Constant, node.constant]);
            default:
                throw "Invalid node type " + node.type;
        }
    }

    private acquireIdByStructure(path) {
        var key = this.last(path),
            prefixPath = this.ensurePath(path);
        if (!prefixPath[key]) {
            prefixPath[key] = this.nextId++;
        }
        return prefixPath[key];
    }

    private ensurePath(path) : Object {
        var current = this.nodeStructure,
            prefixPath = this.init(path),
            nextKey;
        //Follow/build path.
        for (var i = 0; i < prefixPath.length; i++){
            nextKey = prefixPath[i];
            if (!current[nextKey]) current[nextKey] = {};
            current = current[nextKey];
        }
        return current;
    }

    private init(array) {
        return array.slice(0, array.length-1);
    }

    private last(array) {
        return array[array.length-1];
    }
}

export class ReducedParseTree extends PostOrder {
    visitSummation(node) {
        this.removeUndefinedOnRight(node);
        this.removeDuplicateOnRight(node);
        this.setUndefinedSibling(node);
    }
    
    visitComposition(node) {
        this.removeUndefinedOnRight(node);
        this.removeDuplicateOnRight(node);
        this.setUndefinedSibling(node);
    }
    
    visitAssignment(node) {
        this.removeUndefinedOnRight(node);
        this.removeDuplicateOnRight(node);
    }
    
    /* set node to undefined if it can be removed */
    setUndefinedSibling(node) {
        if (node.right.type == CCSNode.NullProcess) {
            node.right = undefined;
        }
        else if (node.left.type == CCSNode.NullProcess) {
            node.left = undefined;
        }
    }
    
    /* override node.right with one of its defined nodes */
    removeUndefinedOnRight(node) {
        if (node.right.type == CCSNode.Summation || node.right.type == CCSNode.Composition) {
            if (node.right.left == undefined) {
                node.right = node.right.right;
            }
            else if (node.right.right == undefined) {
                node.right = node.right.left;
            }
        }
    }
    
    removeDuplicateOnRight(node) {
        if (node.right.type == CCSNode.Summation) { //TODO: also composition?
            // if the right and left side, of node.right, are the same, we can override node.right with either
            if (node.right.left == node.right.right) {
                node.right = node.right.right;
            }
        }
    }
}

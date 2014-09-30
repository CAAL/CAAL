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

//Bottom up we add existing subtrees.
//Any subtree in any node is replaced by
//its existing definition.
export class SharedParseTree extends PostOrder {
    map;
    constructor(map) {
        super();
        this.map = map || new NodeMap();
    }

    visitNullProcess(node, parent) {
        this.map.acquireIdForNode(node);
    }

    visitAssignment(node, parent) {
        node.right = this.map.getById(node.right.id);
        this.map.acquireIdForNode(node);
    }
    visitSummation(node, parent) {
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
    visitComposition(node, parent) {
        //Reuse
        this.visitSummation(node, parent);
    }
    visitAction(node, parent) {
        node.next = this.map.getById(node.next.id);
        this.map.acquireIdForNode(node);
    }
    visitRestriction(node, parent) {
        node.process = this.map.getById(node.process.id);
        this.map.acquireIdForNode(node);
    }
    visitRelabelling(node, parent) {
        node.process = this.map.getById(node.process.id);
        this.map.acquireIdForNode(node);
    }
    visitParenthesis(node, parent) {
        node.process = this.map.getById(node.process.id);
        this.map.acquireIdForNode(node);
    }
    visitConstant(node, parent) {
        node.process = this.map.getById(node.id);
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
            case CCSNode.Relabelling:
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
        if (node.right.type == CCSNode.NullProcess) {
            // if node is to the right of parent, then overwrite parent.right
            if (this.isRightOf(node, parent))
                parent.right = node.left;
            else
                parent.left = node.left;
            return true;
        } else if (node.left.type == CCSNode.NullProcess) {
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

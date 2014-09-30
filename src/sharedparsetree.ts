import ccs = require("./ccs");

//Bottom up we add existing subtrees.
//Any subtree in any node is replaced by
//its existing definition.
export class SharedParseTree extends ccs.PostOrder {
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
            case ccs.CCSNode.Program:
                //TODO
                throw "Not implemented here (yet)";
            case ccs.CCSNode.NullProcess:
                return 0;
            case ccs.CCSNode.Assignment:
                return this.nextId++;
            case ccs.CCSNode.Summation:
                return this.acquireIdByStructure([ccs.CCSNode.Summation, node.left.id, node.right.id]);
            case ccs.CCSNode.Composition:
                return this.acquireIdByStructure([ccs.CCSNode.Composition, node.left.id, node.right.id]);
            case ccs.CCSNode.Action:
                return this.acquireIdByStructure([ccs.CCSNode.Action, node.next.id, node.label, node.complement]);
            case ccs.CCSNode.Restriction:
                return this.nextId++;
            case ccs.CCSNode.Relabelling:
                return this.nextId++;
            case ccs.CCSNode.Parenthesis:
                return this.acquireIdByStructure([ccs.CCSNode.Parenthesis, node.process.id]);
            case ccs.CCSNode.Constant:
                return this.acquireIdByStructure([ccs.CCSNode.Constant, node.constant]);
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
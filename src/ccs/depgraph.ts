/// <reference path="ccs.ts" />
/// <reference path="hml.ts" />
/// <reference path="util.ts" />
/// <reference path="collapse.ts" />

module DependencyGraph {

    import ccs = CCS;
    import hml = HML;

    function copyHyperEdges(hyperEdges) {
        var result = [];
        for (var i=0; i < hyperEdges.length; i++) {
            result.push(hyperEdges[i].slice(0));
        }
        return result;
    }

    export class BisimulationDG implements DependencyGraph {

        /** The dependency graph is constructed with disjunction
            as conjunction and vica versa, since bisimulation is
            maximal fixed-point. The result marking should be
            inverted **/

        private nextIdx;
        private nodes = [];
        public constructData = [];
        private leftPairs = {};
        private isFullyConstructed = false;

        constructor(private attackSuccGen : ccs.SuccessorGenerator,
                    private defendSuccGen : ccs.SuccessorGenerator,
                    leftNode, rightNode) {
            this.constructData[0] = [0, leftNode, rightNode];
            this.nextIdx = 1;
        }

        getHyperEdges(identifier) {
            var type, result;
            //Have we already built this? Then return copy of the edges.
            if (this.nodes[identifier]) {
                result = this.nodes[identifier];
            } else {
                result = this.constructNode(identifier);
            }
            return copyHyperEdges(result);
        }

        private constructNode(identifier) {
            var result,
                data = this.constructData[identifier],
                type = data[0];
            if (type === 0) { //It it a pair?
                result = this.nodes[identifier] = this.getProcessPairStates(data[1], data[2]);
            } else if (type === 1) { // The left action and destination is fixed?
                result = this.nodes[identifier] = this.getNodeForLeftTransition(data);
            } else if (type === 2) { // The right action and destination is fixed?
                result = this.nodes[identifier] = this.getNodeForRightTransition(data);
            }
            return result;
        }

        getAllHyperEdges() : [any][] {
            if (!this.isFullyConstructed) {
                this.isFullyConstructed = true;
                //All nodes have ids in order of creation, thus there are no gaps.
                for (var i=0; i < this.nextIdx; i++) {
                    this.constructNode(i);
                }
            }
            var result = [];
            result.length = this.nextIdx;
            for (var i=0; i < this.nextIdx; i++) {
                result[i] = [i, copyHyperEdges(this.nodes[i])];
            }
            return result;
        }

        private getNodeForLeftTransition(data) {
            var action = data[1],
                toLeftId = data[2],
                fromRightId = data[3],
                result = [];
            // for (s, fromRightId), s ----action---> toLeftId.
            // fromRightId must be able to match.
            var rightTransitions = this.defendSuccGen.getSuccessors(fromRightId);
            rightTransitions.forEach(rightTransition => {
                var existing, toRightId;
                //Same action - possible candidate.
                if (rightTransition.action.equals(action)) {
                    toRightId = rightTransition.targetProcess.id;
                    var rightIds = this.leftPairs[toLeftId];
                    if (rightIds) {
                        existing = rightIds[toRightId];
                    }
                    //Have we already solved the resulting (s1, t1) pair?
                    if (existing) {
                        result.push(existing);
                    } else {
                        //Build the node.
                        var newIndex = this.nextIdx++;
                        if (!rightIds) this.leftPairs[toLeftId] = rightIds = {};
                        rightIds[toRightId] = newIndex
                        this.constructData[newIndex] = [0, toLeftId, toRightId];
                        result.push(newIndex);
                    }
                }
            });
            return [result];
        }

        private getNodeForRightTransition(data) {
            var action = data[1],
                toRightId = data[2],
                fromLeftId = data[3],
                result = [];
            var leftTransitions = this.defendSuccGen.getSuccessors(fromLeftId);
            leftTransitions.forEach(leftTransition => {
                var existing, toLeftId;
                if (leftTransition.action.equals(action)) {
                    toLeftId = leftTransition.targetProcess.id;
                    var rightIds = this.leftPairs[toLeftId];
                    if (rightIds) {
                        existing = rightIds[toRightId];
                    }
                    //Have we already solved the resulting (s1, t1) pair?
                    if (existing) {
                        result.push(existing);
                    } else {
                        //Build the node.
                        var newIndex = this.nextIdx++;
                        if (!rightIds) this.leftPairs[toLeftId] = rightIds = {};
                        rightIds[toRightId] = newIndex
                        this.constructData[newIndex] = [0, toLeftId, toRightId];
                        result.push(newIndex);
                    }
                }
            });
            return [result];
        }

        private getProcessPairStates(leftProcessId, rightProcessId) {
            var hyperedges = [];
            var leftTransitions = this.attackSuccGen.getSuccessors(leftProcessId);
            var rightTransitions = this.attackSuccGen.getSuccessors(rightProcessId);
            leftTransitions.forEach(leftTransition => {
                var newNodeIdx = this.nextIdx++;
                this.constructData[newNodeIdx] = [1, leftTransition.action, leftTransition.targetProcess.id, rightProcessId];
                hyperedges.push([newNodeIdx]);
            });
            rightTransitions.forEach(rightTransition => {
                var newNodeIdx = this.nextIdx++;
                this.constructData[newNodeIdx] = [2, rightTransition.action, rightTransition.targetProcess.id, leftProcessId];
                hyperedges.push([newNodeIdx]);
            });
            return hyperedges;
        }

        getTraceIterator(marking) {
            var that = this;
            if (marking.getMarking(0) !== marking.ONE) throw "getTraceIterator: Processes do not diverge.";

            //Hyperedge [ [X, Y], [Q, R, S], ... ], find the next index starting at startFrom, such that
            //all "edges" inside are marked ONE. E.g. if Q,R,S are all marked ONE then return "1", (assuming X, Y are not).
            //otherwise returns -1.
            function indexNextHyperEdgeMarkedOne(hyperEdges, marking, startFrom?) : number {
                startFrom = startFrom || 0;
                for (var i=startFrom; i < hyperEdges.length; i++) {
                    var edge = hyperEdges[i];
                    var allOne = true;
                    for (var j=0; j < edge.length; j++) {
                        if (marking.getMarking(edge[j]) !== marking.ONE) {
                            allOne = false;
                            break;
                        }
                    }
                    if (allOne) {
                        return i;
                    }
                }
                return -1;
            }

            //Build the arrays of alternating process id, and actions.
            function buildTraces(dfs) {
                var leftTrace = [],
                    rightTrace = [],
                    node, leftMovedLast, constructData, type, action;
                for (var i=0; i < dfs.length; i++) {
                    node = dfs[i][0];
                    constructData = that.constructData[node];
                    type = constructData[0];
                    //Both are in their respective processes in the bisim relation.
                    if (type === 0) {
                        leftTrace.push(constructData[1]);
                        rightTrace.push(constructData[2]);
                    }
                    else {
                        //One of them could do action. Mirror the other.
                        leftMovedLast = type === 1;
                        action = constructData[1];
                        leftTrace.push(action);
                        rightTrace.push(action);
                    }
                }
                //One of them could not do the last action.
                leftMovedLast ? rightTrace.pop() : leftTrace.pop();
                return {
                    left: leftTrace,
                    right: rightTrace
                }
            }

            //Used for the iterator
            var latestResult = null;

            //The entire iterator state, for the DFS.
            var dfs = [ [0, 0, 0, that.getHyperEdges(0)] ];
            var dfsDepth = 1;
            //Nodes in the path - to prevent cycles.
            var visited = [];

            function yieldNext() {
                var yieldResult = null;
                while (dfsDepth > 0 && yieldResult === null) {
                    var current : any[] = dfs[dfsDepth-1];
                    var node = current[0];
                    var hyperEdgeIdx : number = current[1];
                    var edgeIdx : number = current[2];
                    var hyperEdges = current[3];

                    //Tried all hyperEdges?
                    if (hyperEdgeIdx >= hyperEdges.length) {
                        dfs.pop();
                        visited.pop();
                        --dfsDepth;
                    } else {
                        //Process edge if possible
                        var edges = hyperEdges[hyperEdgeIdx];            
                        //Base case, the edge trivially marked ONE.
                        if (edges.length === 0) {
                            yieldResult = buildTraces(dfs);
                        }
                        //Tried all edges?
                        if (edgeIdx >= edges.length) {
                            //Try next hyperedge
                            var hyperEdgeIdx = indexNextHyperEdgeMarkedOne(hyperEdges, marking, hyperEdgeIdx+1);
                            //If none found drop on next iteration
                            if (hyperEdgeIdx === -1) {
                                hyperEdgeIdx = hyperEdges.length;
                            }
                            //Update dfs data
                            current[1] = hyperEdgeIdx;
                            current[2] = 0;
                        } else {
                            //try edge then
                            var nextNode = edges[edgeIdx];
                            if (visited.indexOf(nextNode) === -1) {
                                dfs.push([nextNode, 0, 0, that.getHyperEdges(nextNode)]);
                                visited.push(nextNode);
                                ++dfsDepth;
                            }
                            //Update dfs data
                            current[2] = ++edgeIdx;
                        }
                    }
                }
                return yieldResult;
            }

            //Iterations may be expensive. don't bother if not called.
            var didFirstRun = false;
            function ensureFirstRun() {
                if (!didFirstRun) {
                    didFirstRun = true;
                    latestResult = yieldNext();
                }
            }

            function hasNext() {
                ensureFirstRun();
                return latestResult !== null;
            }

            function getNext() {
                ensureFirstRun();
                var result = latestResult;
                latestResult = yieldNext();
                return result;
            }

            return {
                hasNext: hasNext,
                next: getNext
            }
        }

        getBisimulationCollapse(marking) : Traverse.Collapse {

            var sets = Object.create(null);

            //Union find / disjoint-set.
            function singleton(id) {
                var o : any = {val: id, rank: 0};
                o.parent = o;
                sets[id]= o;
            }

            function findRootInternal(set) {
                if (set.parent !== set) {
                    set.parent = findRootInternal(set.parent);
                }
                return set.parent;
            }

            function findRoot(id) {
                return findRootInternal(sets[id]);
            }

            function union(pId, qId) {
                var pRoot = findRoot(pId),
                    qRoot = findRoot(qId);
                if (pRoot === qRoot) return;
                if (pRoot.rank < qRoot.rank) pRoot.parent = qRoot;
                else if (pRoot.rank > qRoot.rank) qRoot.parent = pRoot;
                else {
                    qRoot.parent = pRoot;
                    ++pRoot.rank;
                }
            }

            //Apply union find algorithm
            this.constructData.forEach((pair, i) => {
                var pId, qId;
                if (pair[0] !== 0) return;
                pId = pair[1];
                qId = pair[2];
                if (!sets[pId]) singleton(pId);
                if (!sets[qId]) singleton(qId);
                //is bisimilar?
                if (marking.getMarking(i) === marking.ZERO) {
                    union(pId, qId);
                }
            });

            //Create equivalence sets
            var eqSet = {};
            Object.keys(sets).forEach(procId => {
                var reprId = getRepresentative(procId);
                (eqSet[reprId] = eqSet[reprId] || []).push(procId);
            });

            function getRepresentative(id) {
                return findRoot(id).val;
            }

            return {
                getRepresentative: getRepresentative,
                getEquivalenceSet: function(id) {
                    return eqSet[getRepresentative(id)];
                }
            }
        }
    }

    export interface PartialDependencyGraph {
        getHyperEdges(identifier) : any[][];
    }

    export interface DependencyGraph extends PartialDependencyGraph {
        getHyperEdges(identifier) : any[][];
        getAllHyperEdges() : any[];
    }

    class MuCalculusMinModelCheckingDG implements PartialDependencyGraph, hml.FormulaDispatchHandler<any> {
        private TRUE_ID = 1;
        private FALSE_ID = 2;
        // the 0th index is set in the constructor.
        // nodes[1] is tt, nodes[2] is ff - described by hyper edges.
        private nodes = [ undefined, [ [] ], [ ] ];
        private constructData = {};
        private nextIdx;
        private variableEdges = {};
        private maxFixPoints = {};

        private getForNodeId;

        constructor(private strongSuccGen : ccs.SuccessorGenerator,
                    private weakSuccGen : ccs.SuccessorGenerator,
                    nodeId, private formulaSet : hml.FormulaSet, formula : hml.Formula) {
            this.constructData[0] = [nodeId, formula];
            this.nextIdx = 3;
        }

        getHyperEdges(identifier) {
            var data, nodeId, formula, result;
            if (this.nodes[identifier]) {
                result = this.nodes[identifier];
            } else {
                data = this.constructData[identifier];
                nodeId = data[0];
                formula = data[1];
                this.getForNodeId = nodeId;
                result = formula.dispatchOn(this);
                this.nodes[identifier] = result;
            }
            return copyHyperEdges(result);
        }

        dispatchDisjFormula(formula : hml.DisjFormula) {
            var leftIdx = this.nextIdx++,
                rightIdx = this.nextIdx++;
            this.constructData[leftIdx] = [this.getForNodeId, formula.left];
            this.constructData[rightIdx] = [this.getForNodeId, formula.right];
            return [ [leftIdx], [rightIdx] ];
        }

        dispatchConjFormula(formula : hml.ConjFormula) {
            var leftIdx = this.nextIdx++,
                rightIdx = this.nextIdx++;
            this.constructData[leftIdx] = [this.getForNodeId, formula.left];
            this.constructData[rightIdx] = [this.getForNodeId, formula.right];
            return [ [leftIdx, rightIdx] ];          
        }

        dispatchTrueFormula(formula : hml.TrueFormula) {
            return this.nodes[this.TRUE_ID];
        }

        dispatchFalseFormula(formula : hml.FalseFormula) {
            return this.nodes[this.FALSE_ID];
        }

        private existsFormula(formula : any, succGen : ccs.SuccessorGenerator) {
            var hyperedges = [],
                transitionSet = succGen.getSuccessors(this.getForNodeId);
            transitionSet.forEach(transition => {
                if (formula.actionMatcher.matches(transition.action)) {
                    var newIdx = this.nextIdx++;
                    this.constructData[newIdx] = [transition.targetProcess.id, formula.subFormula];
                    hyperedges.push([newIdx]);
                }
            });
            return hyperedges;            
        }

        private forallFormula(formula : any, succGen : ccs.SuccessorGenerator) {
            var hyperedges = [],
                transitionSet = succGen.getSuccessors(this.getForNodeId);
            transitionSet.forEach(transition => {
                if (formula.actionMatcher.matches(transition.action)) {
                    var newIdx = this.nextIdx++;
                    this.constructData[newIdx] = [transition.targetProcess.id, formula.subFormula];
                    hyperedges.push(newIdx);
                }
            });
            return [hyperedges];
        }

        dispatchStrongExistsFormula(formula : hml.StrongExistsFormula) {
            return this.existsFormula(formula, this.strongSuccGen);
        }

        dispatchStrongForAllFormula(formula : hml.StrongForAllFormula) {
            return this.forallFormula(formula, this.strongSuccGen);
        }

        dispatchWeakExistsFormula(formula : hml.WeakExistsFormula) {
            return this.existsFormula(formula, this.weakSuccGen);
        }

        dispatchWeakForAllFormula(formula : hml.WeakForAllFormula) {
            return this.forallFormula(formula, this.weakSuccGen);
        }

        dispatchMinFixedPointFormula(formula : hml.MinFixedPointFormula) {
            return formula.subFormula.dispatchOn(this);
        }

        dispatchMaxFixedPointFormula(formula : hml.MaxFixedPointFormula) {
            var maxDg = new MuCalculusMaxModelCheckingDG(this.strongSuccGen, this.weakSuccGen, this.getForNodeId, this.formulaSet, formula);
            var marking = solveMuCalculusInternal(maxDg);
            return marking.getMarking(0) === marking.ZERO ? this.nodes[this.TRUE_ID] : this.nodes[this.FALSE_ID];
        }

        dispatchVariableFormula(formula : hml.VariableFormula) {
            var key = this.getForNodeId + "@" + formula.variable;
            var variableEdge = this.variableEdges[key];
            if (variableEdge) return [[variableEdge]];
            this.variableEdges[key] = variableEdge = this.nextIdx++;
            this.constructData[variableEdge] = [this.getForNodeId, this.formulaSet.formulaByName(formula.variable)];
            return [[variableEdge]];
        }
    }

    class MuCalculusMaxModelCheckingDG implements PartialDependencyGraph, hml.FormulaDispatchHandler<any> {
        private TRUE_ID = 1;
        private FALSE_ID = 2;
        // the 0th index is set in the constructor.
        // nodes[1] is tt, nodes[2] is ff - described by hyper edges.
        private nodes = [ undefined, [ [] ], [ ] ];
        private constructData = {};
        private nextIdx;
        private variableEdges = {};
        private maxFixPoints = {};

        private getForNodeId;

        constructor(private strongSuccGen : ccs.SuccessorGenerator, 
                    private weakSuccGen : ccs.SuccessorGenerator,
                    nodeId, private formulaSet : hml.FormulaSet, formula : hml.Formula) {
            this.constructData[0] = [nodeId, formula];
            this.nextIdx = 3;
        }

        getHyperEdges(identifier) {
            var data, nodeId, formula, result;
            if (this.nodes[identifier]) {
                result = this.nodes[identifier];
            } else {
                data = this.constructData[identifier];
                nodeId = data[0];
                formula = data[1];
                this.getForNodeId = nodeId;
                result = formula.dispatchOn(this);
                this.nodes[identifier] = result;
            }
            return copyHyperEdges(result);
        }

        /* Remember Max fixed point - dependency graph should be "inverted" */
        dispatchDisjFormula(formula : hml.DisjFormula) {
            var leftIdx = this.nextIdx++,
                rightIdx = this.nextIdx++;
            this.constructData[leftIdx] = [this.getForNodeId, formula.left];
            this.constructData[rightIdx] = [this.getForNodeId, formula.right];
            return [ [leftIdx, rightIdx] ];
        }

        dispatchConjFormula(formula : hml.ConjFormula) {
            var leftIdx = this.nextIdx++,
                rightIdx = this.nextIdx++;
            this.constructData[leftIdx] = [this.getForNodeId, formula.left];
            this.constructData[rightIdx] = [this.getForNodeId, formula.right];
            return [ [leftIdx], [rightIdx] ];          
        }

        dispatchTrueFormula(formula : hml.TrueFormula) {
            return this.nodes[this.FALSE_ID];
        }

        dispatchFalseFormula(formula : hml.FalseFormula) {
            return this.nodes[this.TRUE_ID];
        }

        private existsFormula(formula : any, succGen : ccs.SuccessorGenerator) {
            var hyperedges = [],
                transitionSet = succGen.getSuccessors(this.getForNodeId);
            transitionSet.forEach(transition => {
                if (formula.actionMatcher.matches(transition.action)) {
                    var newIdx = this.nextIdx++;
                    this.constructData[newIdx] = [transition.targetProcess.id, formula.subFormula];
                    hyperedges.push(newIdx);
                }
            });
            return [hyperedges];
        }

        private forallFormula(formula : any, succGen : ccs.SuccessorGenerator) {
            var hyperedges = [],
                transitionSet = succGen.getSuccessors(this.getForNodeId);
            transitionSet.forEach(transition => {
                if (formula.actionMatcher.matches(transition.action)) {
                    var newIdx = this.nextIdx++;
                    this.constructData[newIdx] = [transition.targetProcess.id, formula.subFormula];
                    hyperedges.push([newIdx]);
                }
            });
            return hyperedges;
        }

        dispatchStrongExistsFormula(formula : hml.StrongExistsFormula) {
            return this.existsFormula(formula, this.strongSuccGen);
        }

        dispatchStrongForAllFormula(formula : hml.StrongForAllFormula) {
            return this.forallFormula(formula, this.strongSuccGen);
        }

        dispatchWeakExistsFormula(formula : hml.WeakExistsFormula) {
            return this.existsFormula(formula, this.weakSuccGen);
        }

        dispatchWeakForAllFormula(formula : hml.WeakForAllFormula) {
            return this.forallFormula(formula, this.weakSuccGen);
        }

        dispatchMinFixedPointFormula(formula : hml.MinFixedPointFormula) {
            var minDg = new MuCalculusMinModelCheckingDG(this.strongSuccGen, this.weakSuccGen, this.getForNodeId, this.formulaSet, formula);
            var marking = solveMuCalculusInternal(minDg);
            return marking.getMarking(0) === marking.ZERO ? this.nodes[this.TRUE_ID] : this.nodes[this.FALSE_ID];
        }

        dispatchMaxFixedPointFormula(formula : hml.MaxFixedPointFormula) {
            return formula.subFormula.dispatchOn(this);
        }

        dispatchVariableFormula(formula : hml.VariableFormula) {
            var key = this.getForNodeId + "@" + formula.variable;
            var variableEdge = this.variableEdges[key];
            if (variableEdge) return [[variableEdge]];
            variableEdge = this.nextIdx++;
            this.variableEdges[key] = variableEdge;
            this.constructData[variableEdge] = [this.getForNodeId, this.formulaSet.formulaByName(formula.variable)];
            return [[variableEdge]];
        }
    }

    function solveMuCalculusInternal(dg : PartialDependencyGraph) : any {
        var marking = liuSmolkaLocal2(0, dg);
        return marking;
    }

    export function solveMuCalculus(formulaSet, formula, strongSuccGen, weakSuccGen, processId) : boolean {
        var dg = new MuCalculusMinModelCheckingDG(strongSuccGen, weakSuccGen, processId, formulaSet, formula),
            marking = solveMuCalculusInternal(dg);
        return marking.getMarking(0) === marking.ONE;
    }

    export function isBisimilar(attackSuccGen : ccs.SuccessorGenerator, defendSuccGen : ccs.SuccessorGenerator, leftProcessId, rightProcessId, graph?) {
        var dg = new BisimulationDG(attackSuccGen, defendSuccGen, leftProcessId, rightProcessId),
            marking = liuSmolkaLocal2(0, dg);
        //Bisimulation is maximal fixed point, the marking is reversed.
        // if (marking.getMarking(0) === marking.ONE && graph) {
        //     var traceIterator = dg.getTraceIterator(marking)
        //     while (traceIterator.hasNext()) {
        //         var traces = traceIterator.next();            
        //         console.log("Left does: ");
        //         console.log(prettyPrintTrace(graph, traces.left));
        //         console.log("Right does: ");
        //         console.log(prettyPrintTrace(graph, traces.right));
        //     }
        // }
        return marking.getMarking(0) === marking.ZERO;
    }

    export function getBisimulationCollapse(
                attackSuccGen : ccs.SuccessorGenerator,
                defendSuccGen : ccs.SuccessorGenerator,
                leftProcessId,
                rightProcessId) : Traverse.Collapse {
        var dg = new BisimulationDG(attackSuccGen, defendSuccGen, leftProcessId, rightProcessId),
            marking = liuSmolkaGlobal(dg);
        return dg.getBisimulationCollapse(marking);
    }

    function prettyPrintTrace(graph, trace) {
        var notation = new Traverse.CCSNotationVisitor(),
            stringParts = [];
        for (var i=0; i < trace.length; i++) {
            if (i % 2 == 1) stringParts.push("---- " + trace[i].toString() + " ---->");
            else stringParts.push(notation.visit(graph.processById(trace[i])));
        }
        return stringParts.join("\n\t");
    }

    function liuSmolkaLocal2(m, graph : PartialDependencyGraph) : any {
        var S_ZERO = 1, S_ONE = 2, S_BOTTOM = 3;

        // A[k]
        var A = (function () {
            var a = {};
            var o = {
                get: function(k) {
                    return a[k] || S_BOTTOM;
                },
                set: function(k, status) {
                    a[k] = status;
                },
                dump: function() {
                    return a;
                }
            };
            return o;
        }());

        // D[k]
        var D = (function () {
            var d = {};
            var o = {
                empty: function(k) {
                    d[k] = [];
                },
                add: function(k, edgeL) {
                    d[k] = d[k] || [];
                    d[k].push(edgeL);
                },
                get: function(k) {
                    return d[k] || [];
                }
            };
            return o;
        }());

        function getSucc(k) {
            return graph.getHyperEdges(k);
        }

        function load(k) {
            var l = getSucc(k);
            while (l.length > 0) {
                W.push([k, l.pop()]);
            }
        }

        A.set(m, S_ZERO);
        D.empty(m);
        var W = [];
        load(m);
        while (W.length > 0) {
            var next = W.pop();
            var k = next[0];
            var l = next[1];
            if (A.get(k) === S_ZERO) {
                if (l.length > 0) {
                    var headL = l[l.length-1];
                    while (l.length > 0 && A.get(headL) === S_ONE) {
                        l.pop();
                        headL = l[l.length-1];
                    }
                }
                if (l.length === 0) {
                    A.set(k, S_ONE);
                    W = W.concat(D.get(k));
                }
                else if (A.get(headL) === S_ZERO) {
                    D.add(headL, [k, l]);
                }
                else if (A.get(headL) === S_BOTTOM) {
                    A.set(headL, S_ZERO);
                    D.empty(headL);
                    D.add(headL, [k, l]); //Missing in smolka paper
                    load(headL);
                }
            }
        }
        return {
            getMarking: function(dgNodeId) {
                return A.get(dgNodeId);
            },
            ZERO: S_ZERO,
            ONE: S_ONE,
            UNKNOWN: S_BOTTOM
        }
    }

    function liuSmolkaGlobal(graph : DependencyGraph) : any {
        var S_ZERO = 1, S_ONE = 2;
        // A[k]
        var A = (function () {
            var a = {};
            var o = {
                get: function(k) {
                    return a[k] || S_ZERO;
                },
                set: function(k, status) {
                    a[k] = status;
                }
            };
            return o;
        }());

        // D[k]
        var D = (function () {
            var d = {};
            var o = {
                empty: function(k) {
                    d[k] = [];
                },
                add: function(k, edgeL) {
                    d[k] = d[k] || [];
                    d[k].push(edgeL);
                },
                get: function(k) {
                    return d[k] || [];
                }
            };
            return o;
        }());

        var W = [];
        //Unpack hyperedges
        graph.getAllHyperEdges().forEach(pair => {
            var sourceNode = pair[0];
            pair[1].forEach(hyperEdge => W.push([sourceNode, hyperEdge]));
        });
        while (W.length > 0) {
            var next = W.pop();
            var k = next[0];
            var l = next[1];
            if (A.get(k) === S_ZERO) {
                if (l.length > 0) {
                    var headL = l[l.length-1];
                    while (l.length > 0 && A.get(headL) === S_ONE) {
                        l.pop();
                        headL = l[l.length-1];
                    }
                }
                if (l.length === 0) {
                    A.set(k, S_ONE);
                    W = W.concat(D.get(k));
                } else {
                    D.add(headL, [k, l]);
                }
            }
        }
        return {
            getMarking: function(dgNodeId) {
                return A.get(dgNodeId);
            },
            ZERO: S_ZERO,
            ONE: S_ONE
        }
    }
}
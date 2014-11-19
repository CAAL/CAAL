/// <reference path="ccs.ts" />
/// <reference path="hml.ts" />
/// <reference path="util.ts" />

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

        private succGen;
        private nextIdx;
        private nodes = [];
        public constructData = [];
        private pairToNodeId = {};

        constructor(succGen : ccs.SuccessorGenerator, leftNode, rightNode) {
            this.succGen = succGen;
            this.constructData[0] = [0, leftNode, rightNode];
            this.nextIdx = 1;
        }

        getHyperEdges(identifier) {
            var type, data, result;
            //Have we already built this? Then return copy of the edges.
            if (this.nodes[identifier]) {
                result = this.nodes[identifier];
            } else {
                data = this.constructData[identifier];
                type = data[0];
                if (type === 0) { //It it a pair?
                    result = this.nodes[identifier] = this.getProcessPairStates(data[1], data[2]);
                } else if (type === 1) { // The left action and destination is fixed?
                    result = this.nodes[identifier] = this.getNodeForLeftTransition(data);
                } else if (type === 2) { // The right action and destination is fixed?
                    result = this.nodes[identifier] = this.getNodeForRightTransition(data);
                }
            }
            return copyHyperEdges(result);
        }

        private getNodeForLeftTransition(data) {
            var action = data[1],
                toLeftId = data[2],
                fromRightId = data[3],
                result = [];
            // for (s, fromRightId), s ----action---> toLeftId.
            // fromRightId must be able to match.
            var rightTransitions = this.succGen.getSuccessors(fromRightId);
            rightTransitions.forEach(rightTransition => {
                var key, toRightId;
                //Same action - possible candidate.
                if (rightTransition.action.equals(action)) {
                    toRightId = rightTransition.targetProcess.id;
                    key = toLeftId + "-" + toRightId;
                    //Have we already solved the resulting (s1, t1) pair?
                    if (this.pairToNodeId[key]) {
                        result.push(this.pairToNodeId[key]);
                    } else {
                        //Build the node.
                        var newIndex = this.nextIdx++;
                        this.pairToNodeId[key] = newIndex;
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
            var leftTransitions = this.succGen.getSuccessors(fromLeftId);
            leftTransitions.forEach(leftTransition => {
                var key, toLeftId;
                if (leftTransition.action.equals(action)) {
                    toLeftId = leftTransition.targetProcess.id;
                    key = toLeftId + "-" + toRightId;
                    if (this.pairToNodeId[key]) {
                        result.push(this.pairToNodeId[key]);
                    } else {
                        var newIndex = this.nextIdx++;
                        this.pairToNodeId[key] = newIndex;
                        this.constructData[newIndex] = [0, toLeftId, toRightId];
                        result.push(newIndex);
                    }
                }
            });
            return [result];
        }

        private getProcessPairStates(leftProcessId, rightProcessId) {
            var hyperedges = [];
            var leftTransitions = this.succGen.getSuccessors(leftProcessId);
            var rightTransitions = this.succGen.getSuccessors(rightProcessId);
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

        findDivergentTrace(marking) {
            var that = this;

            function selectEdgeMarkedOne(hyperEdges) {
                for (var i=0; i < hyperEdges.length; i++) {
                    var edge = hyperEdges[i];
                    var allOne = true;
                    for (var j=0; j < edge.length; j++) {
                        if (marking.getMarking(edge[j]) !== marking.ONE) {
                            allOne = false;
                            break;
                        }
                    }
                    if (allOne) {
                        return edge.slice(0);
                    }
                }
                throw "All targets must have been marked ONE for at least one target set";
            }

            function addTracePart(node) {
                var data = that.constructData[node],
                    type = data[0],
                    text;
                if (type === 0) {
                    if (lastMove === "RIGHT") leftTrace.push(lastAction);
                    leftTrace.push(data[1]);
                    if (lastMove === "LEFT") rightTrace.push(lastAction);
                    rightTrace.push(data[2]);
                }
                if (type === 1) {
                    lastMove = "LEFT";
                    lastAction = data[1];
                    leftTrace.push(lastAction);
                }
                if (type === 2) {
                    lastMove = "RIGHT";
                    lastAction = data[1];
                    rightTrace.push(lastAction);
                }
            }

            var leftTrace = [ this.constructData[0][1] ];
            var rightTrace = [ this.constructData[0][2] ];
            var lastMove = "";
            var lastAction;

            var current = 0;
            var nexts = selectEdgeMarkedOne(this.getHyperEdges(current));
            while (nexts.length > 0) {
                current = nexts[0];
                addTracePart(current);
                nexts = selectEdgeMarkedOne(this.getHyperEdges(current));
            }
            return {left: leftTrace, right: rightTrace};
        }                
    }

    export class ModelCheckingDG implements DependencyGraph, hml.FormulaDispatchHandler<any[][]> {

        private succGen;
        private TRUE_ID = 1;
        private FALSE_ID = 2;
        // the 0th index is set in the constructor.
        // nodes[1] is tt, nodes[2] is ff - described by hyper edges.
        private nodes = [ undefined, [ [] ], [ ] ];
        private constructData = {};
        private nextIdx;

        private getForNodeId;

        constructor(succGen : ccs.SuccessorGenerator, nodeId, formula : hml.Formula) {
            this.succGen = succGen;
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
                result = formula.dispathOn(this);
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

        dispatchExistsFormula(formula : hml.ExistsFormula) {
            var hyperedges = [],
                transitionSet = this.succGen.getSuccessors(this.getForNodeId),
                transitions = transitionSet.transitionsForAction(formula.action);
            transitions.forEach(transition => {
                var newIdx = this.nextIdx++;
                this.constructData[newIdx] = [transition.targetProcess.id, formula.subFormula];
                hyperedges.push([newIdx]);
            });
            return hyperedges;
        }

        dispatchForAllFormula(formula : hml.ForAllFormula) {
            var hyperedges = [],
                transitionSet = this.succGen.getSuccessors(this.getForNodeId),
                transitions = transitionSet.transitionsForAction(formula.action);
            transitions.forEach(transition => {
                var newIdx = this.nextIdx++;
                this.constructData[newIdx] = [transition.targetProcess.id, formula.subFormula];
                hyperedges.push(newIdx);
            });
            return [hyperedges];
        }
    }

    export interface DependencyGraph {
        getHyperEdges(identifier) : any[][];
    }

    export function liuSmolkaLocal2(m, graph) : any {
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
                    while (A.get(headL) === S_ONE && l.length > 0) {
                        l.pop();
                        headL = l[l.length-1];
                    }
                }
                if (l.length === 0) {
                    A.set(k, S_ONE);
                    W = D.get(k).concat(W);
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

    export function isBisimilar(ltsSuccGen : ccs.SuccessorGenerator, leftProcessId, rightProcessId, graph?) {
        var dg = new BisimulationDG(ltsSuccGen, leftProcessId, rightProcessId),
            marking = liuSmolkaLocal2(0, dg);
        //Bisimulation is maximal fixed point, the marking is reversed.
        if (marking.getMarking(0) === marking.ONE && graph) {
            var traces = dg.findDivergentTrace(marking)
            console.log("Left does: ");
            console.log(prettyPrintTrace(graph, traces.left));
            console.log("Right does: ");
            console.log(prettyPrintTrace(graph, traces.right));
        }
        return marking.getMarking(0) === marking.ZERO;
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

    export function checkFormula(formula, succGen, processId) {
        var dg = new ModelCheckingDG(succGen, processId, formula),
            marking = liuSmolkaLocal2(0, dg);
        return marking.getMarking(0) === marking.ONE;
    }
}
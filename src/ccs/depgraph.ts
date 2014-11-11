/// <reference path="ccs.ts" />
/// <reference path="hml.ts" />

module DependencyGraph {

    import ccs = CCS;
    import hml = HML;

    export class BisimulationDG implements DependencyGraph {

        private succGen;
        private nextIdx;
        private nodes = [];
        private constructData = [];
        private pairToNodeId = {};

        constructor(succGen : ccs.SuccessorGenerator, leftNode, rightNode) {
            this.succGen = succGen;
            this.constructData[0] = [0, leftNode, rightNode];
            this.nextIdx = 1;
        }

        getHyperEdges(identifier) {
            var type, data, result;
            //Have we already built this? Then return copy of the edges.
            if (this.nodes[identifier]) return this.nodes[identifier].slice(0);
            data = this.constructData[identifier];
            type = data[0];
            if (type === 0) { //It it a pair?
                result = this.nodes[identifier] = this.getProcessPairStates(data[1], data[2]);
            } else if (type === 1) { // The left action and destination is fixed?
                result = this.nodes[identifier] = this.getNodeForLeftTransition(data);
            } else if (type === 2) { // The right action and destination is fixed?
                result = this.nodes[identifier] = this.getNodeForRightTransition(data);
            }
            return result.slice(0);
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
                        result.push([this.pairToNodeId[key]]);
                    } else {
                        //Build the node.
                        var newIndex = this.nextIdx++;
                        this.pairToNodeId[key] = newIndex;
                        this.constructData[newIndex] = [0, toLeftId, toRightId];
                        result.push([newIndex]);
                    }
                }
            });
            return result;
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
                        result.push([this.pairToNodeId[key]]);
                    } else {
                        var newIndex = this.nextIdx++;
                        this.pairToNodeId[key] = newIndex;
                        this.constructData[newIndex] = [0, toLeftId, toRightId];
                        result.push([newIndex]);
                    }
                }
            });
            return result;
        }

        private getProcessPairStates(leftProcessId, rightProcessId) {
            var hyperedge = [];
            var leftTransitions = this.succGen.getSuccessors(leftProcessId);
            var rightTransitions = this.succGen.getSuccessors(rightProcessId);
            leftTransitions.forEach(leftTransition => {
                var newNodeIdx = this.nextIdx++;
                this.constructData[newNodeIdx] = [1, leftTransition.action, leftTransition.targetProcess.id, rightProcessId];
                hyperedge.push(newNodeIdx);
            });
            rightTransitions.forEach(rightTransition => {
                var newNodeIdx = this.nextIdx++;
                this.constructData[newNodeIdx] = [2, rightTransition.action, rightTransition.targetProcess.id, leftProcessId];
                hyperedge.push(newNodeIdx);
            });
            return [hyperedge];
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
            var data, nodeId, formula;
            if (this.nodes[identifier]) return this.nodes[identifier].slice(0);
            data = this.constructData[identifier];
            nodeId = data[0];
            formula = data[1];
            this.getForNodeId = nodeId;
            var edges = formula.dispathOn(this);
            this.nodes[identifier] = edges;
            return edges.slice(0);
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

    export function liuSmolkaLocal2(m, graph) : boolean {
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
        return A.get(m) === S_ONE;
    }
}

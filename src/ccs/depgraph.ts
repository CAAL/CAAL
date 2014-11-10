/// <reference path="ccs.ts" />

module DependencyGraph {

    import ccs = CCS;

    export function buildDummyLts() {
        // a.(b.0 + c.0)
        var edges = {};
        edges["aroot"] = [
            ["a", "asplit"]
        ];
        edges["asplit"] = [
            ["b", "null"],
            ["c", "null"]
        ];
        edges["null"] = [];

        // a.b.0 + a.c.0
        edges["bsplit"] = [
            ["a", "bleft"],
            ["a", "bright"]
        ];
        edges["bleft"] = [
            ["b", "null"]
        ];
        edges["bright"] = [
            ["c", "null"]
        ];
        return makeDummyLtsOfEdges(edges);
    }

    function makeDummyLtsOfEdges(edges) {
        var o : any = {};
        o.getSuccessors = function (id) {
            var tSet = new ccs.TransitionSet();
            edges[id].forEach(pairs => {
                var action = new ccs.Action(pairs[0], false),
                    targetProcess = {id: pairs[1], dispatchOn: (x) => {}},
                    newTransition = new ccs.Transition(action, targetProcess);
                tSet.add(newTransition);
            });
            return tSet;
        };
        return o;
    }

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


    export interface DependencyGraph {
        getHyperEdges(identifier) : any[][];
    }



    function testDG() {
        var o : any = {};
        var edges = [];

        /*
            t = a.(b.0 + c.0)
            s = a.b.0 + a.c.0

            t2 = b.0 + c.0
            t3 = t4 = 0

            s2 = b.0
            s4 = 0
            s3 = c.0
            s5 = 0
        */

        edges[0] = [ [1, 2, 3] ];  // s, t
        edges[1] = [ [4] ];  // s -- a --> s2, t 
                        // s can take 'a' to s2, then t process must match.
        edges[2] = [ [5] ]; // s -- a --> s3, t
        edges[3] = [ [4], [5] ]; // s, t --a -- > 2
        edges[4] = [ [7, 8, 9] ];  // s2, t2
        edges[5] = [ [6, 11, 12] ];  // s3, t2
        edges[6] = [ [13] ]; // s3, t2 -- c --> t4
        edges[7] = [ ]; // s2, t2 -- c --> t4
        edges[8] = [ [10] ]; // s2 -- b --> s4, t2
        edges[9] = [ [10] ]; // s2, t2 -- b --> t3
        edges[10] = [ [] ]; // s4, t3
        edges[11] = [ [13] ]; // s3 -- c --> s5, t2
        edges[12] = [ ]; // s3, t2 -- b --> t3
        edges[13] = [ [] ];  // s5, t4

        o.getHyperEdges = function (k) {
            return edges[k];
        }
        return o;
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

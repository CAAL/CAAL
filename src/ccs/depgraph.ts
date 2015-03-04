/// <reference path="../../lib/util.d.ts" />
/// <reference path="ccs.ts" />
/// <reference path="hml.ts" />
/// <reference path="util.ts" />
/// <reference path="collapse.ts" />

module DependencyGraph {

    import ccs = CCS;
    import hml = HML;

    export type Hyperedge = Array<number>;
    export type DgNodeId = number;

    export function copyHyperEdges(hyperEdges : Hyperedge[]) : Hyperedge[] {
        var result = [];
        for (var i=0; i < hyperEdges.length; i++) {
            result.push(hyperEdges[i].slice(0));
        }
        return result;
    }

    export interface PartialDependencyGraph {
        getHyperEdges(identifier : DgNodeId) : Hyperedge[];
    }

    export interface DependencyGraph extends PartialDependencyGraph {
        getHyperEdges(identifier : DgNodeId) : Hyperedge[];
        getAllHyperEdges() : [number, Hyperedge][];
    }1

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

        getHyperEdges(identifier : DgNodeId) : Hyperedge[] {
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
            var hyperEdges = [];
            formula.subFormulas.forEach(subFormula => {
                var newIndex = this.nextIdx++;
                this.constructData[newIndex] = [this.getForNodeId, subFormula];
                hyperEdges.push([newIndex]);
            });
            return hyperEdges;
        }

        dispatchConjFormula(formula : hml.ConjFormula) {
            var targetNodes = [];
            formula.subFormulas.forEach(subFormula => {
                var newIndex = this.nextIdx++;
                this.constructData[newIndex] = [this.getForNodeId, subFormula];
                targetNodes.push(newIndex);
            });
            //Return single hyperedge
            return [targetNodes];
        }

        dispatchTrueFormula(formula : hml.TrueFormula) {
            return this.nodes[this.TRUE_ID];
        }

        dispatchFalseFormula(formula : hml.FalseFormula) {
            return this.nodes[this.FALSE_ID];
        }

        private existsFormula(formula, succGen : ccs.SuccessorGenerator) {
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

        private forallFormula(formula, succGen : ccs.SuccessorGenerator) {
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

        getHyperEdges(identifier : DgNodeId) : Hyperedge[] {
            var data, nodeId, formula, result;
            if (this.nodes[identifier]) {
                result = this.nodes[identifier];
            } else {
                data = this.constructData[identifier];
                nodeId = data[0];
                formula = data[1];
                //Prevents having to pass around the node identifier.
                this.getForNodeId = nodeId;
                result = formula.dispatchOn(this);
                this.nodes[identifier] = result;
            }
            return copyHyperEdges(result);
        }

        /* Remember Max fixed point - dependency graph should be "inverted" */
        dispatchDisjFormula(formula : hml.DisjFormula) {
            var targetNodes = [];
            formula.subFormulas.forEach(subFormula => {
                var newIndex = this.nextIdx++;
                this.constructData[newIndex] = [this.getForNodeId, subFormula];
                targetNodes.push(newIndex);
            });
            //Return single hyperedge
            return [targetNodes];
        }

        dispatchConjFormula(formula : hml.ConjFormula) {
            var hyperEdges = [];
            formula.subFormulas.forEach(subFormula => {
                var newIndex = this.nextIdx++;
                this.constructData[newIndex] = [this.getForNodeId, subFormula];
                hyperEdges.push([newIndex]);
            });
            return hyperEdges;
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
    
    export interface Marking {
        getMarking(any) : number;
        ZERO : number;
        ONE : number;
    }
    
    export interface LevelMarking extends Marking {
        getLevel(any) : number;
    }

    export function liuSmolkaLocal2(m : DgNodeId, graph : PartialDependencyGraph) : any {
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
            getMarking: function(dgNodeId : DgNodeId) {
                return A.get(dgNodeId);
            },
            ZERO: S_ZERO,
            ONE: S_ONE,
            UNKNOWN: S_BOTTOM
        }
    }

    export function liuSmolkaGlobal(graph : DependencyGraph) : any {
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
            getMarking: function(dgNodeId : DgNodeId) {
                return A.get(dgNodeId);
            },
            ZERO: S_ZERO,
            ONE: S_ONE
        }
    }

    export function solveDgGlobalLevel(graph : DependencyGraph) : LevelMarking {
        var S_ZERO = 1, S_ONE = 2;
        // A[k]
        var Level = (function () {
            var a = {};
            var o = {
                get: function(k) {
                    return a[k] || Infinity;
                },
                set: function(k, level) {
                    a[k] = level;
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
                get: function(k, level) {
                    var pairs = (d[k] || []).slice();
                    pairs.forEach(pair => pair.push(level));
                    return pairs;
                }
            };
            return o;
        }());

        var W = [];
        //Unpack hyperedges
        graph.getAllHyperEdges().forEach(pair => {
            var sourceNode = pair[0];
            pair[1].forEach(hyperEdge => W.push([sourceNode, hyperEdge, -1]));
        });
        while (W.length > 0) {
            var next = W.pop();
            var k = next[0];
            var l = next[1];
            var candidateLevel = next[2];
            var kLevel = Level.get(k);

            //First run, add deps
            if (candidateLevel === -1) {
                for (var edgeIdx = 0; edgeIdx < l.length; edgeIdx++) {
                    D.add(l[edgeIdx], [k, l]);
                }
                candidateLevel = Infinity;
            }

            if (candidateLevel < kLevel || kLevel === Infinity) {
                //Check if situation improved.
                var highestSubLevel = 0;
                for (var edgeIdx = 0; edgeIdx < l.length; edgeIdx++) {
                    var subLevel = Level.get(l[edgeIdx]);
                    highestSubLevel = Math.max(subLevel, highestSubLevel);
                    //This target node is too high level to improve "parent".
                    if (subLevel >= candidateLevel) break; 
                }
                //Went through all and improved?
                if ((edgeIdx >= l.length) && (highestSubLevel+1) < kLevel) {
                    Level.set(k, highestSubLevel+1);
                    W = W.concat(D.get(k, highestSubLevel+2));
                }
            }
        }
        return {
            getMarking: function(dgNodeId : DgNodeId) {
                return Level.get(dgNodeId) === Infinity ? S_ZERO : S_ONE;
            },
            getLevel: function(dgNodeId : DgNodeId) {
                return Level.get(dgNodeId);
            },
            ZERO: S_ZERO,
            ONE: S_ONE
        }
    }
}

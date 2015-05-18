/// <reference path="../../lib/util.d.ts" />
/// <reference path="ccs.ts" />
/// <reference path="hml.ts" />
/// <reference path="util.ts" />
/// <reference path="collapse.ts" />

module DependencyGraph {

    import ccs = CCS;
    import hml = HML;

    export type DgNodeId = any; //toString()-able
    export type Hyperedge = Array<DgNodeId>;

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
        getAllHyperEdges() : [DgNodeId, Hyperedge][];
    }
    
    export interface PlayableDependencyGraph extends PartialDependencyGraph {
        getAttackerOptions(dgNodeId : DgNodeId) : [CCS.Action, CCS.Process, DgNodeId, number][];
        getDefenderOptions(dgNodeId : DgNodeId) : [CCS.Process, DgNodeId][];
    }

    export class MuCalculusNode {
        constructor(public process : ccs.Process, public formula : hml.Formula, public isMin? : boolean) {
            if (isMin == undefined) {
                this.isMin = true;
            }
        }
        toString() {
            return [this.isMin ? "MIN" : "MAX", this.process.toString(), this.formula.toString()].join("@");
        }
        get id() {
            return this.toString();
        }
        newWithProcess(process : ccs.Process) : MuCalculusNode {
            return new MuCalculusNode(process, this.formula, this.isMin);
        }
        newWithFormula(formula : hml.Formula) : MuCalculusNode {
            return new MuCalculusNode(this.process, formula, this.isMin);
        }

        describeDGNode(dgNodeId : DgNodeId) : {nodeId: DgNodeId; process: ccs.Process; formula: hml.Formula} {
            var data = this.constructData[dgNodeId],
                process = data[0],
                formula = data[1];
            return {
                nodeId: dgNodeId,
                process: process,
                formula: formula
            };
        }
    }
    
    var fuckingCount = 0;
    export class MuCalculusDG implements PartialDependencyGraph, hml.FormulaDispatchHandler<any> {
        private variableEdges = {};
        private maxFixPoints = {};
        private currentNode : MuCalculusNode;

        constructor(private strongSuccGen : ccs.SuccessorGenerator,
                    private weakSuccGen : ccs.SuccessorGenerator,
                    private formulaSet : hml.FormulaSet) {
        }

        getHyperEdges(node : MuCalculusNode) : Hyperedge[] {
            this.currentNode = node;
            if (fuckingCount < 100) {
            console.log("node then formula");
            console.log(node.toString());
                fuckingCount++;
            }
            return node.formula.dispatchOn(this);
        }
        
        dispatchDisjFormula(formula : hml.DisjFormula) {
            var hyperEdges = [];
            if (this.currentNode.isMin) {
                formula.subFormulas.forEach(subFormula => {
                    hyperEdges.push([this.currentNode.newWithFormula(subFormula)]);
                });
            } else {
                var targetNodes = [];
                formula.subFormulas.forEach(subFormula => {
                    targetNodes.push(this.currentNode.newWithFormula(subFormula));
                });
                hyperEdges.push(targetNodes);
            }
            return hyperEdges;
        }

        dispatchConjFormula(formula : hml.ConjFormula) {
            var hyperEdges = [];
            if (this.currentNode.isMin) {
                var targetNodes = [];
                formula.subFormulas.forEach(subFormula => {
                    targetNodes.push(this.currentNode.newWithFormula(subFormula));
                });
                hyperEdges.push(targetNodes);
            } else {
                formula.subFormulas.forEach(subFormula => {
                    hyperEdges.push([this.currentNode.newWithFormula(subFormula)]);
                });
            }
            //Return single hyperedge
            return hyperEdges;
        }

        dispatchTrueFormula(formula : hml.TrueFormula) {
            //Hyperedge with no targets
            if (this.currentNode.isMin) {
                return [[]];
            } else {
                return [];
            }
        }

        dispatchFalseFormula(formula : hml.FalseFormula) {
            //No hyperedges
            if (this.currentNode.isMin) {
                return [];
            } else {
                return [[]];
            }
        }

        private existsFormula(formula, succGen : ccs.SuccessorGenerator) {
            var hyperEdges = [],
                transitionSet = succGen.getSuccessors(this.currentNode.process.id);
            transitionSet.forEach(transition => {
                if (formula.actionMatcher.matches(transition.action)) {
                    hyperEdges.push([new MuCalculusNode(transition.targetProcess, formula.subFormula, this.currentNode.isMin)]);
                }
            });
            return hyperEdges;            
        }

        private forallFormula(formula, succGen : ccs.SuccessorGenerator) {
            var targetNodes = [],
                transitionSet = succGen.getSuccessors(this.currentNode.process.id);
            transitionSet.forEach(transition => {
                if (formula.actionMatcher.matches(transition.action)) {
                    targetNodes.push(new MuCalculusNode(transition.targetProcess, formula.subFormula, this.currentNode.isMin));
                }
            });
            return [targetNodes];
        }

        dispatchStrongExistsFormula(formula : hml.StrongExistsFormula) {
            return this.currentNode.isMin ? this.existsFormula(formula, this.strongSuccGen) : this.forallFormula(formula, this.strongSuccGen);
        }

        dispatchStrongForAllFormula(formula : hml.StrongForAllFormula) {
            return this.currentNode.isMin ? this.forallFormula(formula, this.strongSuccGen) : this.existsFormula(formula, this.strongSuccGen);
        }

        dispatchWeakExistsFormula(formula : hml.WeakExistsFormula) {
            return this.currentNode.isMin ? this.existsFormula(formula, this.weakSuccGen) : this.forallFormula(formula, this.weakSuccGen);
        }

        dispatchWeakForAllFormula(formula : hml.WeakForAllFormula) {
            return this.currentNode.isMin ? this.forallFormula(formula, this.weakSuccGen) : this.existsFormula(formula, this.weakSuccGen);
        }

        dispatchMinFixedPointFormula(formula : hml.MinFixedPointFormula) {
            if (this.currentNode.isMin) {
                return formula.subFormula.dispatchOn(this);
            } else {
                var minNode = new MuCalculusNode(this.currentNode.process, formula.subFormula, true);
                var minDg = new MuCalculusDG(this.strongSuccGen, this.weakSuccGen, this.formulaSet);
                var marking = solveMuCalculusInternal(minDg, minNode);
                return marking.getMarking(minNode) === marking.ZERO ? [[]] : [];
            }
        }
        //X max= <<a>>[[b]]X and Y;
        dispatchMaxFixedPointFormula(formula : hml.MaxFixedPointFormula) {
            if (!this.currentNode.isMin) {
                return formula.subFormula.dispatchOn(this);
            } else {
                var maxNode = new MuCalculusNode(this.currentNode.process, formula.subFormula, false);
                var maxDg = new MuCalculusDG(this.strongSuccGen, this.weakSuccGen, this.formulaSet);
                var marking = solveMuCalculusInternal(maxDg, maxNode);
                return marking.getMarking(maxNode) === marking.ONE ? [] : [[]];
            }
        }

        dispatchVariableFormula(formula : hml.VariableFormula) {
            return [[this.currentNode.newWithFormula(this.formulaSet.formulaByName(formula.variable))]];
        }
    }

    function solveMuCalculusInternal(dg : PartialDependencyGraph, node : MuCalculusNode) : any {
        var marking = liuSmolkaLocal2(node, dg);
        return marking;
    }

    export function solveMuCalculus(formulaSet, formula, strongSuccGen, weakSuccGen, processId) : boolean {
        var process = strongSuccGen.getProcessById(processId),
            node = new MuCalculusNode(process, formula, true), //Use minimal environment for the nil environment
            dg = new MuCalculusDG(strongSuccGen, weakSuccGen, formulaSet),
            marking = solveMuCalculusInternal(dg, node);
        return marking.getMarking(node) === marking.ONE;
    }
    
    export interface Marking {
        getMarking(any) : number;
        ZERO : number;
        ONE : number;
    }
    
    export interface LevelMarking extends Marking {
        getLevel(any) : number;
    }

    export function liuSmolkaLocal2(m : DgNodeId, graph : PartialDependencyGraph) : LevelMarking {
        var S_ZERO = 1, S_ONE = 2, S_BOTTOM = 3;

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
                
                var bestLevel : number = Level.get(k);
                
                if (l.length > 0) {
                    var headL = l[l.length-1];
                    while (l.length > 0 && A.get(headL) === S_ONE) {
                        var v_prime = l.pop();
                        headL = l[l.length-1];
                        
                        var level = Level.get(v_prime) + 1;
                        if (level < bestLevel)
                            bestLevel = level;
                    }
                }
                if (l.length === 0) {
                    A.set(k, S_ONE);
                    W = W.concat(D.get(k));
                    
                    if (bestLevel === Infinity) bestLevel = 1;
                    Level.set(k, bestLevel);
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
            getLevel: function(dgNodeId : DgNodeId) {
                return Level.get(dgNodeId);
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

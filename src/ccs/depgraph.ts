/// <reference path="../../lib/util.d.ts" />
/// <reference path="../../lib/data.d.ts" />
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
        newWithMinMax(value : boolean) : MuCalculusNode {
            return new MuCalculusNode(this.process, this.formula, value);
        }
        newWithFormula(formula : hml.Formula) : MuCalculusNode {
            return new MuCalculusNode(this.process, formula, this.isMin);
        }
    }

    export class MuCalculusDG implements PartialDependencyGraph, hml.FormulaDispatchHandler<any> {
        private variableEdges = {};
        private maxFixPoints = {};
        private currentNode : MuCalculusNode;
        public calculator : any = null;

        constructor(private strongSuccGen : ccs.SuccessorGenerator,
                    private weakSuccGen : ccs.SuccessorGenerator,
                    private formulaSet : hml.FormulaSet) {
        }

        getHyperEdges(node : MuCalculusNode) : Hyperedge[] {
            this.currentNode = node;
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
                var marking = solveMuCalculusIncremental(minDg, minNode, this.calculator);
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
                var marking = solveMuCalculusIncremental(maxDg, maxNode, this.calculator);
                return marking.getMarking(maxNode) === marking.ONE ? [] : [[]];
            }
        }

        dispatchVariableFormula(formula : hml.VariableFormula) {
            return [[this.currentNode.newWithFormula(this.formulaSet.formulaByName(formula.variable))]];
        }
    }

    /*
        Reuses the state inside the calculator (markings and levels) to gather all results.
    */
    function solveMuCalculusIncremental(dg : MuCalculusDG, node : MuCalculusNode, calculator : MinFixedPointCalculator) {
        calculator.solve(node);
        return {
            getMarking: calculator.getMarking.bind(calculator),
            getLevel: calculator.getLevel.bind(calculator),
            ZERO: calculator.ZERO,
            ONE: calculator.ONE,
            UNKNOWN: calculator.BOTTOM
        };
    }

    export function solveMuCalculusForNode(dg : MuCalculusDG, node : MuCalculusNode) : any {
        var calculator = new MinFixedPointCalculator(k => dg.getHyperEdges(k));
        dg.calculator = calculator;
        var marking = solveMuCalculusIncremental(dg, node, calculator);
        dg.calculator = null;
        return marking;
    }

    export function solveMuCalculus(formulaSet, formula, strongSuccGen, weakSuccGen, processId) : boolean {
        var process = strongSuccGen.getProcessById(processId),
            node = new MuCalculusNode(process, formula, true), //Use minimal environment for the nil environment
            dg = new MuCalculusDG(strongSuccGen, weakSuccGen, formulaSet),
            marking = solveMuCalculusForNode(dg, node);
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

    function compareTargetNodes(nodesA, nodesB) : number {
        //Fragile: Assume vertices in hyperedges are string-like.
        //Performance: on different calls may sort same data again.
        var lengthDiff = nodesA.length - nodesB.length;
        if (lengthDiff !== 0) return lengthDiff;
        var copyA = nodesA.slice();
        var copyB = nodesB.slice();
        copyA.sort();
        copyB.sort();
        for (var i=0; i < copyA.length; ++i) {
            var elemA = copyA[i];
            var elemB = copyB[i];
            if (elemA !== elemB) return elemA < elemB ? -1 : 1;
        }
        return 0;
    }
    
    function compareHyperedgesMFPCalculator(edgeA, edgeB) : number {
        if (edgeA[0] !== edgeB[0]) return edgeA[0] < edgeB[0] ? -1 : 1;
        return compareTargetNodes(edgeA[1], edgeB[1]);
    }

    export class MinFixedPointCalculator {
        private Deps = Object.create(null);
        private Level = Object.create(null);
        private nodesToBeSolved = [];
        
        BOTTOM = 1;
        ZERO = 2;
        ONE = 3;

        constructor(private nodeSuccGen) {
        }

        solve(solveNode?) : void {
            if (solveNode != undefined) { //Nodes may be anything, even 0.
                this.nodesToBeSolved.push(solveNode);
            }
            //Must solve backwards
            while (this.nodesToBeSolved.length > 0) {
                this.solveSingle(this.nodesToBeSolved.pop());
            }
        }

        solveSingle(solveNode) : void {
            var Level = this.Level;
            var Deps = this.Deps;
            var succGen = this.nodeSuccGen;
            var W = [];
            var edgeComparer = compareHyperedgesMFPCalculator;

            function load(node) {
                var hyperedges = succGen(node);
                for (var i=0; i < hyperedges.length; ++i) {
                    W.push([node, hyperedges[i]]);
                }
            }

            var solveNodeMarking = this.getMarking(solveNode);
            if (solveNodeMarking === this.BOTTOM) {
                Level[solveNode] = Infinity;
                Deps[solveNode] = new SetUtil.OrderedSet(edgeComparer);
            } else if (solveNodeMarking === this.ONE) {
                return;
            }

            load(solveNode);
            var solveNodeStr = "" + solveNode;

            var BOTTOM = this.BOTTOM, ZERO = this.ZERO, ONE = this.ONE;
            while (W.length > 0) {
                var hEdge = W.pop();
                var source = hEdge[0];
                var tNodes = hEdge[1];
                var numOnes = 0;
                var maxTargetLevel = 0;

                if ((Level[source] || Infinity) < Infinity) continue; //is ONE

                for (var i=0; i < tNodes.length; ++i) {
                    var tNode = tNodes[i];
                    var tNodeMarking = this.getMarking(tNode);
                    if (tNodeMarking === ONE) {
                        ++numOnes;
                        maxTargetLevel = Math.max(maxTargetLevel, Level[tNode]);
                    } else if (tNodeMarking === ZERO) {
                        Deps[tNode].add(hEdge);
                    } else {
                        Level[tNode] = Infinity;
                        Deps[tNode] = new SetUtil.OrderedSet(edgeComparer);
                        Deps[tNode].add(hEdge);
                        load(tNode);
                    }
                }
                //Check if improved levels. Also prevents cycle-induced infinity looping.
                var sourceLevel = Level[source] || Infinity;
                if (numOnes === tNodes.length && sourceLevel > (maxTargetLevel+1)) {
                    Level[source] = maxTargetLevel+1;
                    Deps[source].forEach(edge => W.push(edge));
                    // W = W.concat(Deps[source]);
                    if (("" + source) === solveNodeStr) {
                        return;
                    }
                }
            }
        }

        addNodeToBeSolved(node) {
            this.nodesToBeSolved.push(node);
        }

        getMarking(node) : any {
            var level = this.Level[node];
            if (level == undefined) return this.BOTTOM;
            return level === Infinity ? this.ZERO : this.ONE;
        }

        getLevel(node) : number {
            return this.Level[node] || Infinity;
        }
    }

    /*
        Backwards compatible
    */
    export function liuSmolkaLocal2(m : DgNodeId, graph : PartialDependencyGraph) : LevelMarking {
        var calculator = new MinFixedPointCalculator(k => graph.getHyperEdges(k));
        calculator.solve(m);

        return {
            getMarking: calculator.getMarking.bind(calculator),
            getLevel: calculator.getLevel.bind(calculator),
            ZERO: calculator.ZERO,
            ONE: calculator.ONE,
            UNKNOWN: calculator.BOTTOM
        };
    }

    export function solveDgGlobalLevel(graph : DependencyGraph) : LevelMarking {
        var S_ZERO = 2, S_ONE = 3;
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
                    return (d[k] || []).map(pair => {
                        return [pair[0], pair[1], level];
                    });
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
                    if (subLevel >= kLevel) break; 
                }
                //Went through all and improved?
                if (edgeIdx >= l.length && (highestSubLevel+1) < kLevel) {
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

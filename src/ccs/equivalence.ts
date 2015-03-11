/// <reference path="ccs.ts" />
/// <reference path="hml.ts" />
/// <reference path="depgraph.ts" />

module Equivalence {

    import ccs = CCS;
    import hml = HML;
    import dg = DependencyGraph;

    export class BisimulationDG implements dg.DependencyGraph, dg.PlayableDependencyGraph {

        /** The dependency graph is constructed with disjunction
            as conjunction and vica versa, since bisimulation is
            maximal fixed-point. The result marking should be
            inverted **/

        private nextIdx;
        private nodes = [];
        private constructData = [];
        private leftPairs = {};
        private isFullyConstructed = false;

        constructor(private attackSuccGen : ccs.SuccessorGenerator,
                    private defendSuccGen : ccs.SuccessorGenerator,
                    leftNode, rightNode) {
            this.constructData[0] = [0, leftNode, rightNode];
            this.nextIdx = 1;
        }

        getHyperEdges(identifier : dg.DgNodeId) : dg.Hyperedge[] {
            var type, result;
            //Have we already built this? Then return copy of the edges.
            if (this.nodes[identifier]) {
                result = this.nodes[identifier];
            } else {
                result = this.constructNode(identifier);
            }
            return dg.copyHyperEdges(result);
        }

        private constructNode(identifier : dg.DgNodeId) {
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

        getAllHyperEdges() : [dg.DgNodeId, dg.Hyperedge][] {
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
                result[i] = [i, dg.copyHyperEdges(this.nodes[i])];
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

        private getProcessPairStates(leftProcessId : ccs.ProcessId, rightProcessId : ccs.ProcessId) : dg.Hyperedge[] {
            var hyperedges : dg.Hyperedge[] = [];
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

        public getAttackerOptions(dgNodeId : dg.DgNodeId) : dg.Hyperedge[] {
            if (this.constructData[dgNodeId][0] !== 0)
                throw "Bad node for attacker options";
            
            var hyperedges = this.getHyperEdges(dgNodeId);
            
            var result = [];
            
            hyperedges.forEach(hyperedge => {
                var targetNode = hyperedge[0];
                var data = this.constructData[targetNode];
                var action = data[1].toString();
                var targetProcess = this.attackSuccGen.getProcessById(data[2]);
                var move = data[0];
                
                result.push({
                    action: action,
                    targetProcess: targetProcess,
                    nextNode: targetNode,
                    move: move
                });
            });
            
            return result;
        }
        
        public getDefenderOptions(dgNodeId : dg.DgNodeId) {
            if (this.constructData[dgNodeId][0] === 0)
                throw "Bad node for defender options";
            
            var hyperedge = this.getHyperEdges(dgNodeId)[0];
            
            var result = [];
            
            var tcpi = this.constructData[dgNodeId][0] === 1 ? 2 : 1;
            
            hyperedge.forEach(targetNode => {
                var data = this.constructData[targetNode];
                var targetProcess = this.defendSuccGen.getProcessById(data[tcpi]);
                
                result.push({
                    targetProcess: targetProcess,
                    nextNode: targetNode
                });
            });
            
            return result;
        }
        
        getBisimulationCollapse(marking : dg.LevelMarking) : Traverse.Collapse {

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

        findDistinguishingFormula(marking : dg.LevelMarking, defendSuccGenType : string) : hml.Formula {
            var that = this,
                formulaSet = new hml.FormulaSet(),
                trace;
            if (marking.getMarking(0) !== marking.ONE) throw "Error: Processes are bisimilar";

            function selectMinimaxLevel(node : dg.DgNodeId) {
                var hyperEdges = that.getHyperEdges(node),
                    bestHyperEdge : dg.Hyperedge,
                    bestNode : dg.DgNodeId;

                //Why JavaScript... why????
                function wrapMax(a, b) {
                    return Math.max(a, b);
                }

                if (hyperEdges.length === 0) return null;
                var bestHyperEdge = ArrayUtil.selectBest(hyperEdges, (tNodesLeft, tNodesRight) => {
                    var maxLevelLeft = tNodesLeft.map(marking.getLevel).reduce(wrapMax, 1),
                        maxLevelRight = tNodesRight.map(marking.getLevel).reduce(wrapMax, 1);
                    if (maxLevelLeft < maxLevelRight) return true;
                    if (maxLevelLeft > maxLevelRight) return false;
                    return tNodesLeft.length < tNodesRight.length;
                });

                if (bestHyperEdge.length === 0) return null;

                bestNode = ArrayUtil.selectBest(bestHyperEdge, (nodeLeft, nodeRight) => {
                    return marking.getLevel(nodeLeft) < marking.getLevel(nodeRight);
                });

                return bestNode;
            }

            //We use the internal implementation details
            //Hyperedges of type 0, have hyperedges of: [ [X], [Y], [Z] ]
            //Hyperedges of type 1/2, have the form: [ [P, Q, R, S, T] ]

            var selectSuccessor = selectMinimaxLevel;
            var existConstructor = (matcher, sub) => formulaSet.newStrongExists(matcher, sub);
            var forallConstructor = (matcher, sub) => formulaSet.newStrongForAll(matcher, sub);
            if (defendSuccGenType === "weak") {
                existConstructor = (matcher, sub) => formulaSet.newWeakExists(matcher, sub);
                forallConstructor = (matcher, sub) => formulaSet.newWeakForAll(matcher, sub);
            }

            function formulaForBranch(node : dg.DgNodeId) : hml.Formula {
                var cData = that.constructData[node];
                if (cData[0] === 0) {
                    var selectedNode = selectSuccessor(node);
                    return formulaForBranch(selectedNode);
                } else if (cData[0] === 1) {
                    var targetPairNodes = that.getHyperEdges(node)[0];
                    var actionMatcher = new hml.SingleActionMatcher(cData[1]);
                    if (targetPairNodes.length > 0) {
                        var subFormulas = targetPairNodes.map(formulaForBranch);
                        return existConstructor(actionMatcher, formulaSet.newConj(subFormulas));
                    } else {
                        return existConstructor(actionMatcher, formulaSet.newTrue());
                    }
                } else {
                    var targetPairNodes = that.getHyperEdges(node)[0];
                    var actionMatcher = new hml.SingleActionMatcher(cData[1]);
                    if (targetPairNodes.length > 0) {
                        var subFormulas = targetPairNodes.map(formulaForBranch);
                        return forallConstructor(actionMatcher, formulaSet.newDisj(subFormulas));
                    } else {
                        return forallConstructor(actionMatcher, formulaSet.newFalse());
                    }
                }
            }
            return formulaForBranch(0);
        }
    }

    export function isBisimilar(attackSuccGen : ccs.SuccessorGenerator, defendSuccGen : ccs.SuccessorGenerator, leftProcessId, rightProcessId, graph?) {
        var bisimDG = new Equivalence.BisimulationDG(attackSuccGen, defendSuccGen, leftProcessId, rightProcessId),
        marking = dg.liuSmolkaLocal2(0, bisimDG);

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
            var bisimDG = new Equivalence.BisimulationDG(attackSuccGen, defendSuccGen, leftProcessId, rightProcessId),
            marking = dg.liuSmolkaGlobal(bisimDG);
            return bisimDG.getBisimulationCollapse(marking);
    }

    export class TraceDG implements dg.DependencyGraph {

        private nextIdx : dg.DgNodeId;
        private constructData = [];
        private nodes = [];
        private leftPairs = {};
        private isFullyConstructed = false;
        
        constructor(leftNode : number, rightNode : number, private attackSuccGen : ccs.SuccessorGenerator) {
            this.constructData[0] = [0, null, leftNode, [rightNode]];
            this.nextIdx = 1;
        }

        public getHyperEdges(identifier : dg.DgNodeId) : dg.Hyperedge[] {
            var type, result;
            //Have we already built this? Then return copy of the edges.
            if (this.nodes[identifier]) {
                result = this.nodes[identifier];
            } else {
                result = this.constructNode(identifier);
            }

            return dg.copyHyperEdges(result);
        }
        
        getAllHyperEdges() : [dg.DgNodeId, dg.Hyperedge][] {
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
                result[i] = [i, dg.copyHyperEdges(this.nodes[i])];
            }

            return result;
        }
        
        private constructNode(identifier : dg.DgNodeId) {
            var data = this.constructData[identifier];
            return this.nodes[identifier] = this.getProcessPairStates(data[2], data[3]);
        }

        private getProcessPairStates(leftProcessId : ccs.ProcessId, rightProcessIds : ccs.ProcessId[]) : dg.Hyperedge[] {
            var hyperedges = [];

            var leftTransitions = this.attackSuccGen.getSuccessors(leftProcessId);
            var rightTransitions = [];

            rightProcessIds.forEach(rightProcessId => {
                var succs = this.attackSuccGen.getSuccessors(rightProcessId);
                succs.forEach(succ => {rightTransitions.push(succ) });
            });
            
            leftTransitions.forEach(leftTransition => {
                var rightTargets = [];
                
                rightTransitions.forEach(rightTransition => {
                    if (rightTransition.action.equals(leftTransition.action)) {
                        rightTargets.push(parseInt(rightTransition.targetProcess.id));
                    }
                });

                if(rightTransitions.length === 0) {
                    hyperedges.push([]);
                } else {
                    rightTargets.sort( function(a, b){return a-b} );
                    rightTargets = ArrayUtil.removeConsecutiveDuplicates(rightTargets);

                    if(this.leftPairs[leftTransition.targetProcess.id] === undefined)
                        this.leftPairs[leftTransition.targetProcess.id] = [];

                    if(this.leftPairs[leftTransition.targetProcess.id][rightTargets.length] === undefined)
                        this.leftPairs[leftTransition.targetProcess.id][rightTargets.length] = [];
                    
                    var rightSets = this.leftPairs[leftTransition.targetProcess.id][rightTargets.length];
                    var existing = false;

                    for(var n = 0; n < rightSets.length; n++) {
                        if(rightTargets.every((v,i)=> v === rightSets[n].set[i])) {
                            hyperedges.push([rightSets[n].index]);
                            existing = true;
                            break;
                        }
                    }

                    if (!existing) {
                        var newNodeIdx = this.nextIdx++;
                        var rightSet = {set: rightTargets, index: newNodeIdx};
                        
                        this.leftPairs[leftTransition.targetProcess.id][rightTargets.length].push(rightSet);

                        this.constructData[newNodeIdx] = [0, leftTransition.action, leftTransition.targetProcess.id, rightTargets];
                        
                        hyperedges.push([newNodeIdx]);
                    }
                }
            });
            
            return hyperedges;
        }
        
        public getDistinguishingFormula(marking : dg.LevelMarking) : string {
            if (marking.getMarking(0) === marking.ZERO)
                return "";
            
            var hyperedges = this.getHyperEdges(0);
            var formulaStr = "";
            var emptySetReached = false;
            var isWeak = this.attackSuccGen instanceof Traverse.WeakSuccessorGenerator;
            
            while (!emptySetReached) {
                
                var bestTarget : dg.DgNodeId;
                var lowestLevel = Infinity;
                
                hyperedges.forEach( (hyperedge) => {
                    var level;
                    var edge = hyperedge[0];
                    
                    if (marking.getMarking(edge) === marking.ONE) {
                        level = marking.getLevel(edge);
                        if (level <= lowestLevel) {
                            lowestLevel = level;
                            bestTarget = edge;
                        }
                    }
                });
                
                formulaStr += (isWeak ? "<<" : "<") + this.constructData[bestTarget][1].toString() + (isWeak ? ">>" : ">");

                hyperedges = this.getHyperEdges(bestTarget);

                for(var i = 0; i < hyperedges.length; i++) {
                    if (hyperedges[i].length === 0) {
                        emptySetReached = true;
                        break;
                    }
                }
            }
            
            formulaStr += "tt;";
            return formulaStr;
        }
    }

    export function isTraceIncluded(attackSuccGen : ccs.SuccessorGenerator, defendSuccGen : ccs.SuccessorGenerator, leftProcessId, rightProcessId, graph?) : boolean {
        var traceDG = new TraceDG(leftProcessId, rightProcessId, attackSuccGen);
        // var marking = dg.liuSmolkaLocal2(0, traceDG);
        var marking = dg.solveDgGlobalLevel(traceDG); //TODO use local with level
        traceDG.getDistinguishingFormula(marking);
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

}

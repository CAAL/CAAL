/// <reference path="../../lib/data.d.ts" />
/// <reference path="../../lib/util.d.ts" />
/// <reference path="ccs.ts" />

module Traverse {

    import ccs = CCS;

    export class ProcessTreeReducer implements ccs.ProcessVisitor<ccs.Process>, ccs.ProcessDispatchHandler<ccs.Process> {
        protected cache : {[id : number] : ccs.Process} = Object.create(null);

        constructor(public graph : ccs.Graph) {
        }

        visit(process : ccs.Process) : ccs.Process {
            return process.dispatchOn(this);
        }

        dispatchNullProcess(process : ccs.NullProcess) {
            var resultProcess = this.cache[process.id];
            if (!resultProcess) {
                resultProcess = this.cache[process.id] = process;
            }
            return resultProcess;
        }

        dispatchNamedProcess(process : ccs.NamedProcess) {
            return process;
        }

        dispatchSummationProcess(process : ccs.SummationProcess) {
            var resultProcess = this.cache[process.id];
            if (!resultProcess) {
                var subProcesses = process.subProcesses.map(subProc => subProc.dispatchOn(this));
                subProcesses = subProcesses.filter(subProc => !(subProc instanceof ccs.NullProcess));
                subProcesses = ArrayUtil.sortAndRemoveDuplicates(subProcesses, p => p.id);
                if (subProcesses.length === 0) {
                    return this.graph.getNullProcess();
                }
                resultProcess = this.cache[process.id] = this.graph.newSummationProcess(subProcesses);
            }
            return resultProcess;
        }

        dispatchCompositionProcess(process : ccs.CompositionProcess) {
            var resultProcess = this.cache[process.id];
            if (!resultProcess) {
                var subProcesses = process.subProcesses.map(subProc => subProc.dispatchOn(this));
                subProcesses = subProcesses.filter(subProc => !(subProc instanceof ccs.NullProcess));
                if (subProcesses.length === 0) {
                    return this.graph.getNullProcess();
                }
                resultProcess = this.cache[process.id] = this.graph.newCompositionProcess(subProcesses);
            }
            return resultProcess;
        }

        dispatchActionPrefixProcess(process : ccs.ActionPrefixProcess) {
            var resultProcess = this.cache[process.id];
            if (!resultProcess) {
                var nextProcess = process.nextProcess.dispatchOn(this);
                resultProcess = this.cache[process.id] = this.graph.newActionPrefixProcess(process.action, nextProcess);
            }
            return resultProcess;
        }

        dispatchRestrictionProcess(process : ccs.RestrictionProcess) {
            var resultProcess = this.cache[process.id];
            if (!resultProcess) {
                var subProcess = process.subProcess.dispatchOn(this);
                var tempProcess;
                // (P \ L1) \L2 => P \ (L1 Union L2)
                if (subProcess instanceof ccs.RestrictionProcess) {
                    var subRestriction = <ccs.RestrictionProcess>subProcess;
                    var mergedLabels = subRestriction.restrictedLabels.union(process.restrictedLabels);
                    tempProcess = this.graph.newRestrictedProcess(subRestriction.subProcess, mergedLabels);
                } else {
                    tempProcess = this.graph.newRestrictedProcess(subProcess, process.restrictedLabels);
                }
                // 0 \ L => 0
                if (tempProcess.subProcess instanceof ccs.NullProcess) {
                    return tempProcess.subProcess;
                }
                // P \ Ø => P
                if (tempProcess.restrictedLabels.empty()) {
                    return tempProcess.subProcess;
                }
                resultProcess = this.cache[process.id] = tempProcess;
            }
            return resultProcess;
        }

        dispatchRelabellingProcess(process : ccs.RelabellingProcess) {
            var resultProcess = this.cache[process.id];
            if (!resultProcess) {
                var subProcess = process.subProcess.dispatchOn(this);
                if (subProcess instanceof ccs.NullProcess) return subProcess; // 0 [f] => 0
                resultProcess = this.cache[process.id] = this.graph.newRelabelingProcess(subProcess, process.relabellings);
            }
            return resultProcess;
        }
    }

    class FullTransition {
        constructor(public fromId : ccs.ProcessId, public action : ccs.Action, public toId : ccs.ProcessId) {
        }
    }

    class FromData {
        constructor(public prev : FromData, public action : ccs.Action, public toId : ccs.ProcessId) {
        }
    }

    function compareAction(left : ccs.Action, right : ccs.Action) : number {
        if (left.isComplement() !== right.isComplement()) return <any>left.isComplement() - <any>right.isComplement();
        if (left.getLabel() < right.getLabel()) return -1;
        if (right.getLabel() < left.getLabel()) return 1;
        return 0;
    }

    function compareTransitionTuple(left : FullTransition, right : FullTransition) : number {
        var fromIdDiff = left.fromId.localeCompare(right.fromId);
        if (fromIdDiff !== 0) return fromIdDiff;
        var toIdDiff = left.toId.localeCompare(right.toId);
        if (toIdDiff !== 0) return toIdDiff;
        return compareAction(left.action, right.action);
    }

    export class AbstractingSuccessorGenerator implements ccs.SuccessorGenerator {
        
        private abstractions : ccs.Action[];
        private addLoop : boolean;
        public strictSuccGenerator : ccs.SuccessorGenerator;
        public cache;
        
        private fromTable : MapUtil.Map<FullTransition, FromData> =
                new MapUtil.OrderedMap<FullTransition, FromData>(compareTransitionTuple);

        constructor(abstractions : ccs.Action[], addLoop : boolean, strictSuccGenerator : ccs.SuccessorGenerator, cache?) {
            this.abstractions = abstractions;
            this.addLoop = addLoop;
            this.strictSuccGenerator = strictSuccGenerator;
            this.cache = cache || {};
        }

        getGraph() {
            return this.strictSuccGenerator.getGraph();
        }

        getProcessByName(processName : string) : ccs.Process {
            return this.strictSuccGenerator.getProcessByName(processName);
        }

        getProcessById(processId : ccs.ProcessId) : ccs.Process { 
            return this.strictSuccGenerator.getProcessById(processId);
        }

        getSuccessors(processId : ccs.ProcessId) : ccs.TransitionSet {
            if (this.cache[processId]) return this.cache[processId];

            //Manuall add tau loop to from set:  P ==tau=> P, by P -- tau -> P
            this.abstractions.forEach(abstraction => {
                var sourceFullTransition = new FullTransition(processId, abstraction, processId);
                if (!this.fromTable.has(sourceFullTransition)) {
                    var sourceFromData = new FromData(null, abstraction, processId);
                    this.fromTable.set(sourceFullTransition, sourceFromData);
                }
            });

            var result = new ccs.TransitionSet(),
                process = this.strictSuccGenerator.getProcessById(processId),
                toVisitProcesses = [process],
                visitedStage1 = {},
                toVisitStage2Processes = [],
                toVisitStage2Actions = [],
                visitedStage2 = {},
                visitingProcess,
                visitingAction,
                strongSuccessors;
            
            if (this.addLoop) {
                this.abstractions.forEach(abstraction => {
                    //Add  P --tau--> P
                    result.add(new ccs.Transition(abstraction, process));
                });
            }
            
            //Stage 1
            //Find all --tau-->* and
            //     all --tau-->*  --x-->
            while (toVisitProcesses.length > 0) {
                visitingProcess = toVisitProcesses.pop();
                if (!visitedStage1[visitingProcess.id]) {
                    visitedStage1[visitingProcess.id] = true;
                    var prevFromDatas = [];
                    this.abstractions.forEach(abstraction => {
                        prevFromDatas.push(this.fromTable.get(new FullTransition(processId, abstraction, visitingProcess.id)));
                    });
                    strongSuccessors = this.strictSuccGenerator.getSuccessors(visitingProcess.id);
                    strongSuccessors.forEach(transition => {

                        //Remember how we got to P => Q to be able to get strict path P -> P1 -> P2 -> Q later.
                        var fullTransition = new FullTransition(processId, transition.action, transition.targetProcess.id);
                        if (!this.fromTable.has(fullTransition)) {
                            prevFromDatas.forEach(prevFromData => {
                                var fromData = new FromData(prevFromData, transition.action, transition.targetProcess.id);
                                this.fromTable.set(fullTransition, fromData);
                            });
                        }
                        
                        if (this.abstractions.some(abstraction => transition.action.getLabel() === abstraction.getLabel())) {
                            this.abstractions.forEach(abstraction => {
                                result.add(new CCS.Transition(abstraction.clone(), transition.targetProcess));  // --tau--> x
                            });
                            toVisitProcesses.push(transition.targetProcess);
                        } else {
                            toVisitStage2Processes.push(transition.targetProcess);
                            toVisitStage2Actions.push(transition.action);
                            visitedStage2[transition.action] = {};
                            result.add(transition); // --a--> x
                        }
                    });
                }
            }

            //Stage 2
            //Find all continuing  P --tau-->* when already --tau->* --x--> P
            while (toVisitStage2Processes.length > 0) {
                visitingProcess = toVisitStage2Processes.pop();
                visitingAction = toVisitStage2Actions.pop();
                var prevFromData = this.fromTable.get(new FullTransition(processId, visitingAction, visitingProcess.id));
                if (!visitedStage2[visitingAction][visitingProcess.id]) {
                    visitedStage2[visitingAction][visitingProcess.id] = true;
                    strongSuccessors = this.strictSuccGenerator.getSuccessors(visitingProcess.id);
                    strongSuccessors.forEach(transition => {
                        if (this.abstractions.some(abstraction => transition.action.getLabel() === abstraction.getLabel())) {

                            var fullTransition = new FullTransition(processId, visitingAction, transition.targetProcess.id);
                            if (!this.fromTable.has(fullTransition)) {
                                var fromData = new FromData(prevFromData, visitingAction, transition.targetProcess.id);
                                this.fromTable.set(fullTransition, fromData);
                            }

                            toVisitStage2Processes.push(transition.targetProcess);
                            toVisitStage2Actions.push(visitingAction);
                            var newTransition = new ccs.Transition(visitingAction, transition.targetProcess) 
                            result.add(newTransition);
                        }
                    });
                }
            }


            this.cache[processId] = result;
            return result;
        }

        //Only call with arguments, for which getSuccessors(fromId) has yielded Transition(action, proces.toId)
        getStrictPath(fromId : ccs.ProcessId, action : ccs.Action, toId : ccs.ProcessId) : ccs.Transition[] {
            var path = [],
                succGen = this.strictSuccGenerator;

            var fromData = this.fromTable.get(new FullTransition(fromId, action, toId));
            if (!fromData) throw "Do not call getStrictPath with unknown data.";
            do {
                path.push(new ccs.Transition(fromData.action, succGen.getProcessById(fromData.toId)));
                fromData = fromData.prev;
            } while (fromData && fromData.toId !== fromId);

            path.reverse();
            //Fix so only one non-tau
            var hasNonTau = false;
            var result = path.map(transition => {
                var resultTransition = transition;
                if (hasNonTau) {
                    resultTransition = new ccs.Transition(this.abstractions[0], transition.targetProcess);
                } else if (this.abstractions.every(abstraction => !abstraction.equals(transition.action))) { 
                    hasNonTau = true;
                }
                return resultTransition;
            });

            return result;
        }
    }
    
    export class WeakSuccessorGenerator extends AbstractingSuccessorGenerator {
        constructor(strictSuccGenerator : ccs.SuccessorGenerator, cache?) {
            super([new ccs.Action("tau", false)], true, strictSuccGenerator, cache);
        }
    }

    export class ReducingSuccessorGenerator implements ccs.SuccessorGenerator {

        constructor(public succGenerator : ccs.SuccessorGenerator, public reducer : ProcessTreeReducer) { }

        getGraph() {
            return this.succGenerator.getGraph();
        }

        getProcessByName(processName : string) : ccs.Process {
            var namedProcess = this.succGenerator.getProcessByName(processName);
            return this.reducer.visit(namedProcess);
        }

        getProcessById(processId : ccs.ProcessId) : ccs.Process {
            var proc = this.succGenerator.getProcessById(processId);
            return this.reducer.visit(proc);
        }

        getSuccessors(processId : ccs.ProcessId) : ccs.TransitionSet {
            var transitionSet = this.succGenerator.getSuccessors(processId);
            return this.reduceSuccessors(transitionSet);
        }

        private reduceSuccessors(transitionSet : ccs.TransitionSet) {
            transitionSet.forEach(transition => {
                transition.targetProcess = this.reducer.visit(transition.targetProcess);
            });
            return transitionSet;
        }
    }
}
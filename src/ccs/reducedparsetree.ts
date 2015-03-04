/// <reference path="../../lib/util.d.ts" />
/// <reference path="ccs.ts" />

module Traverse {

    import ccs = CCS;

    export class ProcessTreeReducer implements ccs.ProcessVisitor<ccs.Process>, ccs.ProcessDispatchHandler<ccs.Process> {
        private cache : {[id : number] : ccs.Process} = Object.create(null);

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

    export class WeakSuccessorGenerator implements ccs.SuccessorGenerator {

        constructor(public strictSuccGenerator : ccs.SuccessorGenerator,  public cache?) {
            this.cache = cache || {};
        }

        getProcessByName(processName : string) : ccs.Process {
            return this.strictSuccGenerator.getProcessByName(processName);
        }

        getProcessById(processId : ccs.ProcessId) : ccs.Process { 
            return this.strictSuccGenerator.getProcessById(processId);
        }

        getSuccessors(processId : ccs.ProcessId) : ccs.TransitionSet {
            if (this.cache[processId]) return this.cache[processId];

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

            //Add  P --tau--> P
            result.add(new ccs.Transition(new ccs.Action("tau", false), process));

            //Stage 1
            //Find all --tau-->* and
            //     all --tau-->*  --x-->
            while (toVisitProcesses.length > 0) {
                visitingProcess = toVisitProcesses.pop();
                if (!visitedStage1[visitingProcess.id]) {
                    visitedStage1[visitingProcess.id] = true;
                    strongSuccessors = this.strictSuccGenerator.getSuccessors(visitingProcess.id);
                    strongSuccessors.forEach(transition => {
                        if (transition.action.getLabel() === "tau") {
                            toVisitProcesses.push(transition.targetProcess);
                            result.add(transition);
                        } else {
                            toVisitStage2Processes.push(transition.targetProcess);
                            toVisitStage2Actions.push(transition.action);
                            visitedStage2[transition.action] = {};
                            result.add(transition);
                        }
                    });
                }
            }
            //Stage 2
            //Find all continuing  P --tau-->* when already --tau->* --x--> P
            while (toVisitStage2Processes.length > 0) {
                visitingProcess = toVisitStage2Processes.pop();
                visitingAction = toVisitStage2Actions.pop();
                if (!visitedStage2[visitingAction][visitingProcess.id]) {
                    visitedStage2[visitingAction][visitingProcess.id] = true;
                    strongSuccessors = this.strictSuccGenerator.getSuccessors(visitingProcess.id);
                    strongSuccessors.forEach(transition => {
                        if (transition.action.getLabel() === "tau") {
                            toVisitStage2Processes.push(transition.targetProcess);
                            toVisitStage2Actions.push(visitingAction);
                            result.add(new ccs.Transition(visitingAction, transition.targetProcess));
                        }
                    });
                }
            }
            
            this.cache[processId] = result;
            return result;
        }
    }

    export class ReducingSuccessorGenerator implements ccs.SuccessorGenerator {
        
        constructor(public succGenerator : ccs.SuccessorGenerator, public reducer : ProcessTreeReducer) { }

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
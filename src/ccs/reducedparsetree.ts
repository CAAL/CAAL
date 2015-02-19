/// <reference path="ccs.ts" />

module Traverse {

    import ccs = CCS;

    export class ProcessTreeReducer implements ccs.ProcessVisitor<ccs.Process>, ccs.ProcessDispatchHandler<ccs.Process> {

        constructor(public graph : ccs.Graph, public cache?) {
            this.cache = cache || {};
        }

        visit(process : ccs.Process) : ccs.Process {
            return process.dispatchOn(this);
        }

        dispatchNullProcess(process : ccs.NullProcess) {
            this.cache[process.id] = true;
            return process;
        }

        dispatchNamedProcess(process : ccs.NamedProcess) {
            if (!this.cache[process.id]) {
                this.cache[process.id] = true;
                process.subProcess = process.subProcess.dispatchOn(this);
            }
            return process;
        }

        dispatchSummationProcess(process : ccs.SummationProcess) {
            if (!this.cache[process.id]) {
                //Reduce subprocesses first
                var subProcesses = process.subProcesses;
                subProcesses.forEach( (subProc, i) => {
                    subProcesses[i] = subProc.dispatchOn(this);
                });
                //Remove null processes
                subProcesses = subProcesses.filter( subProc => !(subProc instanceof ccs.NullProcess));
                //Resort the processes
                subProcesses.sort( (procA, procB) => procA.id - procB.id);
                //Remove duplicates - already sorted on id.
                if (subProcesses.length > 1) {
                    var uniques = [subProcesses[0]];
                    for (var i=1; i < subProcesses.length; i++) {
                        var subProcess = subProcesses[i];
                        if (subProcess.id !== uniques[uniques.length - 1].id) {
                            uniques.push(subProcess);
                        }
                    }
                    subProcesses = uniques;
                }
                if (subProcesses.length === 0) {
                    return this.graph.getNullProcess();
                }
                process.subProcesses = subProcesses;
                this.cache[process.id] = true;
            }
            return process;
        }

        dispatchCompositionProcess(process : ccs.CompositionProcess) {
            if (!this.cache[process.id]) {
                //Reduce subprocesses first
                var subProcesses = process.subProcesses;
                subProcesses.forEach( (subProc, i) => {
                    subProcesses[i] = subProc.dispatchOn(this);
                });
                //Remove null processes
                subProcesses = subProcesses.filter( subProc => !(subProc instanceof ccs.NullProcess));
                //Resort the processes
                subProcesses.sort( (procA, procB) => procA.id - procB.id);
                if (subProcesses.length === 0) {
                    return this.graph.getNullProcess();
                }
                process.subProcesses = subProcesses;
                this.cache[process.id] = true;
            }
            return process;
        }

        dispatchActionPrefixProcess(process : ccs.ActionPrefixProcess) {
            if (!this.cache[process.id]) {
                process.nextProcess = process.nextProcess.dispatchOn(this);
                this.cache[process.id] = true;
            }
            return process;
        }

        dispatchRestrictionProcess(process : ccs.RestrictionProcess) {
            if (!this.cache[process.id]) {
                process.subProcess = process.subProcess.dispatchOn(this);
                // (P \ L1) \L2 => P \ (L1 Union L2)
                if (process.subProcess instanceof ccs.RestrictionProcess) {
                    var subRestriction = <ccs.RestrictionProcess>process.subProcess;
                    var mergedLabels = subRestriction.restrictedLabels.union(process.restrictedLabels);
                    process = this.graph.newRestrictedProcess(subRestriction.subProcess, mergedLabels);
                }
                // 0 \ L => 0
                if (process.subProcess instanceof ccs.NullProcess) {
                    return process.subProcess;
                }
                // P \ Ø => P
                if (process.restrictedLabels.empty()) {
                    return process.subProcess;
                }
                this.cache[process.id] = true;
            }
            return process;
        }

        dispatchRelabellingProcess(process : ccs.RelabellingProcess) {
            if (!this.cache[process.id]) {
                process.subProcess = process.subProcess.dispatchOn(this);
                if (process.subProcess instanceof ccs.NullProcess) return process.subProcess; // 0 [f] => 0
                this.cache[process.id] = true;
            }
            return process;
        }
    }

    export class WeakSuccessorGenerator implements ccs.SuccessorGenerator {

        constructor(public strictSuccGenerator : ccs.SuccessorGenerator,  public cache?) {
            this.cache = cache || {};
        }

        getProcessById(processId : number) : ccs.Process { 
            return this.strictSuccGenerator.getProcessById(processId);
        }

        getSuccessors(processId : number) : ccs.TransitionSet {
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

            //Add  P --tau-->P
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

        getProcessById(processId) : ccs.Process {
            return this.succGenerator.getProcessById(processId);
        }

        getSuccessors(processId) : ccs.TransitionSet {
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
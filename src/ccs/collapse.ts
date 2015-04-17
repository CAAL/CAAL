/// <reference path="ccs.ts" />
/// <reference path="ccs.ts" />

module Traverse {

    import ccs = CCS;

    export interface Collapse {
        getRepresentative(id) : ccs.CollapsedProcess;
    }

    // A collapsed process is a process that has
    // replaced many equivalent processes.
    // is not a real process. Has no id.
    export class CollapsingSuccessorGenerator implements ccs.SuccessorGenerator {

        private cache = {};

        constructor(private succGenerator : ccs.SuccessorGenerator, private collapse : Collapse) {
        }

        getGraph() {
            return this.succGenerator.getGraph();
        }

        getProcessByName(processName : string) : ccs.Process {
            return this.succGenerator.getProcessByName(processName);
        }

        getProcessById(processId : ccs.ProcessId) : ccs.Process {
            return this.succGenerator.getProcessById(processId);
        }

        getSuccessors(processId : ccs.ProcessId) : ccs.TransitionSet {
            if (this.cache[processId]) return this.cache[processId];

            var getRepresentative = this.collapse.getRepresentative;
               var  collapseProcs = getRepresentative(processId).subProcesses;
              var  result = new ccs.TransitionSet();

            collapseProcs
                .map(proc => this.succGenerator.getSuccessors(proc.id))
                .forEach(tSet => {
                    tSet.forEach(transition => {
                        var targetRepr = getRepresentative(transition.targetProcess.id);
                        result.add(new ccs.Transition(transition.action, targetRepr));
                    });
                });

            this.cache[processId] = result;
            return result;
        }

        getCollapseForProcess(processId : ccs.ProcessId) : ccs.Process {
            return this.collapse.getRepresentative(processId);
        }
    }
}
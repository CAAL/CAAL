/// <reference path="ccs.ts" />
/// <reference path="ccs.ts" />

module Traverse {

    import ccs = CCS;

    export interface Collapse {
        getRepresentative(id) : any;
        getEquivalenceSet(id) : any[];
    }

    export class CollapsingSuccessorGenerator implements ccs.SuccessorGenerator {

        private cache = {};

        constructor(private succGenerator : ccs.SuccessorGenerator, private collapse : Collapse) {
        }

        getProcessById(processId : ccs.ProcessId) : ccs.Process {
            return this.succGenerator.getProcessById(processId);
        }

        getSuccessors(processId : ccs.ProcessId) : ccs.TransitionSet {
            if (this.cache[processId]) return this.cache[processId];
            var getRepresentative = this.collapse.getRepresentative,
                sourceCollapseIds = this.collapse.getEquivalenceSet(processId),
                result = new ccs.TransitionSet();

            sourceCollapseIds
                .map(procId => this.succGenerator.getSuccessors(procId))
                .forEach(tSet => {
                    tSet.forEach(transition => {
                        var targetReprId = getRepresentative(transition.targetProcess.id),
                            newProcess = this.succGenerator.getProcessById(targetReprId);
                        result.add(new ccs.Transition(transition.action, newProcess));
                    });
                });

            this.cache[processId] = result;
            return result;
        }
    }
}
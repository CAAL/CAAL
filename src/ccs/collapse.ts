/// <reference path="ccs.ts" />

module Traverse {

    import ccs = CCS;

    export class CollapsingSuccessorGenerator implements ccs.SuccessorGenerator {

        constructor(private succGenerator : ccs.SuccessorGenerator, private collapseFn) {
        }

        getProcessById(processId) : ccs.Process {
            return this.succGenerator.getProcessById(processId);
        }

        getSuccessors(processId) : ccs.TransitionSet {
            var transitionSet = this.succGenerator.getSuccessors(processId);
            //Rewrite target processes
            var result = new ccs.TransitionSet();
            transitionSet.forEach(transition => {
                var newId = this.collapseFn(transition.targetProcess.id),
                    newProcess = this.succGenerator.getProcessById(newId);
                result.add(new ccs.Transition(transition.action, newProcess));
            });
            return result;
        }
    }
}
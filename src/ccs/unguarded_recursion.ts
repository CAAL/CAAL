/// <reference path="ccs.ts" />

module Traverse {

    import ccs = CCS;

    export class UnguardedRecursionChecker implements ccs.ProcessDispatchHandler<boolean> {
        /*
            Recursively checks if named processes are unguarded. Prefix and Null process
            return false to signify guarded. If a named process is able to reach itself
            or another unguarded named process it is unguarded.
        */

        private unknownResults;
        private visiting;
        private unguardedProcesses;

        constructor() {
        }

        findUnguardedProcesses(allNamedProcesses : ccs.NamedProcess[]) : ccs.NamedProcess[] {
            this.unknownResults = allNamedProcesses.slice(0);
            this.visiting = [];
            this.unguardedProcesses = [];
            for (var i = 0, max = allNamedProcesses.length; i < max; i++) {
                allNamedProcesses[i].dispatchOn(this);
            }
            return this.unguardedProcesses;
        }

        dispatchNullProcess(process : ccs.NullProcess) {
            return false;
        }

        dispatchNamedProcess(process : ccs.NamedProcess) {
            var index = this.unknownResults.indexOf(process),
                isUnguarded;
            if (index >= 0) {
                //First time we see this process.
                this.unknownResults.splice(index, 1);
                this.visiting.push(process);
                isUnguarded = process.subProcess.dispatchOn(this);
                if (isUnguarded) {
                    this.unguardedProcesses.push(process);
                }
                this.visiting.splice(this.visiting.indexOf(process), 1);
            } else if (this.visiting.indexOf(process) !== -1) {
                //Got back to this constant without performing action -- unguarded
                isUnguarded = true;
            } else {
                isUnguarded = this.unguardedProcesses.indexOf(process) !== -1;
            }
            return isUnguarded;
        }

        dispatchSummationProcess(process : ccs.SummationProcess) {
            var isUnguarded = false;
            process.subProcesses.forEach(subProc => {
                if (subProc.dispatchOn(this)) {
                    isUnguarded = true;
                }
            });
            return isUnguarded;
        }

        dispatchCompositionProcess(process : ccs.CompositionProcess) {
            var isUnguarded = false;
            process.subProcesses.forEach(subProc => {
                if (subProc.dispatchOn(this)) {
                    isUnguarded = true;
                }
            });
            return isUnguarded; 
        }

        dispatchActionPrefixProcess(process : ccs.ActionPrefixProcess) {
            return false;
        }

        dispatchRestrictionProcess(process : ccs.RestrictionProcess) {
            return process.subProcess.dispatchOn(this);
        }

        dispatchRelabellingProcess(process : ccs.RelabellingProcess) {
            return process.subProcess.dispatchOn(this);
        }
    }
}
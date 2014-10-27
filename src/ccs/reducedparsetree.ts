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
                process.subProcess = process.subProcess.dispatchOn(this);
                this.cache[process.id] = true;
            }
            return process;
        }

        dispatchSummationProcess(process : ccs.SummationProcess) {
            if (!this.cache[process.id]) {
                process.leftProcess = process.leftProcess.dispatchOn(this);
                process.rightProcess = process.rightProcess.dispatchOn(this);
                if (process.leftProcess instanceof ccs.NullProcess) return process.rightProcess; // 0 + P => 0
                if (process.rightProcess instanceof ccs.NullProcess) return process.leftProcess; // P + 0 => P
                if (process.leftProcess.id === process.rightProcess.id) return process.leftProcess; // P + P => P
                this.cache[process.id] = true;
            }
            return process;
        }

        dispatchCompositionProcess(process : ccs.CompositionProcess) {
            if (!this.cache[process.id]) {
                process.leftProcess = process.leftProcess.dispatchOn(this);
                process.rightProcess = process.rightProcess.dispatchOn(this);
                if (process.leftProcess instanceof ccs.NullProcess) return process.rightProcess; // 0 | P => P
                if (process.rightProcess instanceof ccs.NullProcess) return process.leftProcess; // P | 0 => P
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
                    var mergedLabels = subRestriction.restrictedLabels.clone().unionWith(process.restrictedLabels);
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
}
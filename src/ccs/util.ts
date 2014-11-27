/// <reference path="ccs.ts" />

module Traverse {

    import ccs = CCS;

    // http://ironcreek.net/phpsyntaxtree/?
    export class LabelledBracketNotation implements ccs.ProcessVisitor<string>, ccs.ProcessDispatchHandler<void> {

        private stringPieces : string[];
        private recurseOnceForNamedProcess = undefined;

        constructor() {
        }

        visit(process : ccs.Process) {
            this.stringPieces = [];
            if (process instanceof ccs.NamedProcess) {
                this.recurseOnceForNamedProcess = (<ccs.NamedProcess>process).name;
            }
            process.dispatchOn(this);
            return this.stringPieces.join(" ");
        }

        dispatchNullProcess(process : ccs.NullProcess) {
            this.stringPieces.push("[0]");
        }

        dispatchNamedProcess(process : ccs.NamedProcess) {
            if (process.name === this.recurseOnceForNamedProcess) {
                this.recurseOnceForNamedProcess = undefined;
                this.stringPieces.push("[NamedProcess");
                this.stringPieces.push(process.name + " =");
                process.subProcess.dispatchOn(this);
                this.stringPieces.push("]");  
            } else {
                this.stringPieces.push("[ConstantProcess " + process.name + "]");
            }
        }

        dispatchSummationProcess(process : ccs.SummationProcess) {
            this.stringPieces.push("[Summation");
            process.leftProcess.dispatchOn(this);
            process.rightProcess.dispatchOn(this);
            this.stringPieces.push("]");
        }

        dispatchCompositionProcess(process : ccs.CompositionProcess) {
            this.stringPieces.push("[Composition");
            process.leftProcess.dispatchOn(this);
            process.rightProcess.dispatchOn(this);
            this.stringPieces.push("]");
        }

        dispatchActionPrefixProcess(process : ccs.ActionPrefixProcess) {
            this.stringPieces.push("[ActionPrefix");
            this.stringPieces.push(process.action.toString() + ".");
            process.nextProcess.dispatchOn(this);
            this.stringPieces.push("]");
        }

        dispatchRestrictionProcess(process : ccs.RestrictionProcess) {
            this.stringPieces.push("[Restriction");
            process.subProcess.dispatchOn(this);
            var labels = [];
            process.restrictedLabels.forEach(l => labels.push(l));
            this.stringPieces.push("\\ (" + labels.join(",") + ")]");
        }

        dispatchRelabellingProcess(process : ccs.RelabellingProcess) {
            this.stringPieces.push("[Relabelling");
            process.subProcess.dispatchOn(this);
            var relabels = [];
            process.relabellings.forEach((f, t) => relabels.push(t + "/" + f));
            this.stringPieces.push("\\ (" + relabels.join(",") + ")]");
        }
    }

    export class SizeOfProcessTreeVisitor implements ccs.ProcessVisitor<number>, ccs.ProcessDispatchHandler<number> {
        //not very usable at the moment.
        constructor() {
        }

        visit(process : ccs.Process) {
            return process.dispatchOn(this);
        }

        dispatchNullProcess(process : ccs.NullProcess) {
            return 1;
        }

        dispatchNamedProcess(process : ccs.NamedProcess) {
            return 1;
        }

        dispatchSummationProcess(process : ccs.SummationProcess) {
            return 1 + process.leftProcess.dispatchOn(this) + process.rightProcess.dispatchOn(this);
        }

        dispatchCompositionProcess(process : ccs.CompositionProcess) {
            return 1 + process.leftProcess.dispatchOn(this) + process.rightProcess.dispatchOn(this);
        }

        dispatchActionPrefixProcess(process : ccs.ActionPrefixProcess) {
            return 1 + process.nextProcess.dispatchOn(this);
        }

        dispatchRestrictionProcess(process : ccs.RestrictionProcess) {
            return 1 + process.subProcess.dispatchOn(this);
        }

        dispatchRelabellingProcess(process : ccs.RelabellingProcess) {
            return 1 + process.subProcess.dispatchOn(this);
        }
    }

    function wrapIfInstanceOf(stringRepr : string, process : ccs.Process, classes) {
        for (var i = 0; i < classes.length; i++) {
            if (process instanceof classes[i]) {
                return "(" + stringRepr + ")";
            }
        }
        return stringRepr;
    }

    export class CCSNotationVisitor implements ccs.ProcessVisitor<string>, ccs.ProcessDispatchHandler<string> {

        private insideNamedProcess = undefined;
        private cache;

        constructor() {
            this.clearCache();
        }

        clearCache() {
            this.cache = {};
        }

        visit(process : ccs.Process) {
            return process.dispatchOn(this);
        }

        dispatchNullProcess(process : ccs.NullProcess) {
            return this.cache[process.id] = "0";
        }

        dispatchNamedProcess(process : ccs.NamedProcess) {
            var result = this.cache[process.id];
            //How to handle recursion???
            if (!result) {
                result = this.cache[process.id] = process.name;
            }
            return result;
        }

        dispatchSummationProcess(process : ccs.SummationProcess) {
            var result = this.cache[process.id],
                leftStr, rightStr;
            if (!result) {
                leftStr = process.leftProcess.dispatchOn(this);
                rightStr = process.rightProcess.dispatchOn(this);
                result = this.cache[process.id] = leftStr + " + " + rightStr;
            }
            return result;
        }

        dispatchCompositionProcess(process : ccs.CompositionProcess) {
            var result = this.cache[process.id],
                leftStr, rightStr;
            if (!result) {
                leftStr = process.leftProcess.dispatchOn(this);
                rightStr = process.rightProcess.dispatchOn(this);
                leftStr = wrapIfInstanceOf(leftStr, process.leftProcess, [ccs.SummationProcess]);
                rightStr = wrapIfInstanceOf(rightStr, process.rightProcess, [ccs.SummationProcess]);
                result = this.cache[process.id] = leftStr + " | " + rightStr;
            }
            return result;
        }

        dispatchActionPrefixProcess(process : ccs.ActionPrefixProcess) {
            var result = this.cache[process.id],
                subStr;
            if (!result) {
                subStr = process.nextProcess.dispatchOn(this);
                subStr = wrapIfInstanceOf(subStr, process.nextProcess, [ccs.SummationProcess, ccs.CompositionProcess]);
                result = this.cache[process.id] = process.action.toString() + "." + subStr;
            }
            return result;
        }

        dispatchRestrictionProcess(process : ccs.RestrictionProcess) {
            var result = this.cache[process.id],
                subStr, labels;
            if (!result) {
                subStr = process.subProcess.dispatchOn(this);
                subStr = wrapIfInstanceOf(subStr, process.subProcess,
                    [ccs.SummationProcess, ccs.CompositionProcess, ccs.ActionPrefixProcess]);
                labels = process.restrictedLabels.toArray();
                result = this.cache[process.id] = subStr + " \\ {" + labels.join(", ") + "}";
            }
            return result;
        }

        dispatchRelabellingProcess(process : ccs.RelabellingProcess) {
            var result = this.cache[process.id],
                subStr, relabels;
            if (!result) {
                subStr = process.subProcess.dispatchOn(this);
                subStr = wrapIfInstanceOf(subStr, process.subProcess,
                    [ccs.SummationProcess, ccs.CompositionProcess, ccs.ActionPrefixProcess]);
                relabels = [];
                process.relabellings.forEach((from, to) => {
                    relabels.push(to + "/" + from);
                });
                result = this.cache[process.id] = subStr + " \\ [" + relabels.join(",") + "]";
            }
            return result;
        }
    }
}

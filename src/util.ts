/// <reference path="ccs.ts" />
import ccs = require('./ccs');

export class LabelledBracketNotation implements ccs.NodeDispatcher<string> {
    dispatchProgram(node : ccs.Program, assignResults : string[]) : string {
    	return "[Program " + assignResults.join(' ') + "]";
    }
    dispatchNullProcess(node : ccs.NullProcess) : string {
    	return "[0]";
    }
    dispatchAssignment(node : ccs.Assignment, result : string) : string {
    	return "[Assignment " + node.variable + " = " + result + "]";
    }
    dispatchSummation(node : ccs.Summation, leftResult : string, rightResult : string) : string {
    	return "[Summation " + leftResult + " " + rightResult + "]";
    }
    dispatchComposition(node : ccs.Composition, leftResult : string, rightResult : string) : string {
    	return "[Composition " + leftResult + " " + rightResult + "]";
    }
    dispatchAction(node : ccs.Action, processResult : string) : string {
    	return "[Action " + (node.complement ? "!" : "") + node.label + ". " + processResult + "]";
    }
    dispatchRestriction(node : ccs.Restriction, processResult : string) : string {
    	var labels = [];
    	node.restrictedLabels.forEach((label) => { labels.push(label); });
    	return "[Restriction " + processResult + "\\(" + labels.join(",") + ")]";
    }
    dispatchRelabelling(node : ccs.Relabelling, processResult : string) : string {
    	var relabelParts = [];
    	node.relabellings.forEach((from, to) => { relabelParts.push(to + "/" + from); });
    	return "[Relabelling " + processResult + "(" + relabelParts.join(",") + ")]";
    }
    dispatchParenthesis(node : ccs.Parenthesis, processResult : string) : string {
    	return "[Parenthesis " + processResult + "]";
    }
    dispatchConstant(node : ccs.Constant) : string {
    	return "[" + node.constant + "]"; 
    }
}

export class SizeOfTree implements ccs.NodeDispatcher<number> {
    dispatchProgram(node : ccs.Program, assignResults : number[]) : number {
    	return 1 + assignResults.reduce((prev, cur) => { return prev + cur; }, 0);
    }
    dispatchNullProcess(node : ccs.NullProcess) : number {
    	return 1;
    }
    dispatchAssignment(node : ccs.Assignment, result : number) : number {
    	return 1 + result;
    }
    dispatchSummation(node : ccs.Summation, leftResult : number, rightResult : number) : number {
    	return 1 + leftResult + rightResult;
    }
    dispatchComposition(node : ccs.Composition, leftResult : number, rightResult : number) : number {
    	return 1 + leftResult + rightResult;
    }
    dispatchAction(node : ccs.Action, processResult : number) : number {
    	return 1 + processResult;
    }
    dispatchRestriction(node : ccs.Restriction, processResult : number) : number {
    	return 1 + processResult;
    }
    dispatchRelabelling(node : ccs.Relabelling, processResult : number) : number {
    	return 1 + processResult;
    }
    dispatchParenthesis(node : ccs.Parenthesis, processResult : number) : number {
    	return 0 + processResult;
    }
    dispatchConstant(node : ccs.Constant) : number {
    	return 1;
    }
}
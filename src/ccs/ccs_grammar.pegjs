
{
	function extractLabelList(f, rest) {
		var restLabels;
		if (rest === undefined) return [f];
		restLabels = rest.map(function(syntax) {
			return syntax[3];
		});
		return [f].concat(restLabels)
	}

	function strFirstAndRest(first, rest) {
		return first + rest.join('');
	}

	var ccs = options.ccs;
	var g = options.graph || new ccs.Graph();
}

start
	= Program

//A program consists of lines only used for process assignments.
Program
	= assignments:Assignments { return g; }

Assignments = _ first:Assignment _ Newline rest:Assignments { return [first].concat(rest); }
            / _ first:Assignment _ { return [first];}
			/ _ Newline assignments:Assignments { return assignments; }
	  		/ _ Newline? { return []; }

Assignment
	= name:ConstantStr _ "=" _ P:Process { return g.newNamedProcess(name, P); }

//The rules here are defined in the reverse order of their precedence.
//Either a given rule applies, eg. +, and everything to the left must have higher precedence,
// or there is no plus, in which cases it must still have higher predence.
Process = Summation

Summation
	= P:Composition _ "+" _ Q:Summation { return g.newSummationProcess(P, Q); }
	/ P:Composition { return P; }

Composition
	= P:ActionPrefix _ "|" _ Q:Composition { return g.newCompositionProcess(P, Q); }
	/ P:ActionPrefix { return P; }

ActionPrefix
	= label:Label _ "." _ P:ActionPrefix { return g.newActionPrefixProcess(new ccs.Action(label, false), P); }
	/ "!" _ label:Label _ "." _ P:ActionPrefix { return g.newActionPrefixProcess(new ccs.Action(label, true), P); }
	/ P:ReProcess { return P; }

ReProcess
	= P:ParenProcess _ "\\" _ "{" _ labels:LabelList? _ "}" { return g.newRestrictedProcess(P, new ccs.LabelSet(labels || [])); }
	/ P:ParenProcess _ "[" _ relabels:RelabellingList _ "]" { return g.newRelabelingProcess(P, new ccs.RelabellingSet(relabels || [])); }
	/ P:ParenProcess { return P; }

// Relabellings  [a/b, c/d]
RelabellingList
	= first:Relabel _ "," _ rest:RelabellingList { return [first].concat(rest); }
	/ relabel:Relabel { return [relabel]; }

Relabel
	= to:Label _ "/" _ from:Label { return {to: to, from: from}; }

// ( P ) for some process P
ParenProcess
	= "(" _ P:Process _ ")" { return P; }
	/ P:ConstantProcess { return P; }

// A constant process. Either the null process 0, or some process K.
ConstantProcess
	= "0" { return g.getNullProcess(); }
	/ K:ConstantStr { return g.referToNamedProcess(K); }

//Valid names for processes
ConstantStr
	= first:[A-Z] rest:[A-Za-z]* { return strFirstAndRest(first, rest); }

//Valid name for actions
Label
	= label:[a-z]+ { return label.join(''); }

LabelList
	= first:Label rest:(_ "," _ Label)* { return extractLabelList(first, rest); }

Whitespace
	= [ \t]

//Useful utility
_ = Whitespace*

Newline
	= "\r\n" / "\n" / "\r"



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
	function extractRelabelings(relabels) {
		return relabels.map(function(syntaxRelabel) {
			return {new: syntaxRelabel[1], old: syntaxRelabel[5]};
		});
	}

	var AST = options.astNodes;
}

start
	= program

//A program consists of lines only used for process assignments.
program
	= firstAssignments:line* last:lastAssignment? { var assignments = firstAssignments; if (last) assignments.push(last); return {assignments: assignments}; }

//A line is either blank or a valid assignment
line = _ assignment:assignment _ newline { return assignment; }
	 / _ newline

//The last line need not end with a newline
lastAssignment = _ assignment:assignment _ { return assignment; }

assignment
	= left:constantStr _ "=" _ right:process { return {type: AST.Assignment, left: left, right: right}; }

//The rules here are defined in the reverse order of their precedence.
//Either a given rule applies, eg. +, and everything to the left must have higher precedence,
// or there is no plus, in which cases it must still have higher predence.
process = summation

summation
	= left:composition _ "+" _ right:summation { return {type: AST.Summation, left: left, right: right}; }
	/ process:composition { return process; }

composition
	= left:action _ "|" _ right:composition { return {type: AST.Composition, left: left, right: right}; }
	/ process:action { return process; }

action
	= action:label _ "." _ process:action { return {type: AST.Action, label: action, complement: false, next: process}; }
	/ "!" _ action:label _ "." _ process:action { return {type: AST.Action, label: action, complement: true, next: process}; }
	/ process:leftProcess { return process; }

leftProcess
	= process:parenProcess _ labels:restrictedLabels { return {type: AST.Restriction, labels: labels, process: process}; }
	/ process:parenProcess _ relabels:relabelings { return {type: AST.Relabeling, relabels: relabels, process: process}; }
	/ process:parenProcess { return process; }

// A restricted set of labels   \ {a, b}
restrictedLabels
	= "\\" _ "{" _ labels:labelsList? "}" { return labels; }

// Relabelings  [a/b, c/d]
relabelings
	= "[" _ relabels:(_ label _ "/" _ label)* _ "]" { return extractRelabelings(relabels); }

// ( P ) for some process P
parenProcess
	= "(" _ process:process _ ")" { return {type: AST.Parenthesis, process:process}; }
	/ process:constantProcess { return process; }

// A constant process. Either the null process 0, or some process K.
constantProcess
	= "0" { return {type: AST.NullProcess}; }
	/ constant:constantStr { return {type: AST.Constant, constant: constant}; }

//Valid names for processes
constantStr
	= first:[A-Z] rest:[A-Za-z]* { return strFirstAndRest(first, rest); }

//Valid name for actions
label
	= label:[a-z]+ { return label.join(''); }

labelsList
	= first:label rest:(_ "," _ label)* { return extractLabelList(first, rest); }

whitespace
	= [ \t]

//Useful utility
_ = whitespace*

newline
	= "\r\n" / "\n" / "\r"

blankline
	= whitespace* newline

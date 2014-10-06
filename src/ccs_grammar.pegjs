
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
	var AST = options.astNodes;
	var nodeMap = options.nodeMap;
	var nextid = 0;
	function create(constructor) {
		// create(constructor, arg1, arg2, arg3)
		// all nodes have id as first parameter
		//trickery to be able to call constructor with 'new'.
		var args = Array.prototype.slice.call(arguments, 1),
			boundConstructor = constructor.bind.apply(constructor, [null, nextid++].concat(args));
			node = new boundConstructor();
		nodeMap[node.id] = node;
		return node;
	}
}

start
	= program

//A program consists of lines only used for process assignments.
program
	= assignments:assignments { return create(ccs.Program, assignments); }

assignments = _ first:assignment _ newline rest:assignments { return [first].concat(rest); }
            / _ first:assignment _ { return [first];}
			/ _ newline assignments:assignments { return assignments; }
	  		/ _ newline? { return []; }

assignment
	= left:constantStr _ "=" _ right:process { return create(ccs.Assignment, left, right); }

//The rules here are defined in the reverse order of their precedence.
//Either a given rule applies, eg. +, and everything to the left must have higher precedence,
// or there is no plus, in which cases it must still have higher predence.
process = summation

summation
	= left:composition _ "+" _ right:summation { return create(ccs.Summation, left, right); }
	/ process:composition { return process; }

composition
	= left:action _ "|" _ right:composition { return create(ccs.Composition, left, right); }
	/ process:action { return process; }

action
	= action:label _ "." _ process:action { return create(ccs.Action, action, false, process); }
	/ "!" _ action:label _ "." _ process:action { return create(ccs.Action, action, true, process); }
	/ process:leftProcess { return process; }

leftProcess
	= process:parenProcess _ labels:restrictedLabels { return create(ccs.Restriction, process, new ccs.LabelSet(labels || [])); }
	/ process:parenProcess _ "[" _ relabels:relabellings _ "]" { return create(ccs.Relabelling, process, new ccs.RelabellingSet(relabels || [])); }
	/ process:parenProcess { return process; }

// A restricted set of labels   \ {a, b}
restrictedLabels
	= "\\" _ "{" _ labels:labelsList? "}" { return labels; }

// Relabellings  [a/b, c/d]
relabellings
	= first:relabel _ "," _ rest:relabellings { return [first].concat(rest); }
	/ relabel:relabel { return [relabel]; }

relabel
	= newlabel:label _ "/" _ old:label { return {to: newlabel, from: old}; }

// ( P ) for some process P
parenProcess
	= "(" _ process:process _ ")" { return process; }
	/ process:constantProcess { return process; }

// A constant process. Either the null process 0, or some process K.
constantProcess
	= "0" { return create(ccs.NullProcess); }
	/ constant:constantStr { return create(ccs.Constant, constant); }

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

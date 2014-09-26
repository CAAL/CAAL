var util = require('util');
var fs = require('fs');
var PEG = require('pegjs');
var ccs = require('./ccs.js');

var grammar = fs.readFileSync('./src/ccs_grammar.pegjs').toString();
var parser = PEG.buildParser(grammar);

var cmdText = process.argv.slice(2).join(" ");

if (cmdText.trim() !== "") {
	var cmdAst = parser.parse(cmdText, {astNodes: ccs.CCSNode});
	logObjectDeep(cmdAst);

	console.log("\nLabelled bracket notation: \n")
	console.log(labelledBracketNotation(cmdAst));
    
    var sharedPostOrder = new ccs.SharedTree();
    sharedPostOrder.postOrderVisit(cmdAst.assignments[0].right);
}
else 
    console.log("No ccs arguments");

function logObjectDeep(obj) {
	console.log(util.inspect(obj, false, null));
}

//You can use:
// http://ironcreek.net/phpsyntaxtree/?
function labelledBracketNotation(process) {
	var node = ccs.CCSNode,
		lbl = labelledBracketNotation;
	switch (process.type) {
		case node.Program:
			var assignments = process.assignments.map(lbl);
			return "[Program " + assignments.join(" ") + "]";
		case node.NullProcess:
			return "0";
		case node.Assignment:
			return "[Assignment " + process.left + " [=] " + lbl(process.right) + "]";
		case node.Summation:
			return "[Summation " + lbl(process.left) + " + " + lbl(process.right) + "]";
		case node.Composition:
			return "[Composition " + lbl(process.left) + " | " + lbl(process.right) + "]";
		case node.Action:
			return "[Action " + (process.complement ? "!" : "") + process.label + " . " + lbl(process.next) + "]";
		case node.Restriction:
			return "[Restriction " + lbl(process.process) + " \\ (" + process.labels.join(',') + ")]";
		case node.Relabeling:
			var substitutions = process.relabels.map(function (relabel) {
				return relabel.new + "/" + relabel.old;
			});
			return "[Relabeling " + lbl(process.process) + " (" + substitutions.join(',') + ")]";
		case node.Parenthesis:
			return "[Paren ( " + lbl(process.process) + " ) ]";
		case node.Constant:
			return process.constant;
		default:
			console.log(process);
			throw "This should not happen " + process.type;
	}
}

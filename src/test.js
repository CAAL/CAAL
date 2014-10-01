var util = require('util');
var fs = require('fs');
var PEG = require('pegjs');
var ccs = require('./ccs.js');
var ccsutil = require('./util.js');
var reduced = require('./reducedparsetree.js');
var shared = require('./sharedparsetree.js');

var grammar = fs.readFileSync('./src/ccs_grammar.pegjs').toString();
var parser = PEG.buildParser(grammar);

var cmdText = process.argv.slice(2).join(" ");

if (cmdText.trim() !== "") {
	var cmdAst = parser.parse(cmdText, {ccs: ccs, astNodes: ccs.CCSNode});
	var tree = cmdAst;
	var lbn = new ccsutil.LabelledBracketNotation();
	console.log("Tree Size: " + ccs.postOrderTraversal(tree, new ccsutil.SizeOfTree()) + "\n");
	var spt = new shared.SharedParseTreeTraverser();
	console.log("after sharing...\n");
	tree = ccs.postOrderTraversal(tree, spt);
	console.log(ccs.postOrderTraversal(tree, lbn));
	console.log("about to reduce...\n")
	var rpt = new reduced.ReducedParseTreeTraverser();
	tree = ccs.postOrderTraversal(tree, rpt);
	console.log(ccs.postOrderTraversal(tree, lbn));
}
else
    console.log("No ccs arguments");

function logObjectDeep(obj) {
	console.log(util.inspect(obj, false, null));
}

//You can use:
// http://ironcreek.net/phpsyntaxtree/?
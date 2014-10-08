var util = require('util');
var fs = require('fs');
var PEG = require('pegjs');
var ccs = require('./ccs.js');
var ccsutil = require('./util.js');
var reduced = require('./reducedparsetree.js');
var shared = require('./sharedparsetree.js');

var grammar = fs.readFileSync('./src/ccs_grammar.pegjs').toString();
var parser = PEG.buildParser(grammar, {cache: true});

var cmdText = process.argv.slice(2).join(" ");

function runOnText(text) {
    var graph = new ccs.Graph();
    var cmdAst = parser.parse(text, {ccs: ccs, astNodes: ccs.CCSNode, graph: graph});
    var tree = cmdAst;
    var lbn = new ccsutil.LabelledBracketNotation();
    console.log("Tree Size: " + ccs.postOrderTransform(tree, new ccsutil.SizeOfTree()) + "\n");

    var spt = new shared.SharedParseTreeTraverser();
    console.log("after sharing...\n");
    tree = ccs.postOrderTransform(tree, spt);
    console.log(ccs.postOrderTransform(tree, lbn));

    console.log("about to reduce...\n")
    var rpt = new reduced.ReducedParseTreeTraverser();
    tree = ccs.postOrderTransform(tree, rpt);
    console.log(ccs.postOrderTransform(tree, lbn));

    console.log("about to prettyprint...\n");
    var pp = new ccsutil.CCSNotation();
    console.log(ccs.postOrderTransform(tree, pp));

    return [tree, graph];
}

if (cmdText.trim() !== "") {
    runOnText(cmdText);
} else {
    (function () {
        var tree, graph;
        var pair = runOnText("P = (a.b.P | !a.!b.Q) \\ {a,b} \n Q = c.P");
        tree = pair[0];
        graph = pair[1];
        simulate("P", graph, tree, 5);
    })();
}

function logObjectDeep(obj) {
    console.log(util.inspect(obj, false, null));
}

function simulate(processName, graph, tree, n) {
    n = n || 10;
    var successors = {};
    var program = graph.root;
    var sc = new ccs.SuccessorGenerator(successors, graph);
    //Must run it on program to cache all variable definitions.
    ccs.conditionalPostOrderTransform(program, sc, function (n) { return true; });
    var currentNode = graph.assignmentByVariable(processName);
    if (!currentNode) throw "Invalid process name";
    currentNode = currentNode.process;
    for (var i = 0; i < n; i++) {
        //Must run it on the current node since it may be attached independently of the original program.
        ccs.conditionalPostOrderTransform(currentNode, sc, function (n) { return true; });
        var transitionCandidates = successors[currentNode.id];
        var arrayCandidates = [];
        transitionCandidates.forEach(function (t) {
            arrayCandidates.push(t);
        });
        if (arrayCandidates.length === 0) {
            break;
        }
        var ct = arrayCandidates[Math.floor(Math.random() * arrayCandidates.length)];
        console.log(currentNode.id + " ---- " + (ct.complement ? "!" : "") + ct.label + " ----> " + ct.targetProcessId);
        currentNode = graph.nodeById(ct.targetProcessId);
    }
}

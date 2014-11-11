var fs = require('fs'),
    vm = require('vm'),
    assert = require('assert');

function include(path) {
    var code = fs.readFileSync(path, 'utf-8');
    vm.runInThisContext(code, path);
}

include("lib/ccs_grammar.js");
include("test/dependencies.js");

var tvs = Traverse,
    dgMod = DependencyGraph,
    ccs = CCS;

function testNotSimilar() {
    var graph = CCSParser.parse("P = a.(b.0 + c.0); Q = a.b.0 + a.c.0;", {ccs: CCS}),
        succGen = new tvs.ReducingSuccessorGenerator(graph);
        dg = new dgMod.BisimulationDG(
            succGen,
            graph.processByName("P").id,
            graph.processByName("Q").id);
    var isBisimilar = dgMod.liuSmolkaLocal2(0, dg);
    assert(!isBisimilar, "P and Q should not be bisimilar");
}

function testSimilar() {
    var graph = CCSParser.parse("P = a.(b.0 + c.0); Q = a.(b.0 + c.0) + a.(c.0 + b.0);", {ccs: CCS}),
        succGen = new tvs.ReducingSuccessorGenerator(graph);
        dg = new dgMod.BisimulationDG(
            succGen,
            graph.processByName("P").id,
            graph.processByName("Q").id);
    var isBisimilar = dgMod.liuSmolkaLocal2(0, dg);
    assert(isBisimilar, "P and Q should be bisimilar");
}

testNotSimilar();
testSimilar();
console.log("-- tests ok");
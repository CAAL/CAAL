var fs = require('fs'),
    vm = require('vm'),
    assert = require('assert');

function include(path) {
    var code = fs.readFileSync(path, 'utf-8');
    vm.runInThisContext(code, path);
}

include("lib/ccs_grammar.js");
include("lib/hml_grammar.js");
include("test/dependencies.js");

var tvs = Traverse,
    dgMod = DependencyGraph,
    ccs = CCS,
    hml = HML;

function getStrictSuccGenerator(graph) {
    var strictGenerator = new ccs.StrictSuccessorGenerator(graph),
        treeReducer = new tvs.ProcessTreeReducer(graph),
        reducingGenerator = new tvs.ReducingSuccessorGenerator(strictGenerator, treeReducer);
    return reducingGenerator;
}

function checkFormula(program, processName, formula) {
    var graph = new CCSParser.parse(program, {ccs: CCS}),
        succGen = getStrictSuccGenerator(graph),
        formula = HMLParser.parse(formula, {ccs: ccs, hml: hml}),
        dg = new dgMod.ModelCheckingDG(succGen, graph.processByName(processName).id, formula);
    return dgMod.liuSmolkaLocal2(0, dg);
}

function testSimpleCheckTrue() {
    assert(checkFormula("P = a.b.c.0;", "P", "<a><b><c>tt"), "should be true");
}

function testSimpleCheckFails() {
    assert(! checkFormula("P = a.b.c.0;", "P", "<a><q><c>tt"), "should be false");
}

function testDisjunction() {
    assert(  checkFormula("P = a.0 + b.0;", "P", "<x>tt or <b>tt"), "should be true");
    assert(! checkFormula("P = a.0 + b.0;", "P", "<x>tt or <c>tt"), "should be false");
}

function testConjunction() {
    assert(  checkFormula("P = a.0 + b.0;", "P", "<a>tt and <b>tt"), "should be true");
    assert(! checkFormula("P = a.0 + b.0;", "P", "<a>tt and <c>tt"), "should be false");
}

function testExists() {
    assert(  checkFormula("P = a.b.x.P + a.b.y.P;", "P", "<a><b><y>tt"), "should be true");
    assert(! checkFormula("P = a.b.x.P + a.w.y.P;", "P", "<a><b><y>tt"), "should be false");
}

function testForAll() {
    assert(  checkFormula("P = a.x.P;", "P", "[a][y]ff"), "should be true");
    assert(! checkFormula("P = a.y.P;", "P", "[a][y]ff"), "should be false");
}

function testOthers() {
    assert(checkFormula(
        "P = a.Q + a.R + y.P;" + "Q = b.P;" + "R = b.P;",
        "P",
        "[a]<b>[z]ff"), "should be true");

    assert(checkFormula("P = ('a.b.c.P | a.b.P) \\ {a};", "P", "<tau>[b](<b>tt or <c>tt)"), "should be true");
    assert(checkFormula("P = (a.'b.c.0) [x/a, y/b, z/c];", "P", "<x><'y><z>tt", "should be true"));
}

testSimpleCheckTrue();
testSimpleCheckFails();
testDisjunction();
testConjunction();
testExists();
testForAll();
testOthers();

console.log("-- tests ok");
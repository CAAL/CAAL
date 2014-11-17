
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

function checkFormula(program, processName, strFormula) {
    var graph = new CCSParser.parse(program, {ccs: CCS}),
        succGen = getStrictSuccGenerator(graph),
        formula = HMLParser.parse(strFormula, {ccs: ccs, hml: hml}).getAllFormulas()[0];
    return dgMod.checkFormula(formula, succGen, graph.processByName(processName).id);
}

QUnit.module("Model Checking Tests");

QUnit.test("test SimpleCheckTrue", function ( assert ) {
    assert.ok(checkFormula("P = a.b.c.0;", "P", "<a><b><c>tt"), "should be true");
});

QUnit.test("test SimpleCheckFails", function ( assert ) {
    assert.ok(! checkFormula("P = a.b.c.0;", "P", "<a><q><c>tt"), "should be false");
});

QUnit.test("test Disjunction", function ( assert ) {
    assert.ok(  checkFormula("P = a.0 + b.0;", "P", "<x>tt or <b>tt"), "should be true");
    assert.ok(! checkFormula("P = a.0 + b.0;", "P", "<x>tt or <c>tt"), "should be false");
});

QUnit.test("test Conjunction", function ( assert ) {
    assert.ok(  checkFormula("P = a.0 + b.0;", "P", "<a>tt and <b>tt"), "should be true");
    assert.ok(! checkFormula("P = a.0 + b.0;", "P", "<a>tt and <c>tt"), "should be false");
});

QUnit.test("test Exists", function ( assert ) {
    assert.ok(  checkFormula("P = a.b.x.P + a.b.y.P;", "P", "<a><b><y>tt"), "should be true");
    assert.ok(! checkFormula("P = a.b.x.P + a.w.y.P;", "P", "<a><b><y>tt"), "should be false");
});

QUnit.test("test ForAll", function ( assert ) {
    assert.ok(  checkFormula("P = a.x.P;", "P", "[a][y]ff"), "should be true");
    assert.ok(! checkFormula("P = a.y.P;", "P", "[a][y]ff"), "should be false");
});

QUnit.test("test Others", function ( assert ) {
    assert.ok(checkFormula(
        "P = a.Q + a.R + y.P;" + "Q = b.P;" + "R = b.P;",
        "P",
        "[a]<b>[z]ff"), "should be true");

    assert.ok(checkFormula("P = ('a.b.c.P | a.b.P) \\ {a};", "P", "<tau>[b](<b>tt or <c>tt)"), "should be true");
    assert.ok(checkFormula("P = (a.'b.c.0) [x/a, y/b, z/c];", "P", "<x><'y><z>tt", "should be true"));
});

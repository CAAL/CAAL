
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
        formulaSet = HMLParser.parse(strFormula, {ccs: ccs, hml: hml}),
        formula = formulaSet.getAllFormulas()[0];
    return dgMod.solveMuCalculus(formulaSet, formula, succGen, graph.processByName(processName).id);
}

QUnit.module("Model Checking Tests");

QUnit.test("SimpleCheck", function ( assert ) {
    assert.ok(checkFormula("P = a.b.c.0;", "P", "<a><b><c>tt"), "should be true");
    assert.ok(! checkFormula("P = a.b.c.0;", "P", "<a><q><c>tt"), "should be false");
});

QUnit.test("Disjunction", function ( assert ) {
    assert.ok(  checkFormula("P = a.0 + b.0;", "P", "<x>tt or <b>tt"), "should be true");
    assert.ok(! checkFormula("P = a.0 + b.0;", "P", "<x>tt or <c>tt"), "should be false");
});

QUnit.test("Conjunction", function ( assert ) {
    assert.ok(  checkFormula("P = a.0 + b.0;", "P", "<a>tt and <b>tt"), "should be true");
    assert.ok(! checkFormula("P = a.0 + b.0;", "P", "<a>tt and <c>tt"), "should be false");
});

QUnit.test("Exists", function ( assert ) {
    assert.ok(  checkFormula("P = a.b.x.P + a.b.y.P;", "P", "<a><b><y>tt"), "should be true");
    assert.ok(! checkFormula("P = a.b.x.P + a.w.y.P;", "P", "<a><b><y>tt"), "should be false");
});

QUnit.test("ForAll", function ( assert ) {
    assert.ok(  checkFormula("P = a.x.P;", "P", "[a][y]ff"), "should be true");
    assert.ok(! checkFormula("P = a.y.P;", "P", "[a][y]ff"), "should be false");
});

QUnit.test("Others (simple)", function ( assert ) {
    assert.ok(checkFormula(
        "P = a.Q + a.R + y.P;" + "Q = b.P;" + "R = b.P;",
        "P",
        "[a]<b>[z]ff"), "should be true");

    assert.ok(checkFormula("P = ('a.b.c.P | a.b.P) \\ {a};", "P", "<tau>[b](<b>tt or <c>tt)"), "should be true");
    assert.ok(checkFormula("P = (a.'b.c.0) [x/a, y/b, z/c];", "P", "<x><'y><z>tt", "should be true"));
});

QUnit.test("Minimal fixed point", function ( assert ) {
    assert.ok(checkFormula("P = a.0;", "P", "X min= <a>tt"), "should be true");
    assert.ok(!checkFormula("P = a.P;", "P", "X min= X"), "should be false");
    assert.ok(!checkFormula("P = a.P;", "P", "X min= <a>X"), "should be false");
    assert.ok(checkFormula("P = a.P + b.0;", "P", "X min= <a>X or <b>tt"), "should be true");
    assert.ok(checkFormula("P = a.P + b.0;", "P", "X min= [a]X or <b>tt"), "should be true");
});

// console.log(checkFormula("P = a.a.a.a.a.a.P;", "P", "X min= <a>ff or Y; Y min= <a>ff"));
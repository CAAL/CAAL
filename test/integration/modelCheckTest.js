
var tvs = Traverse,
    dgMod = DependencyGraph,
    ccs = CCS,
    hml = HML;

function checkFormula(program, processName, strFormula) {
    var graph = new CCSParser.parse(program, {ccs: CCS}),
        strongSuccGen = ccs.getSuccGenerator(graph, {succGen: "strong", reduce: true}),
        weakSuccGen = new tvs.WeakSuccessorGenerator(strongSuccGen),
        formulaSet = HMLParser.parse(strFormula, {ccs: ccs, hml: hml}),
        formula = formulaSet.getAllFormulas()[0];
    return dgMod.solveMuCalculus(formulaSet, formula, strongSuccGen, weakSuccGen, graph.processByName(processName).id);
}

function checkFormulaForVariable(program, processName, strFormula, formulaVar) {
    var graph = new CCSParser.parse(program, {ccs: CCS}),
        strongSuccGen = ccs.getSuccGenerator(graph, {succGen: "strong", reduce: true}),
        weakSuccGen = new tvs.WeakSuccessorGenerator(strongSuccGen),
        formulaSet = HMLParser.parse(strFormula, {ccs: ccs, hml: hml}),
        formula = formulaSet.formulaByName(formulaVar);
    return dgMod.solveMuCalculus(formulaSet, formula, strongSuccGen, weakSuccGen, graph.processByName(processName).id);
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

QUnit.test("Action Matching", function ( assert ) {
    assert.ok(  checkFormula("P = 'a.b.P;", "P", "<'a><b>tt"), "should be true");
    assert.ok(  checkFormula("P = a.'b.P;", "P", "<a,'b><a,'b>tt"), "should be true");
    assert.ok(  checkFormula("P = a.b.P;", "P", "<b,a><a,b>tt"), "should be true");
    assert.ok(  checkFormula("P = a.b.P;", "P", "<a,b><b,a>tt"), "should be true");
    assert.ok(! checkFormula("P = a.b.P;", "P", "<a,b><c,a>tt"), "should be false");
    assert.ok(  checkFormula("P = a.'b.P;", "P", "<-><->tt"), "should be true");
    assert.ok(  checkFormula("P = a.b.P;", "P", "<a><->tt"), "should be true");
    assert.ok(  checkFormula("P = a.b.P;", "P", "<-><b>tt"), "should be true");
    assert.ok(! checkFormula("P = a.b.P;", "P", "<-><c>tt"), "should be false");
});

QUnit.test("Strong Exists", function ( assert ) {
    assert.ok(  checkFormula("P = a.b.x.P + a.b.y.P;", "P", "<a><b><y>tt"), "should be true");
    assert.ok(! checkFormula("P = a.b.x.P + a.w.y.P;", "P", "<a><b><y>tt"), "should be false");
    assert.ok(  checkFormula("P = a.b.P;", "P", "<-><b>tt"), "should be true");
    assert.ok(  checkFormula("P = a.b.P;", "P", "<a><->tt"), "should be true");
});

QUnit.test("Strong ForAll", function ( assert ) {
    assert.ok(  checkFormula("P = a.x.P;", "P", "[a][y]ff"), "should be true");
    assert.ok(! checkFormula("P = a.y.P;", "P", "[a][y]ff"), "should be false");
    assert.ok(  checkFormula("P = a.b.P;", "P", "[a][b]tt"), "should be true");
    assert.ok(! checkFormula("P = a.b.P;", "P", "[-]ff"), "should be false");
1});

QUnit.test("Weak Exists", function ( assert ) {
    assert.ok(  checkFormula("P = a.x.P;", "P", "<<a>><<x>>tt", "should be true"));
    assert.ok(  checkFormula("P = a.tau.x.P;", "P", "<<a>><<x>>tt"), "should be true");
    assert.ok(  checkFormula("P = tau.a.x.P;", "P", "<<a>><<x>>tt"), "should be true");
    assert.ok(  checkFormula("P = a.x.tau.P;", "P", "<<a>><<x>>tt"), "should be true");
    assert.ok(  checkFormula("P = tau.tau.a.tau.tau.b.tau.0;", "P", "<<a>><<b>>tt"), "should be true");
    assert.ok(! checkFormula("P = a.tau.x.P;", "P", "<<a>><<y>>tt"), "should be false");
    assert.ok(! checkFormula("P = a.tau.x.P;", "P", "<<b>><<->>tt"), "should be false");
    assert.ok(! checkFormula("P = a.tau.x.P;", "P", "<<a>><<b>>ff"), "should be false");
});

QUnit.test("Weak ForAll", function ( assert ) {
    assert.ok(  checkFormula("P = a.x.P;", "P", "[[a]][[x]]<<a>>tt"), "should be true");
    assert.ok(  checkFormula("P = a.tau.x.P;", "P", "[[a]][[x]]<<a>>tt"), "should be true");
    assert.ok(! checkFormula("P = a.tau.x.P;", "P", "[[a]][[x]]ff"), "should be false");
    assert.ok(! checkFormula("P = tau.a.x.P;", "P", "[[a]][[x]]ff"), "should be false");
    assert.ok(! checkFormula("P = a.tau.tau.y.P;", "P", "[[a]][[y]]ff"), "should be false")
});

QUnit.test("Others (simple)", function ( assert ) {
    assert.ok(checkFormula(
        "P = a.Q + a.R + y.P;" + "Q = b.P;" + "R = b.P;",
        "P",
        "[a]<b>[z]ff"), "should be true");

    assert.ok(checkFormulaForVariable(
        "P = a.tau.b.P + c.tau.b.P;",
        "P",
        "X max= <<a>>[[b]]X and Y; Y min=<<c>><<b>>tt;",
        "X"
        ), "should be true");

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

QUnit.test("Maximal fixed point", function ( assert ) {
    assert.ok(checkFormula("P = a.0;", "P", "X max= <a>tt"), "should be true");
    assert.ok(checkFormula("P = a.P;", "P", "X max= X"), "should be true");
    assert.ok(checkFormula("P = a.P;", "P", "X max= <a>X"), "should be true");
    assert.ok(checkFormula("P = a.P + b.0;", "P", "X max= <a>X or <b>tt"), "should be true");
    assert.ok(checkFormula("P = a.P + b.0;", "P", "X max= [a]X or <b>tt"), "should be true");

    var lts = "S = a.S1; S1 = b.S; S2 = a.S1 + a.S3; S3 = b.S3;";
    var formulaStr = "X max= <a>Y and [a]Y and [b]ff; Y max= <b>X and [b]X and [a]ff;";
    assert.ok(checkFormulaForVariable(lts, "S", formulaStr, "X"), "X should hold for S");
    assert.ok(!checkFormulaForVariable(lts, "S", formulaStr, "Y"), "Y should not hold for S");
    assert.ok(!checkFormulaForVariable(lts, "S1", formulaStr, "X"), "X should not hold for S1");
    assert.ok(checkFormulaForVariable(lts, "S1", formulaStr, "Y"), "Y should hold for S1");
});

QUnit.test("Nested fixed points", function ( assert ) {
    var lts = "S = a.S1 + a.S2; S1 = b.S2; S2 = b.S2; T = a.T1; T1 = a.T1 + a.T2; T2 = 0;";
    var formulaStr = "X max= <b>tt and [b]X; Y min= <b>tt or <a>Y or <b>Y;";

    assert.ok(checkFormulaForVariable(lts, "S1", formulaStr, "X"), "X should hold for S1");
    assert.ok(checkFormulaForVariable(lts, "S2", formulaStr, "X"), "X should hold for S2");
    assert.ok(!checkFormulaForVariable(lts, "S", formulaStr, "X"), "X should not hold for S");

    assert.ok(checkFormulaForVariable(lts, "S", formulaStr, "Y"), "Y should hold for S");
    assert.ok(!checkFormulaForVariable(lts, "T", formulaStr, "Y"), "Y should not hold for T");
});
var tvs = Traverse,
    dgMod = DependencyGraph,
    ccs = CCS,
    hml = HML;

function getStrictSuccGenerator(graph) {
    return CCS.getSuccGenerator(graph, {succGen: "strong", reduce: true});
}

function getWeakSuccGenerator(graph) {
    return CCS.getSuccGenerator(graph, {succGen: "weak", reduce: true})
}

QUnit.module("Trace Tests");

QUnit.test("Simple strong trace equivalence", function ( assert ) {
    var graph = CCSParser.parse("P = a.(b.0 + c.0); Q = a.b.0 + a.c.0;", {ccs: CCS}),
        strongSuccGen = getStrictSuccGenerator(graph),
        processP = graph.processByName("P"),
        processQ = graph.processByName("Q");
    assert.ok(Equivalence.isTraceIncluded(strongSuccGen, strongSuccGen, processP.id, processQ.id, graph).isSatisfied, "P should be trace included in Q");
    assert.ok(Equivalence.isTraceIncluded(strongSuccGen, strongSuccGen, processQ.id, processP.id, graph).isSatisfied, "Q should be trace included in P");
});

QUnit.test("Simple one way inclusion", function ( assert ) {
    var graph = CCSParser.parse("P = a.0; Q = a.0 + b.0;", {ccs: CCS}),
        strongSuccGen = getStrictSuccGenerator(graph),
        processP = graph.processByName("P"),
        processQ = graph.processByName("Q");
    assert.ok(Equivalence.isTraceIncluded(strongSuccGen, strongSuccGen, processP.id, processQ.id, graph).isSatisfied, "P should be trace included in Q");
    assert.ok(!Equivalence.isTraceIncluded(strongSuccGen, strongSuccGen, processQ.id, processP.id, graph).isSatisfied, "Q should not be trace included in P");
});

QUnit.test("Simple weak trace inclusion", function ( assert ) {
    var graph = CCSParser.parse("P = a.tau.0; Q = a.0;", {ccs: CCS}),
        strongSuccGen = getStrictSuccGenerator(graph),
        weakSuccGen = getWeakSuccGenerator(graph),
        processP = graph.processByName("P"),
        processQ = graph.processByName("Q");
    assert.ok(!Equivalence.isTraceIncluded(strongSuccGen, strongSuccGen, processP.id, processQ.id, graph).isSatisfied, "P should not be strongly trace included in Q");
    assert.ok(Equivalence.isTraceIncluded(weakSuccGen, weakSuccGen, processP.id, processQ.id, graph).isSatisfied, "P should be weakly trace included in Q");
});

QUnit.test("Peterson", function ( assert ) {
    var peterson = "* Peterson's algorithm for mutual exclusion.\n" +
                 "* See Chapter 7 of \"Reactive Systems\" for a full description.\n" +
                 "\n" +
                 "B1f = 'b1rf.B1f + b1wf.B1f + b1wt.B1t;\n" +
                 "B1t = 'b1rt.B1t + b1wf.B1f + b1wt.B1t;\n" +
                 "\n" +
                 "B2f = 'b2rf.B2f + b2wf.B2f + b2wt.B2t;\n" +
                 "B2t = 'b2rt.B2t + b2wf.B2f + b2wt.B2t;\n" +
                 "\n" +
                 "K1 = 'kr1.K1 + kw1.K1 + kw2.K2;\n" +
                 "K2 = 'kr2.K2 + kw1.K1 + kw2.K2;\n" +
                 "\n" +
                 "P1 = 'b1wt.'kw2.P11;\n" +
                 "P11 = b2rf.P12 + b2rt.(kr2.P11 + kr1.P12);\n" +
                 "P12 = enter1.exit1.'b1wf.P1;\n" +
                 "\n" +
                 "P2 = 'b2wt.'kw1.P21;\n" +
                 "P21 = b1rf.P22 + b1rt.(kr1.P21 + kr2.P22);\n" +
                 "P22 = enter2.exit2.'b2wf.P2;\n" +
                 "\n" +
                 "set L = {b1rf, b2rf, b1rt, b2rt, b1wf, b2wf, b1wt, b2wt, kr1, kr2, kw1, kw2};\n" +
                 "Peterson = (P1 | P2 | B1f | B2f | K1) \\ L;\n" +
                 "\n" +
                 "Spec = enter1.exit1.Spec + enter2.exit2.Spec;";
    var graph = CCSParser.parse(peterson, {ccs: CCS});
    var attackSuccGen = CCS.getSuccGenerator(graph, {succGen: "weak", reduce: true});
    var defendSuccGen = attackSuccGen;
    var leftProcess = graph.processByName("Spec");
    var rightProcess = graph.processByName("Peterson");
    var isTraceIncluded = Equivalence.isTraceIncluded(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id, graph);
    var traceDg = new Equivalence.TraceDG(leftProcess.id, rightProcess.id, attackSuccGen);
    var marking = DependencyGraph.liuSmolkaLocal2(0, traceDg);
    assert.ok(marking.getMarking(0) === marking.ZERO);
});


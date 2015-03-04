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
    assert.ok(dgMod.isTraceIncluded(strongSuccGen, strongSuccGen, processP.id, processQ.id, graph), "P should be trace included in Q");
    assert.ok(dgMod.isTraceIncluded(strongSuccGen, strongSuccGen, processQ.id, processP.id, graph), "Q should be trace included in P");
});

QUnit.test("Simple one way inclusion", function ( assert ) {
    var graph = CCSParser.parse("P = a.0; Q = a.0 + b.0;", {ccs: CCS}),
        strongSuccGen = getStrictSuccGenerator(graph),
        processP = graph.processByName("P"),
        processQ = graph.processByName("Q");
    assert.ok(dgMod.isTraceIncluded(strongSuccGen, strongSuccGen, processP.id, processQ.id, graph), "P should be trace included in Q");
    assert.ok(!dgMod.isTraceIncluded(strongSuccGen, strongSuccGen, processQ.id, processP.id, graph), "Q should not be trace included in P");
});

QUnit.test("Simple weak trace inclusion", function ( assert ) {
    var graph = CCSParser.parse("P = a.tau.0; Q = a.0;", {ccs: CCS}),
        strongSuccGen = getStrictSuccGenerator(graph),
        weakSuccGen = getWeakSuccGenerator(graph),
        processP = graph.processByName("P"),
        processQ = graph.processByName("Q");
    assert.ok(!dgMod.isTraceIncluded(strongSuccGen, strongSuccGen, processP.id, processQ.id, graph), "P should not be strongly trace included in Q");
    assert.ok(dgMod.isTraceIncluded(weakSuccGen, weakSuccGen, processP.id, processQ.id, graph), "P should be weakly trace included in Q");
});



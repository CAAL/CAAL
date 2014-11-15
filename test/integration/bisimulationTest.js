
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

function getWeakSuccGenerator(graph) {
    var strictGenerator = new ccs.StrictSuccessorGenerator(graph),
        treeReducer = new tvs.ProcessTreeReducer(graph),
        reducingGenerator = new tvs.ReducingSuccessorGenerator(strictGenerator, treeReducer),
        weakGenerator = new tvs.WeakSuccessorGenerator(reducingGenerator);
    return weakGenerator;
}

QUnit.module("Bisimulation Tests");

QUnit.test("Simple not bisimilar", function ( assert ) {
    var graph = CCSParser.parse("P = a.(b.0 + c.0); Q = a.b.0 + a.c.0;", {ccs: CCS}),
        succGen = getStrictSuccGenerator(graph),
        processP = graph.processByName("P"),
        processQ = graph.processByName("Q");
    assert.ok(!dgMod.isBisimilar(succGen, processP.id, processQ.id), "P and Q should not be bisimilar");
});

QUnit.test("Simple bisimilar", function ( assert ) {
    var graph = CCSParser.parse("P = a.(b.0 + c.0); Q = a.(b.0 + c.0) + a.(c.0 + b.0);", {ccs: CCS}),
        succGen = getStrictSuccGenerator(graph),
        processP = graph.processByName("P"),
        processQ = graph.processByName("Q");
    assert.ok(dgMod.isBisimilar(succGen, processP.id, processQ.id), "P and Q should be bisimilar");
});

QUnit.test("Tau Cycles", function ( assert ) {
    var graph = CCSParser.parse(
            "P = tau.a.tau.b.tau.P;\n" +
            "Q = a.b.Q;\n", {ccs: ccs}),
        succGen = getWeakSuccGenerator(graph),
        processP = graph.processByName("P"),
        processQ = graph.processByName("Q");
    assert.ok(dgMod.isBisimilar(succGen, processP.id, processQ.id), "P and Q should be weakly bisimilar");
});

QUnit.test("Alternative Bit Protocol", function ( assert) {
    var graph = CCSParser.parse(
            "* Sender\n" +
            "agent Send0 = acc.Sending0;\n" +
            "agent Sending0 = 'left0.Sending0 + leftAck0.Send1 + leftAck1.Sending0;\n" +
            "agent Send1 = acc.Sending1;\n" +
            "agent Sending1 = 'left1.Sending1 + leftAck1.Send0 + leftAck0.Sending1;\n" +
            "\n" +
            "* Receiver\n" +
            "agent Received0 = 'del.RecvAck1;\n" +
            "agent Received1 = 'del.RecvAck0;\n" +
            "agent RecvAck0 = right0.Received0 + right1.RecvAck0 + 'rightAck1.RecvAck0;\n" +
            "agent RecvAck1 = right1.Received1 + right0.RecvAck1 + 'rightAck0.RecvAck1;\n" +
            "\n" +
            "* Medium\n" +
            "agent Med = MedTop | MedBot;\n" +
            "agent MedBot = left0.MedBotRep0 + left1.MedBotRep1;\n" +
            "agent MedBotRep0 = 'right0.MedBotRep0 + tau.MedBot;\n" +
            "agent MedBotRep1 = 'right1.MedBotRep1 + tau.MedBot;\n" +
            "agent MedTop = rightAck0.MedTopRep0 + rightAck1.MedTopRep1;\n" +
            "agent MedTopRep0 = 'leftAck0.MedTopRep0 + tau.MedTop;\n" +
            "agent MedTopRep1 = 'leftAck1.MedTopRep1 + tau.MedTop;\n" +
            "\n" +
            "* Protocol and specification\n" +
            "set InternalComActs = {left0, left1, right0, right1, leftAck0, leftAck1, rightAck0, rightAck1};\n" +
            "agent Protocol = (Send0 | Med | RecvAck0) \\ InternalComActs;\n" +
            "agent Spec = acc.'del.Spec;", {ccs: ccs}),
        succGen = getWeakSuccGenerator(graph),
        protocol = graph.processByName("Protocol").id,
        spec = graph.processByName("Spec").id;
    assert.ok(dgMod.isBisimilar(succGen, protocol, spec), "ABP Protocol should be bisimilar with Spec");
});

QUnit.test("Alternative Bit Protocol", function ( assert) {
    var graph = CCSParser.parse(
            "* Sender\n" +
            "agent Send0 = acc.Sending0;\n" +
            "agent Sending0 = 'left0.Sending0 + leftAck0.Send1 + leftAck1.Sending0;\n" +
            "agent Send1 = acc.Sending1;\n" +
            "agent Sending1 = 'left1.Sending1 + leftAck1.Send0 + leftAck0.Sending1;\n" +
            "\n" +
            "* Receiver\n" +
            "agent Received0 = 'del.RecvAck1;\n" +
            "agent Received1 = 'del.RecvAck0;\n" +
            "agent RecvAck0 = right0.Received0 + right1.RecvAck0 + 'rightAck1.RecvAck0;\n" +
            "agent RecvAck1 = right1.Received1 + right0.RecvAck1 + 'rightAck0.RecvAck1;\n" +
            "\n" +
            "* Medium\n" +
            "agent Med = MedTop | MedBot;\n" +
            "agent MedBot = left0.MedBotRep0 + left1.MedBotRep1;\n" +
            "agent MedBotRep0 = 'right0.MedBotRep0 + MedBot;\n" + //Removed tau
            "agent MedBotRep1 = 'right1.MedBotRep1 + MedBot;\n" + //Removed tau
            "agent MedTop = rightAck0.MedTopRep0 + rightAck1.MedTopRep1;\n" +
            "agent MedTopRep0 = 'leftAck0.MedTopRep0 + MedTop;\n" + //Removed tau
            "agent MedTopRep1 = 'leftAck1.MedTopRep1 + MedTop;\n" + //Removed tau
            "\n" +
            "* Protocol and specification\n" +
            "set InternalComActs = {left0, left1, right0, right1, leftAck0, leftAck1, rightAck0, rightAck1};\n" +
            "agent Protocol = (Send0 | Med | RecvAck0) \\ InternalComActs;\n" +
            "agent Spec = acc.'del.Spec;", {ccs: ccs}),
        succGen = getWeakSuccGenerator(graph),
        protocol = graph.processByName("Protocol").id,
        spec = graph.processByName("Spec").id;
    assert.ok(dgMod.isBisimilar(succGen, protocol, spec), "Modified ABP Protocol should be bisimilar with Spec");
});


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
    assert.ok(!dgMod.isBisimilar(succGen, processP.id, processQ.id, graph), "P and Q should not be bisimilar");
});

QUnit.test("Simple bisimilar", function ( assert ) {
    var graph = CCSParser.parse("P = a.(b.0 + c.0); Q = a.(b.0 + c.0) + a.(c.0 + b.0);", {ccs: CCS}),
        succGen = getStrictSuccGenerator(graph),
        processP = graph.processByName("P"),
        processQ = graph.processByName("Q");
    assert.ok(dgMod.isBisimilar(succGen, processP.id, processQ.id, graph), "P and Q should be bisimilar");
});

QUnit.test("Weak bisimilar fail", function ( assert ) {
    var graph = CCSParser.parse("S = tau.S1 + a.S3; S1 = tau.S + tau.S2 + b.S4; S2 = tau.S1 + tau.S5; S3 = 0; S4 = 0; S5 = 0; T = tau.T1 + a.T2 + b.T3; T1 = tau.T1; T2 = 0; T3 = 0;", {ccs: CCS}),
        succGen = getWeakSuccGenerator(graph),
        processP = graph.processByName("S"),
        processQ = graph.processByName("T");
    assert.ok(dgMod.isBisimilar(succGen, processP.id, processQ.id, graph), "S and T should be weakly bisimilar");
});

QUnit.test("Tau Cycles", function ( assert ) {
    var graph = CCSParser.parse(
            "P = tau.a.tau.b.tau.P;\n" +
            "Q = a.b.Q;\n", {ccs: ccs}),
        succGen = getWeakSuccGenerator(graph),
        processP = graph.processByName("P"),
        processQ = graph.processByName("Q");
    assert.ok(dgMod.isBisimilar(succGen, processP.id, processQ.id, graph), "P and Q should be weakly bisimilar");
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
    assert.ok(dgMod.isBisimilar(succGen, protocol, spec, graph), "ABP Protocol should be bisimilar with Spec");
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
    assert.ok(dgMod.isBisimilar(succGen, protocol, spec, graph), "Modified ABP Protocol should be bisimilar with Spec");
});


QUnit.test("Performance Test ABP vs. ABP", function ( assert) {
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
            "* Sender\n" +
            "agent ZSend0 = acc.ZSending0;\n" +
            "agent ZSending0 = 'left0.ZSending0 + leftAck0.ZSend1 + leftAck1.ZSending0;\n" +
            "agent ZSend1 = acc.ZSending1;\n" +
            "agent ZSending1 = 'left1.ZSending1 + leftAck1.ZSend0 + leftAck0.ZSending1;\n" +
            "\n" +
            "* Receiver\n" +
            "agent ZReceived0 = 'del.ZRecvAck1;\n" +
            "agent ZReceived1 = 'del.ZRecvAck0;\n" +
            "agent ZRecvAck0 = right0.ZReceived0 + right1.ZRecvAck0 + 'rightAck1.ZRecvAck0;\n" +
            "agent ZRecvAck1 = right1.ZReceived1 + right0.ZRecvAck1 + 'rightAck0.ZRecvAck1;\n" +
            "\n" +
            "* Medium\n" +
            "agent ZMed = ZMedTop | ZMedBot;\n" +
            "agent ZMedBot = left0.ZMedBotRep0 + left1.ZMedBotRep1;\n" +
            "agent ZMedBotRep0 = 'right0.ZMedBotRep0 + tau.ZMedBot;\n" +
            "agent ZMedBotRep1 = 'right1.ZMedBotRep1 + tau.ZMedBot;\n" +
            "agent ZMedTop = rightAck0.ZMedTopRep0 + rightAck1.ZMedTopRep1;\n" +
            "agent ZMedTopRep0 = 'leftAck0.ZMedTopRep0 + tau.ZMedTop;\n" +
            "agent ZMedTopRep1 = 'leftAck1.ZMedTopRep1 + tau.ZMedTop;\n" +
            "\n" +
            "* Protocol and specification\n" +
            "set InternalComActs = {left0, left1, right0, right1, leftAck0, leftAck1, rightAck0, rightAck1};\n" +
            "agent Protocol = (Send0 | Med | RecvAck0) \\ InternalComActs;\n" +
            "agent ZProtocol = (ZSend0 | ZMed | ZRecvAck0) \\ InternalComActs;\n", {ccs: ccs}),
        succGen = getStrictSuccGenerator(graph),
        protocol = graph.processByName("Protocol").id,
        spec = graph.processByName("ZProtocol").id;
    assert.ok(dgMod.isBisimilar(succGen, protocol, spec, graph), "ABP Protocol should be bisimilar with Spec");
});

QUnit.test("Bad CM and CS", function ( assert) {
    var graph = CCSParser.parse(
            "agent CS1 = 'pub.CS2;\n"+
            "agent CS2 = 'coin.CS3;\n"+
            "agent CS3 = coffee.CS1;\n"+
            "agent CMbad = coin.'coffee.CMbad + coin.CMbad;\n"+
            "agent System = (CMbad | CS1) \\ {coffee, coin};\n"+
            "agent Spec = 'pub.Spec;", {ccs: ccs}),
        succGen = getWeakSuccGenerator(graph),
        protocol = graph.processByName("System").id,
        spec = graph.processByName("Spec").id;
    assert.ok(!dgMod.isBisimilar(succGen, protocol, spec, graph), "System and Spec is not be bisimilar");
});
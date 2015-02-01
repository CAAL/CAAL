
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

var program = "* Sender\n" +
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
    "agent ZProtocol = (ZSend0 | ZMed | ZRecvAck0) \\ InternalComActs;\n";


function bisimulation(graph) {
    var succGen = getStrictSuccGenerator(graph),
        protocol = graph.processByName("Protocol").id,
        spec = graph.processByName("ZProtocol").id;
    dgMod.isBisimilar(succGen, protocol, spec, graph);
};

var benchParsing = new Benchmark("Parsing", function () {
    CCSParser.parse(program, {ccs: ccs});
});

var benchBisim = new Benchmark("Strong Bisimulation", function () {
    bisimulation(graph);
}, {
    'setup': function () {
        var graph = CCSParser.parse(program, {ccs: ccs});
    }
});

var suite = new Benchmark.Suite();

suite
    .add(benchParsing)
    .add(benchBisim)
    .on('cycle', function (event) {
        onBenchmarkResult(event.target);
    })
    .on('complete', function () {
        onBenchmarkSuiteComplete(this);
    })
    .run({'async': true});

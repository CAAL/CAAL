/// <reference path="lib.webworker.d.ts" />
/// <reference path="../../lib/ccs.d.ts" />

declare var CCSParser;
declare var HMLParser;

importScripts("../ccs_grammar.js", "../hml_grammar.js", "../ccs.js");

var messageHandlers : any = {};
var graph;
var stop = false;

self.addEventListener("message", (event : MessageEvent) => {
    messageHandlers[event.data.type](event.data);
}, false);


messageHandlers.program = data => {
    graph = new CCS.Graph();
    CCSParser.parse(data.program, {ccs: CCS, graph: graph});
};

messageHandlers.isStronglyBisimilar = data => {
    var strongSuccGen = CCS.getSuccGenerator(graph, {succGen: "strong", reduce: true}),
        leftProcess = graph.processByName(data.leftProcess),
        rightProcess = graph.processByName(data.rightProcess),
        isBisimilar = DependencyGraph.isBisimilar(strongSuccGen, leftProcess.id, rightProcess.id, graph);
    //Add some kind of request id to determine for which problem have result? It is necessary? Right now just add the new data to the result.
    data.result = isBisimilar;
    self.postMessage(data);
};

messageHandlers.isWeaklyBisimilar = data => {
    var weakSuccGen = CCS.getSuccGenerator(graph, {succGen: "weak", reduce: true}),
        leftProcess = graph.processByName(data.leftProcess),
        rightProcess = graph.processByName(data.rightProcess),
        isBisimilar = DependencyGraph.isBisimilar(weakSuccGen, leftProcess.id, rightProcess.id, graph);
    data.result = isBisimilar;
    self.postMessage(data);
};

messageHandlers.checkFormula = data => {
    var succGen = data.useStrict ? CCS.getSuccGenerator(graph, {succGen: "strong", reduce: true}) : CCS.getSuccGenerator(graph, {succGen: "weak", reduce: true}),
        formulaSet = HMLParser.parse(data.formula, {ccs: CCS, hml: HML}),
        formula = formulaSet.getAllFormulas()[0],
        result = DependencyGraph.solveMuCalculus(formulaSet, formula, succGen, graph.processByName(data.processName).id);
    data.result = result;
    self.postMessage(data);
};

messageHandlers.checkFormulaForVariable = data => {  
    var succGen = data.useStrict ? CCS.getSuccGenerator(graph, {succGen: "strong", reduce: true}) : CCS.getSuccGenerator(graph, {succGen: "weak", reduce: true}),
        formulaSet = HMLParser.parse(data.formula, {ccs: CCS, hml: HML}),
        formula = formulaSet.formulaByName(data.variable),
        result = DependencyGraph.solveMuCalculus(formulaSet, formula, succGen, graph.processByName(data.processName).id);
    data.result = result;
    self.postMessage(data);
};

messageHandlers.stop = data => {
    self.close();
};

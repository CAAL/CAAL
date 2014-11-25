/// <reference path="../main.ts" />
/// <reference path="../ccs/ccs.ts" />
/// <reference path="../ccs/hml.ts" />
/// <reference path="../ccs/depgraph.ts" />

interface Worker {
    close();
}

declare var self : Worker; //TypeScript complains about, this but accepts it.
declare var CCSParser;
declare var HMLParser;

importScripts("../ccs_grammar.js", "../hml_grammar.js", "../main.js");

var messageHandlers : any = {};
var graph;
var stop = false;

self.addEventListener("message", event => {
    messageHandlers[event.data.type](event.data);
}, false);


messageHandlers.program = data => {
    graph = new CCS.Graph();
    CCSParser.parse(data.program, {ccs: CCS, graph: graph});
};

messageHandlers.isStronglyBisimilar = data => {
    var strongSuccGen = Main.getStrictSuccGenerator(graph),
        leftProcess = graph.processByName(data.leftProcess),
        rightProcess = graph.processByName(data.rightProcess),
        isBisimilar = DependencyGraph.isBisimilar(strongSuccGen, leftProcess.id, rightProcess.id, graph);
    //Add some kind of request id to determine for which problem have result? It is necessary? Right now just add the new data to the result.
    data.result = isBisimilar;
    self.postMessage(data);
};

messageHandlers.isWeaklyBisimilar = data => {
    var weakSuccGen = Main.getWeakSuccGenerator(graph),
        leftProcess = graph.processByName(data.leftProcess),
        rightProcess = graph.processByName(data.rightProcess),
        isBisimilar = DependencyGraph.isBisimilar(weakSuccGen, leftProcess.id, rightProcess.id, graph);
    data.result = isBisimilar;
    self.postMessage(data);
};

messageHandlers.checkFormula = data => {
    var succGen = data.useStrict ? Main.getStrictSuccGenerator(graph) : Main.getWeakSuccGenerator(graph),
        formulaSet = HMLParser.parse(data.formula, {ccs: CCS, hml: HML}),
        formula = formula.getAllFormulas()[0],
        result = DependencyGraph.solveMuCalculus(formulaSet, formula, succGen, graph.processByName(data.processName));
    data.result = result;
    self.postMessage(data);
};

messageHandlers.checkFormulaForVariable = data => {  
    var succGen = data.useStrict ? Main.getStrictSuccGenerator(graph) : Main.getWeakSuccGenerator(graph),
        formulaSet = HMLParser.parse(data.formula, {ccs: CCS, hml: HML}),
        formula = formula.formulaByName(data.variable),
        result = DependencyGraph.solveMuCalculus(formulaSet, formula, succGen, graph.processByName(data.processName));
    data.result = result;
    self.postMessage(data);
};

messageHandlers.stop = data => {
    self.close();
};

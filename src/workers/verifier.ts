/// <reference path="lib.webworker.d.ts" />
/// <reference path="../../lib/ccs.d.ts" />

declare var CCSParser;
declare var TCCSParser;
declare var HMLParser;
declare var THMLParser;

importScripts("../ccs_grammar.js", "../tccs_grammar.js", "../hml_grammar.js", "../thml_grammar.js", "../data.js", "../util.js", "../ccs.js");

var messageHandlers : any = {};
var graph;
var stop = false;
var inputMode;

self.addEventListener("message", (event : MessageEvent) => {
    messageHandlers[event.data.type](event.data);
}, false);


messageHandlers.program = data => {
    inputMode = data.inputMode;
    if (inputMode === "CCS") {
        graph = new CCS.Graph();
        CCSParser.parse(data.program, {ccs: CCS, graph: graph});
    } else if (inputMode === "TCCS") {
        graph = new TCCS.Graph();
        TCCSParser.parse(data.program, {ccs: CCS, tccs: TCCS, graph: graph});
    }
};

messageHandlers.isStronglyBisimilar = data => {
    var attackSuccGen = CCS.getSuccGenerator(graph, {inputMode: inputMode, succGen: "strong", reduce: true}),
        defendSuccGen = attackSuccGen,
        leftProcess = attackSuccGen.getProcessByName(data.leftProcess),
        rightProcess = defendSuccGen.getProcessByName(data.rightProcess),
        isBisimilar = Equivalence.isBisimilar(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id, graph);
    //Add some kind of request id to determine for which problem have result? It is necessary? Right now just add the new data to the result.
    data.result = isBisimilar;
    self.postMessage(data);
};

messageHandlers.isWeaklyBisimilar = data => {
    var attackSuccGen = CCS.getSuccGenerator(graph, {inputMode: inputMode, succGen: "strong", reduce: true}),
        defendSuccGen = CCS.getSuccGenerator(graph, {inputMode: inputMode, succGen: "weak", reduce: true}),
        leftProcess = attackSuccGen.getProcessByName(data.leftProcess),
        rightProcess = defendSuccGen.getProcessByName(data.rightProcess),
        isBisimilar = Equivalence.isBisimilar(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id, graph);
    data.result = isBisimilar;
    self.postMessage(data);
};

messageHandlers.isStronglySimilar = data => {
    var attackSuccGen = CCS.getSuccGenerator(graph, {inputMode: inputMode, succGen: "strong", reduce: true}),
        defendSuccGen = attackSuccGen,
        leftProcess = attackSuccGen.getProcessByName(data.leftProcess),
        rightProcess = defendSuccGen.getProcessByName(data.rightProcess),
        isSimilar = Equivalence.isSimilar(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id);
    data.result = isSimilar;
    self.postMessage(data);
};

messageHandlers.isWeaklySimilar = data => {
    var attackSuccGen = CCS.getSuccGenerator(graph, {inputMode: inputMode, succGen: "strong", reduce: true}),
        defendSuccGen = CCS.getSuccGenerator(graph, {inputMode: inputMode, succGen: "weak", reduce: true}),
        leftProcess = attackSuccGen.getProcessByName(data.leftProcess),
        rightProcess = defendSuccGen.getProcessByName(data.rightProcess),
        isSimilar = Equivalence.isSimilar(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id);
    data.result = isSimilar;
    self.postMessage(data);
};

messageHandlers.isStronglyTraceIncluded = data => {
    var attackSuccGen = CCS.getSuccGenerator(graph, {inputMode: inputMode, succGen: "strong", reduce: true});
    var defendSuccGen = attackSuccGen;
    var leftProcess = graph.processByName(data.leftProcess);
    var rightProcess = graph.processByName(data.rightProcess);
    // var isTraceIncluded = Equivalence.isTraceIncluded(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id, graph);
    var traceDg = new Equivalence.TraceDG(leftProcess.id, rightProcess.id, attackSuccGen);
    var marking = DependencyGraph.liuSmolkaLocal2(0, traceDg);
    
    data.result = {
        isTraceIncluded: marking.getMarking(0) === marking.ZERO,
        formula: traceDg.getDistinguishingFormula(marking)
    };
    self.postMessage(data);
};

messageHandlers.isWeaklyTraceIncluded = data => {
    var attackSuccGen = CCS.getSuccGenerator(graph, {inputMode: inputMode, succGen: "weak", reduce: true});
    var defendSuccGen = attackSuccGen;
    var leftProcess = graph.processByName(data.leftProcess);
    var rightProcess = graph.processByName(data.rightProcess);
    // var isTraceIncluded = Equivalence.isTraceIncluded(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id, graph);
    var traceDg = new Equivalence.TraceDG(leftProcess.id, rightProcess.id, attackSuccGen);
    var marking = DependencyGraph.liuSmolkaLocal2(0, traceDg);
    
    data.result = {
        isTraceIncluded: marking.getMarking(0) === marking.ZERO,
        formula: traceDg.getDistinguishingFormula(marking)
    };
    self.postMessage(data);
};

messageHandlers.isStronglyTraceEq = data => {
    var attackSuccGen = CCS.getSuccGenerator(graph, {inputMode: inputMode, succGen: "strong", reduce: true});
    var defendSuccGen = attackSuccGen;
    var leftProcess = graph.processByName(data.leftProcess);
    var rightProcess = graph.processByName(data.rightProcess);
    var isLeftTraceIncluded = Equivalence.isTraceIncluded(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id, graph);
    var isRightTraceIncluded = Equivalence.isTraceIncluded(attackSuccGen, defendSuccGen, rightProcess.id, leftProcess.id, graph);
    data.result = (isLeftTraceIncluded && isRightTraceIncluded);
    self.postMessage(data);
};

messageHandlers.isWeaklyTraceEq = data => {
    var attackSuccGen = CCS.getSuccGenerator(graph, {inputMode: inputMode, succGen: "weak", reduce: true});
    var defendSuccGen = attackSuccGen;
    var leftProcess = graph.processByName(data.leftProcess);
    var rightProcess = graph.processByName(data.rightProcess);
    var isLeftTraceIncluded = Equivalence.isTraceIncluded(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id, graph);
    var isRightTraceIncluded = Equivalence.isTraceIncluded(attackSuccGen, defendSuccGen, rightProcess.id, leftProcess.id, graph);
    data.result = (isLeftTraceIncluded && isRightTraceIncluded);
    self.postMessage(data);
};

function readFormulaSet(data) : HML.FormulaSet {
    var formulaSet = new HML.FormulaSet;
    if (inputMode === "CCS") {
        HMLParser.parse(data.definitions, {ccs: CCS, hml: HML, formulaSet: formulaSet});
        HMLParser.parse(data.formula, {startRule: "TopFormula", ccs: CCS, hml: HML, formulaSet: formulaSet});
    } else if (inputMode === "TCCS") {
        THMLParser.parse(data.definitions, {ccs: CCS, tccs: TCCS, hml: HML, formulaSet: formulaSet});
        THMLParser.parse(data.formula, {startRule: "TopFormula", ccs: CCS, tccs: TCCS, hml: HML, formulaSet: formulaSet});
    }
    return formulaSet;
}

messageHandlers.checkFormula = data => {
    var strongSuccGen = CCS.getSuccGenerator(graph, {inputMode: inputMode, succGen: "strong", reduce: true}),
        weakSuccGen = CCS.getSuccGenerator(graph, {inputMode: inputMode, succGen: "weak", reduce: true}),
        formulaSet = readFormulaSet(data),
        formula = formulaSet.getTopFormula(),
        result = DependencyGraph.solveMuCalculus(formulaSet, formula, strongSuccGen, weakSuccGen, graph.processByName(data.processName).id);
    data.result = result;
    self.postMessage(data);
};

messageHandlers.checkFormulaForVariable = data => {  
    var strongSuccGen = CCS.getSuccGenerator(graph, {inputMode: inputMode, succGen: "strong", reduce: true}),
        weakSuccGen = CCS.getSuccGenerator(graph, {inputMode: inputMode, succGen: "weak", reduce: true}),
        formulaSet = readFormulaSet(data),
        formula = formulaSet.getTopFormula(),
        result = DependencyGraph.solveMuCalculus(formulaSet, formula, strongSuccGen, weakSuccGen, graph.processByName(data.processName).id);
    data.result = result;
    self.postMessage(data);
};

messageHandlers.findDistinguishingFormula = data => {
    var strongSuccGen = CCS.getSuccGenerator(graph, {succGen: "strong", reduce: true}),
        weakSuccGen = data.succGenType === "weak" ? CCS.getSuccGenerator(graph, {succGen: "weak", reduce: true}) : strongSuccGen,
        leftProcess = strongSuccGen.getProcessByName(data.leftProcess),
        rightProcess = strongSuccGen.getProcessByName(data.rightProcess);
        var bisimilarDg = new Equivalence.BisimulationDG(strongSuccGen, weakSuccGen, leftProcess.id, rightProcess.id),
        marking = DependencyGraph.solveDgGlobalLevel(bisimilarDg),
        formula, hmlNotation;
    if (marking.getMarking(0) === marking.ZERO) {
        data.result = {
            isBisimilar: true,
            formula: ""
        };
    } else {
        formula = bisimilarDg.findDistinguishingFormula(marking, data.succGenType === "weak");
        hmlNotation = new Traverse.HMLNotationVisitor();
        data.result = {
            isBisimilar: false,
            formula: hmlNotation.visit(formula)
        };
    }
    self.postMessage(data);
};

messageHandlers.stop = data => {
    self.close();
};

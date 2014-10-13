
var ccs = CCS,
    tvs = Traverse,
    parser = CCSParser;

$(document).ready(function() {
    $("#parse").on("click", function () {
        var programText = editor.getValue(),
            graph = new ccs.Graph(),
            errors;
        parser.parse(programText, {ccs: ccs, graph: graph});
        console.log("Parsed program into AST: " + graph + " with definitions:");
        errors = graph.getErrors();
        if (errors.length > 0) {
            console.log(errors);
        } else {
            console.log(printListing(graph));
            console.log("Simulating process 'P' 5 times");
            simulate("P", graph, 5);
        }
    });
})

function printListing(graph) {
    var ccsnv = new tvs.CCSNotationVisitor();
    graph.getNamedProcesses().forEach(function (name) {
        console.log(name + " = " + ccsnv.visit(graph.processByName(name).subProcess));
    });
}

function simulate(processName, graph, ast, n) {
    n = n || 10;
    var program = graph.root;
    var sc = new ccs.SuccessorGenerator(graph, graph.cache.successors, graph);
    var ccsn = new tvs.CCSNotationVisitor();
    //Must run it on program to cache all variable definitions.
    var currentNode = graph.processByName(processName);
    if (!currentNode) throw "Process name '" + processName + "' not found";
    for (var i = 0; i < 5; i++) {
        var possibleTransitions = sc.visit(currentNode);

        var transitionsInArray = [];
        possibleTransitions.forEach(function (t) {
            transitionsInArray.push(t);
        });

        var randomTransition = transitionsInArray[Math.floor(Math.random() * transitionsInArray.length)];
        var from = ccsn.visit(currentNode);
        var to = ccsn.visit(randomTransition.targetProcess);
        console.log(from + "\t --- " + randomTransition.action + " --> \t" + to);
        currentNode = randomTransition.targetProcess;
    }
}

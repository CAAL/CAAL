
var ccs = CCS,
    tvs = Traverse,
    parser = CCSParser;

$(document).ready(function() {
    $("#parse").on("click", function () {
        var programText = editor.getValue(),
            graph = new ccs.Graph(),
            n = 10,
            errors;
        parser.parse(programText, {ccs: ccs, graph: graph});
        errors = graph.getErrors();
        if (errors.length > 0) {
            console.log(errors);
        } else {
            // console.log("Parsed program into AST: " + graph + " with definitions:");
            // printListing(graph, "\t");
            console.log("Simulating process 'Protocol' " + n + " times");
            simulate("Protocol", graph, n);
        }
    });
})

function printListing(graph, prefix) {
    var ccsnv = new tvs.CCSNotationVisitor();
    graph.getNamedProcesses().forEach(function (name) {
        console.log(prefix + name + " = " + ccsnv.visit(graph.processByName(name).subProcess));
    });
}

function simulate(processName, graph, n) {
    n = n || 10;
    var program = graph.root;
    var sc = new ccs.StrictSuccessorGenerator(graph, graph.cache.successors, graph);
    var ccsn = new tvs.CCSNotationVisitor();
    //Must run it on program to cache all variable definitions.
    var currentNode = graph.processByName(processName);
    if (!currentNode) throw "Process name '" + processName + "' not found";
    for (var i = 0; i < n; i++) {
        var possibleTransitions = sc.visit(currentNode);

        var transitionsInArray = [];
        possibleTransitions.forEach(function (t) {
            transitionsInArray.push(t);
        });

        var randomTransition = transitionsInArray[Math.floor(Math.random() * transitionsInArray.length)];
        if (!randomTransition) {
            console.log(graph);
            console.log("deadlock");
            break;
        }
        var from = ccsn.visit(currentNode);
        var to = ccsn.visit(randomTransition.targetProcess);
        console.log(from + "\t --- " + randomTransition.action + " --> \t" + to);
        currentNode = randomTransition.targetProcess;
    }
}

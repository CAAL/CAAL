
var ccs = CCS,
    tvs = Traverse,
    parser = CCSParser;

$(document).ready(function(){
    $("#parse").on("click", function () {
        var programText = editor.getValue(),
            graph = new ccs.Graph(),
            ast = parser.parse(programText, {ccs: ccs, graph: graph});
        console.log("Parsed program into AST: " + ast);
        process(graph, ast);
        console.log("Simulating process 'P' 5 times");
        simulate("P", graph, ast, 5);
    });
})

function process(graph, ast) {
    var lbn = new tvs.LabelledBracketNotation();
    console.log("Size of AST: " + ccs.postOrderTransform(ast, new tvs.SizeOfTree()) + "\n");

    var spt = new tvs.SharedParseTreeTraverser();
    ast = ccs.postOrderTransform(ast, spt);
    console.log("After Sharing: " + ccs.postOrderTransform(ast, lbn));

    var rpt = new tvs.ReducedParseTreeTraverser();
    ast = ccs.postOrderTransform(ast, rpt);
    console.log("After reductions: " + ccs.postOrderTransform(ast, lbn));

    var pp = new tvs.CCSNotation();
    console.log("Prettyprinting: " + ccs.postOrderTransform(ast, pp));
}

function simulate(processName, graph, ast, n) {
    n = n || 10;
    var successors = {};
    var program = graph.root;
    var sc = new ccs.SuccessorGenerator(successors, graph);
    //Must run it on program to cache all variable definitions.
    ccs.conditionalPostOrderTransform(program, sc, function (n) { return true; });
    var currentNode = graph.assignmentByVariable(processName);
    if (!currentNode) throw "Invalid process name";
    currentNode = currentNode.process;
    for (var i = 0; i < n; i++) {
        //Must run it on the current node since it may be attached independently of the original program.
        ccs.conditionalPostOrderTransform(currentNode, sc, function (n) { return true; });
        var transitionCandidates = successors[currentNode.id];
        var arrayCandidates = [];
        transitionCandidates.forEach(function (t) {
            arrayCandidates.push(t);
        });
        if (arrayCandidates.length === 0) {
            break;
        }
        var ct = arrayCandidates[Math.floor(Math.random() * arrayCandidates.length)];
        console.log(currentNode.id + " ---- " + (ct.complement ? "!" : "") + ct.label + " ----> " + ct.targetProcessId);
        currentNode = graph.nodeById(ct.targetProcessId);
    }
}

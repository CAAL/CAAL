/*libs Jquery, graphics is needed.*/
/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/arbor.d.ts" />
$(document).ready(function () {
    var env = new Environment();
    env.showTree();
});

var Environment = (function () {
    function Environment() {
        this.sys = arbor.ParticleSystem(700, 9000, 0.90);
        this.sys.parameters({ gravity: true });
        this.sys.renderer = new Renderer("#viewport");
        this.syntaxTree = null;
    }
    Environment.prototype.setSyntaxTree = function (syntaxTree) {
        this.syntaxTree = syntaxTree;
    };

    Environment.prototype.showTree = function () {
        // if(this.syntaxTree != null){ This should be uncommented at some point, when the environment is correctly initialized.
        // add some nodes to the graph and watch it go...
        this.sys.addNode('b', { label: "a.B" });
        this.sys.addNode('a', { label: "b.B" });
        this.sys.addNode('c', { label: "c.B" });

        this.sys.addEdge('b', 'a', { directed: true, label: "a" });
        this.sys.addEdge('a', 'a', { directed: true, label: "b" });
        this.sys.addEdge('a', 'b', { directed: true, label: "b" });
        this.sys.addEdge('c', 'b', { directed: true, label: "c" });
        //}
    };
    return Environment;
})();

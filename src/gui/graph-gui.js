/*libs Jquery, graphics is needed.*/
/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/arbor.d.ts" />
/// <reference path="./renderer.ts" />
$(document).ready(function () {
    var env = new Environment();
    env.init();
});

var Environment = (function () {
    function Environment() {
        this.sys = arbor.ParticleSystem(500, 3000, 0.90);
        this.sys.parameters({ gravity: true });
        this.renderer = new Renderer("#viewport");
        this.sys.renderer = this.renderer;
    }
    Environment.prototype.init = function () {
        this.sys.addNode('b', { label: "a.B" });
        this.sys.addNode('a', { label: "b.B" });
        this.sys.addNode('c', { label: "c.B" });

        this.sys.addEdge('b', 'a', { directed: true, label: "a" });
        this.sys.addEdge('a', 'a', { directed: true, label: "b" });
        this.sys.addEdge('a', 'b', { directed: true, label: "b" });
        this.sys.addEdge('c', 'b', { directed: true, label: "c" });
    };
    return Environment;
})();

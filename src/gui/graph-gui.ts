/*libs Jquery, graphics is needed.*/
/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/arbor.d.ts" />

$(document).ready(function(){
    var env = new Environment();
    env.showTree()
})

class Environment {
    private sys : ParticleSystem;
    private syntaxTree : any; //todo should not be any.
    
    constructor() {
        this.sys = arbor.ParticleSystem(700, 9000, 0.90);
        this.sys.parameters({gravity:true});
        this.sys.renderer = new Renderer("#viewport");
        this.syntaxTree = null;
    }

    setSyntaxTree(syntaxTree: any) : void{
        this.syntaxTree = syntaxTree;
    }

    showTree() : void{
        // if(this.syntaxTree != null){ This should be uncommented at some point, when the environment is correctly initialized.
            // add some nodes to the graph and watch it go...
            this.sys.addNode('b', {label: "asd.B"});
            this.sys.addNode('a', {label: "B"});
            this.sys.addNode('e', {label: "asd.B"});
            this.sys.addNode('c', {label: "c.B"});
            this.sys.addNode('d', {label: "d.B"});
            this.sys.addNode('q', {label: "q.B"});

            this.sys.addEdge('b','a', {directed:true, label:"bjjoijoij"});
            this.sys.addEdge('c','a', {directed:true, label:"joijoijc"});
            this.sys.addEdge('d','a', {directed:true, label:"djoijoij"});
            this.sys.addEdge('a','e', {directed:true, label:"e"});
            this.sys.addEdge('a','q', {directed:true, label:"e"});
        //}
    }
}




/*libs Jquery, graphics is needed.*/

$(document).ready(function(){
    env = new Environment();
    env.showTree()
})

class Environment {
    private sys : any;
    private syntaxTree : any; //todo should not be any.
    
    constructor() {
        this.sys = arbor.ParticleSystem(700, 9000, 0.90);
        this.sys.parameters({gravity:true})
        this.sys.renderer = new Renderer("#viewport");
        this.syntaxTree = null;
    }

    setSyntaxTree(syntaxTree: any){
        this.syntaxTree = syntaxTree;
    }

    showTree(tree : any){
        // if(this.syntaxTree != null){ This should be uncommented at some point, when the environment is correctly initialized.
            // add some nodes to the graph and watch it go...
            this.sys.addNode('b', {label: "b.B"});
            this.sys.addNode('a', {label: "B"});
            this.sys.addNode('e', {label: "e.B"});
            this.sys.addNode('c', {label: "c.B"});
            this.sys.addNode('d', {label: "d.B"});

            this.sys.addEdge('b','a', {directed:true, label:"b"});
            this.sys.addEdge('c','a', {directed:true, label:"c"});
            this.sys.addEdge('d','a', {directed:true, label:"d"});
            this.sys.addEdge('a','e', {directed:true, label:"e"});
        //}
    }
}




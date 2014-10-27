/*libs Jquery, graphics is needed.*/
/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/arbor.d.ts" />
/// <reference path="renderer.ts" />

$(document).ready(function(){
    var graph = new Graph(<Branch>{nodes:{foo:{label:'foo'}}, edges:{foo: {foo: {label: 'baz'}}, '1':{'foo':{label:'test'}}}});
    graph.init()
    $("#freezeButton").on("click", ()=>{
            graph.freeze.call(graph);
        });
})

class Graph {
    private sys : ParticleSystem;
    private renderer : Renderer;
    private nodes : Object; 
    private edges : Object;
    constructor(graphDefinition? : Branch) {
        this.sys = arbor.ParticleSystem(500, 3000, 0.95);
        this.sys.parameters({gravity:true});
        this.renderer = new Renderer("#viewport");
        this.sys.renderer = this.renderer
    }

    init() : void{
        var one  = this.renderer.addNodeToGraph('-1', {label: 'Node one'}); 
        var two = this.renderer.addNodeToGraph('0', {label: 'Node two'});

        this.renderer.addEdgeToGraph(one, two, {label: 'one'});
        this.renderer.addEdgeToGraph(one, two, {label: 'two'});
        this.renderer.addEdgeToGraph(two, one, {label: 'test'});
    }

    private isFrozen: boolean = false;
    
    public freeze(): void {
        if (!this.isFrozen) {
            this.sys.stop();
        } else {
            this.sys.start();
        }
        this.isFrozen = !this.isFrozen;
    }
}

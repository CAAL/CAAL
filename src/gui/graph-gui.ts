/*libs Jquery, graphics is needed.*/
/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/arbor.d.ts" />
/// <reference path="./renderer.ts" />

$(document).ready(function(){
    var graph = new Graph();
    graph.init()
})

class Graph {
    private sys : ParticleSystem;
    private renderer : Renderer;

    constructor() {
        this.sys = arbor.ParticleSystem(500, 3000, 0.95);
        this.sys.parameters({gravity:false});
        this.renderer = new Renderer("#viewport");
        this.sys.renderer = this.renderer
    }


    init() : void{
        this.sys.addNode('1', {label: "asd.B"}); 
    }
}

/*libs Jquery, graphics is needed.*/
/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/arbor.d.ts" />
/// <reference path="./renderer.ts" />

$(document).ready(function(){
    var env = new Environment();
    env.init()
})

class Environment {
    private sys : ParticleSystem;
    private renderer : Renderer;

    constructor() {
        this.sys = arbor.ParticleSystem(500, 3000, 0.90);
        this.sys.parameters({gravity:false});
        this.renderer = new Renderer("#viewport");
        this.sys.renderer = this.renderer
    }


    init() : void{
        this.sys.addNode('b', {label: "a.B"});
        this.sys.addNode('a', {label: "b.B"});
        this.sys.addNode('c', {label: "c.B"});

        this.sys.addEdge('b','a', {label:"a"});
        this.sys.addEdge('a','a', {label:"b"});
        this.sys.addEdge('a','b', {label:"b"});
        this.sys.addEdge('c','b', {label:"c"});

    }
}




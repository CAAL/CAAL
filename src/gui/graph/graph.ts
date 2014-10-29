/*libs Jquery, graphics is needed.*/
/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/arbor.d.ts" />
/// <reference path="renderer.ts" />

class ArborGraph {
    private sys : ParticleSystem;
    private renderer : Renderer;
    private nodes : Object; 
    private edges : Object;
    constructor(renderer) {
        this.sys = arbor.ParticleSystem(500, 3000, 0.95);
        this.sys.parameters({gravity:true});
        this.renderer = renderer;
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

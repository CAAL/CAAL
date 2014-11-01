/*libs Jquery, graphics is needed.*/
/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/arbor.d.ts" />
/// <reference path="renderer.ts" />

class ArborGraph {
    private sys : ParticleSystem;
    private renderer : Renderer;
    private handler : Handler;
    public onClick : Function = null;

    constructor(renderer) {
        this.sys = arbor.ParticleSystem(500, 3000, 0.95);
        this.sys.parameters({gravity:true});
        this.renderer = renderer;
        this.sys.renderer = renderer;
        this.handler = new Handler(renderer);

        this.handler.onClick = (nodeId) => {
            if (this.onClick) this.onClick(nodeId);
        };
    }

    public addNode(nodeId, data) {
        this.sys.addNode(nodeId, data);
    }

    public addEdge(nodeFromId, nodeToId, data) {
        //Arbor only allows one directed edge between two nodes.
        var edges = this.sys.getEdges(nodeFromId, nodeToId),
            edge = edges.length > 0 ? edges[0] : null;
        if (!edge) {
            edge = this.sys.addEdge(nodeFromId, nodeToId, data);
        }
        edge.data = data;
    }

    public clear() {
        this.sys.prune((node, from, to) => true);
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

class Handler {
    public draggedNode : refNode = null;
    //private that = this;
    public mp : Point;
    public pos;
    public canvas : HTMLCanvasElement;
    public particleSystem : ParticleSystem;
    private selected = null;
    private nearest = null;
    private dragged = null;
    private oldmass = 1
    public renderer : Renderer = null;


    constructor(renderer : Renderer, sys : ParticleSystem) {
        this.renderer = renderer;
        this.canvas = renderer.canvas;
        this.particleSystem = sys;
    }

    public init(){
        $(this.canvas).on("mousedown", {handler:this}, this.clicked);
    }

    public clicked(e : any): boolean {
        console.log("clicked");

        var h = e.data.handler; // get the instance of the handler.
        console.log(h.particleSystem);
        h.particleSystem.addNode("TEST", {label: "bal"});
        /*h.pos = $(this).offset();
        var p = {x:e.pageX-h.pos.left, y:e.pageY-h.pos.top};
        h.selected = h.nearest = h.dragged = h.particleSystem.nearest(p);

        if (h.selected.node !== null){
            // dragged.node.tempMass = 10000
            h.dragged.node.fixed = true;
        }
        */
        return false;
    }

    /*public moved(e : any): boolean {
        var old_nearest = nearest && nearest.node._id;
        var pos = $(this).offset();
        var s = {x:e.pageX-pos.left, y:e.pageY-pos.top};

        nearest = particleSystem.nearest(s);
        if (!nearest) return

        if (dragged !== null && dragged.node !== null){
            var p = particleSystem.fromScreen(s)
            dragged.node.p = {x:p.x, y:p.y}
            // dragged.tempMass = 10000
        }

        return false
    }*/

    /*public dropped(e : any): any {
        console.log("dropped");
        var h = e.data.handler;
        
        if (dragged===null || dragged.node===undefined) return
        
        h.dragged.node.fixed = false
        h.dragged.node.tempMass = 100
        h.dragged = null;
        h.selected = null
        return false
    } */
}
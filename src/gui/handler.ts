/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/arbor.d.ts" />
/// <reference path="./renderer.ts" />

class Handler {
    private draggedObject : refNode;
    private nearest : refNode;
    private mouseP : Point;
    constructor(public renderer : Renderer) {

    }

    public init(){
        $(this.renderer.canvas).on("mousedown",{handler: this}, this.clicked);
    }

    public clicked(e): boolean {
         var h = e.data.handler;

         var pos = $(h.renderer.canvas).offset();
         h.mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top);
         h.nearest = h.draggedObject = h.renderer.particleSystem.nearest(h.mouseP);
         h.renderer.selectedNode = h.draggedObject.node;

         if (h.dragged && h.dragged.node !== null){
             // while we're dragging, don't let physics move the node
             h.dragged.node.fixed = true;
         }

         if (h.renderer.selectedNode) {
             // just making sure that the selectedNode is not null
             h.renderer.expandGraph();
         }

         $(h.renderer.canvas).bind('mousemove',{handler: h}, h.dragged);
         $(window).bind('mouseup',{handler: h}, h.dropped);
    
        return  false;
    }

    public dragged(e): boolean {
        var h = e.data.handler;
        var pos = $(h.renderer.canvas).offset();
        var old_nearest = h.nearest && h.nearest.node._id
        var pos = $(h.renderer.canvas).offset();
        var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

        if (h.dragged !== null && h.dragged.node !== null){
            var p = h.renderer.particleSystem.fromScreen(s);
            h.dragged.node.p = p;
        }

        return false;
    }

    public droppen(e): boolean {
         var h = e.data.handler;
    
        return false;
    }
}
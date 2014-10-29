/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/arbor.d.ts" />
/// <reference path="renderer.ts" />

class Handler {
    public selectedNode : Node = null;
    public draggedObject : refNode = null;
    public nearest : refNode = null;
    public mouseP : Point = null;

    public renderer : Renderer = null;
    constructor(renderer : Renderer) {
        this.renderer = renderer;
    }

    public init(){
        $(this.renderer.canvas).on('mousedown', {handler: this}, this.clicked);
    }

    public clicked(e): boolean {
         var h = e.data.handler;

         var pos = $(h.renderer.canvas).offset();
         h.mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top);
         h.nearest = h.draggedObject = h.renderer.particleSystem.nearest(h.mouseP);
         h.selectedNode = h.draggedObject.node;

         if (h.draggedObject && h.draggedObject.node !== null){
             // while we're dragging, don't let physics move the node
             h.draggedObject.node.fixed = true;
         }

         if (h.selectedNode) {
             // just making sure that the selectedNode is not null
             h.renderer.expandGraph(); // test
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

        if (h.draggedObject !== null && h.draggedObject.node !== null){
            var p = h.renderer.particleSystem.fromScreen(s);
            h.draggedObject.node.p = p;
        }

        return false;
    }

    public dropped(e): any {
         var h = e.data.handler;
         if (h.draggedObject===null || h.draggedObject.node===undefined) {
             return;
         }
         
         if (h.draggedObject.node !== null) {
             h.draggedObject.node.fixed = false;
         }

         h.draggedObject = null;
         //that.selectedNode = null;

         $(h.renderer.canvas).unbind('mousemove', h.dragged);
         $(window).unbind('mouseup', h.dropped);
         h.mouseP = null;
    
        return false;
    }
}
/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/arbor.d.ts" />
/// <reference path="renderer.ts" />

class Handler {
    public selectedNode : Node = null;
    public draggedObject : refNode = null;
    public mouseP : Point = null;
    public onClick : Function = null;
    private isDragging = false;
    private mouseDownPos;
    public clickDistance = 50;

    public renderer : Renderer = null;

    constructor(renderer : Renderer) {
        this.renderer = renderer;
        $(this.renderer.canvas).bind('mousedown', {handler: this}, this.clicked);
    }

    public clicked(e): boolean {
        var h = e.data.handler;
        if (!h.renderer.particleSystem) {
            return false;
        }
        h.isDragging = false;

        var pos = $(h.renderer.canvas).offset();
        h.mouseDownPos = arbor.Point(e.pageX-pos.left, e.pageY-pos.top);
        h.mouseP = h.mouseDownPos;
        h.draggedObject = h.renderer.particleSystem.nearest(h.mouseP);
        h.selectedNode = h.draggedObject.node;

        if (h.selectedNode && h.draggedObject.distance <= h.clickDistance) {
            $(h.renderer.canvas).bind('mousemove', {handler: h}, h.dragged);
            $(window).bind('mouseup', {handler: h}, h.dropped);
        }
        return false;
    }

    public dragged(e): boolean {
        var h = e.data.handler;
        var pos = $(h.renderer.canvas).offset();
        var old_nearest = h.draggedObject && h.draggedObject.node._id
        var pos = $(h.renderer.canvas).offset();
        var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

        if (!h.isDragging && h.mouseDownPos.subtract(s).magnitude() > 10) {
            h.isDragging = true;
            h.selectedNode.fixed = true;
        }

        //Drag node visually around
        if (h.isDragging) {
            var p = h.renderer.particleSystem.fromScreen(s);
            h.selectedNode.p = p;
        }

        return false;
    }

    public dropped(e): any {
        var h = e.data.handler,
            nodeReference = h.selectedNode;
        h.selectedNode.fixed = false;
        if (nodeReference && !h.isDragging && h.onClick) {
            h.onClick(nodeReference.name);
            // setTimeout(() => {
            //     h.onClick(nodeReference.name);
            // }, 1);
        }
        h.selectedNode = null;
        h.draggedObject = null;
        $(h.renderer.canvas).unbind('mousemove', h.dragged);
        $(window).unbind('mouseup', h.dropped);
        h.mouseP = null;

        return false;
    }
}
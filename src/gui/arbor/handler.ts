/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/arbor.d.ts" />
/// <reference path="renderer.ts" />

class Handler {
    public selectedNode : Node = null;
    public draggedObject : refNode = null;
    public hoverNode : refNode = null;
    public mouseP : Point = null;
    public onClick : Function = null;
    public hoverOn : Function = null;
    public hoverOut : Function = null;
    private isDragging = false;
    private mouseDownPos;
    public clickDistance = 50;
    public hoverDistance = 30;
    public renderer : Renderer = null;

    constructor(renderer : Renderer) {
        this.renderer = renderer;
        $(this.renderer.canvas).bind('mousedown', {handler: this}, this.clicked);
        $(this.renderer.canvas).bind('mousemove', {handler: this}, this.hover);
    }

    public clicked(e): boolean {
        var h = e.data.handler;
        var pos = $(h.renderer.canvas).offset();
        
        if (!h.renderer.particleSystem) {
            return false;
        }
        
        h.isDragging = false;

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

    public hover(e) : boolean { 
        var h = e.data.handler;
        
        var pos = $(h.renderer.canvas).offset();
        var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

        var newHoverNode = h.renderer.particleSystem.nearest(s);

        // On hover event
        if (h.hoverNode == null && newHoverNode.distance <= h.hoverDistance) {
            if (h.hoverOn) {
                h.hoverNode = newHoverNode;
                h.hoverOn(h.hoverNode.node.name);
            }
        } 
        else if (h.hoverNode !== null && newHoverNode.distance > h.hoverDistance) {
            if (h.hoverOut){   
                h.hoverOut(h.hoverNode.node.name);
                h.hoverNode = null;      
            }
        }

        return false;
    }

    public dragged(e): boolean {
        var h = e.data.handler;
        
        var pos = $(h.renderer.canvas).offset();
        var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

        if (!h.isDragging && h.mouseDownPos.subtract(s).magnitude() > 10) {
            h.isDragging = true;
            h.selectedNode.fixed = true;
        }

        // Drag node visually around
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
        }
        
        h.selectedNode = null;
        h.draggedObject = null;
        
        $(h.renderer.canvas).unbind('mousemove', h.dragged);
        $(window).unbind('mouseup', h.dropped);
        
        h.mouseP = null;

        return false;
    }
}
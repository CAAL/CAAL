/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/arbor.d.ts" />
/// <reference path="renderer.ts" />

var counter = 0
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
        $(this.renderer.canvas).bind('mousedown', this.mousedown);
        $(this.renderer.canvas).bind('mousemove', this.hover); // event for hovering over a node
    }

    public mousedown = (e) => {
        var pos = $(this.renderer.canvas).offset();
        if (!this.renderer.particleSystem) {
            return false;
        }
        
        this.isDragging = false;

        this.mouseDownPos = arbor.Point(e.pageX-pos.left, e.pageY-pos.top);
        this.mouseP = this.mouseDownPos;
        this.draggedObject = this.renderer.particleSystem.nearest(this.mouseP);
        this.selectedNode = this.draggedObject.node;

        if (this.selectedNode && this.draggedObject.distance <= this.clickDistance) {
            $(this.renderer.canvas).unbind('mousemove', this.hover);
            $(this.renderer.canvas).bind('mousemove', this.dragged);
            $(window).bind('mouseup', this.dropped);
        }
        return false;
    }

    public hover = (e) => { 
        var pos = $(this.renderer.canvas).offset();
        var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

        var newHoverNode = this.renderer.particleSystem.nearest(s);

        // On hover event
        if (newHoverNode !== null) {
            if (this.hoverNode == null && newHoverNode.distance <= this.hoverDistance) {
                if (this.hoverOn) {
                    this.hoverNode = newHoverNode;
                    this.hoverOn(this.hoverNode.node.name);
                }
            } 
            else if (this.hoverNode !== null && newHoverNode.distance > this.hoverDistance) {
                if (this.hoverOut){   
                    this.hoverOut(this.hoverNode.node.name);
                    this.hoverNode = null;      
                }
            }
        }

        return false;
    }

    public dragged = (e) => {
        var pos = $(this.renderer.canvas).offset();
        var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

        if (!this.isDragging && this.mouseDownPos.subtract(s).magnitude() > 10) {
            this.isDragging = true;
            this.selectedNode.fixed = true;
        }

        // Drag node visually around
        if (this.isDragging) {
            var p = this.renderer.particleSystem.fromScreen(s);
            this.selectedNode.p = p;

            this.selectedNode.tempMass = 1000;
        }

        return false;
    }

    public dropped = (e) => {
        this.selectedNode.fixed = false;
        
        if (this.selectedNode && !this.isDragging && this.onClick) {
            this.onClick(this.selectedNode.name);
            this.renderer.redraw();
        }
        
        this.selectedNode = null;
        this.draggedObject = null;
        
        $(this.renderer.canvas).unbind('mousemove', this.dragged);
        $(this.renderer.canvas).bind('mousemove', this.hover); // event for hovering over a node
        $(window).unbind('mouseup', this.dropped);
        
        this.mouseP = null;

        return false;
    }
}
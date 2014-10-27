/*libs Jquery, graphics is needed.*/
/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/arbor.d.ts" />
/// <reference path="handler.ts" />

class Renderer {
    public canvas : HTMLCanvasElement;
    public ctx : CanvasRenderingContext2D;
    public gfx : any; //Graphics lib
    public particleSystem : ParticleSystem;
    public selectedNode : Node;
    private nodeBoxes:Point[] = [];

    private unDrawnEdges : Edge[] = [];
    private unDrawnNodes : Node[] = [];

    constructor(canvas : string) {
      this.canvas = <HTMLCanvasElement> $(canvas).get(0);
      this.ctx = this.canvas.getContext("2d");
      this.gfx = arbor.Graphics(this.canvas);
      this.particleSystem = null;
    }

    public init(system : ParticleSystem) {
        // the particle system will call the init function once, right before the
        // first frame is to be drawn. it's a good place to set up the canvas and
        // to pass the canvas size to the particle system

        // save a reference to the particle system for use in the .redraw() loop
        this.particleSystem = system;

        // inform the system of the screen dimensions so it can map coords for us.
        // if the canvas is ever resized, screenSize should be called again with
        // the new dimensions
        this.particleSystem.screenSize(this.canvas.width, this.canvas.height);
        this.particleSystem.screenPadding(40); // leave an extra 80px of whitespace per side

        // set up some event handlers to allow for node-dragging
        this.initMouseHandling();
        this.ctx.translate(0.5,0.5);
    }

    public redraw() {
        var that = this;
        // redraw will be called repeatedly during the run.
        this.gfx.clear();

        /* Draw the nodes that have been saved by "this.addNodeToGraph"*/
        if(this.unDrawnNodes.length > 0 && this.particleSystem) {
            while(this.unDrawnNodes.length > 0){
                var node = this.unDrawnNodes.pop();
                this.addNodeToGraph(node.name, node.data);
            }
        }

        /* Draw the edges that have been saved by "this.addEdgeToGraph"*/
        if(this.unDrawnEdges.length > 0 && this.particleSystem) {
            while(this.unDrawnEdges.length > 0){
                var edge = this.unDrawnEdges.pop();
                this.addEdgeToGraph(edge.source, edge.target, edge.data);
            }
        }

        this.particleSystem.eachNode(function(node : Node, pt : Point) {
            // node: {mass:#, p:{x,y}, name:"", data:{}}
            // pt:   {x:#, y:#}  node position in screen coords

            that.drawRectNode(node, pt);
        })

        // draw the edges
        that.particleSystem.eachEdge(function(edge : Edge, pt1 : Point, pt2 : Point){
            // edge: {source:Node, target:Node, length:#, data:{}}
            // pt1:  {x:#, y:#}  source position in screen coords
            // pt2:  {x:#, y:#}  target position in screen coords
            // draw a line from pt1 to pt2
        
            var label = edge.data.label || "";
            var arrowLength = 13;
            var arrowWidth = 6;
            var chevronColor = edge.data.color || "#4D4D4D";
            
            var isSelfloop = edge.source.name === edge.target.name; 
            var oppo = that.particleSystem.getEdges(edge.target, edge.source)[0];

            that.ctx.save();
            that.ctx.strokeStyle = "rgb(196, 196, 196)"; //Edge color
            that.ctx.lineWidth = 1.6; 
            
            if(isSelfloop){
                that.drawSelfEdge(pt1, pt2, arrowLength, arrowWidth, chevronColor, label, that.nodeBoxes[edge.target.name]);             
            }
            else if (oppo != undefined) {
                /* Bend the edges, otherwise the two edges will "overlap" eachother*/
                if (edge.source == oppo.target && edge.target == oppo.source) {
                    that.drawBendingEdge(pt1, pt2, that.nodeBoxes[edge.source.name], that.nodeBoxes[edge.target.name],
                        arrowLength, arrowWidth, chevronColor, label);
                }
            }
            else {
                /*Draw normal edge*/
                that.drawNormalEdge(pt1, pt2, that.nodeBoxes[edge.source.name], that.nodeBoxes[edge.target.name],
                        arrowLength, arrowWidth, chevronColor, label)
            }     
            that.ctx.restore();       
        })
    }

    drawSelfEdge(pt1, pt2, arrowLength, arrowWidth, chevronColor, label, nodeBox ) {
        var cpH = 90; // horizontal offset to the control points.
        var cpV = 60; // vertical offset to the control points.

        var cp1 = arbor.Point(pt1.x - (cpH/2), pt1.y - cpV);
        var cp2 = arbor.Point(pt1.x + (cpH/2), pt1.y - cpV);

        var start = (nodeBox && this.intersect_line_box(pt1, cp1, nodeBox)) || pt1;
        var end = (nodeBox && this.intersect_line_box(cp2, pt2, nodeBox)) || pt2;

        // Draw edge
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
        this.ctx.stroke();

        // Draw label
        if (label){                 
            this.drawLabel(pt2.x, pt2.y - (cpV), label);
        }

        // Draw chevron
        this.ctx.translate(end.x, end.y); // translate pointer to the top og the nodebox.
        this.ctx.rotate(-Math.atan2(-(end.y - cp2.y), end.x - cp2.x) - Math.PI/23); // Rotates in radians use (degrees*Math.PI/180)
        this.ctx.clearRect(-arrowLength/2,1/2, arrowLength/2,1) // delete some of the edge this's already there (so the point isn't hidden)
        this.drawChevron(arrowLength, arrowWidth, chevronColor); // draw the chevron
    }

    drawNormalEdge(pt1, pt2, nodeBox1, nodeBox2, arrowLength, arrowWidth, chevronColor, label) {
        var tail : Point = this.intersect_line_box(pt1, pt2, nodeBox1)
        var head : Point = this.intersect_line_box(tail, pt2, nodeBox2)
        
        // Draw the edge.
        this.ctx.beginPath();
        this.ctx.moveTo(tail.x, tail.y);
        this.ctx.lineTo(head.x, head.y);  
        this.ctx.stroke();

        // Draw the label
        if (label){ //draw the label on edge
            var offsetAngle = Math.atan2(-(pt2.y - pt1.y), pt2.x - pt1.x) + Math.PI*0.5;
            
            if (offsetAngle < 0){
                offsetAngle += Math.PI * 2;
            } 
            else if(offsetAngle >= Math.PI*2){
                offsetAngle -= Math.PI * 2;
            }

            var offset = arbor.Point(Math.cos(offsetAngle), -Math.sin(offsetAngle)).multiply(10);
            if (offsetAngle < Math.PI * 0.25 || offsetAngle > Math.PI * 1.25) {
                offset = offset.multiply(-1);
            }

            var midPoint = pt1.add(pt2).multiply(0.5);
            
            this.drawLabel(midPoint.x + offset.x, midPoint.y + offset.y, label);  
        }

        // Draw the arrow
        this.ctx.translate(head.x, head.y); // translate pointer to the top og the nodebox.
        this.ctx.rotate(Math.atan2(head.y - tail.y, head.x - tail.x));
        this.ctx.clearRect(-arrowLength/2,1/2, arrowLength/2,1) // delete some of the edge that's already there (so the point isn't hidden)
        this.drawChevron(arrowLength, arrowWidth, chevronColor); // draw the chevron
    }

    drawBendingEdge(pt1, pt2, nodeBox1, nodeBox2, arrowLength, arrowWidth, chevronColor, label) {
        var midPoint = pt1.add(pt2).multiply(0.5);
        var angle = Math.atan2(-(pt2.y-pt1.y), pt2.x - pt1.x) - Math.PI/2; 

        if(angle < 0) {
            angle += Math.PI*2;
        }
        
        var cpOffset = arbor.Point(Math.cos(angle), -Math.sin(angle)).multiply(60);
        var cp = midPoint.add(cpOffset);
        var start = (nodeBox1 && this.intersect_line_box(pt1, cp, nodeBox1)) || pt1;
        var end = (nodeBox2 && this.intersect_line_box(cp, pt2, nodeBox2)) || pt2;

        // Draw the edge
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.quadraticCurveTo(cp.x, cp.y, end.x, end.y);
        this.ctx.stroke();

        if (label) {
            var labelcp = midPoint.add(cpOffset.multiply(0.8));
            this.drawLabel(labelcp.x, labelcp.y, label); 
        }

        this.ctx.translate(end.x, end.y); // translate pointer to the top of the nodebox.
        var arrowMathRotation = Math.atan2(-(end.y-cp.y), end.x-cp.x);
        this.ctx.rotate(-arrowMathRotation);
        this.ctx.clearRect(-arrowLength/2,1/2, arrowLength/2,1); // delete some of the edge s already there (so the point isn't hidden)
        this.drawChevron(arrowLength, arrowWidth, chevronColor); // draw the chevron
    }

   private initMouseHandling() : void{
        // no-nonsense drag and drop (thanks springy.js)
        var nearest : refNode = null;
        var dragged : refNode = null;
        var that = this;
        var mouseP : Point;
        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {
            clicked:function(e){
                console.log("mouseDown");
                var pos = $(that.canvas).offset();
                mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top);
                nearest = dragged = that.particleSystem.nearest(mouseP);
                that.selectedNode = dragged.node;

                if (dragged && dragged.node !== null){
                    // while we're dragging, don't let physics move the node
                    dragged.node.fixed = true;
                }

                if (that.selectedNode) {
                    // just making sure that the selectedNode is not null
                    that.expandGraph();
                }

                $(that.canvas).bind('mousemove', handler.dragged);
                $(window).bind('mouseup', handler.dropped);

                return false
            },
            dragged:function(e){
                console.log("dragged");
                var pos = $(that.canvas).offset();
                var old_nearest = nearest && nearest.node._id
                var pos = $(that.canvas).offset();
                var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

                if (dragged !== null && dragged.node !== null){
                    var p = that.particleSystem.fromScreen(s);
                    dragged.node.p = p;
                }

                return false;
            },
            dropped:function(e){
                console.log("dropped")
                if (dragged===null || dragged.node===undefined) {
                    return;
                }
                
                if (dragged.node !== null) {
                    dragged.node.fixed = false;
                    dragged.node.tempMass = 1000;
                }


                dragged = null;

                $(that.canvas).unbind('mousemove', handler.dragged);
                $(window).unbind('mouseup', handler.dropped);
                mouseP = null;
                
                return false;
            }
        }

        // start listening
        $(that.canvas).mousedown(handler.clicked);
    }

   private drawRectNode(node: Node, pt: Point): void {
        // draw a circle centered at pt
        var label = node.data.label || "";
        var textWidth = this.ctx.measureText(label).width + 30;

        if (node.data.color) {
            if (node.data.color=='none') {
                this.ctx.fillStyle = "rgba(0,0,0,.0)"; // invisible
            }
            else {
                this.ctx.fillStyle = node.data.color; 
            }
        }
        else {
            //that.ctx.fillStyle = "#044C92"; //Node default color
            //that.ctx.fillStyle = "#2471E0"; //Node default color
            this.ctx.fillStyle = "rgb(5, 0, 112)"; //Node default color
        }

        this.gfx.rect(pt.x-textWidth/2, pt.y-10, textWidth, 26, 8, {fill:this.ctx.fillStyle}); // draw the node rect
        this.nodeBoxes[node.name] = [pt.x-textWidth/2, pt.y-11, textWidth, 28]; // save the bounds of the node-rect for drawing the edges correctly.

        // draw the text
        if (label){
            if (node.data.color != 'none' || node.data.color != 'white') {
                this.drawLabel(pt.x, pt.y+8, label, 'white');
            } 
            else {
                this.drawLabel(pt.x, pt.y+8, label, 'black');
            }
        }
    }

    /**
     * Draws the label upon the edge
     * @param {number}                   x     the x coordinate
     * @param {number}                   y     the y coordinate
     * @param {string}                   label the text to be written.
     * @param {CanvasRenderingContext2D} ctx   the canvas to draw on.
     */
    private drawLabel(x : number, y : number, label : string, color? : string) : void {
        this.ctx.save();
        this.ctx.font = "14px 'Open Sans'";
        this.ctx.textAlign = "center";
        this.ctx.fillStyle = color === undefined ? "black" : color;
        this.ctx.fillText(label, x, y);
        this.ctx.restore();
    }

    /**
     * Draws the arrowhead
     * @param {number}                   arrowLength the length of the arrowhead
     * @param {number}                   arrowWidth  the width of the arrowhead
     * @param {string}                   color       the color of the arrowhead
     * @param {CanvasRenderingContext2D} ctx         the canvas
     */
    private drawChevron(arrowLength : number, arrowWidth : number, color : string) : void {
        this.ctx.save()
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(-arrowLength, arrowWidth);
        this.ctx.lineTo(0, 0);
        this.ctx.lineTo(-arrowLength, -arrowWidth);
        this.ctx.lineTo(-arrowLength * 0.8, -0);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    }

    // helpers for figuring out where to draw arrows (thanks springy.js)
    private intersect_line_line(p1 : Point, p2 : Point, p3 : Point, p4 : Point) : Point {
        var denom = ((p4.y - p3.y)*(p2.x - p1.x) - (p4.x - p3.x)*(p2.y - p1.y));
        if (denom === 0){
            return null; // lines are parallel
        }

        var ua = ((p4.x - p3.x)*(p1.y - p3.y) - (p4.y - p3.y)*(p1.x - p3.x)) / denom;
        var ub = ((p2.x - p1.x)*(p1.y - p3.y) - (p2.y - p1.y)*(p1.x - p3.x)) / denom;

        if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
            return null;
        }

        return arbor.Point(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
    }

    private intersect_line_box(p1 : Point, p2 : Point, boxTuple : any) : Point {
        var p3 = arbor.Point(boxTuple[0], boxTuple[1]);
        var w = boxTuple[2];
        var h = boxTuple[3];

        var tl = arbor.Point(p3.x, p3.y);
        var tr = arbor.Point(p3.x + w, p3.y);
        var bl = arbor.Point(p3.x, p3.y + h);
        var br = arbor.Point(p3.x + w, p3.y + h);

        return this.intersect_line_line(p1, p2, tl, tr) ||
             this.intersect_line_line(p1, p2, tr, br) ||
             this.intersect_line_line(p1, p2, br, bl) ||
             this.intersect_line_line(p1, p2, bl, tl) ||
             null;
    }

    /**
     * adds a single node to the graph.
     * @param  {number} nodeId The unique name of the node.
     * @param  {string} label    The label the of the node.
     * @return {Node}            Returns the node, just added.
     */
    public addNodeToGraph(name : string, data : any) : Node{
        if (!this.particleSystem) {
            console.log("particleSystem not defined")
            var node = <Node> {name: name, data: data};
            this.unDrawnNodes.push(<Node> {name: name, data: data});
            return node;
        }

        var label = data.label
        if (label){
            if(label.length > 10){
                label = label.substring(0,8) + "..";
            }
        }
        return this.particleSystem.addNode(name, data);
    }

    public addEdgeToGraph(source: Node, target: Node, data: any) : Edge {
        if(!this.particleSystem) {
            var edge = <Edge>{source: source, target: target, data:data}
            this.unDrawnEdges.push(edge);
            return edge;
        }

        if (source === target) {  // if selfloop
            data.selfloop = true;
        }

        var edge = this.particleSystem.getEdges(source.name, target.name)[0]; // there should only be one...
        
        if (edge !== undefined) { // if ege is already defined then concat the labels.
            edge.data.label += ", " + data.label;
            
            if (edge.data.label.length > 10) {
                edge.data.label = edge.data.label.substring(0, 8) + "..";
            }
            return edge;
        }
        

        return this.particleSystem.addEdge(source.name, target.name, data);
    }

    /**
     * expand the graph from a single node, get it successors and add them to the graph
     * @param {Node} selNode Optional parameter, if not given this.selectedNode will be expanded.
     */
    public expandGraph(selNode? : Node) : void {        
        if (selNode !== undefined) { // if given a node to expand, change this.selectedNode.
            this.selectedNode = selNode;
        }

        if (!this.selectedNode.expanded) { // if not expanded, then expand.
            this.selectedNode.expanded = true;
            var successors : any[] = this.getSuccessors(this.selectedNode);
            
            for (var i = 0, max = successors.length; i < max; i++) {
                var targetNode = this.addNodeToGraph(successors[i].targetid.toString(), successors[i].data);
                this.addEdgeToGraph(this.selectedNode, targetNode, {label:successors[i].action});
            }
        }
    }

    /* Just test function */
    private myid = 1;
    public getSuccessors(curNode : Node) : any[] {
        return [{action:"a", targetid: this.myid, data:{label: "asd.B"}}, {action:"b", targetid: this.myid, data:{label: "asd.B"}}, {action:"c", targetid: ++this.myid, data:{label: "asd.B"}}];
    }
}




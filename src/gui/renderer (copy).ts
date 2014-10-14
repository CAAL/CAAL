/*libs Jquery, graphics is needed.*/
/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/arbor.d.ts" /> 
class Renderer {
    public canvas : HTMLCanvasElement;
    private ctx : CanvasRenderingContext2D;
    private gfx : any; //Graphics lib
    public particleSystem : ParticleSystem;
    public selectedNode : Node = null;
    private myid : number = 0;

    constructor(canvas : string) {
      this.canvas = <HTMLCanvasElement> $(canvas).get(0);
      this.ctx = this.canvas.getContext("2d");
      this.gfx = arbor.Graphics(this.canvas);
      this.particleSystem = null;
    }

    public init(system : ParticleSystem){
        console.log("Init was called");
        //
        // the particle system will call the init function once, right before the
        // first frame is to be drawn. it's a good place to set up the canvas and
        // to pass the canvas size to the particle system
        //
        // save a reference to the particle system for use in the .redraw() loop
        this.particleSystem = system;

        // inform the system of the screen dimensions so it can map coords for us.
        // if the canvas is ever resized, screenSize should be called again with
        // the new dimensions
        this.particleSystem.screenSize(this.canvas.width, this.canvas.height);
        this.particleSystem.screenPadding(40); // leave an extra 80px of whitespace per side
        
        // set up some event handlers to allow for node-dragging
        this.initMouseHandling();
        
    }

    public countNodes() {
        var count = 0;

        this.particleSystem.eachNode(function() {
            count++;
        });

        return count;
    }

    public redraw(){
        // First we need this function

        var that = this;
        // Then, in the redraw() method of your renderer try this:
        //var friction = that.countNodes() === 1 ? 1.0 : 0.5;
        //that.particleSystem.parameters({ friction : friction });
        
        // 
        // redraw will be called repeatedly during the run.
        // 
        this.gfx.clear();
        
        // draw the nodes & save their bounds for edge drawing
        var nodeBoxes:Point[] = [];
        
        this.particleSystem.eachNode(function(node, pt) { 
            // node: {mass:#, p:{x,y}, name:"", data:{}}
            // pt:   {x:#, y:#}  node position in screen coords

            var label = node.data.label||""
            var w = that.ctx.measureText(""+label).width + 10

            if (!(""+label).match(/^[ \t]*$/)) {
                pt.x = Math.floor(pt.x)
                pt.y = Math.floor(pt.y)
            } 
            else
            label = null

            // draw a circle centered at pt
            if(node.data.color)
                that.ctx.fillStyle = node.data.color; 
            else
                that.ctx.fillStyle = "#000000"; //Node default color

            if(node.data.color=='none')
                that.ctx.fillStyle = "rgba(0,0,0,.0)";

            if (node.data.shape=='dot'){
                that.gfx.oval(pt.x-w/2, pt.y-w/2, w,w, {fill:that.ctx.fillStyle});
                nodeBoxes[node.name] = [pt.x-w/2, pt.y-w/2, w,w];
            } else {
                that.gfx.rect(pt.x-w/2, pt.y-10, w,20, 4, {fill:that.ctx.fillStyle});
                nodeBoxes[node.name] = [pt.x-w/2, pt.y-11, w, 22];
            }


            // draw the text
            if (label){
                that.ctx.font = "12px Helvetica"
                that.ctx.textAlign = "center"
                that.ctx.fillStyle = "white"

                if(node.data.color=='none') 
                  that.ctx.fillStyle = '#333333'; //default node label color

                that.ctx.fillText(label||"", pt.x, pt.y+4);
            }
        })

        // draw the edges
        that.particleSystem.eachEdge(function(edge, pt1, pt2){
            // edge: {source:Node, target:Node, length:#, data:{}}
            // pt1:  {x:#, y:#}  source position in screen coords
            // pt2:  {x:#, y:#}  target position in screen coords
            // draw a line from pt1 to pt2
            var line = pt2.subtract(pt1);
            var unit =  line.normalize();
            var isSelfloop = unit.exploded();

            // draw edge
            that.ctx.strokeStyle = "rgba(0,0,0, .25)";
            that.ctx.lineWidth = 2;
            that.ctx.beginPath();
            that.ctx.moveTo(pt1.x, pt1.y);
            var cpH = 130; // horizontal offset to the control points.
            var cpV = 60; // vertical offset to the control points.

            if(isSelfloop){
                that.ctx.moveTo(pt1.x, pt1.y);
                that.ctx.bezierCurveTo(pt1.x - (cpH/2), pt1.y - cpV, pt1.x + (cpH/2), pt1.y - cpV, pt1.x, pt1.y);
                pt2 = pt1;            
            } else{
                that.ctx.lineTo(pt2.x, pt2.y);
            }
            that.ctx.stroke();
            that.ctx.save();

            // draw arrow head
            var label = edge.data.label || "";
            var arrowLength = 15;
            var arrowWidth = 7;
            var chevronColor = edge.data.color || "#4D4D4D";

            if(!isSelfloop){
                /*Edge is not self-loop*/
                var tail : Point = that.intersect_line_box(pt1, pt2, nodeBoxes[edge.source.name])
                var head : Point = that.intersect_line_box(tail, pt2, nodeBoxes[edge.target.name])

                if (label){ //draw the label on edge
                    var mid_x = ((tail.x+head.x)/2) - 5; //minus 5 to offset from the edge
                    var mid_y = ((tail.y+head.y)/2) - 5; //minus 5 to offset form the edge
                    that.drawLabel(mid_x, mid_y, label, that.ctx);                   
                }

                that.ctx.translate(head.x, head.y); // translate pointer to the top og the nodebox.
                that.ctx.rotate(Math.atan2(head.y - tail.y, head.x - tail.x));
                that.ctx.clearRect(-arrowLength/2,1/2, arrowLength/2,1) // delete some of the edge that's already there (so the point isn't hidden)
                that.drawChevron(arrowLength, arrowWidth, chevronColor, that.ctx); // draw the chevron
            } else {
                /*Edge is self-loop*/
                if (label){ 
                    //draw the label on edge
                    that.drawLabel(pt2.x, pt2.y - (cpV), label, that.ctx);                   
                }

                that.ctx.translate(pt2.x + 9, pt2.y - 9); // translate pointer to the top og the nodebox.
                that.ctx.rotate(125*Math.PI/180); // otates in radians use (degrees*Math.PI/180)
                that.ctx.clearRect(-arrowLength/2,1/2, arrowLength/2,1) // delete some of the edge that's already there (so the point isn't hidden)
                that.drawChevron(arrowLength, arrowWidth, chevronColor, that.ctx); // draw the chevron
            }
            that.ctx.restore();
        })
    }

    public initMouseHandling() {
      // no-nonsense drag and drop (thanks springy.js)
      var selected = null;
      var nearest = null;
      var dragged = null;
      var oldmass = 1
      var that = this;
      var mouseP;

      // set up a handler object that will initially listen for mousedowns then
      // for moves and mouseups while dragging
      var handler = {
        clicked:function(e){
            console.log("clicked");
            var particleSys = e.data.particleSystem;
            var pos = $(that.canvas).offset();
            mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            selected = nearest = dragged = particleSys.nearest(mouseP);

            if (dragged.node !== null) 
                dragged.node.fixed = true;

            $(that.canvas).bind('mousemove', {particleSystem : particleSys}, handler.dragged)
            $(window).bind('mouseup', {particleSystem : particleSys}, handler.dropped)

            return false
        },
        dragged:function(e){
            console.log("dragged");
            var particleSys = e.data.particleSystem;
            var old_nearest = nearest && nearest.node._id
            var pos = $(that.canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

            if (dragged !== null && dragged.node !== null){
                var p = particleSys.fromScreen(s)
                dragged.node.p = p
                //console.log(dragged);
            }

            return false
        },
        dropped:function(e){
            console.log("dropped");
            if (dragged===null || dragged.node===undefined) 
                return
            if (dragged.node !== null) 
                dragged.node.fixed = false
            dragged = null
            selected = null
            $(that.canvas).unbind('mousemove', handler.dragged)
            $(window).unbind('mouseup', handler.dropped)
            mouseP = null
            return false
        }
      }
      $(this.canvas).mousedown({particleSystem : this.particleSystem}, handler.clicked);
    }

    public drawLabel(x : number, y : number, label : string, ctx : CanvasRenderingContext2D){
        ctx.save();
        ctx.font = "17px Helvetica";
        ctx.textAlign = "center";
        ctx.fillStyle = "black";
        ctx.fillText(label, x, y);
        ctx.restore();
    }

    public drawChevron(arrowLength : number, arrowWidth : number, color : string, ctx : CanvasRenderingContext2D){
        ctx.save()
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-arrowLength, arrowWidth);
        ctx.lineTo(0, 0);
        ctx.lineTo(-arrowLength, -arrowWidth);
        ctx.lineTo(-arrowLength * 0.8, -0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // helpers for figuring out where to draw arrows (thanks springy.js)
    public intersect_line_line(p1 : Point, p2 : Point, p3 : Point, p4 : Point) : Point {
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

    public intersect_line_box(p1 : Point, p2 : Point, boxTuple : any) : Point {
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

    public addToGraph(targetId : number, label : string) : Node{
        console.log("addToGraph");
        if (label){
            if(label.length > 10){
                label = label.substring(0,8) + "..";
            }
        }
        return this.particleSystem.addNode(''+targetId, {label: label, expanded:false,});
    }

    public expandGraph(selNode : Node /*particleSystem : ParticleSystem*/) : void {
        console.log("expand graph: ", (this.selectedNode == selNode));

        //if(this.selectedNode !== selNode){
            this.selectedNode = selNode;
            //if(!this.selectedNode.expanded){
                this.selectedNode.expanded = true;
                var successors : any[] = this.getSuccessors(this.selectedNode);
                console.log("the successors: ", successors);
                for (var i = 0, max = successors.length; i < max; i++){
                    console.log("Node: ", this.addToGraph(successors[i].targetId, successors[i].label));
                    //console.log("Edge: ", this.particleSystem.addEdge(this.selectedNode.name, successors[i].targetId, {label:successors[i].action}));
                }
            //}
        //}
    }

    public getSuccessors(curNode : Node) : any[]{
        console.log("get Successors");
        this.myid++;
        return [{action:"action" + this.myid, targetId : this.myid + 1, label : "Label" + this.myid}/*, {action:"action" + that.myid++, targetId : that.myid + 1, label : "Label" + that.myid}*/];
    }


}




/*libs Jquery, graphics is needed.*/
/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/arbor.d.ts" />
var Renderer = (function () {
    function Renderer(canvas) {
        this.myid = 1;
        this.canvas = $(canvas).get(0);
        this.ctx = this.canvas.getContext("2d");
        this.gfx = arbor.Graphics(this.canvas);
        this.particleSystem = null;
    }
    Renderer.prototype.init = function (system) {
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
    };

    Renderer.prototype.redraw = function () {
        var that = this;

        // redraw will be called repeatedly during the run.
        this.gfx.clear();

        // draw the nodes & save their bounds for edge drawing
        var nodeBoxes = [];

        this.particleSystem.eachNode(function (node, pt) {
            // node: {mass:#, p:{x,y}, name:"", data:{}}
            // pt:   {x:#, y:#}  node position in screen coords
            if (node.data.invisible != undefined) {
                return;
            }
            var label = node.data.label || "";
            var w = that.ctx.measureText("" + label).width + 10;

            if (!("" + label).match(/^[ \t]*$/)) {
                pt.x = Math.floor(pt.x);
                pt.y = Math.floor(pt.y);
            } else {
                label = null;
            }

            // draw a circle centered at pt
            if (node.data.color) {
                that.ctx.fillStyle = node.data.color;
            } else {
                that.ctx.fillStyle = "#000000"; //Node default color
            }

            if (node.data.color == 'none') {
                that.ctx.fillStyle = "rgba(0,0,0,.0)";
            }

            if (node.data.shape == 'dot') {
                that.gfx.oval(pt.x - w / 2, pt.y - w / 2, w, w, { fill: that.ctx.fillStyle });
                nodeBoxes[node.name] = [pt.x - w / 2, pt.y - w / 2, w, w];
            } else {
                that.gfx.rect(pt.x - w / 2, pt.y - 10, w, 20, 4, { fill: that.ctx.fillStyle });
                nodeBoxes[node.name] = [pt.x - w / 2, pt.y - 11, w, 22];
            }

            // draw the text
            if (label) {
                that.ctx.font = "12px Helvetica";
                that.ctx.textAlign = "center";
                that.ctx.fillStyle = "white";

                if (node.data.color == 'none')
                    that.ctx.fillStyle = '#333333'; //default node label color

                that.ctx.fillText(label || "", pt.x, pt.y + 4);
            }
        });

        // draw the edges
        that.particleSystem.eachEdge(function (edge, pt1, pt2) {
            // edge: {source:Node, target:Node, length:#, data:{}}
            // pt1:  {x:#, y:#}  source position in screen coords
            // pt2:  {x:#, y:#}  target position in screen coords
            // draw a line from pt1 to pt2
            var line = pt2.subtract(pt1);
            var unit = line.normalize();
            var isSelfloop = unit.exploded();

            // draw edge
            that.ctx.strokeStyle = "rgba(0,0,0, .25)";
            that.ctx.lineWidth = 2;
            that.ctx.beginPath();
            that.ctx.moveTo(pt1.x, pt1.y);
            var cpH = 130;
            var cpV = 60;
            var md = arbor.Point((pt1.x + pt2.x) / 2, (pt1.y + pt2.y) / 2);
            var angle = Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x) - Math.PI / 2;

            if (angle < 0)
                angle += Math.PI * 2;

            var dx = 60 * Math.cos(angle);
            var dy = 60 * Math.sin(angle);
            var cp = arbor.Point(md.x + dx, md.y + dy);

            var same = that.particleSystem.getEdges(edge.source, edge.target)[0];
            var oppo = that.particleSystem.getEdges(edge.target, edge.source)[0];

            if (isSelfloop) {
                that.ctx.moveTo(pt1.x, pt1.y);
                that.ctx.bezierCurveTo(pt1.x - (cpH / 2), pt1.y - cpV, pt1.x + (cpH / 2), pt1.y - cpV, pt1.x, pt1.y);
                pt2 = pt1;
            } else if (oppo != undefined) {
                if (same.source == oppo.target && same.target == oppo.source) {
                    that.ctx.moveTo(pt1.x, pt1.y);
                    that.ctx.quadraticCurveTo(cp.x, cp.y, pt2.x, pt2.y);
                    that.ctx.stroke();
                }
            } else {
                that.ctx.lineTo(pt2.x, pt2.y);
            }
            that.ctx.stroke();
            that.ctx.save();

            // draw arrow head
            var label = edge.data.label || "";
            var arrowLength = 15;
            var arrowWidth = 7;
            var chevronColor = edge.data.color || "#4D4D4D";

            if (!isSelfloop) {
                /*Edge is not self-loop*/
                var tail = that.intersect_line_box(pt1, pt2, nodeBoxes[edge.source.name]);
                var head = that.intersect_line_box(tail, pt2, nodeBoxes[edge.target.name]);

                if (oppo != undefined) {
                    if (same.source == oppo.target && same.target == oppo.source && label) {
                        var labeldx = dx * 0.7;
                        var labeldy = dy * 0.7;
                        var labelcp = arbor.Point(md.x + labeldx, md.y + labeldy);

                        that.drawLabel(labelcp.x, labelcp.y, label, that.ctx);

                        that.ctx.translate(pt2.x, pt2.y); // translate pointer to the top of the nodebox.

                        that.ctx.rotate(2 * Math.PI - Math.atan2(pt2.y - cp.y, pt2.x - cp.x));
                        that.ctx.clearRect(-arrowLength / 2, 1 / 2, arrowLength / 2, 1);
                        that.drawChevron(arrowLength, arrowWidth, chevronColor, that.ctx); // draw the chevron
                    }
                } else if (label) {
                    var mid_x = ((tail.x + head.x) / 2) - 5;
                    var mid_y = ((tail.y + head.y) / 2) - 5;
                    that.drawLabel(mid_x, mid_y, label, that.ctx);

                    that.ctx.translate(head.x, head.y); // translate pointer to the top og the nodebox.
                    that.ctx.rotate(Math.atan2(head.y - tail.y, head.x - tail.x));
                    that.ctx.clearRect(-arrowLength / 2, 1 / 2, arrowLength / 2, 1);
                    that.drawChevron(arrowLength, arrowWidth, chevronColor, that.ctx); // draw the chevron
                }
            } else {
                /*Edge is self-loop*/
                if (label) {
                    //draw the label on edge
                    that.drawLabel(pt2.x, pt2.y - (cpV), label, that.ctx);
                }

                that.ctx.translate(pt2.x + 9, pt2.y - 9); // translate pointer to the top og the nodebox.
                that.ctx.rotate(125 * Math.PI / 180); // Rotates in radians use (degrees*Math.PI/180)
                that.ctx.clearRect(-arrowLength / 2, 1 / 2, arrowLength / 2, 1);
                that.drawChevron(arrowLength, arrowWidth, chevronColor, that.ctx); // draw the chevron
            }

            that.ctx.restore();
        });
    };

    Renderer.prototype.initMouseHandling = function () {
        // no-nonsense drag and drop (thanks springy.js)
        var nearest = null;
        var dragged = null;
        var that = this;
        var mouseP;

        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {
            clicked: function (e) {
                var pos = $(that.canvas).offset();
                mouseP = arbor.Point(e.pageX - pos.left, e.pageY - pos.top);
                nearest = dragged = that.particleSystem.nearest(mouseP);
                that.selectedNode = dragged.node;

                if (dragged && dragged.node !== null) {
                    // while we're dragging, don't let physics move the node
                    dragged.node.fixed = true;
                }

                if (that.selectedNode) {
                    // just making sure that the selectedNode is not null
                    that.expandGraph();
                }

                $(that.canvas).bind('mousemove', handler.dragged);
                $(window).bind('mouseup', handler.dropped);

                return false;
            },
            dragged: function (e) {
                var pos = $(that.canvas).offset();
                var old_nearest = nearest && nearest.node._id;
                var pos = $(that.canvas).offset();
                var s = arbor.Point(e.pageX - pos.left, e.pageY - pos.top);

                if (dragged !== null && dragged.node !== null) {
                    var p = that.particleSystem.fromScreen(s);
                    dragged.node.p = p;
                }

                return false;
            },
            dropped: function (e) {
                if (dragged === null || dragged.node === undefined) {
                    return;
                }

                if (dragged.node !== null) {
                    dragged.node.fixed = false;
                }

                dragged = null;

                //that.selectedNode = null;
                $(that.canvas).unbind('mousemove', handler.dragged);
                $(window).unbind('mouseup', handler.dropped);
                mouseP = null;

                return false;
            }
        };

        // start listening
        $(that.canvas).mousedown(handler.clicked);
    };

    /**
    * Draws the label upon the edge
    * @param {number}                   x     the x coordinate
    * @param {number}                   y     the y coordinate
    * @param {string}                   label the text to be written.
    * @param {CanvasRenderingContext2D} ctx   the canvas to draw on.
    */
    Renderer.prototype.drawLabel = function (x, y, label, ctx) {
        ctx.save();
        ctx.font = "17px Helvetica";
        ctx.textAlign = "center";
        ctx.fillStyle = "black";
        ctx.fillText(label, x, y);
        ctx.restore();
    };

    /**
    * Draws the arrowhead
    * @param {number}                   arrowLength the length of the arrowhead
    * @param {number}                   arrowWidth  the width of the arrowhead
    * @param {string}                   color       the color of the arrowhead
    * @param {CanvasRenderingContext2D} ctx         the canvas
    */
    Renderer.prototype.drawChevron = function (arrowLength, arrowWidth, color, ctx) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-arrowLength, arrowWidth);
        ctx.lineTo(0, 0);
        ctx.lineTo(-arrowLength, -arrowWidth);
        ctx.lineTo(-arrowLength * 0.8, -0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    };

    // helpers for figuring out where to draw arrows (thanks springy.js)
    Renderer.prototype.intersect_line_line = function (p1, p2, p3, p4) {
        var denom = ((p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y));
        if (denom === 0) {
            return null;
        }

        var ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
        var ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

        if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
            return null;
        }

        return arbor.Point(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
    };

    Renderer.prototype.intersect_line_box = function (p1, p2, boxTuple) {
        var p3 = arbor.Point(boxTuple[0], boxTuple[1]);
        var w = boxTuple[2];
        var h = boxTuple[3];

        var tl = arbor.Point(p3.x, p3.y);
        var tr = arbor.Point(p3.x + w, p3.y);
        var bl = arbor.Point(p3.x, p3.y + h);
        var br = arbor.Point(p3.x + w, p3.y + h);

        return this.intersect_line_line(p1, p2, tl, tr) || this.intersect_line_line(p1, p2, tr, br) || this.intersect_line_line(p1, p2, br, bl) || this.intersect_line_line(p1, p2, bl, tl) || null;
    };

    /**
    * adds a single node to the graph.
    * @param  {number} nodeId The unique name of the node.
    * @param  {string} label    The label the of the node.
    * @return {Node}            Returns the node, just added.
    */
    Renderer.prototype.addNodeToGraph = function (nodeName, label) {
        if (label) {
            if (label.length > 10) {
                label = label.substring(0, 8) + "..";
            }
        }
        return this.particleSystem.addNode(nodeName, { label: label, expanded: false });
    };

    Renderer.prototype.addEdgeToGraph = function (source, target, data) {
        if (source === target) {
            data.selfloop = true;
            var selfloopEdge = this.particleSystem.getEdges(source.name, target.name)[0];

            if (selfloopEdge !== undefined) {
                selfloopEdge.data.label += ", " + data.label;

                if (selfloopEdge.data.label.length > 10) {
                    selfloopEdge.data.label = selfloopEdge.data.label.substring(0, 8) + "..";
                }
                return selfloopEdge;
            }
        }

        return this.particleSystem.addEdge(source.name, target.name, data);
    };

    /**
    * expand the graph from a single node, get it successors and add them to the graph
    * @param {Node} selNode Optional parameter, if not given this.selectedNode will be expanded.
    */
    Renderer.prototype.expandGraph = function (selNode) {
        if (selNode !== undefined) {
            this.selectedNode = selNode;
        }

        if (!this.selectedNode.expanded) {
            this.selectedNode.expanded = true;
            var successors = this.getSuccessors(this.selectedNode);

            for (var i = 0, max = successors.length; i < max; i++) {
                var targetNode = this.addNodeToGraph(successors[i].targetid.toString(), successors[i].targetLabel);
                this.addEdgeToGraph(this.selectedNode, targetNode, { label: successors[i].action });
            }
            // console.log(this.particleSystem.getEdgesFrom(this.selectedNode.name));
        }
    };

    Renderer.prototype.getSuccessors = function (curNode) {
        return [{ action: "a", targetid: this.myid, targetLabel: "asd.B" }, { action: "b", targetid: this.myid, targetLabel: "asd.B" }, { action: "c", targetid: ++this.myid, targetLabel: "new Node" }];
        // return [{action:"action" + this.myid, targetid : this.myid + 1, targetLabel : "Label" + this.myid}/*, {action:"action" + that.myid++, targetid : that.myid + 1, targetLabel : "Label" + that.myid}*/];
    };
    return Renderer;
})();

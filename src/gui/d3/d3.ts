/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/d3/d3.d.ts" />
/// <reference path="point.ts" />
/// <reference path="vertex.ts" />
/// <reference path="transition.ts" />
/// <reference path="../gui.ts" />

module GUI {
    export class d3Graph implements GUI.ProcessGraphUI {
        public width : number = 960;
        public height : number = 500;
        private onClick : Function = null;
        private nodeColors = {
            "unexpanded" : "rgb(160,160,160)",
            "expanded"   : "rgb(51, 65, 185)",
            "selected"   : "rgb(245, 50, 50)",
            "stroke"     : "rgb(0, 0, 0)"
        }; 
        private vertices = [];
        private verticeIds = {};
        private transitionIds = {};
        private transitions = []; // Remember it is not ID but index in the array
        private svg;
        private vis;
        private force;
        public selected_node = null;
        public hover_node = null;
        private links;
        private circle;
        private circleRadius = 20;

        constructor() {      
            this.init();
        }
    
        private init() : void {
            this.svg = d3.select('svg')
                    .attr('width', this.width)
                    .attr('height', this.height)
                    .attr("pointer-events", "all");

            this.vis = this.svg
                .append('svg:g')
                //.call(d3.behavior.zoom().on("zoom", this.rescale))
                //.on("dblclick.zoom", null)
            
            this.vis.append('svg:rect')
                .attr('width', this.width)
                .attr('height', this.height)
                .attr('fill', 'white');

            this.force = d3.layout.force()
                    .nodes(this.vertices)
                    .links(this.transitions)
                    .size([this.width, this.height])
                    .linkDistance(150)
                    .charge(-500)
                    .gravity(0.06)
                    .on('tick', this.tick);
            // define arrow markers for graph links
            this.svg.append('svg:defs').append('svg:marker')
                .attr('id', 'post-arrow')
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 6)
                .attr('markerWidth', 3.5)
                .attr('markerHeight', 3.5)
                .attr('orient', 'auto')
              .append('svg:path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', '#000');

            this.svg.append('svg:defs').append('svg:marker')
                .attr('id', 'pre-arrow')
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 4)
                .attr('markerWidth', 3.5)
                .attr('markerHeight', 3.5)
                .attr('orient', 'auto')
              .append('svg:path')
                .attr('d', 'M10,-5L0,0L10,5')
                .attr('fill', '#000');

            this.links = this.svg.append('g').selectAll('link');
            this.circle = this.svg.append('g').selectAll('g');
            this.update();
        }

        private tick = () => {
            // vertex
            this.circle.attr('transform', (d) => {
                var p = this.boundingBox(new Point(d.x, d.y));
                return 'translate(' + p.x + ',' + p.y + ')';
            });

            // transition
            this.links.selectAll('path').attr('d', (d) => {
                var sourceP = new Point(d.source.x, d.source.y);
                var targetP = new Point(d.target.x, d.target.y);
                sourceP = this.boundingBox(sourceP);
                targetP = this.boundingBox(targetP);

                var sourcePadding = d.data.direction != 'post' ? this.circleRadius+5 : this.circleRadius;
                var targetPadding = d.data.direction != 'pre' ? this.circleRadius+5 : this.circleRadius;

                var oppositeTransitionExists = this.transitionIds[d.target.id + ',' + d.source.id];

                if (d.source == d.target) {
                    //self loop
                    var cpH = 90;
                    var cpV = 60;

                    var cp1 = new Point(sourceP.x - (cpH/2), sourceP.y - cpV);
                    var cp2 = new Point(sourceP.x + (cpH/2), sourceP.y - cpV);

                    var normSource = sourceP.subtract(cp1).normalize();
                    var normTarget = targetP.subtract(cp2).normalize();

                    var newSourceP = sourceP.subtract(normSource.multiplyWithNumber(sourcePadding)); 
                    var newTargetP = targetP.subtract(normTarget.multiplyWithNumber(targetPadding));

                    return "M" + newSourceP.x + "," + newSourceP.y+"C" + cp1.x + " " + cp1.y+" " + cp2.x+ " " + cp2.y+" " + newTargetP.x +" "+ newTargetP.y;
                }
                else if (oppositeTransitionExists) { 
                    // draw the two opposite transitions
                    var midPoint = sourceP.add(targetP).multiplyWithNumber(0.5);
                    var angle = Math.atan2(-(targetP.y - sourceP.y), targetP.x - sourceP.x) - Math.PI/2;

                    if(angle < 0) {
                        angle += Math.PI*2;
                    }

                    var cpOffset = new Point(Math.cos(angle), -Math.sin(angle)).multiplyWithNumber(45);
                    var cp = midPoint.add(cpOffset);

                    var normSourceP = sourceP.subtract(cp).normalize(); 
                    var normTargetP = targetP.subtract(cp).normalize();

                    var newSourceP = sourceP.subtract(normSourceP.multiplyWithNumber(sourcePadding)); 
                    var newTargetP = targetP.subtract(normTargetP.multiplyWithNumber(targetPadding));

                    return "M" + newSourceP.x + "," + newSourceP.y + "Q" + cp.x + " " + cp.y + " " + newTargetP.x + " " + newTargetP.y;


                }
                else {
                    // normal transition
                    var norm = sourceP.subtract(targetP).normalize();

                    var newSourceP = sourceP.subtract(norm.multiplyWithNumber(sourcePadding));
                    
                    var newTargetP = targetP.add(norm.multiplyWithNumber(targetPadding));
                    return 'M' + newSourceP.x + ',' + newSourceP.y + 'L' + newTargetP.x + ',' + newTargetP.y;
                }
            });

            //link label
            this.links.selectAll('text').attr("transform", (d) => {
                var oppositeTransitionExists = this.transitionIds[d.target.id + ',' + d.source.id];

                var sourceP = new Point(d.source.x, d.source.y);
                var targetP = new Point(d.target.x, d.target.y);
                sourceP = this.boundingBox(sourceP);
                targetP = this.boundingBox(targetP);

                var midPoint = sourceP.add(targetP).multiplyWithNumber(0.5);

                if (d.source == d.target) {
                    // self loop
                    var cpV = 60;
                    return "translate(" + midPoint.x + "," + (midPoint.y - cpV) + ")"; 
                } 
                else if(oppositeTransitionExists){
                    // bending edge
                    var angle = Math.atan2(-(targetP.y - sourceP.y), targetP.x - sourceP.x) - Math.PI/2;

                    if(angle < 0) {
                        angle += Math.PI*2;
                    }

                    var cpOffset = new Point(Math.cos(angle), -Math.sin(angle)).multiplyWithNumber(45);

                    midPoint = midPoint.add(cpOffset.multiplyWithNumber(0.9));

                    return "translate(" + midPoint.x + "," + midPoint.y + ")"; 
                } 
                else {
                    // normal edge
                    var offsetAngle = Math.atan2(-(targetP.y - sourceP.y), targetP.x - sourceP.x) + Math.PI*0.5;

                    if (offsetAngle < 0) {
                        offsetAngle += Math.PI * 2;
                    } 
                    else if(offsetAngle >= Math.PI * 2) {
                        offsetAngle -= Math.PI * 2;
                    }

                    var offset = new Point(Math.cos(offsetAngle), -Math.sin(offsetAngle)).multiplyWithNumber(15);
                    
                    if(offsetAngle < Math.PI * 0.25 || offsetAngle > Math.PI * 1.25){
                        offset = offset.multiplyWithNumber(-1);
                    }

                    return "translate(" + (midPoint.x + offset.x) + "," + (midPoint.y + offset.y) + ")"; 
                }
            });
        }

        // This methods updates, inserts and removes links and circles(Vertex) 
        private update() : void {
            //Bind the data
            this.circle = this.circle.data(this.vertices, (d : Vertex) => {return d.id;});
            
            // update existing vertices (reflexive & selected visual states)
            this.svg.selectAll('circle')
               .style('fill', this.nodeColorChange)
               .style('stroke', this.nodeColors['stroke']);
               

            // add new vertices    
            var g = this.circle.enter().append('svg:g');
            
            // Add drag listener
            g.call(this.force.drag);
            
            // Append circle to group
            g.append('svg:circle')
                .attr('class', 'node')
                .attr('r', this.circleRadius)
                .style('fill', this.nodeColorChange)
                .style('stroke', this.nodeColors['stroke'])
                .on('click', this.nodeClicked);

            // Append text to circle
            g.append('svg:text')
                .attr('x', 0)
                .attr('y', 4)
                .attr('class', 'id')
                .style('font-family','sans-serif') 
                .style('font-size', (d) => {
                    console.log(Math.round(this.circleRadius/2) + 'px')
                    return Math.round(this.circleRadius/2) + 'px';
                })
                .text((d) => { 
                    return d.data.label.substring(0, (this.circleRadius/3)); 
                });

            //remove old vertices
            this.circle.exit().remove();

            //Bind the data
            this.links = this.links.data(this.transitions, (d : Transition) => {return d.id;});

            //update transitions
            this.links.selectAll('path')
                .style('marker-start', (d) => { return d.data.direction != 'post' ? 'url(#pre-arrow)' : ''; }) //pre&post checking is flipped because of "both"
                .style('marker-end', (d) => { return d.data.direction != 'pre' ? 'url(#post-arrow)' : ''; }); //pre&post checking is flipped because of "both"

            //Group links and text label
            var glink = this.links.enter().append('svg:g')
                .attr("id", (d,i) => { return "linkId_" + i; })

            //Append transition
            glink.append('svg:path')
                .attr("fill", "none")
                .attr("class", "link")
                .attr("stroke", "ff8888")
                .style('marker-start', (d) => { return d.data.direction != 'post' ? 'url(#pre-arrow)' : ''; }) //pre&post checking is flipped because of "both"
                .style('marker-end', (d) => { return d.data.direction != 'pre' ? 'url(#post-arrow)' : ''; }); //pre&post checking is flipped because of "both"

            //Append text to transitions
            glink.append('svg:text')
                .style("font-size", "12px")
                .style('font-family','sans-serif')
                //.attr("dy", "1.2em")
                .attr("text-anchor", "middle")
                .text((d) => {
                    return d.data.label;
                });

            //remove transitions
            this.links.exit().remove();
            
            //start the physics
            this.force.start();
        }

        // rescale g
        private rescale = () => {
          var trans=d3.event.translate;
          var scale=d3.event.scale;

          this.svg.attr("transform",
              "translate(" + trans + ")"
              + " scale(" + scale + ")");
        };

        private nodeColorChange = (d) => {
            if(d === this.selected_node) {
                // console.log('selected: ', d.id)
                return this.nodeColors['selected'];
            }
            else if(d.data.expanded) { 
                // console.log('expanded: ', d.id);
                return this.nodeColors['expanded'];
            }
            else {
                // console.log('unexpanded: ', d.id);
                return this.nodeColors['unexpanded'];
            }
        };

        private nodeClicked = (d) => {
            if (d3.event.defaultPrevented) return; // ignore drag

            this.selected_node = d;
            this.selected_node.data.expanded = true;
            this.update();
        };

        private boundingBox(p : Point) {
            p.x = Math.max(this.circleRadius, Math.min(this.width - this.circleRadius, p.x)); 
            p.y = Math.max(this.circleRadius, Math.min(this.height - this.circleRadius, p.y));
            return p;   
        }

        public clearAll() : void {
            this.vertices = [];
            this.transitions = [];
            this.verticeIds = {};
            this.transitionIds = {};
            this.update();
        }

        public showProcess(identifier : string, data : VertexData = {}) : Vertex {
            // So this is what should happend, when node is cliked it should fire the onClick method given from the holder of the graph.(who ever created the object)
            var doesVertexExists = this.verticeIds[identifier]; 
            var v : Vertex;
            if(doesVertexExists) {
                //override vertex
                v = this.getVertexById(identifier)
                v.data = data
                // console.log('Override vertex: ', v);
            }
            else {
                v = new Vertex(identifier, data);
                this.vertices.push(v);
                this.verticeIds[v.id] = true;
                // console.log('Insert vertex: ', v);
            }  

            this.update();
            return v;
        }

        private getVertexById(identifier : string) : Vertex {
            for (var i = 0; i < this.vertices.length; i++){
                if(this.vertices[i].id === identifier){
                    return this.vertices[i];
                }
            }

            return null;
        }

        private removeVertex(v : Vertex) : void {
            this.verticeIds[v.id] = false;
            this.vertices.splice(v.index, 1);
        }

        private removeVertexbyId(identifier : string) : void {
            var v = this.getVertexById(identifier);
            this.removeVertex(v);
        }

        public getProcessDataObject(identifier : string) : VertexData {
            return this.getVertexById(identifier).data
        }

        public showTransitions(sourceId : string, targetId : string, data : TransitionData = {}) : Transition {
            
            // Has the edge been defined
            var doesTransitionExists = this.transitionIds[sourceId + "," +targetId];

            if (doesTransitionExists) {
                // If defined then override the edge with new data.
                // console.log('Override: ')
            } else {
                // Else define it
                var edge = new Transition(this.showProcess(sourceId), this.showProcess(targetId), data);
                this.transitions.push(edge);
                this.transitionIds[sourceId + ',' + targetId] = true;
                console.log("Inserted: ", edge);
            }

            this.update();
            return edge;
        }

        private getTransitionById(identifier : string) : Transition {
            for (var i = 0; i < this.transitions.length; i++){
                if(this.transitions[i].id === identifier){
                    this.transitions[i].index = i;
                    return this.transitions[i];
                }
            }

            return null
        }

        private removeTransitionById(identifier : string) : void { 
            var e = this.getTransitionById(identifier);
            this.removeTransition(e)
        }

        private removeTransition(e : Transition) : void {
            this.transitionIds[e.source + ',' + e.target] = false;
            this.transitions.splice(this.transitions.indexOf(e), 1);
        }

        public getTransitionDataObjects(identifier : string) : any {
            return this.getTransitionById(identifier);
        }

        public setOnSelectListener(f : (identifier) => void) : void {

        }

        public clearOnSelectListener() : void {

        }

        public setHoverOnListener(f : (identifier) => void ) : void {
            
        }

        public clearHoverOnListener() : void {
             
        }

        public setHoverOutListener(f : (identifier) => void ) : void {

        }

        public clearHoverOutListener() : void {

        }

        public setSelected(name : string) : void {
            // Set selected node
        }

        public setHover(name: string) : void {
            // Mark a node as hover
        }

        public clearHover() : void {
            // Clear the node marked as hover
        }

        public freeze() : void {
            // Stop the force
            this.force.stop();
        }

        public unfreeze() : void {
            // Start the force (may the force be with you)
            this.force.resume();
        }

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

            return new Point(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
        }

        private intersect_line_box(p1 : Point, p2 : Point, boxTuple : any) : Point {
            var p3 = new Point(boxTuple[0], boxTuple[1]);
            var w = boxTuple[2];
            var h = boxTuple[3];

            var tl = new Point(p3.x, p3.y);
            var tr = new Point(p3.x + w, p3.y);
            var bl = new Point(p3.x, p3.y + h);
            var br = new Point(p3.x + w, p3.y + h);

            return this.intersect_line_line(p1, p2, tl, tr) ||
                 this.intersect_line_line(p1, p2, tr, br) ||
                 this.intersect_line_line(p1, p2, br, bl) ||
                 this.intersect_line_line(p1, p2, bl, tl) ||
                 new Point(p2.x, p2.y);
        }
    }
}

var d3test = new GUI.d3Graph();
d3test.showProcess("1", {label:"1234567890"});
d3test.showProcess("2", {label:"1234567890"});
d3test.showProcess("3", {label:"1234567890"});
d3test.showProcess("4", {label:"1234567890"});
d3test.showProcess("5", {label:"1234567890"});
d3test.showProcess("6", {label:"1234567890"});
d3test.showProcess("7", {label:"1234567890"});
d3test.showProcess("8", {label:"1234567890"});
d3test.showProcess("9", {label:"1234567890"});
d3test.showTransitions("1","2", {label : 'test'});
d3test.showTransitions("2","3", {label : 'edge 2->3'});
d3test.showTransitions("3","2", {label : 'edge 3->2'});
d3test.showTransitions("3","4", {label : 'this is awesome'});
d3test.showTransitions("4","5", {label : 'this is awesome'});
d3test.showTransitions("5","6", {label : 'this is awesome'});
d3test.showTransitions("6","7", {label : 'this is awesome'});
d3test.showTransitions("7","8", {label : 'this is awesome'});
d3test.showTransitions("8","9", {label : 'this is awesome'});





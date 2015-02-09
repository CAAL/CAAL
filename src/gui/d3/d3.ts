/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/d3/d3.d.ts" />
/// <reference path="point.ts" />
/// <reference path="vertex.ts" />
/// <reference path="edge.ts" />
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
        private lastLinkId = 0;
        private vertices = [];
        private verticeIds = {}
        private edgesIds = {};
        private edges = []; // Remember it is not ID but index in the array
        private svg;
        private vis;
        private force;
        public selected_node = null;
        public hover_node = null;
        private links;
        private circle;
        private circleRadius = 15;
        private linkText;

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
                    .links(this.edges)
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
            console.log("nodes: ",this.force.nodes())
        }

        private tick = () => {
            this.circle.attr('transform', (d) => {
                var p = this.boundingBox(new Point(d.x, d.y));
                return 'translate(' + p.x + ',' + p.y + ')';
            });

            // link
            this.links.selectAll('path').attr('d', (d) => {
                var sourceP = new Point(d.source.x, d.source.y);
                var targetP = new Point(d.target.x, d.target.y);
                sourceP = this.boundingBox(sourceP);
                targetP = this.boundingBox(targetP);

                var sourcePadding = d.data.direction != 'post' ? this.circleRadius+5 : this.circleRadius;
                var targetPadding = d.data.direction != 'pre' ? this.circleRadius+5 : this.circleRadius;

                var oppositeEdgeExists = this.edgesIds[d.target.id + ',' + d.source.id];

                if (d.source == d.target) {
                    console.log('Drawing self-loop: ', d)
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
                else if (oppositeEdgeExists) { 
                    console.log('Drawing bending edges: ', d);
                    // draw the two opposite edges
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

                    console.log("M" + newSourceP.x + "," + newSourceP.y + "Q" + cp.x + " " + cp.y + " " + newTargetP.x + " " + newTargetP.y);
                    return "M" + newSourceP.x + "," + newSourceP.y + "Q" + cp.x + " " + cp.y + " " + newTargetP.x + " " + newTargetP.y;


                }
                else {
                    // normal edge
                    var norm = sourceP.subtract(targetP);
                    norm.normalize();

                    var newSourceP = sourceP.subtract(norm.multiplyWithNumber(sourcePadding));
                    
                    var newTargetP = targetP.add(norm.multiplyWithNumber(targetPadding));
                    return 'M' + newSourceP.x + ',' + newSourceP.y + 'L' + newTargetP.x + ',' + newTargetP.y;
                }
            });

            //link label
            this.links.selectAll('text').attr("transform", (d) => {
                var oppositeEdgeExists = this.edgesIds[d.target.id + ',' + d.source.id];

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
                else if(oppositeEdgeExists){
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

        // This methods updates, inserts and removes links and circles(nodes) 
        private update() : void {
            //Bind the data
            this.circle = this.circle.data(this.vertices, (d) => {return d.id;});
            
            // update existing nodes (reflexive & selected visual states)
            this.svg.selectAll('circle')
               .style('fill', this.nodeColorChange)
               .style('stroke', this.nodeColors['stroke']);
               

            // add new nodes    
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
                .text(function(d) { return d.id; });

            //remove old nodes
            this.circle.exit().remove();

            //Bind the data
            this.links = this.links.data(this.edges, (d) => {return d.id;});

            //update links
            this.links.selectAll('path')
                .style('marker-start', (d) => { return d.data.direction != 'post' ? 'url(#pre-arrow)' : ''; }) //pre&post checking is flipped because of "both"
                .style('marker-end', (d) => { return d.data.direction != 'pre' ? 'url(#post-arrow)' : ''; }); //pre&post checking is flipped because of "both"

            //Group links and text label
            var glink = this.links.enter().append('svg:g')
                .attr("id", (d,i) => { return "linkId_" + i; })

            //Append link
            glink.append('svg:path')
                .attr("fill", "none")
                .attr("class", "link")
                .attr("stroke", "ff8888")
                .style('marker-start', (d) => { return d.data.direction != 'post' ? 'url(#pre-arrow)' : ''; }) //pre&post checking is flipped because of "both"
                .style('marker-end', (d) => { return d.data.direction != 'pre' ? 'url(#post-arrow)' : ''; }); //pre&post checking is flipped because of "both"

            //Append text to links
            glink.append('svg:text')
                .style("font-size", "12px")
                .style("opacity",1)
                //.attr("dy", "1.2em")
                .attr("text-anchor", "middle")
                .text((d) => {
                    return d.data.label;
                });

            //remove links
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
                console.log('selected: ', d.id)
                return this.nodeColors['selected'];
            }
            else if(d.data.expanded) { 
                console.log('expanded: ', d.id);
                return this.nodeColors['expanded'];
            }
            else {
                console.log('unexpanded: ', d.id);
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
            this.edges = [];
            this.verticeIds = {};
            this.edgesIds = {};
            this.update();
        }

        public showProcess(identifier : number, data : VertexData = {label:''}) : Vertex {
            // So this is what should happend, when node is cliked it should fire the onClick method given from the holder of the graph.(who ever created the object)
            var doesVertexExists = this.verticeIds[identifier]; 
            var v : Vertex;
            if(doesVertexExists) {
                //override vertex
                v = this.getVertexById(identifier)
                v.data = data
                console.log('Override vertex: ', v);
            }
            else {
                v = new Vertex(identifier, data);
                this.vertices.push(v);
                this.verticeIds[v.id] = true;
                console.log('Insert vertex: ', v);
            }  

            this.update();
            return v;
        }

        private getVertexById(identifier : number) : Vertex {
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

        private removeVertexbyId(identifier : number) : void {
            var v = this.getVertexById(identifier);
            this.removeVertex(v);
        }

        public getProcessDataObject(identifier) : any {

        }

        public showTransitions(sourceId : number, targetId : number, data : EdgeData = {}) : Edge {
            
            // Has the edge been defined
            var doesEdgeExists = this.edgesIds[sourceId + "," +targetId];

            if (doesEdgeExists) {
                // If defined then override the edge with new data.
                console.log('Override: ')
            } else {
                // Else define it
                var linkId = ++this.lastLinkId;
                var edge = new Edge(linkId, this.showProcess(sourceId), this.showProcess(targetId), data);
                this.edges.push(edge);
                this.edgesIds[sourceId + ',' + targetId] = linkId;
                console.log("Inserted: ", edge);
            }

            this.update();
            return edge;
        }

        private removeTransitionById(identifier : number) { 
            var e = this.getTransitionById(identifier);
        }

        private getTransitionById(identifier : number){

        }

        public getTransitionDataObjects(fromId, toId) : any {

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
    }
}

var d3test = new GUI.d3Graph();
d3test.showProcess(1);
d3test.showProcess(2, {expanded: false});
d3test.showProcess(3, {expanded: false});
d3test.showTransitions(1,2, {label: 'test'});
d3test.showTransitions(2,3, {label: 'edge 2->3'});
d3test.showTransitions(3,2, {label: 'edge 3->2'});
d3test.showTransitions(3,3, {label : 'this is awesome'});




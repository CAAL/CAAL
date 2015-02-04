/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/d3.d.ts" />
/// <reference path="point.ts" />
/// <reference path="../gui.ts" />

module GUI {
    export class d3Graph implements GUI.ProcessGraphUI {
        public width : number = 960;
        public height : number = 500;
        private onClick : Function = null;
        private nodeColors = {
            "unexpanded": "rgb(160,160,160)",
            "expanded": "rgb(51, 65, 185)",
            "selected": "rgb(245, 50, 50)",
            "stroke" : "rgb(0, 0, 0)"
        }; 
        private lastNodeId = 2;
        private lastLinkId = 1;
        private nodes = [{id:0, expanded:true}, {id:1, expanded:false}, {id:2, expanded:false}];
        private edges = [
            {id: 0, source: this.nodes[0], target: this.nodes[1], direction:'pre', label:"Test1"},
            {id: 1, source: this.nodes[1], target: this.nodes[2], direction:'post', label:"Test2"},
            {id: 2, source: this.nodes[0], target: this.nodes[2], direction:'post', label:"Test3"},
            {id: 3, source: this.nodes[2], target: this.nodes[2], direction:'post', label:"Test4"}
        ];
        private svg;
        private vis;
        private force;
        public selected_node = null;
        private links;
        private circle;
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
                    .nodes(this.nodes)
                    .links(this.edges)
                    .size([this.width, this.height])
                    .linkDistance(150)
                    .charge(-500)
                    .on('tick', this.tick);
            // define arrow markers for graph links
            this.svg.append('svg:defs').append('svg:marker')
                .attr('id', 'post-arrow')
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 6)
                .attr('markerWidth', 3)
                .attr('markerHeight', 3)
                .attr('orient', 'auto')
              .append('svg:path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', '#000');

            this.svg.append('svg:defs').append('svg:marker')
                .attr('id', 'pre-arrow')
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 4)
                .attr('markerWidth', 3)
                .attr('markerHeight', 3)
                .attr('orient', 'auto')
              .append('svg:path')
                .attr('d', 'M10,-5L0,0L10,5')
                .attr('fill', '#000');

            this.links = this.svg.append('g').selectAll('link');
            this.circle = this.svg.append('g').selectAll('g');
            this.update();
        }

        private tick = () => {
            // link
            this.links.selectAll('path').attr('d', (d) => {
                var sourceP = new Point(d.source.x, d.source.y);
                var targetP = new Point(d.target.x, d.target.y);
                var norm = sourceP.subtract(targetP);
                norm.normalize();

                var sourcePadding = d.direction == 'pre' || d.direction == 'both' ? 20 : 12;
                var targetPadding = d.direction == 'post' || d.direction == 'both' ? 20 : 15;
                
                var newSourceP = sourceP.subtract(norm.multiplyWithNumber(sourcePadding));
                
                var newTargetP = targetP.add(norm.multiplyWithNumber(targetPadding));
                if(d.source == d.target){
                    //self loop
                    var cpH = 90;
                    var cpV = 60;

                    var cp1 = new Point(sourceP.x - (cpH/2), sourceP.y - cpV);
                    var cp2 = new Point(sourceP.x + (cpH/2), sourceP.y - cpV);

                    console.log("M" + sourceP.x + "," + sourceP.y+"C" + cp1.x + " " + cp1.y+" " + cp2.x+ " " + cp2.y+" " +sourceP.x +" "+ sourceP.y);
                    return "M" + sourceP.x + "," + sourceP.y+"C" + cp1.x + " " + cp1.y+" " + cp2.x+ " " + cp2.y+" " +sourceP.x +" "+ sourceP.y;
                }
                else{
                    // normal edge
                    return 'M' + newSourceP.x + ',' + newSourceP.y + 'L' + newTargetP.x + ',' + newTargetP.y;
                }
            });

            //link label
            this.links.selectAll('text').attr("transform", (d) => {
                if(d.source == d.target) {
                    // self loop
                    var cpV = 65;
                    return "translate(" + (d.source.x + d.target.x) / 2 + "," 
                + (((d.source.y + d.target.y) / 2) - cpV) + ")"; 
                }
                else {
                    // normal edge
                    return "translate(" + (d.source.x + d.target.x) / 2 + "," 
                + (d.source.y + d.target.y) / 2 + ")"; 
                }
            });

            // node positions
            this.circle.attr('transform', (d) => {
              return 'translate(' + d.x + ',' + d.y + ')';
            });
        }

        // This methods updates, inserts and removes links and circles(nodes) 
        private update() : void {
            this.circle = this.circle.data(this.nodes, (d) => {return d.id;});
            // update existing nodes (reflexive & selected visual states)
            this.circle.selectAll('circle')
               .style('fill', this.nodeColorChange)
               .style('stroke', this.nodeColors['stroke']);

            // add new nodes    
            var g = this.circle.enter().append('svg:g');
            
            // Add drag listener
            g.call(this.force.drag);
            
            // Append circle to group
            g.append('svg:circle')
                .attr('class', 'node')
                .attr('r', 15)
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

            this.links = this.links.data(this.edges, (d) => {return d.id;});

            //update links
            this.links.selectAll('path')
                .style('marker-start', (d) => { return d.direction != 'post' ? 'url(#pre-arrow)' : ''; }) //pre&post checking is flipped because of "both"
                .style('marker-end', (d) => { return d.direction != 'pre' ? 'url(#post-arrow)' : ''; }); //pre&post checking is flipped because of "both"

            //Group links and text label
            var glink = this.links.enter().append('svg:g')
                .attr("id", (d,i) => { return "linkId_" + i; })

            //Append link
            glink.append('svg:path')
                .attr("fill", "none")
                .attr("class", "link")
                .attr("stroke", "ff8888")
                .attr("stroke-width", "1px")
                .style('marker-start', (d) => { return d.direction != 'post' ? 'url(#pre-arrow)' : ''; }) //pre&post checking is flipped because of "both"
                .style('marker-end', (d) => { return d.direction != 'pre' ? 'url(#post-arrow)' : ''; }); //pre&post checking is flipped because of "both"

            //Append text to links
            glink.append('svg:text')
                .style("font-size", "12px")
                .style("opacity",1)
                .attr("dy", "1.2em")
                .attr("text-anchor", "middle")
                .text((d) => {
                    return d.label;
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
                console.log('selected', d.id)
                return this.nodeColors['selected'];
            }
            else if(d.expanded) { 
                console.log('expanded', d.id);
                return this.nodeColors['expanded'];
            }
            else {
                console.log('unexpanded', d.id);
                return this.nodeColors['unexpanded'];
            }
        };

        private nodeClicked = (d) => {
            if (d3.event.defaultPrevented) return; // ignore drag

            this.selected_node = d;
            this.selected_node.expanded = true;
            console.log('Clicked', d.id);
            
            this.update();
        };

        public clearAll() : void {

        }

        public showProcess(identifier, data : any) : void {
            // d.expanded = true; 
            // var point = d3.mouse(this),
            //     node = {id: ++lastNodeId, expanded: false};
            // nodes.push(node);
        }

        public getProcessDataObject(identifier) : any {

        }

        public showTransitions(fromId, toId, datas : any[]) {

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

        }

        public setHover(name: string) : void {

        }

        public clearHover() : void {

        }

        public freeze() : void {

        }

        public unfreeze() : void {

        }
    }
}

var d3test = new GUI.d3Graph();



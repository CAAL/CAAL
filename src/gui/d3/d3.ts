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
            "selected": "rgb(245, 50, 50)"
        }; 
        private lastNodeId = 0;
        private nodes = [{id:0, expanded:true}, {id:1, expanded:false}, {id:2, expanded:false}];
        private edges = [{source: this.nodes[0], target: this.nodes[1], direction:'both'}];
        private svg;
        private force;
        public selected_node = null;
        private path;
        private circle;

        constructor() {      
            this.init();
        }
    
        private init() : void {
            this.svg = d3.select('svg')
                    .attr('width', this.width)
                    .attr('height', this.height);

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

            this.path = this.svg.append('svg:g').selectAll('path'),
            this.circle = this.svg.append('svg:g').selectAll('g');
            this.update();
        }

        private tick = () => {
            this.path.attr('d', (d) => {
                var sourceP = new Point(d.source.x, d.source.y);
                var targetP = new Point(d.target.x, d.target.y);
                var norm = sourceP.subtract(targetP);
                norm.normalize();

                var sourcePadding = d.direction == 'pre' || d.direction == 'both' ? 17 : 12;
                var targetPadding = d.direction == 'post' || d.direction == 'both' ? 17 : 12;
                
                var newSourceP = sourceP.subtract(norm.multiplyWithNumber(sourcePadding));
                
                var newTargetP = targetP.add(norm.multiplyWithNumber(targetPadding));

                return 'M' + newSourceP.x + ',' + newSourceP.y + 'L' + newTargetP.x + ',' + newTargetP.y;
            });

            this.circle.attr('transform', (d) => {
              return 'translate(' + d.x + ',' + d.y + ')';
            });
        }

        private update() : void {
            this.path = this.path.data(this.edges);

            // update existing links
            this.path
              .style('marker-start', function(d) { return d.direction == 'pre' || d.direction == 'both' ? 'url(#pre-arrow)' : ''; })
              .style('marker-end', function(d) { return d.direction == 'post' || d.direction == 'both' ? 'url(#post-arrow)' : ''; });

            // add new links
            this.path.enter().append('svg:path')
              .attr('class', 'link')
              .style('marker-start', function(d) { return d.direction == 'pre' || d.direction == 'both' ? 'url(#pre-arrow)' : ''; })
              .style('marker-end', function(d) { return d.direction == 'post' || d.direction == 'both' ? 'url(#post-arrow)' : ''; });

            // remove old links
            this.path.exit().remove();

            this.circle = this.circle.data(this.nodes, function(d) {return d.id;});
            // update existing nodes (reflexive & selected visual states)
            this.circle.selectAll('circle')
                .style('fill', this.nodeColorChange)
                .style('stroke', "#000000");

            var g = this.circle.enter().append('svg:g');

            g.call(this.force.drag);
            
            g.append('svg:circle')
                .attr('class', 'node')
                .attr('r', 12)
                .style('fill', this.nodeColorChange)
                .style('stroke', "#000000")
                .on('click', this.nodeClicked);

            // show node IDs
            g.append('svg:text')
                .attr('x', 0)
                .attr('y', 4)
                .attr('class', 'id')
                .text(function(d) { return d.id; });

            //remove old nodes
            this.circle.exit().remove();

            //start the physics
            this.force.start();
        }

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



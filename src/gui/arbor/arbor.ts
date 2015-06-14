/*libs Jquery, graphics is needed.*/
/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/arbor.d.ts" />
/// <reference path="renderer.ts" />
/// <reference path="handler.ts" />
/// <reference path="../gui.ts" />

module GUI {

    export class ArborGraph implements GUI.ProcessGraphUI {
        private sys : ParticleSystem;
        private renderer : Renderer;
        private handler : Handler;
        private highlightedEdges : Edge[] = [];

        constructor(renderer, options = {repulsion: 400, stiffness: 800, friction: 0.5, integrator: "verlet"}) {
            this.sys = arbor.ParticleSystem(options);
            this.sys.parameters({gravity:true});
            this.renderer = renderer;
            this.sys.renderer = renderer;
            this.handler = new Handler(renderer);
        }

        public showProcess(nodeId : string, data : Object) : void {
            var node = this.sys.getNode(nodeId);
            if (node) {
                node.data = data;
            } else {
                this.sys.addNode(nodeId, data);
            }
        }

        public getProcessDataObject(nodeId : string) : Object {
            var node = this.sys.getNode(nodeId),
                data = node ? node.data : null;
            return data;
        }

        public getNode(name : string) : Node {
            return this.sys.getNode(name);
        }

        public getPosition(name : string) : Point {
            return this.sys.toScreen(this.getNode(name).p);
        }

        public showTransitions(fromId : string, toId : string, datas : Object[]) {
            var edges = this.sys.getEdges(fromId, toId),
                edge = edges.length > 0 ? edges[0] : null;
            if (edge) {
                edge.data.datas = datas;
            } else {
                this.sys.addEdge(fromId, toId, {datas: datas});
            }
        }

        private originalStatus = null;
        public setSelected(name: string) {
            if(!name) return;
            var newSelectedNode = this.sys.getNode(name);

            if(this.renderer.selectedNode && newSelectedNode) {
                this.renderer.selectedNode.data.status = this.originalStatus; // clear the previous selected
            }

            if(newSelectedNode) {
                this.originalStatus = newSelectedNode.data.status;
                this.renderer.selectedNode = newSelectedNode; // get the node
                this.renderer.selectedNode.data.status = 'selected'; // set it as selected, and let the renderer handle the rest.
            }
            this.renderer.redraw(); // redraw the image to change the color of the selected node.
        }

        public getSelected() : string {
            return this.renderer.selectedNode.name;
        }

        public setHover(name : string) : void {
            this.renderer.hoverNode = this.sys.getNode(name);
            this.highlightEdges();
        }

        public clearHover() : void {
            this.renderer.hoverNode = null;
            this.removeHighlightEdges();
        }

        private highlightEdges(){
            var edges = [];
            
            edges = this.sys.getEdges(this.renderer.selectedNode, this.renderer.hoverNode);

            if(edges.length > 0){
                for (var i = 0; i < edges.length; i++){
                    edges[i].data.highlight = true;
                    this.highlightedEdges.push(edges[i]);
                }
                this.renderer.redraw();
            }
        }

        private removeHighlightEdges() : void { 
            if(this.highlightedEdges.length > 0){
                while(this.highlightedEdges.length> 0){
                    var edge = this.highlightedEdges.pop();
                    edge.data.highlight = false;
                }
                this.renderer.redraw();
            }
        }

        public hightlightPath() : void {
            // when given a trace(path) all edges should be highlighted
        }

        public getTransitionDataObjects(fromId : string, toId : string) : Object[] {
            var edges = this.sys.getEdges(fromId, toId),
                edge = edges.length > 0 ? edges[0] : null,
                datas = edge && edge.data ? edge.data.datas : null;
            return datas;
        }

        /* Event handling */
        public setOnSelectListener(f : (identifier : string) => void) : void {
            this.handler.onClick = (nodeId) => {
                f(nodeId);
            };
        }

        public clearOnSelectListener() : void {
            this.handler.onClick = null;
        }

        public setHoverOnListener(f : (identifier : string) => void) : void {
            this.handler.onHover = f
        }

        public clearHoverOutListener() : void {
            this.handler.onHover = null;
        }

        public setHoverOutListener(f : (identifier : string) => void) : void {
            this.handler.onHoverOut = f
        }

        public clearHoverOnListener() : void {
            this.handler.onHoverOut = null;
        }

        public clearAll() : void {
            this.sys.prune((node, from, to) => true);
        }

        public freeze() : void {
            this.sys.stop();
        }

        public unfreeze() : void {
            this.sys.start(true);
        }

        public bindCanvasEvents() : void { 
            this.handler.bindCanvasEvents();
        }

        public unbindCanvasEvents() : void {
            this.handler.unbindCanvasEvents();
        }
    }
}

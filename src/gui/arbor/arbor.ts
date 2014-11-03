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
        public onClick : Function = null; 

        constructor(renderer) {
            this.sys = arbor.ParticleSystem(500, 3000, 0.95);
            this.sys.parameters({gravity:true});
            this.renderer = renderer;
            this.sys.renderer = renderer;
            this.handler = new Handler(renderer);
        }

        showProcess(nodeId : string, data : Object) : void {
            var node = this.sys.getNode(nodeId);
            if (node) {
                node.data = data;
            } else {
                this.sys.addNode(nodeId, data);
            }
        }

        getProcessDataObject(nodeId : string) : Object {
            var node = this.sys.getNode(nodeId),
                data = node ? node.data : null;
            return data;
        }

        showTransitions(fromId : string, toId : string, datas : Object[]) {
            var edges = this.sys.getEdges(fromId, toId),
                edge = edges.length > 0 ? edges[0] : null;
            if (edge) {
                edge.data.datas = datas;
            } else {
                this.sys.addEdge(fromId, toId, {datas: datas});
            }
        }

        getTransitionDataObjects(fromId : string, toId : string) : Object[] {
            var edges = this.sys.getEdges(fromId, toId),
                edge = edges.length > 0 ? edges[0] : null,
                datas = edge && edge.data ? edge.data.datas : null;
            return datas;
        }

        /* Event handling */
        setOnSelectListener(f : (identifier : string) => void) : void {
            this.handler.onClick = (nodeId) => {
                f(nodeId);
            };
        }
        clearOnSelectListener() : void {
            this.handler.onClick = null;
        }

        clearAll() : void {
            this.sys.prune((node, from, to) => true);
        }

        // //Creates or updates a node. Default data is used to fill keys if undefined.
        // public showNode(nodeId, defaultData) {
        //     var node = this.sys.getNode(nodeId),
        //         data;
        //     if (node) {
        //         //Use existing data ast most up to date.
        //         data = {};
        //         this.overrideKeys(data, defaultData);
        //         this.overrideKeys(data, node.data);
        //         node.data = data;
        //     } else {
        //         data = {};
        //         this.overrideKeys(data, defaultData);
        //         node = this.sys.addNode(nodeId, data);
        //     }
        // }

        // public changeNodeData(nodeId, data) {
        //     var node = this.sys.getNode(nodeId);
        //     if (node) {
        //         this.overrideKeys(node.data, data);
        //     }
        // }

        // private overrideKeys(obj, overrideKeyVals) {
        //     for (var key in overrideKeyVals) {
        //         obj[key] = overrideKeyVals[key];
        //     }
        // }

        // private showEdge(nodeFromId, nodeToId, data) {
        //     //Arbor only allows one directed edge between two nodes.
        //     var edges = this.sys.getEdges(nodeFromId, nodeToId),
        //         edge = edges.length > 0 ? edges[0] : null;
        //     if (!edge) {
        //         edge = this.sys.addEdge(nodeFromId, nodeToId, data);
        //     } else {
        //         edge.data = data;
        //     }
        // }

        // public addOutgoingEdgesFrom(fromProcessId) {
        //     var targets = {},
        //         arborGraph = this;

        //     var add = (targetId : string, data) => {
        //         targets[targetId] = targets[targetId] || [];
        //         targets[targetId].push(data);
        //     };

        //     var finish = () => {
        //         for (var targetProcessId in targets) {
        //             arborGraph.showEdge(fromProcessId, targetProcessId, {
        //                 datas: targets[targetProcessId]
        //             });
        //         }
        //         targets = null;
        //     };
            
        //     return {
        //         addTarget: add,
        //         finish: finish
        //     };
        // }

        // public clear() {
        //     this.sys.prune((node, from, to) => true);
        // }

        // private isFrozen: boolean = false;
        
        // public freeze(): void {
        //     if (!this.isFrozen) {
        //         this.sys.stop();
        //     } else {
        //         this.sys.start();
        //     }
        //     this.isFrozen = !this.isFrozen;
        // }
    }
}


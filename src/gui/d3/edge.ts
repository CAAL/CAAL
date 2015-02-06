/// <reference path="vertex.ts" />
class Edge {
    
    constructor(public id : number, public source: Vertex, public target: Vertex, 
        public data = {expanded: false, direction:'post', label : ''}) {
    }
}
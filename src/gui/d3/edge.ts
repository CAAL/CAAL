/// <reference path="vertex.ts" />
interface EdgeData {
    direction? : string
    label? : string
}

class Edge {

    public data : EdgeData = {direction: 'post', label: 'label'};
    constructor(public id : number, public source : Vertex, 
        public target : Vertex, data : EdgeData) {
        this.data.direction = data.hasOwnProperty('direction') ? data.direction : this.data.direction ;
        this.data.label = data.hasOwnProperty('label') ? data.label : this.data.label;
    }
}
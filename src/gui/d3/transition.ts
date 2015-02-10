/// <reference path="vertex.ts" />
interface TransitionData {
    direction? : string
    label? : string
}

class Transition {
    public id : string
    public data : TransitionData = {direction: 'post', label: 'label'};
    constructor(public source : Vertex, 
        public target : Vertex, data : TransitionData) {
        this.id = source.id + ',' + target.id;
        this.data.direction = data.hasOwnProperty('direction') ? data.direction : this.data.direction ;
        this.data.label = data.hasOwnProperty('label') ? data.label : this.data.label;
    }
}
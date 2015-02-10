interface VertexData {
    expanded? : boolean;
    label? : string;
}

class Vertex {
    public index;
    public weight;
    public data : VertexData = {expanded: false, label: ''};
    constructor(public id : string, data : VertexData) {
        // create the node
        this.data.expanded = data.hasOwnProperty('expanded') ? data.expanded : this.data.expanded;
        this.data.label = data.hasOwnProperty('label') ? data.label : this.data.label;
    }
}
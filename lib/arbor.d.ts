interface ParticleSystem {
    (repulsion : number, stiffness : number, friction : number) : ParticleSystem;
    renderer : Object;
    addEdge(source : string, target : string, data : Object) : Edge;
    addNode(name : string, object : Object) : Node;
    parameters(o : Object) : void;
}

interface Node{
    mass : number;
    p : Point;
    name : string;
    data : Object;
}

interface Edge {
    source : Node;
    target : Node;
    lengt : Number
    data : Object;
}


interface Graphics {
(canvas : HTMLCanvasElement) : any;
}

interface Point {
    (x : number, y : number) : Point;
    x : number;
    y : number;
}

interface Arbor {
    ParticleSystem : ParticleSystem;
    Point : Point;
    Graphics : Graphics;

}

declare module "arbor" {
    export = arbor;
}
declare var arbor: Arbor;
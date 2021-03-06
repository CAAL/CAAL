interface ParticleSystem {
    /*Vars*/
    renderer : Object;

    /*Constructor*/
    (repulsion : number, stiffness : number, friction : number) : ParticleSystem;
    (repulsion : number, stiffness : number, friction : number, gravity : boolean, fps : number, dt : number, precision : number) : ParticleSystem;
    (particleSettings : Object) : ParticleSystem;

    /*Functions*/
    screenSize(width : number, height : number) : void;
    screenPadding(top : number) : void;
    screenPadding(top : number, bottom : number) : void;
    screenPadding(top : number, right : number, bottom : number, left : number) : void;

    nearest(p : Point) : refNode;
    fromScreen(p : Point) : Point;
    toScreen(p : Point) : Point;
    parameters(o : Object) : void;

    /* Nodes */
    addNode(name : string, object : Object) : Node;
    getNode(name : string);
    pruneNode(node);

    /* Edges */
    addEdge(source, target, data) : Edge;
    getEdges(source, target) : Edge[];
    getEdgesFrom(node) : Edge[];
    getEdgesTo(node) : Edge[];
    pruneEdge(edge : Edge);

    /* Iteration */

    eachNode(f : (n : Node, pt : Point) => void) : void;
    eachEdge(f : (e : Edge, p1 : Point, p2 : Point) => void) : void;

    prune(f : (node : Node, from : Edge[], to : Edge[]) => void);

    start(unpause: boolean) : void;
    stop() : void;

}

interface refNode{
    node : Node;
    point : Point;
    distance : number;
}

interface Node{
    _id : number;
    mass : number;
    p : Point;
    name : string;
    data : any; //Must not be object for some reason
    fixed : boolean; // if true, don't let physics move the node
    tempMass : number;
    expanded : boolean;
}

interface Edge {
    source : Node;
    target : Node;
    lengt : Number
    data : any; //Must not be object for some reason
}


interface Graphics {
(canvas : HTMLCanvasElement) : any;
}

interface Point {
    (x : number, y : number) : Point;
    x : number;
    y : number;

    add(pt : Point) : Point;
    subtract(pt : Point) : Point;
    multiply(n : number) : Point;
    divide(n : number) : Point;
    magnitude( ) : Number;
    normal( ) : Point;
    normalize( ) : Point;
    exploded() : boolean;
}

interface Branch {
    nodes : Object;
    edges : Object;
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
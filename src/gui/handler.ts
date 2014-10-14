/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/arbor.d.ts" />
/// <reference path="./renderer.ts" />

class Handler {


    constructor(public renderer : Renderer) {

    }

    public init(){
        $(this.renderer.canvas).on("mousedown", this.clicked);
    }

    public clicked(): boolean {
         // Content
    
        return  false;
    }

    public dragged(): boolean {
         // Content
    
        return false;
    }

    public droppen(): boolean {
         // Content
    
        return false;
    }
}
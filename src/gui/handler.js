var Handler = (function () {
    function Handler(renderer, sys) {
        this.draggedNode = null;
        this.selected = null;
        this.nearest = null;
        this.dragged = null;
        this.oldmass = 1;
        this.renderer = null;
        this.renderer = renderer;
        this.canvas = renderer.canvas;
        this.particleSystem = sys;
    }
    Handler.prototype.init = function () {
        $(this.canvas).on("mousedown", { handler: this }, this.clicked);
    };

    Handler.prototype.clicked = function (e) {
        console.log("clicked");

        var h = e.data.handler;
        console.log(h.particleSystem);
        h.particleSystem.addNode("TEST", { label: "bal" });

        /*h.pos = $(this).offset();
        var p = {x:e.pageX-h.pos.left, y:e.pageY-h.pos.top};
        h.selected = h.nearest = h.dragged = h.particleSystem.nearest(p);
        
        if (h.selected.node !== null){
        // dragged.node.tempMass = 10000
        h.dragged.node.fixed = true;
        }
        */
        return false;
    };
    return Handler;
})();

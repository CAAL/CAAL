/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/arbor.d.ts" />
/// <reference path="./renderer.ts" />
var Handler = (function () {
    function Handler(renderer) {
        this.renderer = renderer;
    }
    Handler.prototype.init = function () {
        $(this.renderer.canvas).on("mousedown", this.clicked);
    };

    Handler.prototype.clicked = function () {
        // Content
        return false;
    };

    Handler.prototype.dragged = function () {
        // Content
        return false;
    };

    Handler.prototype.droppen = function () {
        // Content
        return false;
    };
    return Handler;
})();

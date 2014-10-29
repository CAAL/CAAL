
module Activities {

    export interface Activity {
        beforeVisible();
        afterVisible();
        beforeHide();
        afterHide();
    }

    export class Editor implements Activity {
        constructor() {
        }

        beforeVisible() {}
        afterVisible() {}
        beforeHide() {}
        afterHide() {}
    }

    export class Explorer implements Activity { 
        private canvas;
        private renderer;
        private arborGraph;
        private bindedResizeFn;

        constructor(canvas) {
            this.canvas = canvas;
            this.renderer = new Renderer(canvas);
            this.arborGraph = new ArborGraph(this.renderer);
            this.arborGraph.init();
        }

        afterVisible() {
            this.bindedResizeFn = this.resize.bind(this);
            $(window).on("resize", this.bindedResizeFn);
            this.resize();
        }

        private resize() {
            var width = this.canvas.parentNode.clientWidth;
            var height = this.canvas.parentNode.clientHeight;
            height = width * 4 / 10;
            this.canvas.width = width;
            this.canvas.height = height;
            this.renderer.resize(width, height);
        }

        afterHide() {
            $(window).unbind("resize", this.bindedResizeFn)
            this.bindedResizeFn = null;
        }

        beforeVisible() {}
        beforeHide() {}
    }
}

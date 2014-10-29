
module Activities {

    export interface Activity {
        prepare();
        exit();
    }

    export class Editor implements Activity {
        constructor() {
        }

        prepare() {

        }
        exit () {

        }
    }

    export class Explorer implements Activity { 
        private canvas;
        private renderer;
        private arborGraph;

        constructor(canvas) {
            this.canvas = canvas;
            this.renderer = new Renderer(canvas);
            this.arborGraph = new ArborGraph(this.renderer);
            this.arborGraph.init();
        }

        prepare() {
        }

        exit() {
        }
    }
}

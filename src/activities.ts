/// <reference path="../lib/jquery.d.ts" />
/// <reference path="gui/graph/graph.ts" />
/// <reference path="ccs/ccs.ts" />

module Activities {

    import ccs = CCS;

    export class Activity {
        public beforeShow(configuration : Object): void {}
        public afterShow(): void {}
        public beforeHide(): void {}
        public afterHide(): void {}
    }

    export class Editor extends Activity {
        private editor: any;

        public constructor(editor, editorId : string) {
            super();
            this.editor = editor;
            this.editor.setTheme("ace/theme/crisp");
            this.editor.getSession().setMode("ace/mode/ccs");
            this.editor.getSession().setUseWrapMode(true);
            this.editor.setOptions({
                enableBasicAutocompletion: true,
                maxLines: Infinity,
                showPrintMargin: false,
                fontSize: 14,
                fontFamily: "Inconsolata",
            });

            // /* Focus Ace editor whenever its containing <div> is pressed */
            $("#" + editorId).on('click', () => {
                this.editor.focus()
            });
        }
        afterShow() {
            this.editor.focus();
        }
    }

    export class Explorer extends Activity { 
        private canvas: any;
        private renderer: Renderer;
        private arborGraph: ArborGraph;
        private bindedResizeFn;
        private graph : CCS.Graph;
        private succGenerator : CCS.ProcessVisitor<CCS.TransitionSet>;
        private initialProcessName : string;

        constructor(canvas) {
            super();
            this.canvas = canvas;
            this.renderer = new Renderer(canvas);
            this.arborGraph = new ArborGraph(this.renderer);
        }

        beforeShow(configuration) {
            this.clear();
            this.graph = configuration.graph;
            this.succGenerator = configuration.successorGenerator;
            this.initialProcessName = configuration.initialProcessName;
            this.clear();
            this.expand(this.graph.processByName(this.initialProcessName));
        }

        afterShow(): void {
            this.bindedResizeFn = this.resize.bind(this);
            $(window).on("resize", this.bindedResizeFn);
            this.arborGraph.onClick = (processId) => {
                this.expand(this.graph.processById(processId));
            };
            this.resize(); 
        }

        afterHide() {
            $(window).unbind("resize", this.bindedResizeFn)
            this.bindedResizeFn = null;
            this.arborGraph.onClick = null;
            this.graph = null;
            this.succGenerator = null;
        }

        private clear() : void {
            this.arborGraph.clear();
        }

        private showProcess(process : ccs.Process) {
            var data;
            if (!process) throw {type: "ArgumentError", name: "Bad argument 'process'"};
            data = {label: this.labelFor(process), status: "unexpanded"};
            this.arborGraph.showNode(process.id, data);
        }

        private labelFor(process : ccs.Process) : string{
            var label = "S" + process.id;
            if (process instanceof ccs.NamedProcess) {
                label = (<ccs.NamedProcess>process).name;
            }
            return label;
        }

        private expand(process : ccs.Process) {
            if (!process) throw {type: "ArgumentError", name: "Bad argument 'process'"};
            this.showProcess(process);
            this.showProcessAsExplored(process);
            var transitions = this.succGenerator.visit(process);
            var edgeAdder = this.arborGraph.addOutgoingEdgesFrom(process.id);
            transitions.forEach(transition => {
                this.showTransition(edgeAdder, transition);
            }); 
            edgeAdder.finish();
        }

        private showProcessAsExplored(process : ccs.Process) : void {
            this.arborGraph.changeNodeData(process.id, {status: "expanded"});
        }

        private showTransition(edgeAdder, transition) {
            var action = transition.action,
                toProcess = transition.targetProcess,
                actionLabel = action.toString();
            this.showProcess(toProcess);
            edgeAdder.addTarget(toProcess.id, {label: actionLabel});
        }

        private resize(): void {
            var width = this.canvas.parentNode.clientWidth;
            var height = this.canvas.parentNode.clientHeight;
            height = width * 4 / 10;
            this.canvas.width = width;
            this.canvas.height = height;
            this.renderer.resize(width, height);
        }
    }
}

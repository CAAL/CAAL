module Activities {
    export class ActivityHandler {
        private currentActivity: Activity;

        public constructor(initialActivity: Activity) {
            this.selectActivity(initialActivity);

            $(document).on('activityChanged', (evt, activity) => {
                this.selectActivity(activity);
            });
        }

        private selectActivity(activity: Activity): void {
            if (activity instanceof Activity) {
                if (activity !== this.currentActivity) {
                    if (this.currentActivity) { // Will be 'undefined' initially.
                        this.currentActivity.hide();
                        this.currentActivity.exit();
                    }
                    activity.prepare();
                    activity.show();
                    this.currentActivity = activity;
                }
            }
        }
    }

    export class Activity {
        private containerId: string;

        public constructor(containerId: string, buttonId: string) {
            this.containerId = containerId;

            this.hide();

            $(buttonId).on('click', () => {
                $(document).trigger('activityChanged', this);
            });
        }

        public show(): void {
            $(this.containerId).show();
        }

        public hide(): void {
            $(this.containerId).hide();
        }

        public prepare(): void {}
        public exit(): void {}
    }

    export class Editor extends Activity {
        private editor: any;

        public constructor(containerId: string, buttonId: string, editorId: string) {
            super(containerId, buttonId);

            this.editor = ace.edit($(editorId)[0]);
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

            /* Focus Ace editor whenever its containing <div> is pressed */
            $(editorId).on('click', () => {
                this.editor.focus()
            });
        }

        public show(): void {
            super.show();
            this.editor.focus();
        }
    }

    export class Explorer extends Activity { 
        private canvas: HTMLCanvasElement;
        private renderer: any;
        private arborGraph: any;

        public constructor(containerId: string, buttonId: string, canvasId: string) {
            super(containerId, buttonId);

            this.canvas = <HTMLCanvasElement> $(canvasId)[0];
            this.renderer = new Renderer(this.canvas);
            this.arborGraph = new ArborGraph(this.renderer);
            this.arborGraph.init();
        }
    }

    export class Verifier extends Activity {
        public constructor(containerId: string, buttonId: string) {
            super(containerId, buttonId);
        }
    }
}

module Activities {

    export class ActivityHandler {
        private activities: Activity[];
        private currentActivity: Activity;

        public constructor(initialActivity: Activity, activities: Activity[]) {
            this.currentActivity = initialActivity;

            $(document).on('newActivity', (event, activity) => {
                this.selectActivity(activity);
            });
        }

        public selectActivity(activity: Activity): void {
            if (activity instanceof Activity) {
                if (activity !== this.currentActivity) {
                    if (this.currentActivity) {
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

            $(buttonId).on('click', () => {
                $(document).trigger('newActivity', this);
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
        public constructor(containerId: string, buttonId: string) {
            super(containerId, buttonId);
        }
    }

    export class Explorer extends Activity { 
        private canvas;
        private renderer;
        private arborGraph;

        public constructor(containerId: string, buttonId: string, canvas) {
            super(containerId, buttonId);
            //this.canvas = canvas;
            //this.renderer = new Renderer(canvas);
            //this.arborGraph = new ArborGraph(this.renderer);
            //this.arborGraph.init();
        }
    }

    export class Verifier extends Activity {
        public constructor(containerId: string, buttonId: string) {
            super(containerId, buttonId);
        }
    }
}

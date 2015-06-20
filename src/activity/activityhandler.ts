/// <reference path="activity.ts" />

module Activity {
	
	export class ActivityHandler {
		private currentActivity: Activity.Activity;
        private activities: Activity.Activity[] = [];

        public addActivity(name: string, activity: Activity.Activity): void {
            this.activities[name] = activity;

            activity.getButton().on("click", () => {
                this.selectActivity(name);
            });

            activity.getContainer().hide();
        }

        public selectActivity(name: string, configuration?: any): void {
            var activity = this.activities[name];

            if (activity.checkPreconditions()) {
                if (this.currentActivity) {
                    this.currentActivity.onHide();
                    this.currentActivity.getContainer().hide();
                    this.currentActivity.getActiveToggle().removeClass("active");
                }

                this.currentActivity = activity;
                this.currentActivity.getContainer().show();
                this.currentActivity.getActiveToggle().addClass("active");
                activity.onShow(configuration);
            }
        }
	}

}
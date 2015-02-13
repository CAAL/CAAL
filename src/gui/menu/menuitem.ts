/// <reference path="../project.ts" />
/// <reference path="../storage.ts" />
/// <reference path="../../activity/activityhandler.ts" />

class MenuItem {
    protected $button : JQuery;
    protected activityHandler : Activity.ActivityHandler;
    protected project : Project;
    protected storage : WebStorage;
    protected session : WebStorage;

    public constructor(button : string, activityHandler : Activity.ActivityHandler) {
        this.$button = $(button);
        this.activityHandler = activityHandler;
        this.project = Project.getInstance();
        this.storage = new WebStorage(localStorage);
        this.session = new WebStorage(sessionStorage);

        this.$button.on("click", (e) => this.onClick(e));
    }

    protected onClick(e) : void {}
}

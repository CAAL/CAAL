/// <reference path="menuitem.ts" />

class New extends MenuItem {
    protected onClick(e) : void {
        this.project.reset();
        this.activityHandler.selectActivity("editor");
    }
}

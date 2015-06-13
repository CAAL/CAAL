/// <reference path="../project.ts" />
/// <reference path="../storage.ts" />
/// <reference path="../../activity/activityhandler.ts" />

class MenuItem {
    protected $button : JQuery;
    protected activityHandler : Activity.ActivityHandler;
    protected project : Project;
    protected storage : WebStorage;
    protected session : WebStorage;
    protected $confirmModal : JQuery;
    protected $confirmModalNo : JQuery;
    protected $confirmModalYes: JQuery;

    public constructor(button : string, activityHandler : Activity.ActivityHandler) {
        this.$button = $(button);
        this.activityHandler = activityHandler;
        this.project = Project.getInstance();
        this.storage = new WebStorage(localStorage);
        this.session = new WebStorage(sessionStorage);
        this.$confirmModal = $("#confirm-modal");
        this.$confirmModalNo = $("#confirm-modal-no");
        this.$confirmModalYes = $("#confirm-modal-yes");

        this.$button.on("click", (e) => this.onClick(e));
    }

    protected onClick(e) : void {}

    protected showConfirmModal(title : string, message : string, noText : string, yesText : string,
                               noCallback : () => void, yesCallback : () => void) : void { 
        this.$confirmModal.find(".modal-title").text(title)
        this.$confirmModal.find(".modal-body > p").text(message);

        this.$confirmModalNo.text(noText);
        this.$confirmModalYes.text(yesText);

        this.$confirmModalNo.off("click");
        this.$confirmModalYes.off("click");
        this.$confirmModalNo.on("click", noCallback);
        this.$confirmModalYes.on("click", yesCallback);

        this.$confirmModal.modal("show");
    }
}

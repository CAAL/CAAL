module Activity {

    export class Activity {
        protected $container : JQuery;
        protected $button : JQuery;

        public constructor(container : string, button : string) {
            this.$container = $(container);
            this.$button = $(button);
        }

        public getContainer() : JQuery {
            return this.$container;
        }

        public getButton() : JQuery {
            return this.$button;
        }

        protected showExplainDialog(title : string, message : string) : void {
            var $dialog = $("#explain-dialog"),
            $dialogTitle = $("#explain-dialog-title"),
            $dialogBodyPar = $("#explain-dialog-body-par");
            $dialogTitle.text(title);
            $dialogBodyPar.text(message);
            $dialog.modal("show");
        }

        protected checkPreconditions() : boolean {
            return true;
        }

        public onShow(configuration?: any) : void {}
        public onHide() : void {}
    }

}

module Activity {

    export class Activity {
        protected project: Project;
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
            try {
                var graph = this.project.getGraph();

                if (graph.getNamedProcesses().length === 0) {
                    this.showExplainDialog("No Named Processes", "There must be at least one named process in the program.");
                    return false;
                }

                var errors = graph.getErrors();

                if (errors.length > 0) {
                    this.showExplainDialog("Error", errors.map(error => error.toString()).join("\n"));
                    return false;
                }
            } catch (error) {
                this.showExplainDialog("Error", error);
                return false;
            }

            return true;
        }

        public onShow(configuration?: any) : void {}
        public onHide() : void {}
    }

}

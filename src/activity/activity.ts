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

        protected showMessageBox(title : string, message : string) : void {
            $("#message-box-title").text(title);
            $("#message-box-body").text(message);
            $("#message-box").modal("show");
        }

        protected checkPreconditions() : boolean {
            try {
                var graph = this.project.getGraph();

                if (graph.getNamedProcesses().length === 0) {
                    this.showMessageBox("No Named Processes", "There must be at least one named process in the program.");
                    return false;
                }

                var errors = graph.getErrors();

                if (errors.length > 0) {
                    this.showMessageBox("Error", errors.map(error => error.toString()).join("\n"));
                    return false;
                }
            } catch (error) {
                this.showMessageBox("Error", error);
                return false;
            }

            return true;
        }

        public onShow(configuration?: any) : void {}
        public onHide() : void {}
    }

}

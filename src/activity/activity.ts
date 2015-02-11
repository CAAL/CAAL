module Activity {

    export class Activity {
        protected $container: JQuery;
        protected $button: JQuery;

        public constructor(container: string, button: string) {
            this.$container = $(container);
            this.$button = $(button);
        }

        public getContainer(): JQuery {
            return this.$container;
        }

        public getButton(): JQuery {
            return this.$button;
        }

        public checkPreconditions(): boolean {
            return true;
        }

        public onShow(configuration?: any): void {}
        public onHide(): void {}
    }

}

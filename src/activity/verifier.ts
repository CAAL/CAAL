/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="activity.ts" />
/// <reference path="../main.ts" />

module Activity {

    export class Verifier extends Activity {
        private toggleSelectId: string;

        public constructor(toggleSelectId: string) {
            super();

            this.toggleSelectId = toggleSelectId;

            $(toggleSelectId).on('click', () => this.toggleSelect());
        }

        private toggleSelect(): void {
            if ($(this.toggleSelectId).prop("checked")) {
                $(":checkbox").prop("checked", true);
            } else {
                $(":checkbox").prop("checked", false);
            }
        }
    }
}
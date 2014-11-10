/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="activity.ts" />
/// <reference path="../main.ts" />
/// <reference path="../ccs/ccs.ts" />

module Activity {

    export class Editor extends Activity {
        private editor: any;
        private statusArea: any;
        private closeButton: any;

        public constructor(editor: any, parseButtonId: string, statusAreaId: string) {
            super();
            this.editor = editor;
            this.statusArea = $(statusAreaId);

            this.editor.setTheme("ace/theme/crisp");
            this.editor.getSession().setMode("ace/mode/ccs");
            this.editor.getSession().setUseWrapMode(true);
            this.editor.setOptions({
                enableBasicAutocompletion: true,
                maxLines: Infinity,
                showPrintMargin: false,
                fontSize: 16,
                fontFamily: "Inconsolata",
            });

            $(parseButtonId).on("click", () => this.parse());

            this.statusArea.children("button").on("click", () => {
                this.statusArea.hide();
            });
        }

        public beforeShow(): void {
            this.statusArea.hide();
        }

        public afterShow(): void {
            this.editor.focus();
        }

        private getGraph(): CCS.Graph {
            var graph = new CCS.Graph();
                CCSParser.parse(this.editor.getValue(), {ccs: CCS, graph: graph});
            return graph;
        }

        private parse(): void {
            try {
                var graph = this.getGraph(),
                    errors = graph.getErrors();
                if (errors.length > 0) {
                    this.updateStatusArea(errors.map(error => error.message).join("<br>"), "alert-danger");
                } else {
                    this.updateStatusArea("Success! No errors.", "alert-success");
                }
            } catch (error) {
                if (error.message) {
                    var prefix = error.name ? error.name : "FatalError";
                    this.updateStatusArea(prefix + ": " + error.message, "alert-danger");
                } else {
                    this.updateStatusArea("Unknown Error: " + error.toString(), "alert-danger");
                }
            }
        }

        private updateStatusArea(errorString: string, errorClass: string): void {
            this.statusArea.removeClass("alert-success");
            this.statusArea.removeClass("alert-danger");
            this.statusArea.addClass(errorClass);

            var textArea = this.statusArea.children("p");
            textArea.empty();
            textArea.append(errorString);
            this.statusArea.show();
        }
    }

}

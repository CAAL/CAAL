/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="activity.ts" />
/// <reference path="../main.ts" />
/// <reference path="../ccs/ccs.ts" />

module Activity {

    export class Editor extends Activity {
        private editor: any;
        private statusArea: any;
        private fontSizeButtonId: string;

        public constructor(editor: any,
                           editorId: string,
                           parseButtonId: string,
                           statusAreaId: string,
                           clearButtonId: string,
                           fontSizeButtonId: string) 
        {
            super();
            this.editor = editor;
            this.statusArea = $(statusAreaId);
            this.fontSizeButtonId = fontSizeButtonId;

            this.editor.setTheme("ace/theme/crisp");
            this.editor.getSession().setMode("ace/mode/ccs");
            this.editor.getSession().setUseWrapMode(true);
            this.editor.setOptions({
                enableBasicAutocompletion: true,
                maxLines: Infinity,
                showPrintMargin: false,
                fontSize: 14,
                fontFamily: "Inconsolata",
            });

            // Focus editor whenever its parent element is clicked.
            $(editorId).on("click", () => {this.editor.focus()});

            $(parseButtonId).on("click", () => this.parse());
            this.statusArea.children("button").on("click", () => {
                this.statusArea.hide();
            });

            $(clearButtonId).on("click", () => this.clear());

            $(fontSizeButtonId).children("li").on("click", e => this.setFontSize(e));
        }

        public beforeShow(): void {
            this.statusArea.hide();
        }

        public afterShow(): void {
            this.editor.focus();
        }

        private clear(): void {
            this.editor.setValue("");
            this.statusArea.hide();
            this.editor.focus();
        }

        private setFontSize(e): void {
            var selected = " <i class=\"fa fa-check\"></i>";

            $(this.fontSizeButtonId).find("a").each(function() {
                $(this).children("i").remove();
                if ($(this).text() === e.target.text) {$(this).append(selected)}
            });

            this.editor.setFontSize(parseInt(e.target.text));
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

        private getGraph(): CCS.Graph {
            var graph = new CCS.Graph();
                CCSParser.parse(this.editor.getValue(), {ccs: CCS, graph: graph});
            return graph;
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

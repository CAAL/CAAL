/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="activity.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="../main.ts" />
/// <reference path="../../lib/ccs.d.ts" />

module Activity {

    export class Editor extends Activity {
        private editor: any;
        private project : Project;
        private statusArea: any;
        private $fontSizeButton: JQuery;

        public constructor(project: Project, container) 
        {
            var $container = $(container);
            super();
            this.project = project;
            this.editor = ace.edit("editor");
            this.statusArea = $container.find("#status-area");
            this.$fontSizeButton = $container.find("#font-size-btn");

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
            $container.find("#editor").on("click", () => {this.editor.focus()});

            $container.find("#parse-btn").on("click", () => {this.parse()});
            this.statusArea.children("button").on("click", () => {
                this.statusArea.hide();
            });

            this.$fontSizeButton.children("li").on("click", e => {this.setFontSize(e)});
            project.on("ccs-set", (event) => this.setText(event.ccs));
            this.editor.on("change", (event) => this.project.onCCSChanged(this.editor.getValue()));
        }

        private setText(text) : void {
            this.editor.setValue(text);
            this.editor.clearSelection();
        }

        public beforeShow(): void {
            this.statusArea.hide();
            this.setText(this.project.getCCS());
        }

        public afterShow(): void {
            this.editor.focus();
        }

        private setFontSize(e): void {
            var selected = " <i class=\"fa fa-check\"></i>";

            this.$fontSizeButton.find("a").each(function() {
                console.log("Hello");
                $(this).children("i").remove();
                if ($(this).text() === e.target.text) {$(this).append(selected)}
            });

            this.editor.setFontSize(parseInt(e.target.text));
        }

        private parse(): void {
            try {
                var graph = this.project.getGraph(),
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

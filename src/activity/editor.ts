/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/ccs.d.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="../main.ts" />
/// <reference path="activity.ts" />

module Activity {

    export class Editor extends Activity {
        private editor: any;
        private project: Project;
        private initialCCS: string;
        private $statusArea: JQuery;
        private $fontSizeButton: JQuery;

        constructor(container: string, button: string) {
            super(container, button);

            this.project = Project.getInstance();
            this.editor = ace.edit("editor");
            this.$statusArea = this.$container.find("#status-area");
            this.$fontSizeButton = this.$container.find("#font-size-btn");

            this.editor.setTheme("ace/theme/crisp");
            this.editor.getSession().setMode("ace/mode/ccs");
            this.editor.getSession().setUseWrapMode(true);
            this.editor.setOptions({
                enableBasicAutocompletion: true,
                showPrintMargin: false,
                fontSize: 16,
                fontFamily: "Inconsolata",
            });

            // Focus editor whenever its parent element is clicked.
            this.$container.find("#editor").on("click", () => {this.editor.focus()});
            
            this.$container.find("#parse-btn").on("click", () => {this.parse()});
            this.$statusArea.children("button").on("click", () => {this.$statusArea.hide()});
            this.$fontSizeButton.children("li").on("click", (e) => {this.setFontSize(e)});

            // Set initial size to match initial content
            this.updateHeight();
            
            this.editor.on("change", (event) => {
                this.project.setCCS(this.editor.getValue())
                this.updateHeight();
            });
        }

        public onShow(configuration?: any): void {
            this.$statusArea.hide();
            this.initialCCS = this.editor.getValue()
            this.setText(this.project.getCCS());
            this.editor.focus();
        }

        public onHide(): void {
            this.project.setChanged(this.initialCCS !== this.project.getCCS());
        }

        private setText(text: string): void {
            this.editor.setValue(text);
            this.editor.clearSelection();
        }

        private setFontSize(e): void {
            var selected = " <i class=\"fa fa-check\"></i>";

            this.$fontSizeButton.find("a").each(function() {
                $(this).children("i").remove();
                if ($(this).text() === e.target.text) {$(this).append(selected)}
            });

            this.editor.setFontSize(parseInt(e.target.text));
            this.updateHeight();
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
            this.$statusArea.removeClass("alert-success");
            this.$statusArea.removeClass("alert-danger");
            this.$statusArea.addClass(errorClass);

            var textArea = this.$statusArea.children("p");
            textArea.empty();
            textArea.append(errorString);
            this.$statusArea.show();
        }

        // http://stackoverflow.com/questions/11584061/
        private updateHeight(): void {
            var newHeight =
                      this.editor.getSession().getScreenLength()
                      * this.editor.renderer.lineHeight
                      + this.editor.renderer.scrollBar.getWidth();

            $('#editor').height(newHeight.toString() + "px");
            $('#editor-section').height(newHeight.toString() + "px");

            // This call is required for the editor to fix all of
            // its inner structure for adapting to a change in size
            this.editor.resize();
        }
    }
}

/// <reference path="activity.ts" />
/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../main.ts" />
/// <reference path="../ccs/ccs.ts" />

module Activity {

    export class Editor extends Activity {
        private editor: any;
        private statusDiv;
        private parseButton;
        private parseClickFn = null;

        public constructor(editor, editorId : string, statusDiv, parseButton) {
            super();
            this.editor = editor;
            this.statusDiv = statusDiv;
            this.parseButton = parseButton;
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

            // /* Focus Ace editor whenever its containing <div> is pressed */
            $("#" + editorId).on('click', () => {
                this.editor.focus()
            });
        }

        beforeShow() {
            this.parseClickFn = this.parse.bind(this);
            $(this.parseButton).on("click", this.parseClickFn);
        }

        afterShow() {
            this.editor.focus();
        }

        afterHide() {
            $(this.parseButton).off("click", this.parseClickFn);
            this.parseClickFn = null;
        }

        private getGraph() {
            var graph = new CCS.Graph();
                CCSParser.parse(this.editor.getValue(), {ccs: CCS, graph: graph});
            return graph;
        }

        private parse(eventData) {
            try {
                var graph = this.getGraph(),
                    errors = graph.getErrors();
                if (errors.length > 0) {
                    this.updateStatusArea(errors.map(error => error.message).join("\n"), "ccs-error");
                } else {
                    this.updateStatusArea("OK. No errors...");
                }
            } catch (error) {
                if (error.message) {
                    var prefix = error.name ? error.name : "FatalError";
                    this.updateStatusArea(prefix + error.message);
                } else {
                    this.updateStatusArea("Unknown Error: " + error.toString());
                }
            }
        }

        private updateStatusArea(preFormatted : string, classes? : string) {
            var $statusDiv = $(this.statusDiv),
                $preElement = $(document.createElement("pre"));
            if (classes) {
                $preElement.addClass(classes);
            }
            $statusDiv.empty();
            $preElement.text(preFormatted);
            $statusDiv.append($preElement);
        }
    }

}

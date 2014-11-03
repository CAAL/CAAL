/// <reference path="activity.ts" />
/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../main.ts" />

module Activity {

    export class Editor extends Activity {
        private editor: any;

        public constructor(editor, editorId : string) {
            super();
            this.editor = editor;
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
        afterShow() {
            this.editor.focus();
        }
    }

}

/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/ccs.d.ts" />
/// <reference path="../main.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="../gui/autosave.ts" />
/// <reference path="activity.ts" />

module Activity {

    export class Editor extends Activity {
        private project : Project;
        private editor : any;
        private autosave : AutoSave;
        private initialCCS : string;
        private $parseResult : JQuery;

        constructor(container : string, button : string) {
            super(container, button);

            this.project = Project.getInstance();

            this.editor = ace.edit("editor");
            this.editor.setTheme("ace/theme/crisp");
            this.editor.getSession().setMode("ace/mode/ccs");
            this.editor.getSession().setUseWrapMode(true);
            this.editor.setOptions({
                enableBasicAutocompletion: true,
                showPrintMargin: false,
                fontSize: 16,
                fontFamily: "Inconsolata",
            });

            this.editor.on("change", () => {
                if (this.editor.curOp && this.editor.curOp.command.name) {
                    this.autosave.resetTimer();
                }

                this.project.setCCS(this.editor.getValue());
                this.updateHeight();
            });

            this.autosave = new AutoSave();

            if (this.autosave.checkAutosave()) {
                var autosaveProject = this.autosave.getAutosave();
                this.project.update(0, autosaveProject.title, autosaveProject.ccs, autosaveProject.properties);
            }

            this.$parseResult = $("#parse-result");
            this.$parseResult.find("button").on("click", () => this.$parseResult.hide());

            $("#parse-btn").on("click", () => this.parse());
            $("#input-mode").on("change", (e) => this.setInputMode(e));
            $("#font-size").on("change", (e) => this.setFontSize(e));
        }

        public setInputMode(e) {
            var inputMode = InputMode[<string> $(e.target).val()];
            this.project.setInputMode(inputMode);

            if (inputMode === InputMode.CCS) {
                this.editor.getSession().setMode("ace/mode/ccs");
            } else if (inputMode === InputMode.TCCS) {
                this.editor.getSession().setMode("ace/mode/tccs");
            }
        }

        public onShow(configuration? : any) : void {
            $(window).on("resize", () => this.resize());
            this.resize();

            this.initialCCS = this.editor.getValue();

            if (this.initialCCS !== this.project.getCCS()) {
                this.editor.setValue(this.project.getCCS());
                this.editor.clearSelection();
            }

            this.editor.focus();
        }

        public onHide() : void {
            $(window).off("resize");
            this.project.setChanged(this.initialCCS !== this.project.getCCS());
            this.$parseResult.hide();
        }

        private setFontSize(e) : void {
            var fontSize = $(e.target).val();
            this.editor.setFontSize(parseInt(fontSize));
            this.updateHeight();
        }

        private parse() : void {
            try {
                var graph = this.project.getGraph(),
                    errors = graph.getErrors();
                if (errors.length > 0) {
                    this.showParseResult(errors.map(error => error.message).join("<br>"), "alert-danger");
                } else {
                    this.showParseResult("Success! No errors.", "alert-success");
                }
            } catch (error) {
                if (error.message) {
                    var prefix = error.name ? error.name : "FatalError";
                    this.showParseResult(prefix + ": " + error.message, "alert-danger");
                } else {
                    this.showParseResult("Unknown Error: " + error.toString(), "alert-danger");
                }
            }
        }

        private showParseResult(errorString : string, errorClass : string) : void {
            console.log(errorString);
        }

        // http://stackoverflow.com/questions/11584061/
        private updateHeight() : void {
            var newHeight = this.editor.getSession().getScreenLength() * this.editor.renderer.lineHeight + this.editor.renderer.scrollBar.getWidth();

            $('#editor').height(newHeight);
            $('#editor-section').height(newHeight);

            this.editor.resize();
        }

        private resize() : void {
            var height = window.innerHeight - $(".editor-border").offset().top - 32;
            $("#editor").css("max-height", height);
        }
    }
}

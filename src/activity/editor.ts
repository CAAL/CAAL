module Activity {

    export class Editor extends Activity {
        private $editor : JQuery;
        private $parse : JQuery;
        private editor : any;
        private autosave : AutoSave;
        private initialCCS : string;

        constructor(container : string, button : string) {
            super(container, button);

            this.project = Project.getInstance();

            this.$editor = $("#editor");
            this.$parse = $("#parse");

            this.editor = ace.edit(this.$editor[0]);
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
                this.project.update(0, autosaveProject.title, autosaveProject.ccs, autosaveProject.properties, autosaveProject.inputMode);
            }

            this.$parse.on("click", () => this.parse());
            this.$parse.popover({delay: {"show": 100, "hide": 100}, html: true, placement: "bottom", trigger: "manual"});

            $("#input-mode").on("change", (e) => this.setInputMode(e));
            $("#font-size").on("change", (e) => this.setFontSize(e));
        }

        protected checkPreconditions() : boolean {
            return true;
        }

        public onShow(configuration? : any) : void {
            $(window).on("resize", () => this.resize());
            this.resize();

            this.project.setChanged(false);
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
        }

        private parse() : void {
            var graph, errors, title, content;

            title = '<span class="text-danger"><i class="fa fa-exclamation-circle fa-lg"></i> Error</span>';

            try {
                graph = this.project.getGraph();
                errors = graph.getErrors();

                if (errors.length > 0) {
                    content = "";
                    for (var i = 0; i < errors.length; i++) {
                        content += "<p>" + errors[i].name + ": " + errors[i].message + "</p>";
                    }
                } else {
                    title = '<span class="text-success"><i class="fa fa-check fa-lg"></i> Success</span>';
                    content = "<p>The program is valid " + InputMode[this.project.getInputMode()] + ".</p>";
                    this.showPopover(title, content, false);
                    return;
                }
            } catch (error) {
                content = "<p>" + error.name + ": " + error.message + "</p>";
            }

            this.showPopover(title, content, true);
        }

        private showPopover(title : string, content : string, sticky : boolean) : void {
            this.$parse.attr("data-original-title", title);
            this.$parse.attr("data-content", content);
            this.$parse.popover("show");

            if (sticky) {
                this.$parse.siblings().find(".popover-title").append('<button type="button" id="parse-close" class="close">&times;</button>');

                $(document).off("click", this.handleClick);

                $("#parse-close").on("click", () => {
                    this.$parse.popover("hide");
                    this.editor.focus();
                });
            } else {
                $(document).on("click", this.handleClick);
            }
        }

        // http://stackoverflow.com/questions/11703093/
        private handleClick = (e) => {
            if (!$(e.target).is(this.$parse) && $(e.target).parents(".popover.in").length === 0) { 
                this.$parse.popover("hide");
            }
        }

        private setInputMode(e) : void {
            var inputMode = InputMode[<string> $(e.target).val()];

            if (inputMode === InputMode.CCS) {
                this.editor.getSession().setMode("ace/mode/ccs");
            } else if (inputMode === InputMode.TCCS) {
                this.editor.getSession().setMode("ace/mode/tccs");
            }

            this.project.setInputMode(inputMode);
            this.editor.focus();
        }

        private setFontSize(e) : void {
            var fontSize = $(e.target).val();
            this.editor.setFontSize(parseInt(fontSize));
            this.updateHeight();
        }

        // http://stackoverflow.com/questions/11584061/
        private updateHeight() : void {
            var height = this.editor.getSession().getScreenLength() * this.editor.renderer.lineHeight + this.editor.renderer.scrollBar.getWidth();

            this.$editor.height(height);
            this.$editor.find("#editor-section").height(height);

            this.editor.resize();
        }

        private resize() : void {
            var height = window.innerHeight - this.$editor.parent().offset().top - 32;
            this.$editor.css("max-height", height);
        }
    }
}

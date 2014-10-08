var editor;
$("document").ready(function() {
    editor = ace.edit("editor");
    editor.setTheme("ace/theme/crisp");
    editor.setShowPrintMargin(false);
    editor.getSession().setMode("ace/mode/ccs");

    ace.require("ace/ext/language_tools");
    editor.setOptions({enableBasicAutocompletion: true});
});

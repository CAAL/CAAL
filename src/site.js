$("#sidebar-header").click(function() {
    var page = $("#page-wrapper");
    var sidebar = $("#sidebar-wrapper");

    if (sidebar.css("left") == "0px") {
        sidebar.css("left", "-184px");
        page.css("padding-left", "66px");
        $("#sidebar-footer").hide();
    }
    else {
        sidebar.css("left", "0px");
        page.css("padding-left", "250px");
        $("#sidebar-footer").show();
    }
});

$("document").ready(function() {
    var editor = ace.edit("content");
    editor.setTheme("ace/theme/crisp");
    editor.setShowPrintMargin(false);
    editor.getSession().setMode("ace/mode/ccs");

    ace.require("ace/ext/language_tools");
    editor.setOptions({enableBasicAutocompletion: true});
});

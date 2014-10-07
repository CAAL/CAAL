$("#sidebar-header").click(function() {
    var page = $("#page-wrapper");
    var sidebar = $("#sidebar-wrapper");
    var footer = $("#sidebar-footer");

    if (sidebar.css("left") == "0px") {
        sidebar.css("left", "-184px");
        page.css("padding-left", "66px");
        footer.hide();
        $(".sidebar-submenu").hide();
    } else {
        sidebar.css("left", "0px");
        page.css("padding-left", "250px");
        footer.show();
    }
});

$("#save").click(function() {
    if (typeof(Storage) !== "undefined") {
        var title = $(".project-title").text();
        var desc = $(".project-desc").text();
        var ccs = ace.edit("content").getSession().getValue();
        var key = title.replace(/\s+/g, '');
        var value = {
            title: title,
            desc: desc,
            ccs: ccs
        }
        localStorage["projects/" + key] = value;
    } else {
        alert("Your browser does not support Web Storage.");
    }
});

$("#load").click(function() {
    $(".sidebar-submenu").toggle();
});

$("document").ready(function() {
    var editor = ace.edit("content");
    editor.setTheme("ace/theme/crisp");
    editor.setShowPrintMargin(false);
    editor.getSession().setMode("ace/mode/ccs");

    ace.require("ace/ext/language_tools");
    editor.setOptions({enableBasicAutocompletion: true});
});

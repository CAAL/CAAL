/// <reference path="../lib/jquery.d.ts" />
/// <reference path="../lib/ace.d.ts" />
/// <reference path="gui/project.ts" />
/// <reference path="gui/sidebar.ts" />
/// <reference path="gui/storage.ts" />
/// <reference path="gui/examples.ts" />

/* Initialize Ace */
var editor = ace.edit("editor");
editor.setTheme("ace/theme/crisp");
editor.setShowPrintMargin(false);
editor.getSession().setMode("ace/mode/ccs");
ace.require("ace/ext/language_tools");

editor.setOptions({enableBasicAutocompletion: true, maxLines: Infinity, fontSize: 14, fontFamily: "Inconsolata"});

editor.focus();

/* Initialize project */
var project = new Project(
    'Untitled Project', // Default title
    'No description ...', // Default description
    '* Enter your program here', // Initial editor content
    '#project-title', '#project-desc', 'editor'
);

/* Initialize sidebar items */
new New('#new', project);
new Save('#save', project);
new Import('#import-input', project);
new Export('#export', project);
new MyProjects('#projects', '#projects-list', project);
new Examples('#examples', '#examples-list', project);

/* Simulate click on hidden <input> element when "Import" is pressed. */
$('#import').click(function() { $('#import-input').click() });


$('#editor').click(function() { editor.focus(); });

/// <reference path="../lib/jquery.d.ts" />
/// <reference path="../lib/ace.d.ts" />
/// <reference path="gui/sidebar.ts" />
/// <reference path="gui/project.ts" />
/// <reference path="gui/storage.ts" />

/* Initialize Ace */
var editor = ace.edit("editor");
editor.setTheme("ace/theme/crisp");
editor.setShowPrintMargin(false);
editor.getSession().setMode("ace/mode/ccs");
ace.require("ace/ext/language_tools");
editor.setOptions({enableBasicAutocompletion: true, maxLines: Infinity, fontSize: 16});

/* Initialize project */
var project = new Project(
    'Untitled Project', // Default title
    'No description ...', // Default description
    '# Enter your program here', // Initial editor content
    '#project-title', '#project-desc', 'editor'
);

/* Initialize sidebar elements */
new ExpandableList(false, '#projects', '#projects-list');
new ExpandableList(false, '#examples', '#examples-list');

new New('#new', project);
new Save('#save', project);

$('#import').click(function() { $('#import-input').click() }); // Simulate click on hidden <input> element
new Import('#import-input', project);
new Export('#export', project);

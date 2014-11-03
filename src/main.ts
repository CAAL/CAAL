/// <reference path="../lib/jquery.d.ts" />
/// <reference path="../lib/ace.d.ts" />
/// <reference path="gui/project.ts" />
/// <reference path="gui/sidebar.ts" />
/// <reference path="gui/storage.ts" />
/// <reference path="gui/examples.ts" />
/// <reference path="gui/trace.ts" />

/* Initialize Ace */
var editor = ace.edit("editor");
ace.require("ace/ext/language_tools");
editor.setTheme("ace/theme/crisp");
editor.getSession().setMode("ace/mode/ccs");
editor.getSession().setUseWrapMode(true);
editor.setOptions({
    enableBasicAutocompletion: true,
    maxLines: Infinity,
    showPrintMargin: false,
    fontSize: 14,
    fontFamily: "Inconsolata",
});
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

/* Simulate click on hidden <input> element */
$('#import').click(function() { $('#import-input').click() });

/* Focus Ace editor whenever its containing <div> is pressed */
$('#editor').click(function() { editor.focus(); });

/* Trace / Raphael */
var traceWidth = document.getElementById("trace").clientWidth;
var traceHeight = document.getElementById("trace").clientHeight;

/* Raphael canvas drawing */
var canvas = new SnapCanvas("#trace", traceWidth, traceHeight);

function resizeCanvas() {
    traceWidth = document.getElementById("trace").clientWidth;
    traceHeight = document.getElementById("trace").clientHeight;
    canvas.setSize(traceWidth, traceHeight);
}

var resizeTimer;
$(window).resize(function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 100);
});
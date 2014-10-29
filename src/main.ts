/// <reference path="../lib/jquery.d.ts" />
/// <reference path="../lib/ace.d.ts" />
/// <reference path="gui/project.ts" />
/// <reference path="gui/sidebar.ts" />
/// <reference path="gui/storage.ts" />
/// <reference path="gui/examples.ts" />
/// <reference path="./activities.ts" />
/// <reference path="gui/graph/renderer.ts" />
/// <reference path="gui/graph/handler.ts" />
/// <reference path="gui/graph/graph.ts" />

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

/* Activity buttons */
$('#edit-mode-btn').on('click', () => selectActivity("editor"));
$('#viz-mode-btn').on('click', () => selectActivity("explorer"));

/* Initialize Activities */
var activityElements = {
    explorer: {
        element: document.getElementById("explorer-container"),
        activity: new Activities.Explorer(document.getElementById("arbor-canvas"))
    },
    editor: {
        element: document.getElementById("editor-container"),
        activity: new Activities.Editor()
    }
};

var currentActivity = "";
function selectActivity(activityStr) {
    var activityElement;
    //New or valid activity?
    if (activityStr === currentActivity) return;
    if (!activityElements[activityStr]) return;
    if (currentActivity) {
        //Close current
        activityElement = activityElements[currentActivity];
        $(activityElement.element).hide();
        activityElement.activity.exit();
    }
    //Open new activity.
    currentActivity = activityStr;
    activityElement = activityElements[currentActivity];
    activityElement.activity.prepare();
    $(activityElement.element).show();
}
selectActivity("editor");

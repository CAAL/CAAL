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

$(document).ready(function() {
    var project = new Project(
        'Untitled Project', // Default title
        'No description ...', // Default description
        '* Enter your program here', // Initial editor content
        '#project-title', '#project-desc', '#editor'
    );

    new New('#new', project);
    new Save('#save', project);
    new Import('#import-input', project);
    new Export('#export', project);
    new MyProjects('#projects', '#projects-list', project);
    new Examples('#examples', '#examples-list', project);

    /* Simulate click on hidden <input> element */
    $('#import').click(function() { $('#import-input').click() });

    var editorActivity = new Activities.Editor('#editor-container', '#edit-mode-btn', '#editor');
    var explorerActivity = new Activities.Explorer('#explorer-container', '#viz-mode-btn', '#arbor-canvas');
    var activityHandler = new Activities.ActivityHandler(editorActivity);
});

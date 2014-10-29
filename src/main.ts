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

    new New('#new-btn', project);
    new Save('#save-btn', project);
    new Import('#import-input', project);
    new Export('#export-btn', project);
    new MyProjects('#projects-btn', '#projects-list', project);
    new Examples('#examples-btn', '#examples-list', project);

    /* Simulate click on hidden <input> element */
    $('#import-btn').click(function() { $('#import-input').click() });

    var editorActivity = new Activities.Editor('#editor-container', '#edit-btn', '#editor');
    var explorerActivity = new Activities.Explorer('#explorer-container', '#explore-btn', '#arbor-canvas');
    var activityHandler = new Activities.ActivityHandler(editorActivity);
});

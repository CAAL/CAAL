/// <reference path="../lib/jquery.d.ts" />
/// <reference path="gui/sidebar.ts" />
/// <reference path="gui/projects.ts" />

$(function() {
    var projects = new ExpandableList(false, '#projects-toggle', '#projects');
    var examples = new ExpandableList(false, '#examples-toggle', '#examples');
    var sidebar = new ExpandableNav(true, '#sidebar-header', '#sidebar', '#content', 250, 66, ['#sidebar-footer']);
    //$('#projects').click(displayAll('projects', '#projects'));
    generateList(load('projects'), '#projects');
});

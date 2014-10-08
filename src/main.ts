/// <reference path="../lib/jquery.d.ts" />
/// <reference path="gui/sidebar.ts" />

$(function() {
    var projects = new ExpandableItem(false, '#projects-toggle', '#projects');
    var examples = new ExpandableItem(false, '#examples-toggle', '#examples');
    var sidebar = new ExpandableNav(true, '#sidebar-header', '#sidebar', '#content', 250, 66, ['#sidebar-footer', '#projects', '#examples']);
});

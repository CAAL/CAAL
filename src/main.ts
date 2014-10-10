/// <reference path="../lib/jquery.d.ts" />
/// <reference path="../lib/ace.d.ts" />
/// <reference path="gui/sidebar.ts" />
/// <reference path="gui/project.ts" />

/* Initialize Ace */
var editor = ace.edit("editor");
editor.setTheme("ace/theme/crisp");
editor.setShowPrintMargin(false);
editor.getSession().setMode("ace/mode/ccs");
ace.require("ace/ext/language_tools");
editor.setOptions({enableBasicAutocompletion: true});

/* Element IDs */
var newId = '#new';
var exportId = '#export';

/* Initialize project */
var project = new Project('Untitled Project', 'No description ...', '', '.project-title', '.project-desc', editor);
$(newId).click(() => project.new());
$(exportId).click(() => project.export(exportId));

/* Initialize sidebar elements */
var projects = new ExpandableList(false, '#projects-toggle', '#projects');
var examples = new ExpandableList(false, '#examples-toggle', '#examples');
var sidebar = new ExpandableNav(true, '#sidebar-header', '#sidebar', '#content', 250, 66, ['#sidebar-footer']);

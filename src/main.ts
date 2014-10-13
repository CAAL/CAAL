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
var importId = '#import';
var exportId = '#export';

/* Initialize project */
var project = new Project('Untitled Project', 'No description ...', '', '.project-title', '.project-desc', editor);
$(newId).click(() => project.new());
$(importId).click(function() {
    $(':file').click();
});
$(':file').change((evt) => project.importProject(evt));
$(exportId).click(() => project.exportProject(exportId));

/* Initialize sidebar elements */
var projects = new ExpandableList(false, '#projects-toggle', '#projects');
var examples = new ExpandableList(false, '#examples-toggle', '#examples');
var sidebar = new ExpandableNav(true, '#sidebar-header', '#sidebar', '#content', 250, 66, ['#sidebar-footer']);


editor.setValue([
    "",
    "* Lets look at alternating bit protocol.",
    "",
    "set InternalComActs = {left0, left1, right0, right1, leftAck0, leftAck1, rightAck0, rightAck1};",
    "",
    "agent Send0 = acc.Sending0;",
    "agent Sending0 = 'left0.Sending0 + leftAck0.Send1 + leftAck1.Sending0;",
    "agent Send1 = acc.Sending1;",
    "agent Sending1 = 'left1.Sending1 + leftAck1.Send0 + leftAck0.Sending1;",
    " ",
    "agent Received0 = 'del.RecvAck1;",
    "agent Received1 = 'del.RecvAck0;",
    "agent RecvAck0 = right0.Received0 + right1.RecvAck0 + 'rightAck1.RecvAck0;",
    "agent RecvAck1 = right1.Received1 + right0.RecvAck1 + 'rightAck0.RecvAck1;",
    "",
    "agent Med = MedTop | MedBot;",
    "agent MedBot = left0.MedBotRep0 + left1.MedBotRep1;",
    "agent MedBotRep0 = 'right0.MedBotRep0 + tau.MedBot;",
    "agent MedBotRep1 = 'right1.MedBotRep1 + tau.MedBot;",
    "agent MedTop = rightAck0.MedTopRep0 + rightAck1.MedTopRep1;",
    "agent MedTopRep0 = 'leftAck0.MedTopRep0 + tau.MedTop;",
    "agent MedTopRep1 = 'leftAck1.MedTopRep1 + tau.MedTop;",
    "",
    "agent Protocol = (Send0 | Med | RecvAck0) \\ InternalComActs;",
    "agent Spec = acc.'del.Spec; * our specification",
    ""
].join('\n'));

editor.clearSelection();
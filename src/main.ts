//# sourceMappingURL=main.js.map
/// <reference path="../lib/jquery.d.ts" />
/// <reference path="../lib/bootstrap.d.ts" />
/// <reference path="../lib/ace.d.ts" />
/// <reference path="ccs/ccs.ts" />
/// <reference path="ccs/reducedparsetree.ts" />
/// <reference path="ccs/util.ts" />
/// <reference path="gui/project.ts" />
/// <reference path="gui/sidebar.ts" />
/// <reference path="gui/storage.ts" />
/// <reference path="gui/examples.ts" />
/// <reference path="activity/activity.ts" />
/// <reference path="activity/editor.ts" />
/// <reference path="activity/explorer.ts" />

declare var CCSParser;

var editor;
var isDialogOpen = false;

$(document).ready(function() {
    editor = ace.edit("editor");

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

    var activityHandler = new Main.ActivityHandler();
    activityHandler.addActivity(
            "editor", 
            new Activity.Editor(editor, "editor", $("#editor-status-div")[0], $("#parse")[0]),
            (callback) => { callback({}); },
            "editor-container",
            "edit-btn");
    activityHandler.addActivity(
            "explorer",
            new Activity.Explorer($("#arbor-canvas")[0], $("#explorer-status-div")[0], $("#explorer-freeze-btn")[0], new Traverse.CCSNotationVisitor()),
            setupExplorerActivityFn,
            "explorer-container",
            "explore-btn");
    activityHandler.selectActivity("editor");
});

module Main {
    export class ActivityHandler {
        private currentActivityName : string = "";
        private activities = {};

        public constructor() {}

        public addActivity(name : string, activity : Activity.Activity, setupFn : (callback) => void, containerId : string, buttonId : string) {
            if (this.activities[name]) throw new Error("Activity with the name '" + name + "' already exists");
            this.activities[name] = {
                activity: activity,
                setupFn: setupFn,
                containerId: containerId,
                buttonId: buttonId
            };
            this.setupHandlingOfUI(name);
        }

        private setupHandlingOfUI(activityName : string) {
            var data = this.activities[activityName],
                handler = this;
            $("#" + data.buttonId).on("click", () => {
                handler.selectActivity(activityName);
            });
        }

        private closeActivity(activityName : string) {
            var activityData = this.activities[activityName],
                activity = activityData.activity;
            activity.beforeHide();
            $("#" + activityData.buttonId).removeClass("active");
            $("#" + activityData.containerId).hide();
            activity.afterHide();
        }

        private openActivity(activityName : string, configuration : any) {
            var data = this.activities[activityName],
                activity = data.activity;
            activity.beforeShow(configuration);
            $("#" + data.buttonId).addClass("active");
            $("#" + data.containerId).show();
            activity.afterShow();
        }

        public selectActivity(newActivityName : string): void {
            var newActivityData, callback;
            //Don't do the work if not necessary
            if (newActivityName === this.currentActivityName) return;
            newActivityData = this.activities[newActivityName];
            if (!newActivityData) return;
            callback = (configuration) => {
                //Did it want to open?
                if (!configuration) return;
                if (this.currentActivityName) {
                    this.closeActivity(this.currentActivityName);
                }
                this.currentActivityName = newActivityName;
                this.openActivity(newActivityName, configuration);             
            };
            newActivityData.setupFn(callback);
        }
    }
}

function setupExplorerActivityFn(callback) : any {
    var graph = getGraph(),
        successorGenerator = new Traverse.ReducingSuccessorGenerator(graph),
        namedProcesses = graph.getNamedProcesses(),
        $dialogBody = $("#viz-mode-dialog-body"),
        $dialog = $("#viz-mode-dialog");
    //Important only one dialog at a time.
    if (isShowingDialog()) return callback(null);
    //First are they any named processes at all?
    if (namedProcesses.length === 0) {
        showExplainDialog("No Named Processes", "There must be at least one named process in the program to explore.");
        return callback(null);
    }
        
    function makeConfiguration(processName) {
        return {
            graph: graph,
            successorGenerator: successorGenerator,
            initialProcessName: processName
        };
    }

    $dialogBody.children().remove();
    namedProcesses.sort().forEach(processName => {
        var $element = $(document.createElement("button"));
        $element.addClass("btn btn-default btn-lg btn-block");
        $element.text(processName);
        $element.on("click", () => {
            $dialog.modal("hide");
            callback(makeConfiguration(processName));
        });
        $dialogBody.append($element);
    });

    $dialog.modal("show");
}

function showExplainDialog(title, message) {
    var $dialog = $("#explain-dialog"),
        $dialogTitle = $("#explain-dialog-title"),
        $dialogBodyPar = $("#explain-dialog-body-par");
    if (isShowingDialog()) return;
    $dialogTitle.text(title);
    $dialogBodyPar.text(message);
    $dialog.modal("show");
}

function isShowingDialog() : boolean {
    var dialogIds = ["explain-dialog", "viz-mode-dialog"],
        jQuerySelector, i;
    for (i=0; i < dialogIds.length; i++) {
        jQuerySelector = "#" + dialogIds[i];
        if ($(jQuerySelector).data('bs.modal') &&
                $(jQuerySelector).data('bs.modal').isShown) {
            return true;
        }
    };
    return false;
}

function getGraph() {
    var graph = new CCS.Graph();
        CCSParser.parse(editor.getValue(), {ccs: CCS, graph: graph});
    return graph;
}

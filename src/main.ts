//# sourceMappingURL=main.js.map
/// <reference path="../lib/jquery.d.ts" />
/// <reference path="../lib/bootstrap.d.ts" />
/// <reference path="../lib/ace.d.ts" />
/// <reference path="ccs/ccs.ts" />
/// <reference path="ccs/reducedparsetree.ts" />
/// <reference path="ccs/util.ts" />
/// <reference path="ccs/depgraph.ts" />
/// <reference path="gui/project.ts" />
/// <reference path="gui/menu.ts" />
/// <reference path="gui/storage.ts" />
/// <reference path="gui/examples.ts" />
/// <reference path="activity/activity.ts" />
/// <reference path="activity/editor.ts" />
/// <reference path="activity/explorer.ts" />
/// <reference path="activity/verifier.ts" />

declare var CCSParser;
import ccs = CCS;

var editor;
var isDialogOpen = false;

module Main {

    export function setup() {
        editor = ace.edit("editor");

        var project = new Project(
            "Untitled Project",
            null,
            "#project-title",
            editor
        );

        var activityHandler = new Main.ActivityHandler();

        activityHandler.addActivity(
                "editor", 
                new Activity.Editor(editor, "#editor", "#parse-btn", "#status-area", "#clear-btn", "#font-size-btn"),
                (callback) => { callback({}); },
                "editor-container",
                "edit-btn");

        activityHandler.addActivity(
                "explorer",
                new Activity.Explorer(
                    {
                        canvas: $("#arbor-canvas")[0],
                        fullscreenContainer: $("#fullscreen-container")[0],
                        statusTableContainer: $("#status-table-container")[0],
                        freezeBtn: $("#explorer-freeze-btn")[0],
                        saveBtn: "#explorer-save-btn",
                        fullscreenBtn: $("#explorer-fullscreen-btn")[0],
                        sourceDefinition: $("#explorer-source-definition")[0]
                    },
                    new Traverse.CCSNotationVisitor()),
                    setupExplorerActivityFn,
                    "explorer-container",
                    "explore-btn");

        activityHandler.addActivity(
                "verifier",
                new Activity.Verifier("#toggle-select"),
                (callback) => { callback({}); },
                "verifier-container",
                "verify-btn");

        activityHandler.selectActivity("editor");

        new New('#new-btn', null, project, activityHandler);

        var saveIds = {
            saveFileId: '#save-file-btn',
            saveProjectsId: '#save-projects-btn'
        };
        new Save(null, saveIds, project, activityHandler);

        var loadIds = {
            loadFileId: '#load-file-btn',
            fileInputId: '#file-input',
            projectsId: '#projects-list',
            examplesId: '#examples-list'
        };
        new Load(null, loadIds, project, activityHandler);

        var deleteIds = {
            deleteId: '#delete-list',
        }
        new Delete(null, deleteIds, project, activityHandler);
    }

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

    export function getGraph() {
        var graph = new CCS.Graph();
            CCSParser.parse(editor.getValue(), {ccs: CCS, graph: graph});
        return graph;
    }

    export function getStrictSuccGenerator(graph) : ccs.SuccessorGenerator {
        var strictGenerator = new ccs.StrictSuccessorGenerator(graph),
            treeReducer = new Traverse.ProcessTreeReducer(graph),
            reducingGenerator = new Traverse.ReducingSuccessorGenerator(strictGenerator, treeReducer);
        return reducingGenerator;
    }

    export function getWeakSuccGenerator(graph) : ccs.SuccessorGenerator {
        //Wait do we build the, weak generator on top of the strict directly and then reduce?
        //or do we take take the strict one, reduce it, then apply the weak on top?  <-- this right now.
        var strictGenerator = new ccs.StrictSuccessorGenerator(graph),
            treeReducer = new Traverse.ProcessTreeReducer(graph),
            reducingGenerator = new Traverse.ReducingSuccessorGenerator(strictGenerator, treeReducer),
            weakGenerator = new Traverse.WeakSuccessorGenerator(reducingGenerator);
        return weakGenerator;
    }
}

function setupExplorerActivityFn(callback) : any {
    var namedProcesses = Main.getGraph().getNamedProcesses(),
        $dialogList = $("#viz-mode-dialog-body-list"),
        $depthSelect = $("#viz-mode-dialog-depth"),
        $dialog = $("#viz-mode-dialog");
    //Important only one dialog at a time.
    if (isShowingDialog()) return callback(null);
    //First are they any named processes at all?
    if (namedProcesses.length === 0) {
        showExplainDialog("No Named Processes", "There must be at least one named process in the program to explore.");
        return callback(null);
    }

    function makeConfiguration(processName, expandDepth) {
        var graph = Main.getGraph(),
            succGenerator = Main.getStrictSuccGenerator(graph);
        return {
            graph: graph,
            successorGenerator: succGenerator,
            initialProcessName: processName,
            expandDepth: expandDepth
        };
    }

    $dialogList.children().remove();
    namedProcesses.sort().forEach(processName => {
        var $element = $(document.createElement("button"));
        $element.addClass("btn btn-default btn-lg btn-block");
        $element.text(processName);
        $element.on("click", () => {
            $dialog.modal("hide");
            callback(makeConfiguration(
                processName,
                parseInt($depthSelect.val(), 10)
            ));
        });
        $dialogList.append($element);
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

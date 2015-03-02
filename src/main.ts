//# sourceMappingURL=main.js.map
/// <reference path="../lib/jquery.d.ts" />
/// <reference path="../lib/bootstrap.d.ts" />
/// <reference path="../lib/ace.d.ts" />
/// <reference path="../lib/ccs.d.ts" />
/// <reference path="gui/project.ts" />
/// <reference path="gui/menu/new.ts" />
/// <reference path="gui/menu/save.ts" />
/// <reference path="gui/menu/load.ts" />
/// <reference path="gui/menu/delete.ts" />
/// <reference path="gui/menu/export.ts" />
/// <reference path="gui/tooltips.ts" />
/// <reference path="activity/activityhandler.ts" />
/// <reference path="activity/activity.ts" />
/// <reference path="activity/editor.ts" />
/// <reference path="activity/explorer.ts" />
/// <reference path="activity/verifier.ts" />
/// <reference path="activity/game.ts" />

declare var CCSParser;
declare var HMLParser;
import ccs = CCS;
import hml = HML;

module Main {
    declare var Version : string;
    export var activityHandler = new Activity.ActivityHandler();

    $(document).ready(function() {
        activityHandler.addActivity("editor", new Activity.Editor("#editor-container", "#edit-btn"));
        activityHandler.addActivity("explorer", new Activity.Explorer("#explorer-container", "#explore-btn"));
        activityHandler.addActivity("verifier" , new Activity.Verifier("#verifier-container", "#verify-btn"));
        activityHandler.addActivity("game" , new Activity.Game("#game-container", "#game-btn"));
        activityHandler.selectActivity("editor");

        $("#version").append(Version);

        new New("#new-btn", activityHandler);
        new Save(null, activityHandler);
        new Load(null, activityHandler);
        new Delete(null, activityHandler);
        new Export("#export-pdf-btn", activityHandler);

        GUI.addTooltips();
    });

    export function getProgram() : string {
        return Project.getInstance().getCCS();
    }

    export function getGraph() {
        var graph : ccs.Graph = new CCS.Graph(),
            bad = false;
        try {
            CCSParser.parse(Project.getInstance().getCCS(), {ccs: CCS, graph: graph});
            bad = graph.getErrors().length > 0;
        } catch (error) {
            bad = true;
        }
        if (bad) {
            graph = null;
        }
        return graph;
    }

    export function getStrictSuccGenerator(graph : ccs.Graph) : ccs.SuccessorGenerator {
        return CCS.getSuccGenerator(graph, {succGen: "strong", reduce: true});
    }

    export function getWeakSuccGenerator(graph : ccs.Graph) : ccs.SuccessorGenerator {
        return CCS.getSuccGenerator(graph, {succGen: "weak", reduce: true});
    }
}

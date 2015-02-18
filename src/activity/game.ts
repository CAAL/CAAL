/// <reference path="../../lib/d3.d.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="activity.ts" />

module Activity {

    export class Game extends Activity {
        private project : Project;
        private graph : CCS.Graph;
        private succGen : CCS.SuccessorGenerator;
        private leftTree : D3.Layout.TreeLayout;
        private rightTree : D3.Layout.TreeLayout;
        private currentLeftProcess : CCS.NamedProcess;
        private currentRightProcess : CCS.NamedProcess;
        private $gameType : JQuery;
        private $leftProcessList : JQuery;
        private $rightProcessList : JQuery;
        private leftSvgContainer : string;
        private rightSvgContainer : string;
        private leftSvg : D3.Selection;
        private rightSvg : D3.Selection;

        constructor(container : string, button : string) {
            super(container, button);

            this.project = Project.getInstance();
            this.leftTree = d3.layout.tree().size([200, 200]);

            this.$gameType = $("#game-type");
            this.$leftProcessList = $("#game-left-process");
            this.$rightProcessList = $("#game-right-process");
            this.leftSvgContainer = "#game-left-svg";
            this.rightSvgContainer = "#game-right-svg";

            this.createCanvas();
        }

        protected checkPreconditions(): boolean {
            this.graph = Main.getGraph();

            if (!this.graph) {
                this.showExplainDialog("Syntax Error", "Your program contains syntax errors.");
                return false;
            }

            if (this.graph.getNamedProcesses().length === 0) {
                this.showExplainDialog("No Named Processes", "There must be at least one named process in the program to explore.");
                return false;
            }

            return true;
        }

        public onShow(configuration? : any) : void {
            $(window).on("resize", () => this.resize());
            this.resize();

            if (this.project.getChanged()) {
                this.graph = this.project.getGraph();
                this.displayOptions();
            }
        }

        public onHide() : void {
            $(window).off("resize");
        }

        private displayOptions() : void {
            var processes = this.graph.getNamedProcesses().reverse();
            
            this.$leftProcessList.empty();
            this.$rightProcessList.empty();

            for (var i = 0; i < processes.length; i++) {
                this.$leftProcessList.append($("<option></option>").append(processes[i]));
                this.$rightProcessList.append($("<option></option>").append(processes[i]));
            }

            this.$rightProcessList.find("option:nth-child(2)").prop("selected", true);
        }

        private createCanvas() : void {
            this.leftSvg = d3.select(this.leftSvgContainer).append("svg")
                .attr("width", "100%");
            this.rightSvg = d3.select(this.rightSvgContainer).append("svg")
                .attr("width", "100%");
        }

        private resize() : void {
            var offsetTop = $("#game-main").offset().top;
            var offsetBottom = $("#game-log").height();
            var height = Math.max(275, window.innerHeight - offsetTop - offsetBottom - 42);
            this.leftSvg.attr("height", height);
            this.rightSvg.attr("height", height);
        }
    }

}

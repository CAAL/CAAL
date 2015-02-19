/// <reference path="../../lib/d3.d.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="activity.ts" />

module Activity {

    export class Game extends Activity {
        private project : Project;
        private graph : CCS.Graph;
        private succGen : CCS.SuccessorGenerator;
        private $gameType : JQuery;
        private $leftProcessList : JQuery;
        private $rightProcessList : JQuery;
        private leftSvg : D3.Selection;
        private rightSvg : D3.Selection;

        constructor(container : string, button : string) {
            super(container, button);

            this.project = Project.getInstance();

            this.$gameType = $("#game-type");
            this.$leftProcessList = $("#game-left-process");
            this.$rightProcessList = $("#game-right-process");

            this.$gameType.add(this.$leftProcessList).add(this.$rightProcessList).on("change", () => this.newGame());

            this.leftSvg = d3.select("#game-left-svg").append("svg")
                .attr("width", "100%");
            this.rightSvg = d3.select("#game-right-svg").append("svg")
                .attr("width", "100%");
        }

        public onShow(configuration? : any) : void {
            $(window).on("resize", () => this.resize());
            this.resize();

            if (this.project.getChanged()) {
                this.graph = this.project.getGraph();
                this.displayOptions();
                this.newGame();
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

            // Set second option as default selection for the right process.
            this.$rightProcessList.find("option:nth-child(2)").prop("selected", true);
        }

        private getOptions() : any {           
            return {
                gameType: this.$gameType.val(),
                leftProcess: this.$leftProcessList.val(),
                rightProcess: this.$rightProcessList.val()
            };
        }

        private newGame() : void {
            var options = this.getOptions();
            this.succGen = CCS.getSuccGenerator(this.graph, {succGen: options.gameType, reduce: false});
            this.draw(this.leftSvg);
        }

        private draw(svg : D3.Selection) : void {
            var graph = this.getGraph(this.graph.processByName("A"));

            var test = [1,2,3,4,5];
            test[10] = 2
            console.log(test);

            var nodes = graph.nodes;
            var links = graph.links;
            
            console.log(graph.nodes);
            console.log(graph.links);

            var force = d3.layout.force()
                .nodes(nodes)
                .links(links)
                .size([parseInt(svg.attr("width")), parseInt(svg.attr("height"))]);

            force.start();
            for (var i = 100; i > 0; --i) force.tick();
            force.stop();

            svg.selectAll("circle")
                .data(nodes)
                .enter().append("circle")
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; })
                .attr("r", 4.5);

            svg.selectAll("line")
                .data(links)
                .enter().append("line")
                .attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });
        }

        private getNodes() : any[] {
            return this.graph.getNamedProcesses().map(function(p) {return {name: p}});
        }

        private getGraph(start : CCS.Process) : any {
            var nodes = [],
                links = [],
                waiting = [start],
                done = [],
                source;

            for (var i = 0; i < waiting.length; i++) {
                source = waiting[i];
                done.push(source.id);

                this.succGen.getSuccessors(source.id).forEach(t => {
                    if (done.indexOf(t.targetProcess.id) === -1) {
                        waiting.push(t.targetProcess);
                    }

                    nodes[source.id] = {id: source.id, name: source.name};
                    links.push({source: source.id, target: t.targetProcess.id});
                });
            }

            return {nodes: nodes, links: links};
        }

        private resize() : void {
            var offsetTop = $("#game-main").offset().top;
            var offsetBottom = $("#game-log").height();

            // Height = Total - (menu + options) - log - (margin + border).
            // Minimum size 275 px.
            var height = Math.max(275, window.innerHeight - offsetTop - offsetBottom - 41);

            this.leftSvg.attr("height", height);
            this.rightSvg.attr("height", height);
        }
    }

}

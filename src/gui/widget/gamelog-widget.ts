/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/ccs.d.ts" />

module GUI.Widget {
    export type GameLogObjectRow = {text : string; tag? : string; attr? : [{name: string; value: string}];};
    export class GameLog {
        private log = document.createElement("div");
        /* 
            Things to consider
                Print intro
                    You are playing $player$ in $weak/strong$ HML game.
                    You have a winning strategy/You will lose.
                Print a "Play" 
                    Round X
                        Current configuration: (Process, Formula).
                        (Attk)Attacker played Spec -walk-> Spec.
                        (Def)You played 20 =walk=> 23.
                Print winner and why
        */
        constructor() {
            var $log = $(this.log);
            $log.attr("id", "hml-game-log");
        }

        public getRootElement() : HTMLElement {
            return this.log;
        }

        public clear() {
            var $log = $(this.log);
            $log.empty();
        }

        public printToGameLog(gameLogObject : GameLogObject) : void {
            var $log = $(this.log),
                logStr = this.render(gameLogObject);

            $log.append(logStr);
        }

        private render(gameLogObject : GameLogObject) : string {
            var result : string = gameLogObject.getTemplate();
            var context : any = gameLogObject.getContext();

            context.forEach((element, index) => {
                var current = element.text;

                if (element.tag) {
                    current = $(element.tag).append(current);

                    for (var j in element.attr) {
                        current.attr(element.attr[j].name, element.attr[j].value);
                    }

                    result = result.replace("{" + index + "}", current[0].outerHTML);
                } else {
                    result = result.replace("{" + index + "}", current);
                }
            });

            return result;
        }
    }

    
    const enum GameLogType {intro, play};
    export class GameLogObject {
        private template : string;
        private context : GameLogObjectRow[];
        
        constructor() {
            this.template = "";
            this.context = [];
        }

        public addLabel (row : GameLogObjectRow, index? : number) : void {
            if (index) {
                this.context.splice(index, 0, row);
            } else {
                this.context.push(row);
            }
        }

        public setTemplate(template : string) {
            this.template = template;
        }

        public getTemplate() : string {
            return this.template;
        }

        public getContext() : GameLogObjectRow[] {
            return this.context;
        }
    }

    /*public println(line: string, wrapper? : string) : void {
        if (wrapper) {
            this.$log.append($(wrapper).append(line));
        } else {
            this.$log.append(line);
        }

        this.$log.scrollTop(this.$log[0].scrollHeight);;
    }

    public render(template : string, context : any) : string {
        for (var i in context) {
            var current = context[i].text;

            if (context[i].tag) {
                current = $(context[i].tag).append(current);

                for (var j in context[i].attr) {
                    current.attr(context[i].attr[j].name, context[i].attr[j].value);
                }

                template = template.replace("{" + i + "}", current[0].outerHTML);
            } else {
                template = template.replace("{" + i + "}", current);
            }
        }

        return template;
    }

    public removeLastPrompt() : void {
        this.$log.find(".game-prompt").last().remove();
    }

    public printRound(round : number, configuration : any) : void {
        this.println("Round " + round, "<h4>");
        this.printConfiguration(configuration);
    }

    public printConfiguration(configuration : any) : void {
        var template = "Current configuration: ({1}, {2}).";

        var context = {
            1: {text: this.labelFor(configuration.left), tag: "<span>", attr: [{name: "class", value: "ccs-tooltip-process"}]},
            2: {text: this.labelFor(configuration.right), tag: "<span>", attr: [{name: "class", value: "ccs-tooltip-process"}]}
        }

        this.println(this.render(template, context), "<p>");
    }

    public printPlay(player : Player, action : CCS.Action, source : CCS.Process, destination : CCS.Process, move : Move, isStrongMove : boolean) : void {
        var template = "{1} played {2} {3} {4} on the {5}.";
        
        var actionTransition : string;
        var actionContext : any;
        
        if (isStrongMove) {
            actionTransition = "-" + action.toString() + "->";
            actionContext = {text: actionTransition, tag: "<span>", attr: [{name: "class", value: "monospace"}]};
        } else {
            actionTransition = "=" + action.toString() + "=>";
            actionContext = {text: actionTransition, tag: "<span>",attr: [{name: "class", value: "ccs-tooltip-data"},
                {name: "data-tooltip", value: Tooltip.strongSequence(<Traverse.WeakSuccessorGenerator>this.gameActivity.getSuccessorGenerator(), source, action, destination)}]};
        }
        
        var context = {
            1: {text: (player instanceof Computer) ? player.playTypeStr() : "You"},
            2: {text: this.labelFor(source), tag: "<span>", attr: [{name: "class", value: "ccs-tooltip-process"}]},
            3: actionContext,
            4: {text: this.labelFor(destination), tag: "<span>", attr: [{name: "class", value: "ccs-tooltip-process"}]},
            5: {text: (move === Move.Left) ? "left" : "right"}
        };

        if (player instanceof Human) {
            this.removeLastPrompt();
        }

        this.println(this.render(template, context), "<p>");
    }

    public printWinner(winner : Player) : void {
        var template = "{1} no available transitions. You {2}!";

        var context = {
            1: {text: (winner instanceof Computer) ? "You have" : (winner.getPlayType() === PlayType.Attacker) ? "Defender has" : "Attacker has"},
            2: {text: (winner instanceof Computer) ? "lose" : "win"}
        };

        this.println(this.render(template, context), "<p class='outro'>");
    }

    public printCycleWinner(defender : Player) : void {
        var template = "A cycle has been detected. {1}!";

        var context = {
            1: {text: (defender instanceof Human) ? "You win" : "You lose"}
        };

        this.println(this.render(template, context), "<p class='outro'>");
    }
    
    public printWinnerChanged(winner : Player) : void {
        this.println("You made a bad move. " + winner.playTypeStr() + " now has a winning strategy.", "<p>");
    }

    public printIntro(gameType : string, configuration : any, winner : Player, attacker : Player) : void {
        var template = "You are playing {1} in {2} bisimulation game.";

        var context = {
            1: {text: (attacker instanceof Computer ? "defender" : "attacker")},
            2: {text: gameType},
        }

        this.println(this.render(template, context), "<p class='intro'>");

        if (winner instanceof Human){
            this.println("You have a winning strategy.", "<p class='intro'>");
        } else {
            this.println(winner.playTypeStr() + " has a winning strategy. You are going to lose.", "<p class='intro'>");
        }
    }

    private capitalize(str : string) : string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    private labelFor(process : CCS.Process) : string {
        return (process instanceof CCS.NamedProcess) ? (<CCS.NamedProcess> process).name : process.id.toString();
    }*/
}


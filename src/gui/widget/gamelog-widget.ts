/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/ccs.d.ts" />
/// <reference path="../../activity/tooltip.ts" />

module GUI.Widget {
    export type htmlWrapper = {tag : string; attr? : [{name: string; value: string}];}
    export type GameLogObjectRow = {text : string; htmlWrapper? : htmlWrapper;};
    export class GameLog {
        private log = document.createElement("div");
        private round = 0;
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

        public reset() {
            var $log = $(this.log);
            $log.empty();
            this.round = 0;
        }

        public deleteTempRows() {
            var $log = $(this.log);
            var $temprows = $log.find("#temprow");
            $temprows.remove()
        }

        private newRound() {
            var $log = $(this.log);
            var $round = $("<h4></h4>").append("Round " + (++this.round).toString()).addClass("hml-game-round");


            $log.append($round);
        }

        public printToGameLog(gameLogObject : GameLogObject) : void {
            var $log = $(this.log),
                logStr = this.render(gameLogObject);

            if (gameLogObject.getNewRound()) {
                this.newRound();
            }

            $log.append(logStr);
            // $log.scrollTop($log[0].scrollHeight);
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

            var wrapper = gameLogObject.getWrapper();
            if (wrapper) {
                var $temp = $(wrapper.tag);

                if (wrapper.attr){
                    wrapper.attr.forEach(elem => {
                        $temp.attr(elem.name, elem.value);
                    });
                }

                result = $temp.append(result)[0].outerHTML;
            }

            return result;
        }
    }


    const enum GameLogType {intro, play};
    export class GameLogObject {
        private template : string;
        private context : GameLogObjectRow[];
        private wrapper : htmlWrapper;
        private isNewRound : boolean;

        constructor(private graph : CCS.Graph) {
            this.template = "";
            this.context = [];
            this.wrapper = null;
            this.isNewRound = false;
        }

        public addLabel (row : GameLogObjectRow, index? : number) : void {
            if (index) {
                this.context.splice(index, 0, row);
            } else {
                this.context.push(row);
            }
        }

        public setNewRound(isNewRound : boolean) : void {
            this.isNewRound = isNewRound;
        }

        public getNewRound() : boolean {
            return this.isNewRound;
        }

        public addWrapper (wrapper : htmlWrapper) : void {
            this.wrapper = wrapper;
        }

        public getWrapper() : htmlWrapper {
            return this.wrapper;
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

        public labelForProcess(process : CCS.Process) : string {
            return this.graph.getLabel(process);
        }

        public labelForFormula(formula : HML.Formula) : string {
            var hmlNotationVisitor = new Traverse.HMLNotationVisitor(false);
            return Traverse.safeHtml(hmlNotationVisitor.visit(formula)); //slice is used to remove ";"
        }
    }
}


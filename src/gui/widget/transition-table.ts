/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/ccs.d.ts" />

module GUI.Widget {

    export type SelectListener = (transition : CCS.Transition) => void;;
    export type HoverEnterListener = SelectListener;
    export type HoverLeaveListener = SelectListener;

    export class TransitionTable {

        private table = document.createElement("table");
        private body = document.createElement("tbody");
        private transitions : CCS.Transition[] = [];
        private htmlNotationVisitor = new Traverse.TooltipHtmlCCSNotationVisitor();

        public onSelectListener : SelectListener = null;
        public onHoverEnterListener : HoverEnterListener = null;
        public onHoverLeaveListener : HoverLeaveListener = null;

        constructor() {
            var $table = $(this.table);

            $table.addClass("widget-transition-table table table-responsive table-striped table-condensed table-hover no-highlight");
            $table.append('<thead><tr><th class="narrow">Action</th><th class="narrow">Target</th><th>Target Definition</th></tr></thead>');
            $table.append(this.body);

            $(this.body)
                .on("click", "tr", this.onRowClicked.bind(this))
                .on("mouseenter", "tr", this.onRowHoverEnter.bind(this))
                .on("mouseleave", "tr", this.onRowHoverLeave.bind(this));

        }

        setTransitions(transitions : CCS.Transition[]) {
            var $body = $(this.body);
            $body.empty();
            this.transitions = transitions.slice(0);
            this.transitions.forEach((transition, index) => {
                var $row = $("<tr></tr>"),
                    $action = $("<td></td>").append(transition.action.toString()),
                    $name = $("<td></td>").append(this.labelFor(transition.targetProcess)),
                    $target = $("<td></td>").append(this.getDefinitionForProcess(transition.targetProcess));
                $row.append($action, $name, $target);
                $row.data("data-transition-idx", index);
                $body.append($row);
            });          
        }

        getRootElement() : HTMLElement {
            return this.table;
        }

        private labelFor(process : CCS.Process) {
            return (process instanceof CCS.NamedProcess) ? (<CCS.NamedProcess>process).name : "" + process.id;
        }

        private getDefinitionForProcess(process) : string {
            if (process instanceof CCS.NamedProcess) {
                return this.htmlNotationVisitor.visit((<CCS.NamedProcess>process).subProcess);
            }
            return this.htmlNotationVisitor.visit(process);
        }

        private transitionFromDelegateEvent(event) : CCS.Transition {
            var idx = $(event.currentTarget).data("data-transition-idx");
            return this.transitions[idx];
        }

        private onRowClicked(event) {
            if (this.onSelectListener) this.onSelectListener(this.transitionFromDelegateEvent(event));
        }

        private onRowHoverEnter(event) {
            if (this.onHoverEnterListener) this.onHoverEnterListener(this.transitionFromDelegateEvent(event));
        }

        private onRowHoverLeave(event) {
            if (this.onHoverLeaveListener) this.onHoverLeaveListener(this.transitionFromDelegateEvent(event));
        }
    }
}
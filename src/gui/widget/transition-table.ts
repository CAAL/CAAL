/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/ccs.d.ts" />
/// <reference path="../../activity/tooltip.ts" />

module GUI.Widget {

    export type SelectListener = (transition : CCS.Transition) => void;
    export type HoverEnterListener = SelectListener;
    export type HoverLeaveListener = SelectListener;

    export class TransitionTable {
        private table = document.createElement("table");
        private body = document.createElement("tbody");
        private transitions : CCS.Transition[] = [];

        public onSelectListener : SelectListener = null;
        public onHoverEnterListener : HoverEnterListener = null;
        public onHoverLeaveListener : HoverLeaveListener = null;
        public graph : CCS.Graph;

        constructor() {
            var $table = $(this.table);

            $table.addClass("widget-transition-table table table-responsive table-striped table-condensed table-hover no-highlight");
            $table.append('<thead><tr><th class="narrow">Source</th><th class="narrow">Action</th><th class="narrow">Target</th></tr></thead>');
            $table.append(this.body);

            $(this.body)
                .on("click", "tr", this.onRowClicked.bind(this))
                .on("mouseenter", "tr", this.onRowHoverEnter.bind(this))
                .on("mouseleave", "tr", this.onRowHoverLeave.bind(this));
        }

        setTransitions(source, transitions : CCS.Transition[], abstractingSuccGen : CCS.SuccessorGenerator) {
            var $body = $(this.body);
            $body.empty();
            this.transitions = transitions.slice(0);
            this.transitions.forEach((transition, index) => {
                var $action
                var $row = $("<tr></tr>"),
                    $source = $("<td></td>").append(this.labelWithTooltip(source)),
                    $target = $("<td></td>").append(this.labelWithTooltip(transition.targetProcess));
                
                if (abstractingSuccGen instanceof Traverse.AbstractingSuccessorGenerator) {
                    // Add strict path to the tooltip when it is a weak transition
                    var actionTransition = "=" + transition.action.toString() + "=>";
                    $action = $("<td></td>").append(Activity.Tooltip.setTooltip(Activity.Tooltip.wrap(actionTransition), Activity.Tooltip.strongSequence(abstractingSuccGen, source, transition.action, transition.targetProcess, this.graph)))
                } else {
                    $action = $("<td></td>").append("-" + transition.action.toString() + "->");
                }

                $row.append($source, $action, $target);
                $row.data("data-transition-idx", index);
                $body.append($row);
            });          
        }

        getRootElement() : HTMLElement {
            return this.table;
        }

        private labelWithTooltip(process : CCS.Process) : JQuery {
            return Activity.Tooltip.wrapProcess(this.labelFor(process));
        }

        private labelFor(process : CCS.Process) {
            return this.graph.getLabel(process);
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
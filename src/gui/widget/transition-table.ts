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
        // private htmlNotationVisitor = new Traverse.TooltipHtmlCCSNotationVisitor();

        public onSelectListener : SelectListener = null;
        public onHoverEnterListener : HoverEnterListener = null;
        public onHoverLeaveListener : HoverLeaveListener = null;

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

        setTransitions(source, transitions : CCS.Transition[] ) {
            var $body = $(this.body);
            $body.empty();
            this.transitions = transitions.slice(0);
            this.transitions.forEach((transition, index) => {
                var $row = $("<tr></tr>"),
                    $source = $("<td></td>").append(this.labelWithTooltip(source)),
                    $action = $("<td></td>").append(transition.action.toString()),
                    $target = $("<td></td>").append(this.labelWithTooltip(transition.targetProcess));
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
            return (process instanceof CCS.NamedProcess) ? (<CCS.NamedProcess>process).name : "" + process.id;
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
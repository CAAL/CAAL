class ExpandableNav {
    private expanded: boolean;
    private navId: String;
    private contentId: String;
    private expandedWidth: number;
    private contractedWidth: number;
    private hideOnContraction: String[];

    constructor(startState: boolean,
                buttonId: String,
                navId: String,
                contentId: String,
                expandedWidth: number,
                contractedWidth: number,
                hideOnContraction?: String[])
    {
        this.expanded = startState;
        this.navId = navId;
        this.contentId = contentId;
        this.expandedWidth = expandedWidth;
        this.contractedWidth = contractedWidth;
        this.hideOnContraction = hideOnContraction;

        if (startState) { this.expand() }
        else { this.contract() }

        $(buttonId).click(() => this.toggle());
    }

    private toggle() {
        if (this.expanded) { this.contract() }
        else { this.expand() }

        this.expanded = !this.expanded;

        for (var i in this.hideOnContraction) {
            $(this.hideOnContraction[i]).toggle(this.expanded);
        }
    }

    private expand() {
        $(this.navId).css('margin-left', 0);
        $(this.contentId).css('margin-left', this.expandedWidth);
    }

    private contract() {
        $(this.navId).css('margin-left', this.contractedWidth - this.expandedWidth);
        $(this.contentId).css('margin-left', this.contractedWidth);
    }
}

class ExpandableItem {
    private itemId: String;

    constructor(startState: boolean, buttonId: String, itemId: String) {
        this.itemId = itemId;

        $(itemId).toggle(startState);
        $(buttonId).click(() => this.toggle());
    }

    private toggle() {
        $(this.itemId).toggle();
    }
}

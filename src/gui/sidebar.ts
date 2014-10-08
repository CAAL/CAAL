class ExpandableNav {
    private expanded: boolean;
    private navId: string;
    private contentId: string;
    private expandedWidth: number;
    private contractedWidth: number;
    private hideOnContraction: string[];

    constructor(startState: boolean,
                buttonId: string,
                navId: string,
                contentId: string,
                expandedWidth: number,
                contractedWidth: number,
                hideOnContraction?: string[])
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

class ExpandableList {
    private itemId: string;

    constructor(startState: boolean, buttonId: string, itemId: string) {
        this.itemId = itemId;

        $(itemId).toggle(startState);
        $(buttonId).click(() => this.toggle());
    }

    private toggle() {
        $(this.itemId).toggle();
    }
}

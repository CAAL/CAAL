/// <reference path="../../lib/jquery.d.ts" />

module GUI {
	export var Tooltips = {
		"collapse-none": "Do not collapse the labelled transition system.",
		"collapse-strong": "Collapse all processes that are strongly bisimilar (∼) into a single process.",
		"collapse-weak": "Collapse all processes that are weakly bisimilar (≈) into a single process.",
        "simplify": "Simplify processes by applying structural congruence.",
        "depth": "Set the unfolding depth of the labelled transition system.",
        "freeze": "Lock/unlock the current location of states.",
        "save-image": "Export the labelled transition system."
	}

	export function addTooltips() {
		//Non delegating since these tooltips only cover static elements.
		$("[data-tooltip]").tooltip({
            title: function() {
            	return Tooltips[this.dataset.tooltip];
            },
            delay: {
            	"show": 500,
            	"hide": 100
            }
        });
	}
}

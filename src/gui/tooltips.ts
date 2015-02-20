/// <reference path="../../lib/jquery.d.ts" />

module GUI {
	export var Tooltips = {
		"collapse-none": "Do not collapse processes.",
		"collapse-strong": "Combines a group processes that are strongly bisimilar (∼) into a single process.",
		"collapse-weak": "Combines a group processes that are weakly bisimilar (≈) into a single process.",
        "simplify" : "Simplies the processes"
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

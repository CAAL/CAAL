/// <reference path="../../lib/jquery.d.ts" />

module GUI {
	export var Tooltips = {
		"collapse-none": "Do not collapse processes.",
		"collapse-strong": "Combines processes that are strongly bisimilar (∼) into process that represents that group.",
		"collapse-weak": "Combines processes that are weakly bisimilar (≈) into process that represents that group."
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

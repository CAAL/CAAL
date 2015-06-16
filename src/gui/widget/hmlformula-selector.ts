/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/ccs.d.ts" />

module GUI.Widget {
    export type HMLSelectListener = (formula : HML.Formula) => void;

    export class FormulaSelector {
        private root = document.createElement("div");
        private table = document.createElement("table");
        private body = document.createElement("tbody");
        private paragraph = document.createElement("p");
        private currentSubFormulas : HML.Formula[];
        private currentHmlSet : HML.FormulaSet;

        public onSelectListener : HMLSelectListener = null;

        constructor() {
            var $table = $(this.table);
            var $body = $(this.body);

            $table.attr("id", "hml-selector-body");
            $table.addClass("widget-transition-table table table-responsive table-striped table-condensed table-hover no-highlight");
            $table.append('<thead><tr><th class="narrow">Subformula</th></tr></thead>');
            $table.append(this.body);

            $body.attr("id", "hml-selector-body");
            /*Click listeners on each subformula*/
            $body.on("click", "tr", this.onSubformulaClick.bind(this));
        }

        public getRootElement() : HTMLElement {
            return this.table;
        }

        setFormulaSet(hmlFormulaSet : HML.FormulaSet) {
            this.currentHmlSet = hmlFormulaSet;
        }

        setFormula(hmlSubFormulas : HML.Formula[]){
            var $body = $(this.body);
            $body.empty();

            if(hmlSubFormulas){
                this.currentSubFormulas = hmlSubFormulas.slice(0);

                this.currentSubFormulas.forEach((subFormula, index) => {
                    var $row = $("<tr></tr>"),
                        hmlNotationVisitor = new Traverse.HMLNotationVisitor(false),
                        $subFormulaTd = $("<td></td>").append(Traverse.safeHtml(hmlNotationVisitor.visit(subFormula)));


                    $row.append($subFormulaTd);
                    $row.data("data-transition-idx", index);
                    $body.append($row);
                });
            }
        }

        private subformulaFromDelegateEvent(event) : HML.Formula {
            // var id = parseInt($(event.currentTarget).data("data-subformula-id"));
            // var hmlExtractor = new HMLSubFormulaExtractor(this.currentHmlSet);
            // var subFormula : HML.Formula = hmlExtractor.getSubFormulaWithId(this.currentHml, id);
            var idx = $(event.currentTarget).data("data-transition-idx");
            return this.currentSubFormulas[idx];
        }

        private onSubformulaClick(event) {
            if(this.onSelectListener) {
                this.onSelectListener(this.subformulaFromDelegateEvent(event));
            }
        }
    }




    /*class HMLSubFormulaExtractor implements HML.FormulaDispatchHandler<HML.Formula> {
        private getForId : number;

        constructor(private hmlFormulaSet : HML.FormulaSet) {
        }

        getSubFormulaWithId(parentFormula : HML.Formula, id : number) : HML.Formula {
            this.getForId = id;
            return parentFormula.dispatchOn(this);
        }

        dispatchDisjFormula(formula : HML.DisjFormula) {
            return ArrayUtil.first(formula.subFormulas, f => f.id === this.getForId);
        }

        dispatchConjFormula(formula : HML.ConjFormula) {
            return ArrayUtil.first(formula.subFormulas, f => f.id === this.getForId);
        }

        dispatchTrueFormula(formula : HML.TrueFormula) {
            return null;
        }

        dispatchFalseFormula(formula : HML.FalseFormula) {
            return null;
        }

        dispatchStrongExistsFormula(formula : HML.StrongExistsFormula) {
            return (formula.subFormula.id === this.getForId) ? formula.subFormula : null;
        }

        dispatchStrongForAllFormula(formula : HML.StrongForAllFormula) {
            return (formula.subFormula.id === this.getForId) ? formula.subFormula : null;
        }

        dispatchWeakExistsFormula(formula : HML.WeakExistsFormula) {
            return (formula.subFormula.id === this.getForId) ? formula.subFormula : null;
        }

        dispatchWeakForAllFormula(formula : HML.WeakForAllFormula) {
            return (formula.subFormula.id === this.getForId) ? formula.subFormula : null;
        }

        dispatchMinFixedPointFormula(formula : HML.MinFixedPointFormula) {
            return (formula.subFormula.id === this.getForId) ? formula.subFormula : null;
        }

        dispatchMaxFixedPointFormula(formula : HML.MaxFixedPointFormula) {
            return (formula.subFormula.id === this.getForId) ? formula.subFormula : null;
        }

        dispatchVariableFormula(formula : HML.VariableFormula) {
            var namedFormula = this.hmlFormulaSet.formulaByName(formula.variable);
            if(namedFormula instanceof HML.MinFixedPointFormula || namedFormula instanceof HML.MaxFixedPointFormula) {
                if (namedFormula && namedFormula.subFormula.id === this.getForId) {
                    return namedFormula.subFormula;
                }
            }

            return null;
        }
    }*/
}
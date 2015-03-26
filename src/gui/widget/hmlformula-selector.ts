/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/ccs.d.ts" />

module GUI.Widget {
    export type HMLSelectListener = (formula : HML.Formula) => void;

    export class FormulaSelector {
        private root = document.createElement("div");
        private paragraph = document.createElement("p");
        private hmlFormulaSet : HML.FormulaSet;
        private HMLSubFormulaVisitor = new HMLSubFormulaVisitor();

        public onSelectListener : HMLSelectListener = null;

        constructor() {        
            var $root = $(this.root);
            var $paragraph = $(this.paragraph);
            
            $paragraph.attr("id", "hml-selector-paragraph");

            $root.attr("id", "hml-selector-body");
            $root.addClass("no-highlight");

            $root.append(this.paragraph);

            /*Click listeners on each subformula*/
            $root.on("click", "span .hml-subformula", this.onSubformulaClick.bind(this));
        }

        setFormula(hmlFormula : HML.Formula, hmlFormulaSet : HML.FormulaSet){
            this.hmlFormulaSet = hmlFormulaSet;
            var $paragraph = $(this.paragraph);

            var hmlFormulaStr = this.HMLSubFormulaVisitor.visit(hmlFormula);
            $paragraph.append(hmlFormulaStr);
            // get the subformula from the visitor
            // and add each of them to the paragraph
        }

        public getRootElement() : HTMLElement {
            return this.root;
        }

        private subformulaFromDelegateEvent(event) : HML.Formula {
            var idx = $(event.currentTarget).data("data-subformula-idx");
            return this.hmlFormulaSet.formulaById(idx);
        }

        private onSubformulaClick(event) {
            if(this.onSelectListener) {
                this.onSelectListener(this.subformulaFromDelegateEvent(event));
            }
        }
    }

    class HMLSubFormulaVisitor implements HML.FormulaVisitor<string>, HML.FormulaDispatchHandler<string> { 

        private cache;

        constructor() {
            this.clearCache();        
        }

        clearCache(){
            this.cache = {};
        }

        visit(formula : HML.Formula) {
            return formula.dispatchOn(this);
        }

        dispatchDisjFormula(formula : HML.DisjFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStrs = formula.subFormulas.map((subF) => {
                    var preHtml = '<span id="'+ subF.id +'" class="hml-subformula">';
                    var endHtml = '</span>'; 
                    
                    return preHtml + Traverse.safeHtml(subF.dispatchOn(this)) + endHtml;
                    });
                
                result = this.cache[formula.id] = subStrs.join(" or ");
            }
            return result;
        }

        dispatchConjFormula(formula : HML.ConjFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStrs = formula.subFormulas.map(subF => {
                    var unwrapped = subF.dispatchOn(this)
                    var wrapped = Traverse.wrapIfInstanceOf(unwrapped, subF, [HML.DisjFormula]);

                    var preHtml = '<span id="'+ subF.id +'" class="hml-subformula">';
                    var endHtml = '</span>';

                    return preHtml + wrapped + endHtml;
                });

                result = this.cache[formula.id] = subStrs.join(" and ");
            }
            return result;
        }

        dispatchTrueFormula(formula : HML.TrueFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                result = this.cache[formula.id] = "T";
            }
            return result;
        }

        dispatchFalseFormula(formula : HML.FalseFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                result = this.cache[formula.id] = "F";
            }
            return result;
        }

        dispatchStrongExistsFormula(formula : HML.StrongExistsFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                result = this.cache[formula.id] = "<" + 
                    formula.actionMatcher.actionMatchingString() + ">" +
                    Traverse.wrapIfInstanceOf(subStr, formula.subFormula, [HML.DisjFormula, HML.ConjFormula]);
            }
            return result;
        }

        dispatchStrongForAllFormula(formula : HML.StrongForAllFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                result = this.cache[formula.id] = "[" + 
                    formula.actionMatcher.actionMatchingString() + "]" +
                    Traverse.wrapIfInstanceOf(subStr, formula.subFormula, [HML.DisjFormula, HML.ConjFormula]);
            }
            return result;
        }

        dispatchWeakExistsFormula(formula : HML.WeakExistsFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                result = this.cache[formula.id] = "<<" + 
                    formula.actionMatcher.actionMatchingString() + ">>" +
                    Traverse.wrapIfInstanceOf(subStr, formula.subFormula, [HML.DisjFormula, HML.ConjFormula]);
            }
            return result;
        }

        dispatchWeakForAllFormula(formula : HML.WeakForAllFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                result = this.cache[formula.id] = "[[" + 
                    formula.actionMatcher.actionMatchingString() + "]]" +
                    Traverse.wrapIfInstanceOf(subStr, formula.subFormula, [HML.DisjFormula, HML.ConjFormula]);
            }
            return result;
        }

        dispatchMinFixedPointFormula(formula : HML.MinFixedPointFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                result = this.cache[formula.id] = formula.variable + " min= " + subStr;
            }
            return result;
        }

        dispatchMaxFixedPointFormula(formula : HML.MaxFixedPointFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                result = this.cache[formula.id] = formula.variable + " max= " + subStr;
            }
            return result;
        }

        dispatchVariableFormula(formula : HML.VariableFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                result = this.cache[formula.id] = formula.variable;
            }
            return result;
        }

    }
}
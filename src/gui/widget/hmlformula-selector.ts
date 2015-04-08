/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/ccs.d.ts" />

module GUI.Widget {
    export type HMLSelectListener = (formula : HML.Formula) => void;

    export class FormulaSelector {
        private root = document.createElement("div");
        private table = document.createElement("table");
        private body = document.createElement("tbody");
        private paragraph = document.createElement("p");
        private currentHml : HML.Formula;
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
            // $body.on("click", "span.hml-subformula", this.onSubformulaClick.bind(this));
            $body.on("click", "tr", this.onSubformulaClick.bind(this));
        }

        public getRootElement() : HTMLElement {
            return this.table;
        }

        setFormulaSet(hmlFormulaSet : HML.FormulaSet) {
            this.currentHmlSet = hmlFormulaSet;
        }

        setFormula(hmlFormula : HML.Formula){
            var $body = $(this.body);
            $body.empty();

            /*this.transitions.forEach((transition, index) => {
                var $row = $("<tr></tr>"),
                    $action = $("<td></td>").append(transition.action.toString()),
                    $name = $("<td></td>").append(this.labelFor(transition.targetProcess)),
                    $target = $("<td></td>").append(this.getDefinitionForProcess(transition.targetProcess));
                $row.append($action, $name, $target);
                $row.data("data-transition-idx", index);
                $body.append($row);
            });*/

            if(hmlFormula){
                this.currentHml = hmlFormula

                var HMLVisitor = new HMLSubFormulaHTMLVisitor(this.currentHmlSet);
                var hmlSubformulas : Array<string> = HMLVisitor.visit(hmlFormula); // convert the formula to an array of strings
                
                hmlSubformulas.forEach((subFormula) => {
                    var $row = $("<tr></tr>"),
                        $subFormula = $(subFormula),
                        $subFormulaTd = $("<td></td>").append($subFormula);

                    $row.append($subFormulaTd);
                    $row.data("data-subformula-id", $subFormula.attr("data-id"));
                    $body.append($row);
                });                
            }
        }

        private subformulaFromDelegateEvent(event) : HML.Formula {
            var id = parseInt($(event.currentTarget).data("data-subformula-id"));
            var hmlExtractor = new HMLSubFormulaExtractor(this.currentHmlSet);
            var subFormula : HML.Formula = hmlExtractor.getSubFormulaWithId(this.currentHml, id);
            return subFormula;
        }

        private onSubformulaClick(event) {
            if(this.onSelectListener) {
                this.onSelectListener(this.subformulaFromDelegateEvent(event));
            }
        }
    }

    class HMLSubFormulaHTMLVisitor implements HML.FormulaVisitor<Array<string>>, HML.FormulaDispatchHandler<Array<string>> { 
        private isFirst = true;

        constructor(private hmlFormulaSet : HML.FormulaSet) {
        }

        visit(formula : HML.Formula) {
            return formula.dispatchOn(this);
        }

        private isFirstFormula() : boolean {
            if(this.isFirst){
                this.isFirst = !this.isFirst;
                return true;
            }

            return false;
        }

        dispatchDisjFormula(formula : HML.DisjFormula) {
            var result = [];
            var isfirst = this.isFirstFormula();

            var subStrs = formula.subFormulas.map((subF) => {
                if(isfirst) {
                    var $span = $('<span></span>').addClass('hml-subformula').attr('data-id', subF.id);
                    $span.append(subF.dispatchOn(this)[0]);
                    result.push($span[0].outerHTML);                    
                } else {
                    
                    result.push(subF.dispatchOn(this)[0]);
                    result = [result.join(" or ")];
                }
            });

            return result;
        }

        dispatchConjFormula(formula : HML.ConjFormula) {
            var result = [];
            var isfirst = this.isFirstFormula();

            var subStrs = formula.subFormulas.map(subF => {
                var unwrapped = subF.dispatchOn(this)[0];
                var wrapped = Traverse.wrapIfInstanceOf(unwrapped, subF, [HML.DisjFormula]);
                if(isfirst) {
                    var $span = $('<span></span>').addClass('hml-subformula').attr('data-id', subF.id);
                    $span.append(wrapped);     
                    result.push($span[0].outerHTML);
                } else {
                    result.push(wrapped);
                    result = [result.join(" and ")];
                }
            });

            return result;
        }

        dispatchTrueFormula(formula : HML.TrueFormula) {
            var result = [];
            var isfirst = this.isFirstFormula();

            if(isfirst) {
                var $span = $('<span></span>').addClass('hml-subformula').attr('data-id', '-1');
                $span.append('T');
                result.push($span[0].outerHTML);
            } else {
                result.push("T");
            }

            return result;
        }

        dispatchFalseFormula(formula : HML.FalseFormula) {
            var result = [];
            var isfirst = this.isFirstFormula();

            if(isfirst) {
                var $span = $('<span></span>').addClass('hml-subformula').attr('data-id', '-1');
                $span.append('F');
                result.push($span[0].outerHTML);
            } else {
                result.push("F");
            }

            return result;
        }

        dispatchStrongExistsFormula(formula : HML.StrongExistsFormula) {
            var result = [];
            var isfirst = this.isFirstFormula();
            var subStr = formula.subFormula.dispatchOn(this)[0];
            var formulaAction = "<" + formula.actionMatcher.actionMatchingString() + ">";
            var formulaStr = Traverse.safeHtml(formulaAction) +
                Traverse.wrapIfInstanceOf(subStr, formula.subFormula, [HML.DisjFormula, HML.ConjFormula]);
            
            if (isfirst) {
                var $span = $('<span></span>').addClass('hml-subformula').attr('data-id', formula.subFormula.id);
                $span.append(formulaStr)
                result.push($span[0].outerHTML);
            } else {
                result.push(formulaStr);
            }

            return result;
        }

        dispatchStrongForAllFormula(formula : HML.StrongForAllFormula) {
            var result = [];
            var isfirst = this.isFirstFormula();
            var subStr = formula.subFormula.dispatchOn(this)[0];
            var formulaAction = "[" + formula.actionMatcher.actionMatchingString() + "]";
            var formulaStr = Traverse.safeHtml(formulaAction) +
                Traverse.wrapIfInstanceOf(subStr, formula.subFormula, [HML.DisjFormula, HML.ConjFormula]);

            if (isfirst) {
                var $span = $('<span></span>').addClass('hml-subformula').attr('data-id', formula.subFormula.id);
                $span.append(formulaStr)
                result.push($span[0].outerHTML);
            } else {
                result.push(formulaStr);
            }

            return result;
        }

        dispatchWeakExistsFormula(formula : HML.WeakExistsFormula) {
            var result = []
            var isfirst = this.isFirstFormula();
            var subStr = formula.subFormula.dispatchOn(this)[0];
            var formulaAction = "<<" + formula.actionMatcher.actionMatchingString() + ">>";
            var formulaStr = Traverse.safeHtml(formulaAction) +
                Traverse.wrapIfInstanceOf(subStr, formula.subFormula, [HML.DisjFormula, HML.ConjFormula]);
            
            if (isfirst) {
                var $span = $('<span></span>').addClass('hml-subformula').attr('data-id', formula.subFormula.id);
                $span.append(formulaStr)
                result.push($span[0].outerHTML);
            } else {
                result.push(formulaStr);
            }

            return result;
        }

        dispatchWeakForAllFormula(formula : HML.WeakForAllFormula) {
            var result = [];
            var isfirst = this.isFirstFormula();
            var subStr = formula.subFormula.dispatchOn(this)[0];
            var formulaAction = "[[" + formula.actionMatcher.actionMatchingString() + "]]"
            var formulaStr = Traverse.safeHtml(formulaAction) +
                Traverse.wrapIfInstanceOf(subStr, formula.subFormula, [HML.DisjFormula, HML.ConjFormula]);

            if (isfirst) {                
                var $span = $('<span></span>').addClass('hml-subformula').attr('data-id', formula.subFormula.id);
                $span.append(formulaStr)
                result.push($span[0].outerHTML);
            } else {
                result.push(formulaStr);
            }

            return result;
        }

        dispatchMinFixedPointFormula(formula : HML.MinFixedPointFormula) {
            var result = [];
            var isfirst = this.isFirstFormula();
            var subStr = formula.subFormula.dispatchOn(this)[0];
            var formulaStr = formula.variable + " min= " + subStr;
            
            if (isfirst) {    
                var $span = $('<span></span>').addClass('hml-subformula').attr('data-id', formula.subFormula.id);
                $span.append(formulaStr)
                result.push($span[0].outerHTML);
            } else {
                result.push(formulaStr);
            }

            return result;
        }

        dispatchMaxFixedPointFormula(formula : HML.MaxFixedPointFormula) {
            var result = [];
            var isfirst = this.isFirstFormula();
            var subStr = formula.subFormula.dispatchOn(this)[0];
            var formulaStr = formula.variable + " max= " + subStr;
        
            if (isfirst) {        
                var $span = $('<span></span>').addClass('hml-subformula').attr('data-id', formula.subFormula.id);
                $span.append(formulaStr)
                result.push($span[0].outerHTML);
            } else {
                result.push(formulaStr);
            }
        
            return result;
        }

        dispatchVariableFormula(formula : HML.VariableFormula) {
            var result = [];
            var isfirst = this.isFirstFormula();
            var formulaStr = Traverse.safeHtml(formula.variable);
            var namedFormulaDef = this.hmlFormulaSet.formulaByName(formula.variable);
            if (namedFormulaDef) {
                if (isfirst) {
                    // this is the first formula
                    if(namedFormulaDef instanceof HML.MinFixedPointFormula || namedFormulaDef instanceof HML.MaxFixedPointFormula) {
                        var $span = $('<span></span>').addClass('hml-subformula').attr('data-id', namedFormulaDef.subFormula.id);
                        $span.append(formulaStr)
                        result.push($span[0].outerHTML);
                    }
                } else {
                    // this is not the first formula therefore just return the formula definition.
                    result.push(formulaStr);
                }
            } else {
                throw "HML variable " + formula.variable + " has no definition";
            }
        
            return result;
        }
    }

    class HMLSubFormulaExtractor implements HML.FormulaDispatchHandler<HML.Formula> { 
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

    }
}
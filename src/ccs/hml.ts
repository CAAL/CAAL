/// <reference path="ccs.ts" />

module HML {
    
    import ccs = CCS;
    import DGMod = DependencyGraph;

    export interface Formula {
        dispathOn<T>(dispatcher : FormulaDispatchHandler<T>) : T;
    }

    export interface FormulaDispatchHandler<T> {
        dispatchDisjFormula(formula : DisjFormula, ... args) : T
        dispatchConjFormula(formula : ConjFormula, ... args) : T
        dispatchTrueFormula(formula : TrueFormula, ... args) : T
        dispatchFalseFormula(formula : FalseFormula, ... args) : T
        dispatchExistsFormula(formula : ExistsFormula, ... args) : T
        dispatchForAllFormula(formula : ForAllFormula, ... args) : T
    }

    export class DisjFormula implements Formula {
        constructor(public left : Formula, public right : Formula) {
        }
        dispathOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchDisjFormula(this);
        }
        toString() {
            return "DisjFormula";
        }
    }

    export class ConjFormula implements Formula {
        constructor(public left : Formula, public right : Formula) {
        }
        dispathOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchConjFormula(this);
        }
        toString() {
            return "ConjFormula";
        }
    }

    export class TrueFormula implements Formula {
        constructor() {
        }
        dispathOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchTrueFormula(this);
        }
        toString() {
            return "TrueFormula";
        }
    }

    export class FalseFormula implements Formula {
        constructor() {
        }
        dispathOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchFalseFormula(this);
        }
        toString() {
            return "FalseFormula";
        }
    }

    export class ExistsFormula implements Formula {
        constructor(public action : ccs.Action, public subFormula : Formula) {
        }
        dispathOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchExistsFormula(this);
        }
        toString() {
            return "ExistsFormula";
        }
    }

    export class ForAllFormula implements Formula {
        constructor(public action : ccs.Action, public subFormula : Formula) {
        }
        dispathOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchForAllFormula(this);
        }
        toString() {
            return "ForAllFormula";
        }
    }
}
/// <reference path="ccs.ts" />

module HML {
    
    import ccs = CCS;
    import DGMod = DependencyGraph;

    export interface Formula {
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T;
    }

    export interface FormulaDispatchHandler<T> {
        dispatchDisjFormula(formula : DisjFormula, ... args) : T
        dispatchConjFormula(formula : ConjFormula, ... args) : T
        dispatchTrueFormula(formula : TrueFormula, ... args) : T
        dispatchFalseFormula(formula : FalseFormula, ... args) : T
        dispatchExistsFormula(formula : ExistsFormula, ... args) : T
        dispatchForAllFormula(formula : ForAllFormula, ... args) : T
        dispatchMinFixedPointFormula(formula : MinFixedPointFormula, ... args) : T
        dispatchMaxFixedPointFormula(formula : MaxFixedPointFormula, ... args) : T
        dispatchVariableFormula(formula : VariableFormula, ... args) : T
    }

    export class DisjFormula implements Formula {
        constructor(public left : Formula, public right : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchDisjFormula(this);
        }
        toString() {
            return "DisjFormula";
        }
    }

    export class ConjFormula implements Formula {
        constructor(public left : Formula, public right : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchConjFormula(this);
        }
        toString() {
            return "ConjFormula";
        }
    }

    export class TrueFormula implements Formula {
        constructor() {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchTrueFormula(this);
        }
        toString() {
            return "TrueFormula";
        }
    }

    export class FalseFormula implements Formula {
        constructor() {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchFalseFormula(this);
        }
        toString() {
            return "FalseFormula";
        }
    }

    export class ExistsFormula implements Formula {
        constructor(public action : ccs.Action, public subFormula : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchExistsFormula(this);
        }
        toString() {
            return "ExistsFormula";
        }
    }

    export class ForAllFormula implements Formula {
        constructor(public action : ccs.Action, public subFormula : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchForAllFormula(this);
        }
        toString() {
            return "ForAllFormula";
        }
    }

    export class MinFixedPointFormula implements Formula {
        constructor(public variable : string, public subFormula : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchMinFixedPointFormula(this);
        }
        toString() {
            return "MinFixedPointFormula";
        }
    }

    export class MaxFixedPointFormula implements Formula {
        constructor(public variable : string, public subFormula : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchMaxFixedPointFormula(this);
        }
        toString() {
            return "MaxFixedPointFormula";
        }
    }

    export class VariableFormula implements Formula {
        constructor(public variable : string) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchVariableFormula(this);
        }
        toString() {
            return "VariableFormula";
        }
    }

    export class FormulaSet {
        private allFormulas = [];
        private namedFormulas = Object.create(null);
        private undefinedVariables = [];
        private errors = [];
        constructor() {
        }

        newDisj(left : Formula, right : Formula) {
            return new DisjFormula(left, right);
        }

        newConj(left : Formula, right : Formula) {
            return new ConjFormula(left, right);
        }

        newTrue() {
            return new TrueFormula();
        }

        newFalse() {
            return new FalseFormula();
        }

        newExists(action : ccs.Action, subFormula : Formula) {
            return new ExistsFormula(action, subFormula);
        }

        newForAll(action : ccs.Action, subFormula : Formula) {
            return new ForAllFormula(action, subFormula);
        }

        newMinFixedPoint(variable : string, subFormula : Formula) {
            var result = new MinFixedPointFormula(variable, subFormula);
            if (this.namedFormulas[variable]) {
                this.errors.push({name: "DuplicateDefinition", message: "The variable '" + variable + "' is defined multiple times."});
            } else {
                this.namedFormulas[variable] = result;
                this.allFormulas.push(result);
                var undefinedIndex = this.undefinedVariables.indexOf(variable);
                if (undefinedIndex !== -1) {
                    this.undefinedVariables.splice(undefinedIndex, 1);
                }
            }
            return result;
        }

        newMaxFixedPoint(variable : string, subFormula : Formula) {
            var result = new MaxFixedPointFormula(variable, subFormula);
            if (this.namedFormulas[variable]) {
                this.errors.push({name: "DuplicateDefinition", message: "The variable '" + variable + "' is defined multiple times."});
            } else {
                this.namedFormulas[variable] = result;
                this.allFormulas.push(result);
                var undefinedIndex = this.undefinedVariables.indexOf(variable);
                if (undefinedIndex !== -1) {
                    this.undefinedVariables.splice(undefinedIndex, 1);
                }
            }
            return result;
        }

        unnamedMinFixedPoint(formula : Formula) {
            this.allFormulas.push(formula);
            return formula;
        }

        referVariable(variable : string) {
            if (!this.namedFormulas[variable] && this.undefinedVariables.indexOf(variable) === -1) {
                this.undefinedVariables.push(variable);
            }
            return new VariableFormula(variable);
        }

        getErrors() {
            var errors = this.errors.slice(0);
            this.undefinedVariables.forEach(variable => {
                errors.push({name: "UndefinedVariable", message: "The variable '" + variable + "' has not been defined."});
            });
            if (errors.length === 0) {
                var cycleChecker = new ReferenceCycleChecker();
                Array.prototype.push.apply(errors, cycleChecker.check(this));
            }
            return errors;
        }

        formulaByName(variable) : Formula {
            var result = this.namedFormulas[variable];
            return result ? result : null;
        }

        getVariables() : string[] {
            return Object.keys(this.namedFormulas);
        }

        getAllFormulas() {
            return this.allFormulas.slice(0);
        }
    }

    class ReferenceCycleChecker implements FormulaDispatchHandler<boolean> {

        private hasSeen = [];
        private formulaSet;
        
        private hasSeenButNotIn(variable) : boolean {
            var index = this.hasSeen.indexOf(variable);
            return index >= 0 && index < this.hasSeen.length-1;
        }

        private isInside(variable) : boolean {
            return this.hasSeen.length > 0 ? (this.hasSeen[this.hasSeen.length-1] === variable) : false;
        }

        check(formulaSet : FormulaSet) {
            var errors = [];
            this.formulaSet = formulaSet;
            var variables = formulaSet.getVariables();
            variables.forEach(variable => {
                if (formulaSet.formulaByName(variable).dispatchOn(this)) {
                    errors.push({name: "NonAcyclicVariable", message: "The variable '" + variable + "' is not acyclic"});
                }
            });
            this.formulaSet = null;
            return errors;
        }

        dispatchDisjFormula(formula : DisjFormula) : boolean {
            return formula.left.dispatchOn(this) || formula.right.dispatchOn(this);
        }

        dispatchConjFormula(formula : ConjFormula) : boolean {
            return formula.left.dispatchOn(this) || formula.right.dispatchOn(this);
        }

        dispatchTrueFormula(formula : TrueFormula) : boolean {
            return false;
        }

        dispatchFalseFormula(formula : FalseFormula) : boolean {
            return false;
        }

        dispatchExistsFormula(formula : ExistsFormula) : boolean {
            return formula.subFormula.dispatchOn(this);
        }

        dispatchForAllFormula(formula : ForAllFormula) : boolean {
            return formula.subFormula.dispatchOn(this);
        }

        dispatchMinFixedPointFormula(formula : MinFixedPointFormula) : boolean {
            if (this.hasSeenButNotIn(formula.variable)) return true;
            if (this.isInside(formula.variable)) return false;
            this.hasSeen.push(formula.variable);
            var result = formula.subFormula.dispatchOn(this);
            this.hasSeen.pop();
            return result;
        }

        dispatchMaxFixedPointFormula(formula : MaxFixedPointFormula) : boolean {
            if (this.hasSeenButNotIn(formula.variable)) return true;
            if (this.isInside(formula.variable)) return false;
            this.hasSeen.push(formula.variable);
            var result = formula.subFormula.dispatchOn(this);
            this.hasSeen.pop();
            return result;
        }

        dispatchVariableFormula(formula : VariableFormula) : boolean {
            return this.formulaSet.formulaByName(formula.variable).dispatchOn(this);
        }
    }
}
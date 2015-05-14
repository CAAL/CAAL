/// <reference path="../../lib/util.d.ts" />
/// <reference path="ccs.ts" />

module HML {
    
    import ccs = CCS;
    import DGMod = DependencyGraph;
    import AU = ArrayUtil;

    export interface Formula {
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T;
        toString() : string;
        id : string;
    }

    export interface FormulaVisitor<T> {
        visit(formula : Formula) : T;
    }

    export interface FormulaDispatchHandler<T> {
        dispatchDisjFormula(formula : DisjFormula) : T
        dispatchConjFormula(formula : ConjFormula) : T
        dispatchTrueFormula(formula : TrueFormula) : T
        dispatchFalseFormula(formula : FalseFormula) : T
        dispatchStrongExistsFormula(formula : StrongExistsFormula) : T
        dispatchStrongForAllFormula(formula : StrongForAllFormula) : T
        dispatchWeakExistsFormula(formula : WeakExistsFormula) : T
        dispatchWeakForAllFormula(formula : WeakForAllFormula) : T
        dispatchMinFixedPointFormula(formula : MinFixedPointFormula) : T
        dispatchMaxFixedPointFormula(formula : MaxFixedPointFormula) : T
        dispatchVariableFormula(formula : VariableFormula) : T
    }

    export class DisjFormula implements Formula {
        private hmlStr : string;
        constructor(public subFormulas : Formula[]) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchDisjFormula(this);
        }
        toString() : string {
            if (this.hmlStr) return this.hmlStr;
            var subStrs = this.subFormulas.map(f => f.toString());
            return this.hmlStr = subStrs.map(f => "(" + f + ")").join(" or ");
        }
        get id() : string {
            return this.toString();
        }
    }

    export class ConjFormula implements Formula {
        private hmlStr : string;
        constructor(public subFormulas : Formula[]) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchConjFormula(this);
        }
        toString() : string {
            if (this.hmlStr) return this.hmlStr;
            var subStrs = this.subFormulas.map(f => f.toString());
            return this.hmlStr = subStrs.map(f => "(" + f + ")").join(" and ");
        }
        get id() : string {
            return this.toString();
        }
    }

    export class TrueFormula implements Formula {
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchTrueFormula(this);
        }
        toString() {
            return "tt";
        }
        get id() : string {
            return this.toString();
        }
    }

    export class FalseFormula implements Formula {
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchFalseFormula(this);
        }
        toString() {
            return "ff";
        }
        get id() : string {
            return this.toString();
        }
    }

    export class StrongExistsFormula implements Formula {
        private hmlStr : string;
        constructor(public actionMatcher : ActionMatcher, public subFormula : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchStrongExistsFormula(this);
        }
        toString() {
            if (this.hmlStr) return this.hmlStr;
            return this.hmlStr = "<" + this.actionMatcher.toString() + ">" + this.subFormula.toString();
        }
        get id() : string {
            return this.toString();
        }
    }

    export class StrongForAllFormula implements Formula {
        private hmlStr : string;
        constructor(public actionMatcher : ActionMatcher, public subFormula : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchStrongForAllFormula(this);
        }
        toString() {
            if (this.hmlStr) return this.hmlStr;
            return this.hmlStr = "[" + this.actionMatcher.toString() + "]" + this.subFormula.toString();
        }
        get id() : string {
            return this.toString();
        }
    }

    export class WeakExistsFormula implements Formula {
        private hmlStr : string;
        constructor(public actionMatcher : ActionMatcher, public subFormula : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchWeakExistsFormula(this);
        }
        toString() {
            if (this.hmlStr) return this.hmlStr;
            return this.hmlStr = "<<" + this.actionMatcher.toString() + ">>" + this.subFormula.toString();
        }
        get id() : string {
            return this.toString();
        }
    }

    export class WeakForAllFormula implements Formula {
        private hmlStr : string;
        constructor(public actionMatcher : ActionMatcher, public subFormula : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchWeakForAllFormula(this);
        }
        toString() {
            if (this.hmlStr) return this.hmlStr;
            return this.hmlStr = "[[" + this.actionMatcher.toString() + "]]" + this.subFormula.toString();
        }
        get id() : string {
            return this.toString();
        }
    }

    export class MinFixedPointFormula implements Formula {
        private hmlStr : string;
        constructor(public variable : string, public subFormula : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchMinFixedPointFormula(this);
        }
        toString() {
            if (this.hmlStr) return this.hmlStr;
            return this.hmlStr = this.variable + " min= " + this.subFormula.toString();
        }
        get id() : string {
            return this.toString();
        }
    }

    export class MaxFixedPointFormula implements Formula {
        private hmlStr : string;
        constructor(public variable : string, public subFormula : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchMaxFixedPointFormula(this);
        }
        toString() {
            if (this.hmlStr) return this.hmlStr;
            return this.hmlStr = this.variable + " max= " + this.subFormula.toString();
        }
        get id() : string {
            return this.toString();
        }
    }

    export class VariableFormula implements Formula {
        constructor(public variable : string) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchVariableFormula(this);
        }
        toString() {
            return this.variable;
        }
        get id() : string {
            return this.toString();
        }
    }

    function compareStrings(strA, strB) {
        return strA.toString().localeCompare(strB.toString());
    }

    export class FormulaSet {
        private topFormula : Formula = null;
        private formulas = Object.create(null);
        // private allFormulas = [];
        private topLevelFormulas = [];
        private undefinedVariables = [];
        private errors = [];
        private falseFormula = new FalseFormula();
        private trueFormula = new TrueFormula();
        // private nextId = 2;
        // private structural = {};
        private actionMatchers = new ccs.GrowingIndexedArraySet<ActionMatcher>();

        constructor() {
        }

        newDisj(formulas : Formula[]) {
            var subFormulas = AU.sortAndRemoveDuplicates(formulas, f => f.id);
            var formula = new DisjFormula(subFormulas)
            return this.formulas[formula.id] = formula;
        }

        newConj(formulas : Formula[]) {
            var subFormulas = AU.sortAndRemoveDuplicates(formulas, f => f.id);
            var formula = new ConjFormula(subFormulas)
            return this.formulas[formula.id] = formula;
        }

        newTrue() {
            return this.trueFormula;
        }

        newFalse() {
            return this.falseFormula;
        }

        private newExistOrForAll(structuralPrefix, constructor, actionMatcher, subFormula) {
            var uniqActionMatcher = this.actionMatchers.getOrAdd(actionMatcher);
            var formula = new constructor(uniqActionMatcher, subFormula);
            return this.formulas[formula.id] = formula;
        }

        newStrongExists(actionMatcher : ActionMatcher, subFormula : Formula) {
            return this.newExistOrForAll("SE", StrongExistsFormula, actionMatcher, subFormula);
        }

        newStrongForAll(actionMatcher : ActionMatcher, subFormula : Formula) {
            return this.newExistOrForAll("SFA", StrongForAllFormula, actionMatcher, subFormula);
        }

        newWeakExists(actionMatcher : ActionMatcher, subFormula : Formula) {
            return this.newExistOrForAll("WE", WeakExistsFormula, actionMatcher, subFormula);
        }

        newWeakForAll(actionMatcher : ActionMatcher, subFormula : Formula) {
            return this.newExistOrForAll("WFA", WeakForAllFormula, actionMatcher, subFormula);
        }

        newMinFixedPoint(variable : string, subFormula : Formula) {
            var result = new MinFixedPointFormula(variable, subFormula);
            if (this.formulaByName(variable)) {
                this.errors.push({name: "DuplicateDefinition", message: "The variable '" + variable + "' is defined multiple times."});
            } else {
                this.topLevelFormulas.push(result);
                var undefinedIndex = this.undefinedVariables.indexOf(variable);
                if (undefinedIndex !== -1) {
                    this.undefinedVariables.splice(undefinedIndex, 1);
                }
                this.formulas[result.id] = result;
            }
            return result;
        }

        newMaxFixedPoint(variable : string, subFormula : Formula) {
            var result = new MaxFixedPointFormula(variable, subFormula);
            if (this.formulaByName(variable)) {
                this.errors.push({name: "DuplicateDefinition", message: "The variable '" + variable + "' is defined multiple times."});
            } else {
                this.topLevelFormulas.push(result);
                var undefinedIndex = this.undefinedVariables.indexOf(variable);
                if (undefinedIndex !== -1) {
                    this.undefinedVariables.splice(undefinedIndex, 1);
                }
                this.formulas[result.id] = result;
            }
            return result;
        }

        unnamedMinFixedPoint(formula : Formula) : Formula {
            this.topLevelFormulas.push(formula);
            return this.addFormula(formula);
        }

        referVariable(variable : string) : VariableFormula {
            if (!this.formulaByName(variable) && this.undefinedVariables.indexOf(variable) === -1) {
                this.undefinedVariables.push(variable);
            }
            return new VariableFormula(variable);
        }

        addFormula(formula : Formula) : Formula {
            return this.formulas[formula.id] = formula;
        }

        getErrors() : string[] {
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

        formulaByName(variable : string) : Formula {
            var allTopFormulas = this.getTopLevelFormulas();
            for (var i=0; i < allTopFormulas.length; i++) {
                var allVariable = (<any>allTopFormulas[i]).variable;
                if (allVariable === variable) {
                    return allTopFormulas[i];
                }
            }
            return null;
        }

        getVariables() : string[] {
            var variables = [],
                allTopFormulas = this.getTopLevelFormulas();
            for (var i=0; i < allTopFormulas.length; i++) {
                var variable = (<any>allTopFormulas[i]).variable;
                if (variable) {
                    variables.push(variable);
                }
            }
            return variables;
        }

        getTopLevelFormulas() : Formula[] {
            return this.topLevelFormulas.slice();
        }

        getTopFormula() : Formula {
            return this.topFormula;
        }

        setTopFormula(formula : Formula) {
            this.topFormula = formula;
        }

        map(fn : (formula : Formula) => Formula) : FormulaSet {
            var newSet = new FormulaSet(),
                formulaDict = this.formulas,
                allFormulas = Object.keys(formulaDict).map(f => formulaDict[f]);
            allFormulas.forEach(formula => {
                newSet.addFormula(fn(formula));
            });
            return newSet;
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
            var result = false;
            formula.subFormulas.forEach(subFormula => {
                result = result || subFormula.dispatchOn(this);
            });
            //cast potentially undefined.
            return !!result;
        }

        dispatchConjFormula(formula : ConjFormula) : boolean {
            var result = false;
            formula.subFormulas.forEach(subFormula => {
                result = result || subFormula.dispatchOn(this);
            });
            //cast potentially undefined.
            return !!result;
        }

        dispatchTrueFormula(formula : TrueFormula) : boolean {
            return false;
        }

        dispatchFalseFormula(formula : FalseFormula) : boolean {
            return false;
        }

        dispatchStrongExistsFormula(formula : StrongExistsFormula) : boolean {
            return formula.subFormula.dispatchOn(this);
        }

        dispatchStrongForAllFormula(formula : StrongForAllFormula) : boolean {
            return formula.subFormula.dispatchOn(this);
        }

        dispatchWeakExistsFormula(formula : WeakExistsFormula) : boolean {
            return formula.subFormula.dispatchOn(this);
        }

        dispatchWeakForAllFormula(formula : WeakForAllFormula) : boolean {
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

    export interface ActionMatcher {
        matches(action : ccs.Action) : boolean;
        toString() : string; //Returns unique string representing matching actions
    }

    export class SingleActionMatcher {
        constructor(private action : ccs.Action) {
        }

        matches(action : ccs.Action) : boolean {
            return this.action.equals(action);
        }

        add(action : ccs.Action) : ActionMatcher {
            return new ArrayActionMatcher([this.action, action]);
        }
        equals(other) {
            if (!(other instanceof SingleActionMatcher)) return false;
            return this.action.equals(other.action);
        }
        toString() : string {
            return this.action.toString();
        }
    }

    export class ArrayActionMatcher {
        private actions = [];
        constructor(actions : ccs.Action[]) {
            this.actions = actions.slice();
            this.actions.forEach(action => {
                if (!this.matches(action)) {
                    this.actions.push(action);
                }
            });
            this.sortActions();
        }

        private sortActions() {
            function compareActions(actLeft, actRight) {
                if (actLeft.complement !== actRight.complement) return !actLeft.complement ? -1 : 1;
                if (actLeft.label !== actRight.label) return actLeft.label < actRight.label ? -1 : 1;
                return 0;
            }
            this.actions.sort(compareActions)
        }

        matches(action : ccs.Action) : boolean {
            for (var i=0; i < this.actions.length; i++) {
                if (this.actions[i].equals(action)) {
                    return true;
                }
            }
            return false;
        }

        add(action : ccs.Action) : ActionMatcher {
            var matcher = new ArrayActionMatcher([]);
            matcher.actions = this.actions.slice(0);
            if (!matcher.matches(action)) {
                matcher.actions.push(action);
                matcher.sortActions();
            }
            return matcher;
        }
        equals(other) {
            if (!(other instanceof ArrayActionMatcher)) return false;
            if (this.actions.length !== other.actions.length) return false;
            for (var i=0, len = this.actions.length; i < len; i++) {
                if (!this.actions[i].equals(other.actions[i])) return false;
            }
            return true;
        }
        toString() : string {
            return this.actions.map(action => action.toString()).join(",");
        }
    }

    export class AllActionMatcher {
        matches(action : ccs.Action) : boolean {
            return true;
        }
        equals(other) {
            return other instanceof AllActionMatcher;
        }
        toString() : string {
            return "-";
        }
    }

}
/// <reference path="../../lib/util.d.ts" />
/// <reference path="ccs.ts" />

module HML {
    
    import ccs = CCS;
    import DGMod = DependencyGraph;
    import AU = ArrayUtil;

    export interface Formula {
        id : number;
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T;
    }

    export interface FormulaVisitor<T> {
        visit(formula : Formula) : T;
    }

    export interface FormulaDispatchHandler<T> {
        dispatchDisjFormula(formula : DisjFormula, ... args) : T
        dispatchConjFormula(formula : ConjFormula, ... args) : T
        dispatchTrueFormula(formula : TrueFormula, ... args) : T
        dispatchFalseFormula(formula : FalseFormula, ... args) : T
        dispatchStrongExistsFormula(formula : StrongExistsFormula, ... args) : T
        dispatchStrongForAllFormula(formula : StrongForAllFormula, ... args) : T
        dispatchWeakExistsFormula(formula : WeakExistsFormula, ... args) : T
        dispatchWeakForAllFormula(formula : WeakForAllFormula, ... args) : T
        dispatchMinFixedPointFormula(formula : MinFixedPointFormula, ... args) : T
        dispatchMaxFixedPointFormula(formula : MaxFixedPointFormula, ... args) : T
        dispatchVariableFormula(formula : VariableFormula, ... args) : T
    }

    export class DisjFormula implements Formula {
        constructor(public id : number, public subFormulas : Formula[]) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchDisjFormula(this);
        }
        toString() {
            return "DisjFormula";
        }
    }

    export class ConjFormula implements Formula {
        constructor(public id : number, public subFormulas : Formula[]) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchConjFormula(this);
        }
        toString() {
            return "ConjFormula";
        }
    }

    export class TrueFormula implements Formula {
        constructor(public id : number) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchTrueFormula(this);
        }
        toString() {
            return "TrueFormula";
        }
    }

    export class FalseFormula implements Formula {
        constructor(public id : number) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchFalseFormula(this);
        }
        toString() {
            return "FalseFormula";
        }
    }

    export class StrongExistsFormula implements Formula {
        constructor(public id : number, public actionMatcher : ActionMatcher, public subFormula : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchStrongExistsFormula(this);
        }
        toString() {
            return "StrongExistsFormula";
        }
    }

    export class StrongForAllFormula implements Formula {
        constructor(public id : number, public actionMatcher : ActionMatcher, public subFormula : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchStrongForAllFormula(this);
        }
        toString() {
            return "StrongForAllFormula";
        }
    }

    export class WeakExistsFormula implements Formula {
        constructor(public id : number, public actionMatcher : ActionMatcher, public subFormula : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchWeakExistsFormula(this);
        }
        toString() {
            return "WeakExistsFormula";
        }
    }

    export class WeakForAllFormula implements Formula {
        constructor(public id : number, public actionMatcher : ActionMatcher, public subFormula : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchWeakForAllFormula(this);
        }
        toString() {
            return "WeakForAllFormula";
        }
    }

    export class MinFixedPointFormula implements Formula {
        constructor(public id : number, public variable : string, public subFormula : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchMinFixedPointFormula(this);
        }
        toString() {
            return "MinFixedPointFormula";
        }
    }

    export class MaxFixedPointFormula implements Formula {
        constructor(public id : number, public variable : string, public subFormula : Formula) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchMaxFixedPointFormula(this);
        }
        toString() {
            return "MaxFixedPointFormula";
        }
    }

    export class VariableFormula implements Formula {
        constructor(public id : number, public variable : string) {
        }
        dispatchOn<T>(dispatcher : FormulaDispatchHandler<T>) : T {
            return dispatcher.dispatchVariableFormula(this);
        }
        toString() {
            return "VariableFormula";
        }
    }

    export class FormulaSet {
        private topFormula : Formula = null;
        private allFormulas = [];
        private undefinedVariables = [];
        private errors = [];
        private falseFormula = new FalseFormula(0);
        private trueFormula = new TrueFormula(1);
        private nextId = 2;
        private structural = {};
        private actionMatchers = new ccs.GrowingIndexedArraySet<ActionMatcher>();

        constructor() {
        }

        newDisj(formulas : Formula[]) {
            var newFormulas = AU.sortAndRemoveDuplicates(formulas, f => f.id),
                key = "or," + newFormulas.map(f => f.id).join(","),
                existing = this.structural[key];
            if (newFormulas.length === 1) return newFormulas[0];
            if (!existing) {
                existing = this.structural[key] = new DisjFormula(this.nextId++, newFormulas);
            }
            return existing;
        }

        newConj(formulas : Formula[]) {
            var newFormulas = AU.sortAndRemoveDuplicates(formulas, f => f.id),
                key = "and," + newFormulas.map(f => f.id).join(","),
                existing = this.structural[key];
            if (newFormulas.length === 1) return newFormulas[0];
            if (!existing) {
                existing = this.structural[key] = new ConjFormula(this.nextId++, newFormulas);
            }
            return existing;
        }

        newTrue() {
            return this.trueFormula;
        }

        newFalse() {
            return this.falseFormula;
        }

        private newExistOrForAll(structuralPrefix, constructor, actionMatcher, subFormula) {
            var uniqActionMatcher = this.actionMatchers.getOrAdd(actionMatcher),
                actionMatcherId = this.actionMatchers.indexOf(uniqActionMatcher),
                key = structuralPrefix + "," + actionMatcherId + "," + subFormula.id,
                existing = this.structural[key];
            if (!existing) {
                existing = this.structural[key] = new constructor(this.nextId++, uniqActionMatcher, subFormula);
            }
            return existing;            
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
            var result = new MinFixedPointFormula(this.nextId++, variable, subFormula);
            if (this.formulaByName(variable)) {
                this.errors.push({name: "DuplicateDefinition", message: "The variable '" + variable + "' is defined multiple times."});
            } else {
                this.allFormulas.push(result);
                var undefinedIndex = this.undefinedVariables.indexOf(variable);
                if (undefinedIndex !== -1) {
                    this.undefinedVariables.splice(undefinedIndex, 1);
                }
            }
            return result;
        }

        newMaxFixedPoint(variable : string, subFormula : Formula) {
            var result = new MaxFixedPointFormula(this.nextId++, variable, subFormula);
            if (this.formulaByName(variable)) {
                this.errors.push({name: "DuplicateDefinition", message: "The variable '" + variable + "' is defined multiple times."});
            } else {
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
            if (!this.formulaByName(variable) && this.undefinedVariables.indexOf(variable) === -1) {
                this.undefinedVariables.push(variable);
            }
            return new VariableFormula(this.nextId++, variable);
        }

        addFormula(formula : Formula) {
            this.allFormulas.push(formula);
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

        formulaByName(variable) : Formula {
            for (var i=0; i < this.allFormulas.length; i++) {
                var allVariable = this.allFormulas[i].variable;
                if (allVariable === variable) {
                    return this.allFormulas[i];
                }
            }
            return null;
        }

        getFormulaById(id : number) : Formula {
            this.allFormulas.forEach((formula)=>{
                if(id === formula.id){
                    return formula;
                }
            });
            return null;
        }

        getVariables() : string[] {
            var variables = [];
            for (var i=0; i < this.allFormulas.length; i++) {
                var variable = this.allFormulas[i].variable;
                if (variable) {
                    variables.push(variable);
                }
            }
            return variables;
        }

        getAllFormulas() : Formula[] {
            return this.allFormulas.slice(0);
        }

        getTopFormula() : Formula {
            return this.topFormula;
        }

        setTopFormula(formula : Formula) {
            this.topFormula = formula;
        }

        map(fn : (formula : Formula) => Formula) : FormulaSet {
            var newSet = new FormulaSet();
            this.allFormulas.forEach(formula => {
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
        actionMatchingString() : string //Returns string representing matching actions
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
        actionMatchingString() : string {
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
        actionMatchingString() : string {
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
        actionMatchingString() : string {
            return "-";
        }
    }

}
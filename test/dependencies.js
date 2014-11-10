/// <reference path="ccs.ts" />
var Traverse;
(function (Traverse) {
    var UnguardedRecursionChecker = (function () {
        function UnguardedRecursionChecker() {
        }
        UnguardedRecursionChecker.prototype.findUnguardedProcesses = function (allNamedProcesses) {
            this.unknownResults = allNamedProcesses.slice(0);
            this.visiting = [];
            this.unguardedProcesses = [];
            for (var i = 0, max = allNamedProcesses.length; i < max; i++) {
                allNamedProcesses[i].dispatchOn(this);
            }
            return this.unguardedProcesses;
        };

        UnguardedRecursionChecker.prototype.dispatchNullProcess = function (process) {
            return false;
        };

        UnguardedRecursionChecker.prototype.dispatchNamedProcess = function (process) {
            var index = this.unknownResults.indexOf(process), isUnguarded = false;
            if (index >= 0) {
                //First time we see this process.
                this.unknownResults.splice(index, 1);
                this.visiting.push(process);
                if (process.subProcess.dispatchOn(this)) {
                    this.unguardedProcesses.push(process);
                }
                this.visiting.splice(this.visiting.indexOf(process), 1);
            } else if (this.visiting.indexOf(process) !== -1) {
                //We are currently trying to determine unguarded recursion for this
                //and we got here again. This means it is unguarded.
                isUnguarded = true;
            } else {
                isUnguarded = this.unguardedProcesses.indexOf(process) !== -1;
            }
            return isUnguarded;
        };

        UnguardedRecursionChecker.prototype.dispatchSummationProcess = function (process) {
            var leftIsUnguarded = process.leftProcess.dispatchOn(this);
            var rightIsUnguarded = process.rightProcess.dispatchOn(this);
            return leftIsUnguarded || rightIsUnguarded;
        };

        UnguardedRecursionChecker.prototype.dispatchCompositionProcess = function (process) {
            var leftIsUnguarded = process.leftProcess.dispatchOn(this);
            var rightIsUnguarded = process.rightProcess.dispatchOn(this);
            return leftIsUnguarded || rightIsUnguarded;
        };

        UnguardedRecursionChecker.prototype.dispatchActionPrefixProcess = function (process) {
            return false;
        };

        UnguardedRecursionChecker.prototype.dispatchRestrictionProcess = function (process) {
            return process.subProcess.dispatchOn(this);
        };

        UnguardedRecursionChecker.prototype.dispatchRelabellingProcess = function (process) {
            return process.subProcess.dispatchOn(this);
        };
        return UnguardedRecursionChecker;
    })();
    Traverse.UnguardedRecursionChecker = UnguardedRecursionChecker;
})(Traverse || (Traverse = {}));
/// <reference path="unguarded_recursion.ts" />
var CCS;
(function (CCS) {
    var NullProcess = (function () {
        function NullProcess(id) {
            this.id = id;
        }
        NullProcess.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchNullProcess(this);
        };
        NullProcess.prototype.toString = function () {
            return "NullProcess";
        };
        return NullProcess;
    })();
    CCS.NullProcess = NullProcess;

    var NamedProcess = (function () {
        function NamedProcess(id, name, subProcess) {
            this.id = id;
            this.name = name;
            this.subProcess = subProcess;
        }
        NamedProcess.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchNamedProcess(this);
        };
        NamedProcess.prototype.toString = function () {
            return "NamedProcess(" + this.name + ")";
        };
        return NamedProcess;
    })();
    CCS.NamedProcess = NamedProcess;

    var SummationProcess = (function () {
        function SummationProcess(id, leftProcess, rightProcess) {
            this.id = id;
            this.leftProcess = leftProcess;
            this.rightProcess = rightProcess;
        }
        SummationProcess.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchSummationProcess(this);
        };
        SummationProcess.prototype.toString = function () {
            return "Summation";
        };
        return SummationProcess;
    })();
    CCS.SummationProcess = SummationProcess;

    var CompositionProcess = (function () {
        function CompositionProcess(id, leftProcess, rightProcess) {
            this.id = id;
            this.leftProcess = leftProcess;
            this.rightProcess = rightProcess;
        }
        CompositionProcess.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchCompositionProcess(this);
        };
        CompositionProcess.prototype.toString = function () {
            return "Composition";
        };
        return CompositionProcess;
    })();
    CCS.CompositionProcess = CompositionProcess;

    var ActionPrefixProcess = (function () {
        function ActionPrefixProcess(id, action, nextProcess) {
            this.id = id;
            this.action = action;
            this.nextProcess = nextProcess;
        }
        ActionPrefixProcess.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchActionPrefixProcess(this);
        };
        ActionPrefixProcess.prototype.toString = function () {
            return "Action(" + this.action.toString() + ")";
        };
        return ActionPrefixProcess;
    })();
    CCS.ActionPrefixProcess = ActionPrefixProcess;

    var RestrictionProcess = (function () {
        function RestrictionProcess(id, subProcess, restrictedLabels) {
            this.id = id;
            this.subProcess = subProcess;
            this.restrictedLabels = restrictedLabels;
        }
        RestrictionProcess.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchRestrictionProcess(this);
        };
        RestrictionProcess.prototype.toString = function () {
            return "Restriction";
        };
        return RestrictionProcess;
    })();
    CCS.RestrictionProcess = RestrictionProcess;

    var RelabellingProcess = (function () {
        function RelabellingProcess(id, subProcess, relabellings) {
            this.id = id;
            this.subProcess = subProcess;
            this.relabellings = relabellings;
        }
        RelabellingProcess.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchRelabellingProcess(this);
        };
        RelabellingProcess.prototype.toString = function () {
            return "Relabelling";
        };
        return RelabellingProcess;
    })();
    CCS.RelabellingProcess = RelabellingProcess;

    var Action = (function () {
        function Action(label, isComplement) {
            if (label === "tau" && isComplement) {
                throw new Error("tau has no complement");
            }
            this.label = label;
            this.complement = isComplement;
        }
        Action.prototype.getLabel = function () {
            return this.label;
        };

        Action.prototype.isComplement = function () {
            return this.complement;
        };

        Action.prototype.equals = function (other) {
            return this.label === other.label && this.complement === other.complement;
        };
        Action.prototype.toString = function () {
            return (this.complement ? "'" : "") + this.label;
        };
        Action.prototype.clone = function () {
            return new Action(this.label, this.complement);
        };
        return Action;
    })();
    CCS.Action = Action;

    var Graph = (function () {
        function Graph() {
            this.nextId = 1;
            this.nullProcess = new NullProcess(0);
            this.cache = {};
            this.processes = { 0: this.nullProcess };
            this.namedProcesses = {};
            this.constructErrors = [];
            this.definedSets = {};
            //Uses index as uid.
            this.allRestrictedSets = new GrowingIndexedArraySet();
            this.allRelabellings = new GrowingIndexedArraySet();
            this.cache.structural = {}; //used structural sharing
            this.cache.successors = {};
        }
        Graph.prototype.newNamedProcess = function (processName, process) {
            var namedProcess = this.namedProcesses[processName];
            if (!namedProcess) {
                namedProcess = this.namedProcesses[processName] = new NamedProcess(this.nextId++, processName, process);
                this.processes[namedProcess.id] = namedProcess;
            } else if (!namedProcess.subProcess) {
                namedProcess.subProcess = process;
            } else {
                this.constructErrors.push({
                    name: "DuplicateProcessDefinition",
                    message: "Duplicate definition of process '" + processName + "'" });
            }
            return namedProcess;
        };

        Graph.prototype.referToNamedProcess = function (processName) {
            var namedProcess = this.namedProcesses[processName];
            if (!namedProcess) {
                //Null will be fixed, by newNamedProcess
                namedProcess = this.namedProcesses[processName] = new NamedProcess(this.nextId++, processName, null);
                this.processes[namedProcess.id] = namedProcess;
            }
            return namedProcess;
        };

        Graph.prototype.getNullProcess = function () {
            return this.nullProcess;
        };

        Graph.prototype.newActionPrefixProcess = function (action, nextProcess) {
            var key = "." + action.toString() + nextProcess.id;
            var existing = this.cache.structural[key];
            if (!existing) {
                existing = this.cache.structural[key] = new ActionPrefixProcess(this.nextId++, action, nextProcess);
            }
            this.processes[existing.id] = existing;
            return existing;
        };

        Graph.prototype.newSummationProcess = function (left, right) {
            var temp, key, existing;

            //Ensure left.id <= right.id
            if (left.id > right.id) {
                temp = left;
                left = right;
                right = temp;
            }
            key = "+" + left.id + "," + right.id;
            existing = this.cache.structural[key];
            if (!existing) {
                existing = this.cache.structural[key] = new SummationProcess(this.nextId++, left, right);
                this.processes[existing.id] = existing;
            }
            return existing;
        };

        Graph.prototype.newCompositionProcess = function (left, right) {
            var temp, key, existing;

            //Ensure left.id <= right.id
            if (right.id > left.id) {
                temp = left;
                left = right;
                right = temp;
            }
            key = "|" + left.id + "," + right.id;
            existing = this.cache.structural[key];
            if (!existing) {
                existing = this.cache.structural[key] = new CompositionProcess(this.nextId++, left, right);
                this.processes[existing.id] = existing;
            }
            return existing;
        };

        Graph.prototype.newRestrictedProcess = function (process, restrictedLabels) {
            //For now return just new instead of structural sharing
            var key, existing;
            restrictedLabels = this.allRestrictedSets.getOrAdd(restrictedLabels);
            key = "\\" + process.id + "," + this.allRestrictedSets.indexOf(restrictedLabels);
            existing = this.cache.structural[key];
            if (!existing) {
                existing = this.cache.structural[key] = new RestrictionProcess(this.nextId++, process, restrictedLabels);
                this.processes[existing.id] = existing;
            }
            return existing;
        };

        Graph.prototype.newRestrictedProcessOnSetName = function (process, setName) {
            var labelSet = this.definedSets[setName];
            if (!labelSet) {
                this.constructErrors.push({ name: "UndefinedSet", message: "Set '" + setName + "' has not been defined" });

                //Fallback for empty set
                labelSet = this.allRestrictedSets.getOrAdd(new LabelSet([]));
            }
            return this.newRestrictedProcess(process, labelSet);
        };

        Graph.prototype.newRelabelingProcess = function (process, relabellings) {
            var key, existing;
            relabellings = this.allRelabellings.getOrAdd(relabellings);
            key = "[" + process.id + "," + this.allRelabellings.indexOf(relabellings);
            existing = this.cache.structural[key];
            if (!existing) {
                existing = this.cache.structural[key] = new RelabellingProcess(this.nextId++, process, relabellings);
                this.processes[existing.id] = existing;
            }
            return existing;
        };

        Graph.prototype.defineNamedSet = function (name, labelSet) {
            if (this.definedSets[name]) {
                this.constructErrors.push({ name: "DuplicateSetDefinition", message: "Set '" + name + "' has already been defined" });
            }
            this.definedSets[name] = this.allRestrictedSets.getOrAdd(labelSet);
        };

        Graph.prototype.processById = function (id) {
            return this.processes[id] || null;
        };

        Graph.prototype.processByName = function (name) {
            return this.namedProcesses[name] || null;
        };

        Graph.prototype.getNamedProcesses = function () {
            return Object.keys(this.namedProcesses);
        };

        Graph.prototype.getErrors = function () {
            var _this = this;
            var errors = this.constructErrors.slice(0);

            //Add undefined processes
            var addUndefinedProcesses = function () {
                var processName, process;
                for (processName in _this.namedProcesses) {
                    process = _this.namedProcesses[processName];
                    if (!process.subProcess) {
                        errors.push({
                            name: "UndefinedProcess",
                            message: "Process '" + processName + "' has no definition" });
                    }
                }
            };
            var addUnguardedRecursionErrors = function () {
                var checker = new Traverse.UnguardedRecursionChecker(), processNames = Object.keys(_this.namedProcesses), processes = processNames.map(function (name) {
                    return _this.namedProcesses[name];
                }), unguardedProcesses = checker.findUnguardedProcesses(processes);
                unguardedProcesses.forEach(function (process) {
                    errors.push({ name: "UnguardedProcess", message: "Process '" + process.name + "' has unguarded recursion" });
                });
            };
            addUndefinedProcesses();

            //Unguarded recursion checking requires all processes to defined.
            if (errors.length === 0)
                addUnguardedRecursionErrors();
            return errors;
        };
        return Graph;
    })();
    CCS.Graph = Graph;

    var RelabellingSet = (function () {
        function RelabellingSet(relabellings) {
            var _this = this;
            this.froms = [];
            this.tos = [];
            relabellings.forEach(function (relabel) {
                if (relabel.from === "tau" || relabel.to === "tau") {
                    throw new Error("Cannot relabel from or to tau");
                }
                _this.froms.push(relabel.from);
                _this.tos.push(relabel.to);
            });
            this.froms.sort();
            this.tos.sort();
        }
        RelabellingSet.prototype.forEach = function (f, thisObject) {
            for (var i = 0, max = this.froms.length; i < max; i++) {
                f.call(thisObject, this.froms[i], this.tos[i]);
            }
        };

        RelabellingSet.prototype.hasRelabelForLabel = function (label) {
            return this.froms.indexOf(label) !== -1;
        };

        RelabellingSet.prototype.toLabelForFromLabel = function (label) {
            var index = this.froms.indexOf(label), result = null;
            if (index >= 0) {
                result = this.tos[index];
            }
            return result;
        };

        RelabellingSet.prototype.equals = function (other) {
            if (other === this)
                return true;
            if (other.froms.length !== this.froms.length)
                return false;
            for (var i = 0; i < this.froms.length; i++) {
                if (this.froms[i] !== other.froms[i])
                    return false;
                if (this.tos[i] !== other.tos[i])
                    return false;
            }
            return true;
        };

        RelabellingSet.prototype.toString = function () {
            return "RelabellingSet";
        };
        return RelabellingSet;
    })();
    CCS.RelabellingSet = RelabellingSet;

    /*
    Always modifies inplace. Clone gives shallow clone
    */
    var LabelSet = (function () {
        function LabelSet(labels) {
            this.labels = [];
            var temp = labels.slice(0), cur, next;
            if (temp.length > 0) {
                temp.sort();

                //Don't add the first of duplicates
                cur = temp[0];
                for (var i = 1; i < temp.length; i++) {
                    next = temp[i];
                    if (cur !== next) {
                        this.labels.push(cur);
                    }
                    cur = next;
                }

                //Add the last
                this.labels.push(cur);
            }
        }
        LabelSet.prototype.toArray = function () {
            return this.labels.slice(0);
        };

        LabelSet.prototype.contains = function (label) {
            return this.labels.indexOf(label) !== -1;
        };

        LabelSet.prototype.empty = function () {
            return this.count() === 0;
        };

        LabelSet.prototype.count = function () {
            return this.labels.length;
        };

        LabelSet.prototype.forEach = function (f, thisObject) {
            for (var i = 0, max = this.labels.length; i < max; i++) {
                f(this.labels[i]);
            }
        };

        LabelSet.prototype.equals = function (other) {
            var myLabels = this.labels, otherLabels = other.labels;
            if (other === this)
                return true;
            if (myLabels.length !== other.labels.length)
                return false;
            for (var i = 0; i < myLabels.length; i++) {
                if (myLabels[i] !== otherLabels[i])
                    return false;
            }
            return true;
        };

        LabelSet.prototype.union = function (other) {
            return LabelSet.Union(this, other);
        };

        LabelSet.Union = function () {
            var sets = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                sets[_i] = arguments[_i + 0];
            }
            var result = new LabelSet([]), si, li, curSet;
            for (si = 0; si < sets.length; si++) {
                curSet = sets[si];
                for (li = 0; li < curSet.labels.length; li++) {
                    if (!result.contains(curSet.labels[li])) {
                        result.labels.push(curSet.labels[li]);
                    }
                }
            }
            result.labels.sort();
            return result;
        };

        LabelSet.prototype.toString = function () {
            return "LabelSet";
        };
        return LabelSet;
    })();
    CCS.LabelSet = LabelSet;

    /*
    Represents the order of an in-order traversal.
    */
    var InorderStruct = (function () {
        function InorderStruct(before, process, after) {
            this.before = before;
            this.process = process;
            this.after = after;
        }
        return InorderStruct;
    })();
    CCS.InorderStruct = InorderStruct;

    /*
    Always modifies inplace. Clone gives shallow clone
    */
    var Transition = (function () {
        function Transition(action, targetProcess) {
            this.action = action;
            this.targetProcess = targetProcess;
        }
        Transition.prototype.equals = function (other) {
            return (this.action.equals(other.action) && this.targetProcess.id == other.targetProcess.id);
        };
        Transition.prototype.toString = function () {
            if (this.targetProcess instanceof NamedProcess) {
                return this.action.toString() + "->" + this.targetProcess.name;
            }
            return this.action.toString() + "->" + this.targetProcess.id;
        };
        return Transition;
    })();
    CCS.Transition = Transition;

    var TransitionSet = (function () {
        function TransitionSet(transitions) {
            this.transitions = [];
            if (transitions) {
                this.addAll(transitions);
            }
        }
        TransitionSet.prototype.add = function (transition) {
            var allCurrent = this.transitions;
            for (var i = 0, max = allCurrent.length; i < max; i++) {
                if (transition.equals(allCurrent[i]))
                    break;
            }
            allCurrent.push(transition);
            return this;
        };

        TransitionSet.prototype.addAll = function (transitions) {
            for (var i = 0, max = transitions.length; i < max; i++) {
                this.add(transitions[i]);
            }
        };

        TransitionSet.prototype.unionWith = function (tSet) {
            this.addAll(tSet.transitions);
            return this;
        };

        TransitionSet.prototype.clone = function () {
            return new TransitionSet(this.transitions);
        };

        TransitionSet.prototype.count = function () {
            return this.transitions.length;
        };

        TransitionSet.prototype.applyRestrictionSet = function (labels) {
            var count = this.transitions.length, allCurrent = this.transitions, i = 0;
            while (i < count) {
                if (labels.contains(allCurrent[i].action.label)) {
                    allCurrent[i] = allCurrent[--count];
                } else {
                    ++i;
                }
            }
            allCurrent.length = count;
            return this;
        };

        TransitionSet.prototype.applyRelabelSet = function (relabels) {
            var allCurrent = this.transitions, newLabel, transition;
            for (var i = 0, max = allCurrent.length; i < max; i++) {
                transition = allCurrent[i];
                if (relabels.hasRelabelForLabel(transition.action.label)) {
                    newLabel = relabels.toLabelForFromLabel(transition.action.label);
                    transition.action = new Action(newLabel, transition.action.isComplement());
                }
            }
        };

        TransitionSet.prototype.possibleActions = function () {
            var actions = [], action, found;
            for (var i = 0; i < this.transitions.length; i++) {
                action = this.transitions[i].action;
                found = false;
                for (var j = 0; j < actions.length; j++) {
                    if (action.equals(actions[j])) {
                        found = true;
                        break;
                    }
                }
                if (!found)
                    actions.push(action);
            }
            return actions;
        };

        TransitionSet.prototype.transitionsForAction = function (action) {
            return this.transitions.filter(function (transition) {
                return action.equals(transition.action);
            });
        };

        TransitionSet.prototype.forEach = function (f) {
            for (var i = 0, max = this.transitions.length; i < max; i++) {
                f(this.transitions[i]);
            }
        };

        TransitionSet.prototype.toArray = function () {
            return this.transitions.slice(0);
        };
        return TransitionSet;
    })();
    CCS.TransitionSet = TransitionSet;

    var StrictSuccessorGenerator = (function () {
        function StrictSuccessorGenerator(graph, cache) {
            this.graph = graph;
            this.cache = cache;
            this.cache = cache || {};
        }
        StrictSuccessorGenerator.prototype.getSuccessors = function (processId) {
            //Move recursive calling into loop with stack here
            //if overflow becomes an issue.
            var process = this.graph.processById(processId);
            return this.cache[process.id] = process.dispatchOn(this);
        };

        StrictSuccessorGenerator.prototype.dispatchNullProcess = function (process) {
            var transitionSet = this.cache[process.id];
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new TransitionSet();
            }
            return transitionSet;
        };

        StrictSuccessorGenerator.prototype.dispatchNamedProcess = function (process) {
            var transitionSet = this.cache[process.id];
            if (!transitionSet) {
                //Assume nothing, then figure it out when subprocess successors are known.
                this.cache[process.id] = new TransitionSet();
                transitionSet = this.cache[process.id] = process.subProcess.dispatchOn(this).clone();
            }
            return transitionSet;
        };

        StrictSuccessorGenerator.prototype.dispatchSummationProcess = function (process) {
            var transitionSet = this.cache[process.id], leftTransitions, rightTransitions;
            if (!transitionSet) {
                leftTransitions = process.leftProcess.dispatchOn(this);
                rightTransitions = process.rightProcess.dispatchOn(this);
                transitionSet = this.cache[process.id] = leftTransitions.clone().unionWith(rightTransitions);
            }
            return transitionSet;
        };

        StrictSuccessorGenerator.prototype.dispatchCompositionProcess = function (process) {
            var _this = this;
            var transitionSet = this.cache[process.id], leftSet, rightSet;
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new TransitionSet();
                leftSet = process.leftProcess.dispatchOn(this);
                rightSet = process.rightProcess.dispatchOn(this);

                leftSet.forEach(function (leftTransition) {
                    //COM1
                    transitionSet.add(new Transition(leftTransition.action.clone(), _this.graph.newCompositionProcess(leftTransition.targetProcess, process.rightProcess)));

                    //COM3
                    rightSet.forEach(function (rightTransition) {
                        if (leftTransition.action.label === rightTransition.action.label && leftTransition.action.isComplement() !== rightTransition.action.isComplement()) {
                            transitionSet.add(new Transition(new Action("tau", false), _this.graph.newCompositionProcess(leftTransition.targetProcess, rightTransition.targetProcess)));
                        }
                    });
                });

                //COM2
                rightSet.forEach(function (rightTransition) {
                    transitionSet.add(new Transition(rightTransition.action.clone(), _this.graph.newCompositionProcess(process.leftProcess, rightTransition.targetProcess)));
                });
            }
            return transitionSet;
        };

        StrictSuccessorGenerator.prototype.dispatchActionPrefixProcess = function (process) {
            var transitionSet = this.cache[process.id];
            if (!transitionSet) {
                process.nextProcess.dispatchOn(this).clone();
                transitionSet = this.cache[process.id] = new TransitionSet([new Transition(process.action, process.nextProcess)]);
            }
            return transitionSet;
        };

        StrictSuccessorGenerator.prototype.dispatchRestrictionProcess = function (process) {
            var _this = this;
            var transitionSet = this.cache[process.id], subTransitionSet;
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new TransitionSet();
                subTransitionSet = process.subProcess.dispatchOn(this).clone();
                subTransitionSet.applyRestrictionSet(process.restrictedLabels);
                subTransitionSet.forEach(function (transition) {
                    var newRestriction = _this.graph.newRestrictedProcess(transition.targetProcess, process.restrictedLabels);
                    transitionSet.add(new Transition(transition.action.clone(), newRestriction));
                });
            }
            return transitionSet;
        };

        StrictSuccessorGenerator.prototype.dispatchRelabellingProcess = function (process) {
            var _this = this;
            var transitionSet = this.cache[process.id], subTransitionSet;
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new TransitionSet();
                subTransitionSet = process.subProcess.dispatchOn(this).clone();
                subTransitionSet.applyRelabelSet(process.relabellings);
                subTransitionSet.forEach(function (transition) {
                    var newRelabelling = _this.graph.newRelabelingProcess(transition.targetProcess, process.relabellings);
                    transitionSet.add(new Transition(transition.action.clone(), newRelabelling));
                });
            }
            return transitionSet;
        };
        return StrictSuccessorGenerator;
    })();
    CCS.StrictSuccessorGenerator = StrictSuccessorGenerator;

    // export interface Set<T> {
    //     // union(other : Set<T>) : Set<T>;
    //     difference(other : Set<T>) : Set<T>;
    //     toArray() : T[];
    //     has(element : T) : boolean;
    // }
    // export interface MutableSet<T> extends Set<T> {
    //     add(element : T);
    //     remove(element : T);
    // }
    // export interface Equitable<T> {
    //     equals(other : T) : boolean;
    // }
    // class ArraySet<T> implements MutableSet<T> {
    //     private elements : T[] = [];
    //     constructor() {
    //     }
    //     add(element : T) {
    //         if (!this.has(element)) {
    //             this.elements.push(element);
    //         }
    //     }
    //     union(other : Set<T>) : Set<T> {
    //         var result = new ArraySet(),
    //             otherElements = other.toArray();
    //         result.elements = this.elements.slice(0);
    //         for (var i=0; i < otherElements.length; i++) {
    //             result.add(otherElements[i]);
    //         }
    //         return result;
    //     }
    //     difference(other : Set<T>) : Set<T> {
    //         var result = new ArraySet(),
    //             resultElements = [],
    //             element;
    //         for (var i=0; i < this.elements.length; i++) {
    //             element = this.elements[i];
    //             if (!other.has(element)) {
    //                 resultElements.push(element);
    //             }
    //         }
    //         result.elements = resultElements;
    //         return result;
    //     }
    //     remove(element : T) {
    //         var index = this.indexOf(element),
    //             curLen = this.elements.length;
    //         if (index !== -1) {
    //             this.elements[index] = this.elements[curLen - 1];
    //             this.elements.length = curLen - 1;
    //         }
    //     }
    //     toArray() : T[] {
    //         return this.elements.slice(0);
    //     }
    //     has(element : T) : boolean {
    //         return this.indexOf(element) !== -1;
    //     }
    //     private indexOf(element) {
    //        for (var i=0; i < this.elements.length; i++) {
    //             if (this.elements[i].equals(element)) return i;
    //         }
    //         return -1;
    //     }
    // }
    var GrowingIndexedArraySet = (function () {
        function GrowingIndexedArraySet() {
            this.elements = [];
        }
        GrowingIndexedArraySet.prototype.getOrAdd = function (element) {
            var result = element, index = this.indexOf(element);
            if (index === -1) {
                this.elements.push(element);
            } else {
                result = this.elements[index];
            }
            return result;
        };

        GrowingIndexedArraySet.prototype.get = function (index) {
            return index >= this.elements.length ? null : this.elements[index];
        };

        GrowingIndexedArraySet.prototype.indexOf = function (element) {
            for (var i = 0; i < this.elements.length; i++) {
                if (this.elements[i].equals(element))
                    return i;
            }
            return -1;
        };
        return GrowingIndexedArraySet;
    })();
})(CCS || (CCS = {}));
/// <reference path="ccs.ts" />
var DependencyGraph;
(function (DependencyGraph) {
    var ccs = CCS;

    function buildDummyLts() {
        // a.(b.0 + c.0)
        var edges = {};
        edges["aroot"] = [
            ["a", "asplit"]
        ];
        edges["asplit"] = [
            ["b", "null"],
            ["c", "null"]
        ];
        edges["null"] = [];

        // a.b.0 + a.c.0
        edges["bsplit"] = [
            ["a", "bleft"],
            ["a", "bright"]
        ];
        edges["bleft"] = [
            ["b", "null"]
        ];
        edges["bright"] = [
            ["c", "null"]
        ];
        return makeDummyLtsOfEdges(edges);
    }
    DependencyGraph.buildDummyLts = buildDummyLts;

    function makeDummyLtsOfEdges(edges) {
        var o = {};
        o.getSuccessors = function (id) {
            var tSet = new ccs.TransitionSet();
            edges[id].forEach(function (pairs) {
                var action = new ccs.Action(pairs[0], false), targetProcess = { id: pairs[1], dispatchOn: function (x) {
                    } }, newTransition = new ccs.Transition(action, targetProcess);
                tSet.add(newTransition);
            });
            return tSet;
        };
        return o;
    }

    var BisimulationDG = (function () {
        function BisimulationDG(succGen, leftNode, rightNode) {
            this.nodes = [];
            this.constructData = [];
            this.pairToNodeId = {};
            this.succGen = succGen;
            this.constructData[0] = [0, leftNode, rightNode];
            this.nextIdx = 1;
        }
        BisimulationDG.prototype.getHyperEdges = function (identifier) {
            var type, data, result;

            //Have we already built this? Then return copy of the edges.
            if (this.nodes[identifier])
                return this.nodes[identifier].slice(0);
            data = this.constructData[identifier];
            type = data[0];
            if (type === 0) {
                result = this.nodes[identifier] = this.getProcessPairStates(data[1], data[2]);
            } else if (type === 1) {
                result = this.nodes[identifier] = this.getNodeForLeftTransition(data);
            } else if (type === 2) {
                result = this.nodes[identifier] = this.getNodeForRightTransition(data);
            }
            return result.slice(0);
        };

        BisimulationDG.prototype.getNodeForLeftTransition = function (data) {
            var _this = this;
            var action = data[1], toLeftId = data[2], fromRightId = data[3], result = [];

            // for (s, fromRightId), s ----action---> toLeftId.
            // fromRightId must be able to match.
            var rightTransitions = this.succGen.getSuccessors(fromRightId);
            rightTransitions.forEach(function (rightTransition) {
                var key, toRightId;

                //Same action - possible candidate.
                if (rightTransition.action.equals(action)) {
                    toRightId = rightTransition.targetProcess.id;
                    key = toLeftId + "-" + toRightId;

                    //Have we already solved the resulting (s1, t1) pair?
                    if (_this.pairToNodeId[key]) {
                        result.push([_this.pairToNodeId[key]]);
                    } else {
                        //Build the node.
                        var newIndex = _this.nextIdx++;
                        _this.pairToNodeId[key] = newIndex;
                        _this.constructData[newIndex] = [0, toLeftId, toRightId];
                        result.push([newIndex]);
                    }
                }
            });
            return result;
        };

        BisimulationDG.prototype.getNodeForRightTransition = function (data) {
            var _this = this;
            var action = data[1], toRightId = data[2], fromLeftId = data[3], result = [];
            var leftTransitions = this.succGen.getSuccessors(fromLeftId);
            leftTransitions.forEach(function (leftTransition) {
                var key, toLeftId;
                if (leftTransition.action.equals(action)) {
                    toLeftId = leftTransition.targetProcess.id;
                    key = toLeftId + "-" + toRightId;
                    if (_this.pairToNodeId[key]) {
                        result.push([_this.pairToNodeId[key]]);
                    } else {
                        var newIndex = _this.nextIdx++;
                        _this.pairToNodeId[key] = newIndex;
                        _this.constructData[newIndex] = [0, toLeftId, toRightId];
                        result.push([newIndex]);
                    }
                }
            });
            return result;
        };

        BisimulationDG.prototype.getProcessPairStates = function (leftProcessId, rightProcessId) {
            var _this = this;
            var hyperedge = [];
            var leftTransitions = this.succGen.getSuccessors(leftProcessId);
            var rightTransitions = this.succGen.getSuccessors(rightProcessId);
            leftTransitions.forEach(function (leftTransition) {
                var newNodeIdx = _this.nextIdx++;
                _this.constructData[newNodeIdx] = [1, leftTransition.action, leftTransition.targetProcess.id, rightProcessId];
                hyperedge.push(newNodeIdx);
            });
            rightTransitions.forEach(function (rightTransition) {
                var newNodeIdx = _this.nextIdx++;
                _this.constructData[newNodeIdx] = [2, rightTransition.action, rightTransition.targetProcess.id, leftProcessId];
                hyperedge.push(newNodeIdx);
            });
            return [hyperedge];
        };
        return BisimulationDG;
    })();
    DependencyGraph.BisimulationDG = BisimulationDG;

    function testDG() {
        var o = {};
        var edges = [];

        /*
        t = a.(b.0 + c.0)
        s = a.b.0 + a.c.0
        
        t2 = b.0 + c.0
        t3 = t4 = 0
        
        s2 = b.0
        s4 = 0
        s3 = c.0
        s5 = 0
        */
        edges[0] = [[1, 2, 3]]; // s, t
        edges[1] = [[4]]; // s -- a --> s2, t

        // s can take 'a' to s2, then t process must match.
        edges[2] = [[5]]; // s -- a --> s3, t
        edges[3] = [[4], [5]]; // s, t --a -- > 2
        edges[4] = [[7, 8, 9]]; // s2, t2
        edges[5] = [[6, 11, 12]]; // s3, t2
        edges[6] = [[13]]; // s3, t2 -- c --> t4
        edges[7] = []; // s2, t2 -- c --> t4
        edges[8] = [[10]]; // s2 -- b --> s4, t2
        edges[9] = [[10]]; // s2, t2 -- b --> t3
        edges[10] = [[]]; // s4, t3
        edges[11] = [[13]]; // s3 -- c --> s5, t2
        edges[12] = []; // s3, t2 -- b --> t3
        edges[13] = [[]]; // s5, t4

        o.getHyperEdges = function (k) {
            return edges[k];
        };
        return o;
    }

    function liuSmolkaLocal2(m, graph) {
        var S_ZERO = 1, S_ONE = 2, S_BOTTOM = 3;

        // A[k]
        var A = (function () {
            var a = {};
            var o = {
                get: function (k) {
                    return a[k] || S_BOTTOM;
                },
                set: function (k, status) {
                    a[k] = status;
                },
                dump: function () {
                    return a;
                }
            };
            return o;
        }());

        // D[k]
        var D = (function () {
            var d = {};
            var o = {
                empty: function (k) {
                    d[k] = [];
                },
                add: function (k, edgeL) {
                    d[k] = d[k] || [];
                    d[k].push(edgeL);
                },
                get: function (k) {
                    return d[k] || [];
                }
            };
            return o;
        }());

        function getSucc(k) {
            return graph.getHyperEdges(k);
        }

        function load(k) {
            var l = getSucc(k);
            while (l.length > 0) {
                W.push([k, l.pop()]);
            }
        }

        A.set(m, S_ZERO);
        D.empty(m);
        var W = [];
        load(m);

        while (W.length > 0) {
            var next = W.pop();
            var k = next[0];
            var l = next[1];
            if (A.get(k) === S_ZERO) {
                if (l.length > 0) {
                    var headL = l[l.length - 1];
                    while (A.get(headL) === S_ONE && l.length > 0) {
                        l.pop();
                        headL = l[l.length - 1];
                    }
                }
                if (l.length === 0) {
                    A.set(k, S_ONE);
                    W = D.get(k).concat(W);
                } else if (A.get(headL) === S_ZERO) {
                    D.add(headL, [k, l]);
                } else if (A.get(headL) === S_BOTTOM) {
                    A.set(headL, S_ZERO);
                    D.empty(headL);
                    D.add(headL, [k, l]); //Missing in smolka paper
                    load(headL);
                }
            }
        }
        return A.get(m) === S_ONE;
    }
    DependencyGraph.liuSmolkaLocal2 = liuSmolkaLocal2;
})(DependencyGraph || (DependencyGraph = {}));
/// <reference path="ccs.ts" />
var Traverse;
(function (Traverse) {
    var ccs = CCS;

    var ProcessTreeReducer = (function () {
        function ProcessTreeReducer(graph, cache) {
            this.graph = graph;
            this.cache = cache;
            this.cache = cache || {};
        }
        ProcessTreeReducer.prototype.visit = function (process) {
            return process.dispatchOn(this);
        };

        ProcessTreeReducer.prototype.dispatchNullProcess = function (process) {
            this.cache[process.id] = true;
            return process;
        };

        ProcessTreeReducer.prototype.dispatchNamedProcess = function (process) {
            if (!this.cache[process.id]) {
                this.cache[process.id] = true;
                process.subProcess = process.subProcess.dispatchOn(this);
            }
            return process;
        };

        ProcessTreeReducer.prototype.dispatchSummationProcess = function (process) {
            if (!this.cache[process.id]) {
                process.leftProcess = process.leftProcess.dispatchOn(this);
                process.rightProcess = process.rightProcess.dispatchOn(this);
                if (process.leftProcess instanceof ccs.NullProcess)
                    return process.rightProcess;
                if (process.rightProcess instanceof ccs.NullProcess)
                    return process.leftProcess;
                if (process.leftProcess.id === process.rightProcess.id)
                    return process.leftProcess;
                this.cache[process.id] = true;
            }
            return process;
        };

        ProcessTreeReducer.prototype.dispatchCompositionProcess = function (process) {
            if (!this.cache[process.id]) {
                process.leftProcess = process.leftProcess.dispatchOn(this);
                process.rightProcess = process.rightProcess.dispatchOn(this);
                if (process.leftProcess instanceof ccs.NullProcess)
                    return process.rightProcess;
                if (process.rightProcess instanceof ccs.NullProcess)
                    return process.leftProcess;
                this.cache[process.id] = true;
            }
            return process;
        };

        ProcessTreeReducer.prototype.dispatchActionPrefixProcess = function (process) {
            if (!this.cache[process.id]) {
                process.nextProcess = process.nextProcess.dispatchOn(this);
                this.cache[process.id] = true;
            }
            return process;
        };

        ProcessTreeReducer.prototype.dispatchRestrictionProcess = function (process) {
            if (!this.cache[process.id]) {
                process.subProcess = process.subProcess.dispatchOn(this);

                // (P \ L1) \L2 => P \ (L1 Union L2)
                if (process.subProcess instanceof ccs.RestrictionProcess) {
                    var subRestriction = process.subProcess;
                    var mergedLabels = subRestriction.restrictedLabels.union(process.restrictedLabels);
                    process = this.graph.newRestrictedProcess(subRestriction.subProcess, mergedLabels);
                }

                // 0 \ L => 0
                if (process.subProcess instanceof ccs.NullProcess) {
                    return process.subProcess;
                }

                // P \ Ø => P
                if (process.restrictedLabels.empty()) {
                    return process.subProcess;
                }
                this.cache[process.id] = true;
            }
            return process;
        };

        ProcessTreeReducer.prototype.dispatchRelabellingProcess = function (process) {
            if (!this.cache[process.id]) {
                process.subProcess = process.subProcess.dispatchOn(this);
                if (process.subProcess instanceof ccs.NullProcess)
                    return process.subProcess;
                this.cache[process.id] = true;
            }
            return process;
        };
        return ProcessTreeReducer;
    })();
    Traverse.ProcessTreeReducer = ProcessTreeReducer;

    var ReducingSuccessorGenerator = (function () {
        function ReducingSuccessorGenerator(graph, successorCache, reducerCache) {
            this.graph = graph;
            this.successorCache = successorCache;
            this.reducerCache = reducerCache;
            this.successorCache = successorCache || {};
            this.reducerCache = reducerCache || {};
            this.succGenerator = new ccs.StrictSuccessorGenerator(graph, this.successorCache);
            this.reducer = new ProcessTreeReducer(graph, this.reducerCache);
        }
        ReducingSuccessorGenerator.prototype.getSuccessors = function (processId) {
            var transitionSet = this.succGenerator.getSuccessors(processId);
            return this.reduceSuccessors(transitionSet);
        };

        ReducingSuccessorGenerator.prototype.reduceSuccessors = function (transitionSet) {
            var _this = this;
            transitionSet.forEach(function (transition) {
                transition.targetProcess = _this.reducer.visit(transition.targetProcess);
            });
            return transitionSet;
        };
        return ReducingSuccessorGenerator;
    })();
    Traverse.ReducingSuccessorGenerator = ReducingSuccessorGenerator;
})(Traverse || (Traverse = {}));
/// <reference path="../src/ccs/ccs.ts" />
/// <reference path="../src/ccs/depgraph.ts" />
/// <reference path="../src/ccs/reducedparsetree.ts" />

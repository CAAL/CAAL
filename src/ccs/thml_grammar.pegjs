// Timed Hennessy-Milner Logic.

{
    function strFirstAndRest(first, rest) {
        return first + rest.join('');
    }

    function expandDelay(min, max, subFormula, isForAll) {
        var matcher = new hml.SingleActionMatcher(new tccs.Delay(1));
        var subFormulas = [];

        for (var i = min; i <= max; i++) {
            var next = subFormula;

            for (var j = i; j > 0; j--) {
                if (isForAll) next = formulas.newStrongForAll(matcher, next);
                else next = formulas.newStrongExists(matcher, next);
            }

            subFormulas.push(next);
        }

        if (isForAll) return formulas.newConj(subFormulas);
        else return formulas.newDisj(subFormulas);
    }

    var ccs = options.ccs,
        tccs = options.tccs,
        hml = options.hml,
        formulas = options.formulaSet || new hml.FormulaSet();
}

start
    = Ps:Statements _ { return formulas; }
    / F:SimpleFormula _ ";" _ { console.log(formulas); return formulas; }
    / _ { return formulas; }

Statements
    = P:FixedPoint _ ";" Qs:Statements { return [P].concat(Qs); }
    / P:FixedPoint _ (";" _)? { return [P]; }

TopFormula
    = F:SimpleFormula _ ";"_ { formulas.setTopFormula(F); return F;}

SimpleFormula
    = P:Disjunction _ { var f = formulas.unnamedMinFixedPoint(P); return f; }

FixedPoint
    = _ V:Variable _ [mM][aA][xX] "=" _ P:Disjunction { return formulas.newMaxFixedPoint(V, P); }
    / _ V:Variable _ [mM][iI][nN] "=" _ P:Disjunction { return formulas.newMinFixedPoint(V, P); }

Disjunction
    = P:Conjunction Whitespace _ "or" Whitespace _ Q:Disjunction { return Q instanceof hml.DisjFormula ? formulas.newDisj([P].concat(Q.subFormulas)) : formulas.newDisj([P, Q]); }
    / P:Conjunction { return P; }

Conjunction
    = M:Modal Whitespace _ "and" Whitespace _ P:Conjunction { return P instanceof hml.ConjFormula ? formulas.newConj([M].concat(P.subFormulas)) : formulas.newConj([M, P]); }
    / M:Modal { return M; }

Modal
    = _ "[" _ "[" _ AM:ActionList _ "]" _ "]" _ F:Modal { return formulas.newWeakForAll(AM, F); }
    / _ "<" _ "<" _ AM:ActionList _ ">" _ ">" _ F:Modal { return formulas.newWeakExists(AM, F); }
    / _ "[" _ AM:ActionList _ "]" _ F:Modal { return formulas.newStrongForAll(AM, F); }
    / _ "[" _ delay:Delay _ "]" _ F:Modal { return expandDelay(delay, delay, F, true); }
    / _ "[" _ min:Delay _ "," _ max:Delay _ "]" _ F:Modal { return expandDelay(min, max, F, true); }
    / _ "<" _ AM:ActionList _ ">" _ F:Modal { return formulas.newStrongExists(AM, F); }
    / _ "<" _ delay:Delay _ ">" _ F:Modal { return expandDelay(delay, delay, F, false); }
    / _ "<" _ min:Delay _ "," _ max:Delay _ ">" _ F:Modal { return expandDelay(min, max, F, false); }
    / Unary

Unary "term"
    = ParenFormula
    / _ "tt" { return formulas.newTrue(); }
    / _ "ff" { return formulas.newFalse(); }
    / _ V:Variable { return formulas.referVariable(V); }
    / _ "T" { return formulas.newTrue(); }
    / _ "F" { return formulas.newFalse(); }

ParenFormula
    = _ "(" _ F:Disjunction _ ")" { return F; }

Variable "variable"
    = letter:[A-EG-SU-Z] rest:IdentifierRestSym* { return strFirstAndRest(letter, rest); }
    / letter:[FT] rest:IdentifierRestSym+ { return strFirstAndRest(letter, rest); }

IdentifierRestSym
    = [A-Za-z0-9?!_'\-#]

ActionList
    = A:Action _ "," _ AM:ActionList { return AM.add(A); }
    / A:Action { return new hml.SingleActionMatcher(A); }
    / "-" { return new hml.AllActionMatcher(); }

Action "action"
    = ['] label:Label { return new ccs.Action(label, true); }
    / label:Label { return new ccs.Action(label, false); }

Delay "delay"
    = number:([1-9][0-9]*) { return parseInt(number.join(""), 10); }

Label "label"
    = first:[a-z] rest:IdentifierRestSym* { return strFirstAndRest(first, rest); }

Whitespace "whitespace"
    = [ \t]

Comment "comment"
    = "*" [^\r\n]* "\r"? "\n"?

_
    = (Whitespace / Newline)* Comment _
    / (Whitespace / Newline)*

Newline "newline"
    = "\r\n" / "\n" / "\r"

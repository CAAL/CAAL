//Hennessy-Milner Logic

{
	function strFirstAndRest(first, rest) {
		return first + rest.join('');
	}

    var ccs = options.ccs,
        hml = options.hml,
        formulas = new hml.FormulaSet();
}

start
	= Ps:Statements _ { return formulas; }
	/ _ { return formulas; }

Statements = P:FixedPoint _ ";" Qs:Statements { return [P].concat(Qs); }
		   / P:FixedPoint _ (";" _)? { return [P]; }

FixedPoint = _ V:Variable _ [mM][aA][xX] "=" _ P:Disjunction { return formulas.newMaxFixedPoint(V, P); }
		   / _ V:Variable _ [mM][iI][nN] "=" _ P:Disjunction { return formulas.newMinFixedPoint(V, P); }
		   / P:Disjunction { return formulas.unnamedMinFixedPoint(P); }

Disjunction = P:Conjunction Whitespace _ "or" Whitespace _ Q:Disjunction { return formulas.newDisj(P, Q); }
			/ P:Conjunction { return P; }

Conjunction = M:Modal Whitespace _ "and" Whitespace _ P:Conjunction { return formulas.newConj(M, P); }
			/ M:Modal { return M; }

Modal = _ "[" _ AM:ActionList _ "]" _ F:Modal { return formulas.newForAll(AM, F); }
	  / _ "<" _ AM:ActionList _ ">" _ F:Modal { return formulas.newExists(AM, F); }
	  / Unary

Unary = ParenFormula
	  / _ "tt" { return formulas.newTrue(); }
	  / _ "ff" { return formulas.newFalse(); }
	  / _ V:Variable { return formulas.referVariable(V); }

ParenFormula = _ "(" _ F:Disjunction _ ")" { return F; }

Variable = letter:[A-Z] rest:IdentifierRest { return strFirstAndRest(letter, rest); }

IdentifierRest
    = rest:[A-Za-z0-9?!_'\-#]*  { return rest; }

ActionList = A:Action _ "," _ AM:ActionList { return AM.add(A); }
		   / A:Action { return new hml.SingleActionMatcher(A); }
		   / "-" { return new hml.AllActionMatcher(); }

Action "action"
    = ['] label:Label { return new ccs.Action(label, true); }
    / label:Label { return new ccs.Action(label, false); }

//Valid name for actions
Label "label"
    = first:[a-z] rest:IdentifierRest { return strFirstAndRest(first, rest); }

Whitespace "whitespace"
    = [ \t]

Comment "comment" = "*" [^\r\n]* "\r"? "\n"?

//Useful utility
_ = (Whitespace / Newline)* Comment _
  / (Whitespace / Newline)*

Newline "newline"
    = "\r\n" / "\n" / "\r"
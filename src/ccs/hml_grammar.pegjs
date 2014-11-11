//Hennessy-Milner Logic

{
	function strFirstAndRest(first, rest) {
		return first + rest.join('');
	}

    var ccs = options.ccs,
        hml = options.hml;
}

start
	= Formula

Formula = Disjunction

Disjunction = _ P:Conjunction Whitespace _ "or" Whitespace _ Q:Disjunction { return new hml.DisjFormula(P, Q); }
			/ P:Conjunction { return P; }

Conjunction =  _ M:Modal Whitespace _ "and" Whitespace _ P:Conjunction { return new hml.ConjFormula(M, P); }
			/ M:Modal { return M; }

Modal = _ "[" _ A:Action _ "]" _ F:Modal { return new hml.ForAllFormula(A, F); }
	  / _ "<" _ A:Action _ ">" _ F:Modal { return new hml.ExistsFormula(A, F); }
	  / Unary

Unary = ParenFormula
	  / _ "tt" { return new hml.TrueFormula(); }
	  / _ "ff" { return new hml.FalseFormula(); }

ParenFormula = _ "(" _ F:Formula _ ")" { return F; }

IdentifierRest
    = rest:[A-Za-z0-9?!_'\-#]*  { return rest; }

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
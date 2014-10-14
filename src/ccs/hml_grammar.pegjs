//Hennessy-Milner Logic

{
	function strFirstAndRest(first, rest) {
		return first + rest.join('');
	}
}

start
	= Formula

Formula = Disjunction

Disjunction = _ P:Conjunction Whitespace _ "or" Whitespace _ Q:Disjunction { return {type: "or", left: P, right: Q}; }
			/ Conjunction

Conjunction =  _ M:Modal Whitespace _ "and" Whitespace _ P:Conjunction { return {type: "and", left: M, right: P}; }
			/ Modal

Modal = _ "[" _ A:Action _ "]" _ F:Formula { return {type: "forall", action: A, formula: F}}
	  / _ "<" _ A:Action _ ">" _ F:Formula { return {type: "exists", action: A, formula: F}}
	  / Unary

Unary = ParenFormula
	  / _ "tt" { return {type: "true"}; }
	  / _ "ff" { return {type: "false"}; }

ParenFormula = _ "(" _ F:Formula _ ")" { return F; }

IdentifierRest
	= rest:[A-Za-z0-9?!_'\-#]*  { return rest; }

Action
	= [!'] label:Label { return "'" + label; }
	/ label:Label { return label; }

//Valid name for actions
Label
	= first:[a-z] rest:IdentifierRest { return strFirstAndRest(first, rest); }

Whitespace
	= [ \r\n\t]

Comment = "*" [^\r\n]* "\r"? "\n"?

//Useful utility
_ = Whitespace* Comment _
  / Whitespace*

Newline
	= "\r\n" / "\n" / "\r"


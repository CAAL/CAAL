#!/bin/bash

MAIN_SRC="./src/main.ts"
MAIN_DEST="./lib/main.js"

CCS_PARSE_SRC=".src/ccs/ccs.ts"
CCS_PARSE_DEST="./lib/ccs.js"

# generate the parser
echo "Building Parser"
pegjs --cache -e CCSParser src/ccs/ccs_grammar.pegjs lib/ccs_grammar.js

echo "Integrating Parser into Ace Module"
mkdir -p modules/ace/lib/ace/mode/ccs

# manually create requirejs files for the ccs data structure and the ccs parser
echo "Compiling CCS subset for Ace CCS linter"
echo "Building $CCS_PARSE_DEST" 
if [ ! -f "$CCS_PARSE_DEST" ] || [ "$CCS_PARSE_SRC" -nt "$CCS_PARSE_DEST" ] ; then
	tsc --out "$CCS_PARSE_DEST" "$CCS_PARSE_SRC"
else
	echo "-- Compilation not necessary"
fi

cp lib/ccs.js .
echo 'define(function(require, exports, module) {' | cat - ccs.js > temp && mv temp ccs.js
echo 'module.exports.CCS = CCS; });' >> ccs.js
mv ccs.js modules/ace/lib/ace/mode/ccs/

cp lib/ccs_grammar.js .
echo 'define(function(require, exports, module) {' | cat - ccs_grammar.js > temp && mv temp ccs_grammar.js
echo 'module.exports.CCSParser = CCSParser; });' >> ccs_grammar.js
mv ccs_grammar.js modules/ace/lib/ace/mode/ccs/

# Build the ACE editor.
#echo 'ACE EDITOR OUTPUT:'
echo "Building Ace"
node modules/ace/Makefile.ccs.js --target lib/ace

#build typescript files
echo "Building $MAIN_DEST" 
tsc --sourcemap --out "$MAIN_DEST" "$MAIN_SRC"

# If tsc gives errors we don't need bash to tell us something was wrong.
true

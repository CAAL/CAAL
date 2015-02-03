#!/bin/bash

MAIN_SRC="./src/main.ts"
MAIN_DEST="./lib/main.js"

CCS_DEST="./lib/ccs.js"

# generate the parser
echo "Building CCS Parser"
./node_modules/.bin/pegjs --cache -e CCSParser src/ccs/ccs_grammar.pegjs lib/ccs_grammar.js

echo "Building HML Parser"
./node_modules/.bin/pegjs --cache -e HMLParser src/ccs/hml_grammar.pegjs lib/hml_grammar.js

echo "Integrating Parser into Ace Module"
mkdir -p modules/ace/lib/ace/mode/ccs

# manually create requirejs files for the ccs data structure and the ccs parser
echo "Compiling CCS subset"
echo "For ace linter and verifier"
tsc -d --out "$CCS_DEST" ./src/ccs/ccs.ts ./src/ccs/depgraph.ts ./src/ccs/hml.ts ./src/ccs/reducedparsetree.ts ./src/ccs/unguarded_recursion.ts ./src/ccs/util.ts

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

#build workers
echo "Compiling Workers"
./node_modules/.bin/tsc src/workers/*.ts --outDir lib/workers

#build typescript files
echo "Building $MAIN_DEST" 
./node_modules/.bin/tsc -d --sourcemap --out "$MAIN_DEST" "$MAIN_SRC"

# If tsc gives errors we don't need bash to tell us something was wrong.
true

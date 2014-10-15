#!/bin/bash

#build typescript files
find src/ccs/*.ts -type f | xargs tsc -out lib/ccs.js
tsc --out ./src/main.js ./src/main.ts

# generate the parser
pegjs --cache -e CCSParser src/ccs/ccs_grammar.pegjs lib/ccs_grammar.js

mkdir -p modules/ace/lib/ace/mode/ccs

# manually create requirejs files for the ccs data structure and the ccs parser
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
#node modules/ace/Makefile.ccs.js --target lib/ace

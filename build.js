var path = require('path');
var child_process = require('child_process');
var fs = require('fs');

var _P = path.normalize;

// Binaries
TSC = _P('./node_modules/.bin/tsc');
PEGJS = _P('./node_modules/.bin/pegjs');

//----------------------------------

// grammars
var ccsGrammar = _P('lib/ccs_grammar.js');
pegjs(ccsGrammar, _P('src/ccs/ccs_grammar.pegjs'), 'CCSParser');

var hmlGrammar = _P('lib/hml_grammar.js');
pegjs(hmlGrammar, _P('src/ccs/hml_grammar.pegjs'), 'HMLParser');

// ccs.js
var ccsTargetFile = _P('lib/ccs.js');
var ccsSourceFiles = new jake.FileList();
ccsSourceFiles.include('src/ccs/*.ts');
ccsSourceFiles = ccsSourceFiles.toArray();
createTscFileTask(ccsTargetFile, ccsSourceFiles, {definitionFile: true}, 'Compile ' + ccsTargetFile);

// verifier worker
var workerVerifier = _P('lib/workers/verifier.js');
createTscFileTask(workerVerifier, [_P('src/workers/verifier.ts')]);

// build ace
task('ace-integration', [ccsTargetFile, ccsGrammar, hmlGrammar], function () {
    jake.mkdirP('modules/ace/lib/ace/mode/ccs');
    var moduleHeader = 'define(function(require, exports, module) {\n';
        toWrap = [
            {source: ccsTargetFile, target: _P('modules/ace/lib/ace/mode/ccs/ccs.js'), footer: '\nmodule.exports.CCS = CCS; module.exports.HML = HML; });'},
            {source: ccsGrammar, target: _P('modules/ace/lib/ace/mode/ccs/ccs_grammar.js'), footer: '\nmodule.exports.CCSParser = CCSParser; });'},
            {source: hmlGrammar, target: _P('modules/ace/lib/ace/mode/ccs/hml_grammar.js'), footer: '\nmodule.exports.HMLParser = HMLParser; });'}
        ];
    toWrap.forEach(function (data) {
        fs.writeFileSync(data.target, moduleHeader);
        fs.appendFileSync(data.target, fs.readFileSync(data.source));
        fs.appendFileSync(data.target, data.footer);
    });
});

task('ace', ['ace-integration'], {async: true}, function () {
    jake.exec('node modules/ace/Makefile.ccs.js --target lib/ace', {printStderr: true}, function () { complete(); });
});

// main.js
var mainTargetFile = _P('lib/main.js');
var mainSourceFiles = ['src/main.ts'].map(_P);
createTscFileTask(mainTargetFile, mainSourceFiles, {definitionFile: true, sourceMap: true}, 'Compile Main', addVersion);

task('grammars', [ccsGrammar, hmlGrammar]);

task('all', ['ace', 'grammars', ccsTargetFile, workerVerifier, mainTargetFile], function() {
    console.log('Done Building');
});

task('default', ['all']);

//----------------------------------

function createTscFileTask(targetFile, sourceFiles, options, comment, onFinish) {
    options = options || {};
    onFinish = onFinish || function(callback) { callback(); };
    if (comment) {
        desc(comment);
    }
    file(targetFile, sourceFiles, {async: true}, function () {
        var command = TSC;
        if (options.definitionFile) command += ' -d';
        if (options.sourceMap) command += ' --sourcemap';
        command += ' --out ' + targetFile + ' ' + sourceFiles.join(' ');
        jake.exec(command, {printStdout: true}, function () { onFinish(complete); });
    });
}

function pegjs(targetFile, sourceFile, variable) {
    file(targetFile, [sourceFile], {async: true}, function() {
        var command = [PEGJS, '--cache', '-e', variable, sourceFile, targetFile].join(' ');
        jake.exec(command, {printStdout: true}, function () { complete(); });
    });
}

function addVersion(callback) {
    child_process.execFile('git', ['describe', '--tags', '--long'], function (error, stdout, stderr) {
        if (error) throw error;
        //remove newlines
        var tag = stdout.replace(/(\r\n|\n|\r)/gm,"");
        if (tag.length < 3) throw "Bad tag: " + tag;
        fs.appendFileSync(mainTargetFile, '\nvar Version = "' + tag + '";');
        callback();
    });
}
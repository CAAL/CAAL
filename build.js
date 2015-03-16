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
pegjs(hmlGrammar, _P('src/ccs/hml_grammar.pegjs'), 'HMLParser', ["--allowed-start-rules", "start,TopFormula"]);

// util.js
var utilTargetFile = _P('lib/util.js');
var utilSourceFiles = getFilesMatchingGlob('src/util/*.ts');
createTscFileTask(utilTargetFile, utilSourceFiles, {definitionFile: true}, 'Compile ' + utilTargetFile);

// data.js
var dataTargetFile = _P('lib/data.js');
var dataSourceFiles = getFilesMatchingGlob('src/data/*.ts');
createTscFileTask(dataTargetFile, dataSourceFiles, {definitionFile: true}, 'Compile ' + dataTargetFile);

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
            {source: dataTargetFile, header: moduleHeader, target: _P('modules/ace/lib/ace/mode/ccs/data.js'), footer: '\nmodule.exports.MapUtil = MapUtil;\nmodule.exports.SetUtil = SetUtil; });'},
            {source: utilTargetFile, header: moduleHeader, target: _P('modules/ace/lib/ace/mode/ccs/util.js'), footer: '\nmodule.exports.ArrayUtil = ArrayUtil; });'},
            {source: ccsTargetFile, header: moduleHeader + 'var ArrayUtil = require("./util").ArrayUtil;\n', target: _P('modules/ace/lib/ace/mode/ccs/ccs.js'), footer: '\nmodule.exports.CCS = CCS; module.exports.HML = HML; });'},
            {source: ccsGrammar, header: moduleHeader, target: _P('modules/ace/lib/ace/mode/ccs/ccs_grammar.js'), footer: '\nmodule.exports.CCSParser = CCSParser; });'},
            {source: hmlGrammar, header: moduleHeader, target: _P('modules/ace/lib/ace/mode/ccs/hml_grammar.js'), footer: '\nmodule.exports.HMLParser = HMLParser; });'}
        ];
    toWrap.forEach(function (data) {
        fs.writeFileSync(data.target, data.header);
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

task('all', [dataTargetFile, utilTargetFile, 'grammars', ccsTargetFile, 'ace', workerVerifier, mainTargetFile], function() {
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
    //TSC compiles even with errors. Means running build again hides errors since input files not changed and target file exists
    //Thus use task() for now.
    //file(targetFile ....)
    task(targetFile, sourceFiles, {async: true}, function () {
        var command = TSC;
        if (options.definitionFile) command += ' -d';
        if (options.sourceMap) command += ' --sourcemap';
        command += ' --out ' + targetFile + ' ' + sourceFiles.join(' ');
        jake.exec(command, {printStdout: true}, function () { onFinish(complete); });
    });
}

function pegjs(targetFile, sourceFile, variable, extraOptions) {
    extraOptions = extraOptions || [];
    file(targetFile, [sourceFile], {async: true}, function() {
        var command = [PEGJS, '--cache', '-e', variable].concat(extraOptions).concat([sourceFile, targetFile]).join(' ');
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

function getFilesMatchingGlob(glob) {
    var list = new jake.FileList();
    list.include(glob);
    return list.map(_P);
}
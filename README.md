[![Stories in Ready](https://badge.waffle.io/caal/caal.svg?label=ready&title=Ready)](http://waffle.io/caal/caal)
# CAAL

CAAL (Concurrency Workbench, Aalborg Edition) is a web-based tool for modelling, visualization and verification of concurrent processes expressed in the well-known CCS language (Calculus of Communicating Systems).

The tool allows to edit CCS processes, explore the generated labelled transition systems and verify their correctness via the equivalence checking approach (e.g. strong and weak bisimulation, and strong and weak trace equivalence checking) and model checking approach (determining whether a given process satisfies a HML formulae with recursion, including a generation of distinguishing formulae). Both equivalence and model checking approaches support a visualization of counter examples via equivalence/model checking games.

#### Try it!

A live demo of CAAL is available at [caal.cs.aau.dk](http://caal.cs.aau.dk/)

#### Offline version

Download and unzip the latest [release](http://caal.cs.aau.dk/caal-local.zip) for offline use. Extract the package and run the scripts; there is a script for Windows, MacOs, and Linux. For more information read the README bundled with the package.

## For developers

####Setup

All you need is to have installed is [Node.js](http://nodejs.org/), npm, and Python (for building ace).
Clone this repository and run the following commands in the root directory of the repository:
```bash
npm install
git submodule init
git submodule update
cd modules/ace
npm install
```

#### Building

To build CAAL, run the following command in the root directory.

```bash
npm run build
```
This will run the ``` build.sh ``` script, which will compile all of the Typescript files, and compile any potential changes in the Ace submodule.


To compile the project, run all unit tests, and zip all necessary files to run CAAL:
```bash
npm run release
```
The release will be zipped to ```release.tar.gz```. ([caal.cs.aau.dk](http://caal.cs.aau.dk/) is running the latest release.)

Another option (not recommended) is to compile the release without running tests:
```bash
npm run release-notest
```

#### Troubleshooting

You might see the following JavaScript errors in the browser console upon running the tool.
```
ace.js:14346 Uncaught SyntaxError: Unexpected token ILLEGAL
editor.ts:19 Uncaught ReferenceError: ace is not defined
```
The problem is that some line endings characters are causing issues. One possible method to fix this is to run the following commands.

1. Delete the directory ``` modules/ace ```.
2. Run ```git config --global core.autocrlf input```.
3. Run the above setup again.

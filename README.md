[![Stories in Ready](https://badge.waffle.io/caal/caal.svg?label=ready&title=Ready)](http://waffle.io/caal/caal)
# CAAL

CAAL (Concurrency Workbench, Aalborg Edition) is a web-based tool for modelling, visualization and verification of concurrent processes expressed in the well-known CCS language (Calculus of Communicating Systems).

The tool allows to edit CCS processes, explore the generated labelled transition systems and verify their correctness via the equivalence checking approach (e.g. strong and weak bisimulation, and strong and weak trace equivalence checking) and model checking approach (determining whether a given process satisfies a HML formulae with recursion, including a generation of distinguishing formulae). Both equivalence and model checking approaches support a visualization of counter examples via equivalence/model checking games.

#### Try it!

A live demo of CAAL is available at [caal.cs.aau.dk](http://caal.cs.aau.dk/)

#### Offline version

- Download and install [Node.js](http://nodejs.org/).
- Download and unzip the latest [release](https://github.com/CAAL/CAAL/releases).
- Open a shell and run ```node server``` in the root directory.
- Open a web browser and navigate to ```http://localhost:8090```.

## For developers

####Setup

All you need is [Node.js](http://nodejs.org/) and npm installed.
Clone this repository and run the following commands in the root directory of the repository:
```bash
npm install
git submodule init
git submodule update
cd modules/ace
npm install
```

#### Building

```bash
npm run build
```
This will run the ``` build.sh ``` script, which will compile all of the Typescript files, and compile any potential changes in the Ace submodule.

#### Troubleshooting

If you experience errors with the Ace editor upon running the tool, such as
```
ace.js:14346 Uncaught SyntaxError: Unexpected token ILLEGAL
editor.ts:19 Uncaught ReferenceError: ace is not defined
```
1. Delete the directory ``` modules/ace ```.
2. Run ```git config --global core.autocrlf input```.
3. Run the above setup again.

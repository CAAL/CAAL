[![Stories in Ready](https://badge.waffle.io/figa12/CCS-tool.png?label=ready&title=Ready)](https://waffle.io/figa12/CCS-tool)
CCS-tool
========
A web-based tool for modelling and verification of concurrent systems. Concurrent systems are modelled using the CCS language. Supports verification of μ-calculus formulas and other properties such as bisimilarity and deadlock. 

Try it!
-----------
A live demo of CCS-tool is available at [figz.dk/ccstool](http://figz.dk/ccstool)

Setup
-----------
All you need is [Node.js](http://nodejs.org/) and npm installed.
Clone this repository and run the following commands in the root directory of the repository:
```bash
npm install
git submodule init
git submodule update
cd modules/ace
npm install
```

Building
-----------
```bash
npm run build
```
This will run the ``` build.sh ``` script, which will compile all of the Typescript files, and compile any potential changes in the Ace submodule.

[![Stories in Ready](https://badge.waffle.io/caal/caal.svg?label=ready&title=Ready)](http://waffle.io/caal/caal)
CAAL
========
A web-based tool for modelling and verification of concurrent systems. Concurrent systems are modelled using the CCS language. Supports verification of properties such as bisimilarity.

Try it!
-----------
A live demo of CAAL is available at [caal.cs.aau.dk](http://caal.cs.aau.dk/)

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

Troubleshooting
-----------
If you experience errors with the Ace editor upon running the tool, such as
```
ace.js:14346 Uncaught SyntaxError: Unexpected token ILLEGAL
editor.ts:19 Uncaught ReferenceError: ace is not defined
```
1. Delete the directory ``` modules/ace ```.
2. Run ```git config --global core.autocrlf input```.
3. Run the above setup again.

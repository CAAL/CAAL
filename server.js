var connect = require('connect');
var serveStatic = require('serve-static');
var port = 8090;
connect().use(serveStatic(__dirname)).listen(port);
console.log("http://localhost:"+port);
// server related tasks

// dependencies
const http = require("http");
const https = require("https");
const url = require("url");
const Stringdecoder = require("string_decoder").StringDecoder;
const config = require("./config");
const fs = require("fs");
const handlers = require('./handlers')
const helpers = require('./helpers')
const path = require('path')
const util = require('util')
const debug = util.debuglog('server')
// instantiate server module object
const server = {}

// instantiate HTTP server
server.httpServer = http.createServer(function (req, res) {
    server.unifiedServer(req, res);
});

// instantiate HTTPS server
server.httpsServerOptions = {
    key: fs.readFileSync(path.join(__dirname, "/../https/key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "/../https/cert.pem")),
}

server.httpsServer = https.createServer(server.httpsServerOptions, function (req, res) {
    server.unifiedServer(req, res);
});



// all the srever logic for http/(s)
server.unifiedServer = function (req, res) {
    // get url and parse it
    const parsedURL = url.parse(req.url, true);

    // get path from url
    const path = parsedURL.pathname;
    const trimedPath = path.replace(/^\/+|\/+$/g, "");

    // get query string as an object
    const queryStringObject = parsedURL.query;

    // get http method
    const method = req.method.toLowerCase();

    // get the headers as an object
    const headers = req.headers;

    // get the payload, if any
    const decoder = new Stringdecoder("utf-8");
    let buffer = "";
    req.on("data", function (data) {
        buffer += decoder.write(data);
    });

    req.on("end", function () {
        buffer += decoder.end();

        // choose handler request should go to.  If one is not found, use the notFound handler
        const chosenHandler =
            typeof server.router[trimedPath] !== "undefined"
                ? server.router[trimedPath]
                : handlers.notFound;

        // construct data object to send to the handler
        const data = {
            trimedPath: trimedPath,
            queryStringObject: queryStringObject,
            method: method,
            headers: headers,
            payload: helpers.parseJsonToObject(buffer),
        };

        // route request to the handler specified in the router
        chosenHandler(data, function (statusCode, payload) {
            // use the status code called back by the handler, or default to 200
            statusCode = typeof statusCode == "number" ? statusCode : 200;

            // use the payload called back by the handler, or default to an empty object
            payload = typeof payload == "object" ? payload : {};

            // convert the payload to a string
            const payloadString = JSON.stringify(payload);

            // return the response
            res.setHeader("Content-Type", "application/json");
            res.writeHead(statusCode);
            res.end(payloadString);

            // if response is 200, print green otherwise print yellow
            if (statusCode === 200) {
                debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + ' /' + trimedPath + ' ' + statusCode)
            } else {
                debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + ' /' + trimedPath + ' ' + statusCode)
            }
        });
    });
};

// Define a request router
server.router = {
    ping: handlers.ping,
    users: handlers.users,
    checks: handlers.checks,
    tokens: handlers.tokens
};

// init script
server.init = function () {
    //  start HTTP server
    server.httpServer.listen(config.httpPort, function () {
        console.log('\x1b[36m%s\x1b[0m', "server is listening on port " + config.httpPort)
    });

    // start the https server 
    server.httpsServer.listen(config.httpsPort, function () {
        console.log('\x1b[35m%s\x1b[0m', "server is listening on port " + config.httpsPort)
    });
}

// export
module.exports = server
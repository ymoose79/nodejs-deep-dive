// primary file for the API

// dependencies
const http = require("http");
const https = require("https");
const url = require("url");
const Stringdecoder = require("string_decoder").StringDecoder;
const config = require("./config");
const fs = require("fs");

// tinstantiate HTTP server
const httpServer = http.createServer(function (req, res) {
  unifiedServer(req, res);
});

// instantiate HTTPS server
const httpsServerOptions = {
  key: fs.readFileSync("./https/key.pem"),
  cert: fs.readFileSync("./https/cert.pem"),
};
const httpsServer = https.createServer(httpsServerOptions, function (req, res) {
  unifiedServer(req, res);
});

// start the http server
httpServer.listen(config.httpPort, function () {
  console.log("server is listening on port " + config.httpPort);
});

// start the http server
httpsServer.listen(config.httpsPort, function () {
  console.log("server is listening on port " + config.httpsPort);
});

// all the srever logic for http/(s)
const unifiedServer = function (req, res) {
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
      typeof router[trimedPath] !== "undefined"
        ? router[trimedPath]
        : handlers.notFound;

    // construct data object to send to the handler
    const data = {
      trimedPath: trimedPath,
      queryStringObject: queryStringObject,
      method: method,
      headers: headers,
      payload: buffer,
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

      console.log("returning res:", statusCode, payloadString);
    });
  });
};

// Define handlers
const handlers = {};

// sample handlers
handlers.ping = function (data, callback) {
  callback(200);
};

// not found handler
handlers.notFound = function (data, callback) {
  callback(404);
};

// Define a request router
const router = {
  ping: handlers.ping,
};

// primary file for the API

// dependencies
const http = require("http");
const url = require("url");
const Stringdecoder = require("string_decoder").StringDecoder;

// the server should respond to all requests with a string
const server = http.createServer(function (req, res) {

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
    res.end("hello");
    console.log(buffer)
  });
});

// start the server, have it listen on port 3000
server.listen(3000, function () {
  console.log("server is listening on port 3000");
});

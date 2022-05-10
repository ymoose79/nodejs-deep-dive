// primary file for the API

// Dependencies

const server = require('./lib/server')
const workers = require('./lib/workers')

// Declare the app
const app = {

}

// init
app.init = function () {
  server.init()

  // start workers
  // workers.init
}

// execute
app.init();

// export
module.exports = app
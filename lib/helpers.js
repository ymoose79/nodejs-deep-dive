/**
 * helpers for various tasks
 */

// Dependencies
const crypto = require('crypto')
const config = require('./config')

// container for all the helpers
const helpers = {}

// careate a sha256 hash
helpers.hash = function (str) {
    if (typeof (str) == 'string' && str.length > 0) {
        const hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex')
        return hash;
    } else {
        return false
    }
}

// parse JSON string to an object in all cases without throwing
helpers.parseJsonToObject = function (str) {
    try {
        const obj = JSON.parse(str)
        return obj;
    } catch (e) {
        return {}
    }
}
// export the module
module.exports = helpers
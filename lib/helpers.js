/**
 * helpers for various tasks
 */

// Dependencies
const crypto = require('crypto')
const config = require('./config')
const https = require('https')
const querystring = require('querystring')

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

// create strting of random characters of a given lenght
helpers.createRandomString = function (strLength) {
    // define all characters that work for the string
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz1234567890';
    let str = '';
    for (i = 1; i <= strLength; i++) {
        let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
        str += randomCharacter
    }
    return str;
};

helpers.sendTwilioSms = function (phone, msg, callback) {
    // validate parameters
    phone = typeof (phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false
    msg = typeof (msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false
    if (phone && msg) {
        // configure req payload
        let payload = {
            "From": config.twilio.fromPhone,
            "To": '+1' + phone,
            "Body": msg
        }
        const stringPayload = querystring.stringify(payload)

        // config req details
        const requestDetails = {
            "protocol": "https:",
            "hostname": "api.twilio.com",
            "method": "POST",
            "path": "/2010-04-01/Accounts/" + config.twilio.accountSid + "/Messages.json",
            "auth": config.twilio.accountSid + ":" + config.twilio.authToken,
            "headers": {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(stringPayload)
            }
        }

        // instantiate req object
        const req = https.request(requestDetails, function (res) {
            // grab status of sent req
            const status = res.statusCode
            // callback success
            if (status == 200 || status == 201) {
                callback(false)
            } else {
                callback('status code returned was ' + status)
            }
        })

        // Bind to error event so it doesn't get thrown
        req.on('error', function (e) {
            callback(e)
        })
        // add payload
        req.write(stringPayload)
        // end req
        req.end()

    } else {
        callback('given parameters were missing/invalid')
    }
}
// export the module
module.exports = helpers
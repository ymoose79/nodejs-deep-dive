// worker related tasks

// dependencies
const path = require('path');
const fs = require('fs');
const _data = require('./data')
const https = require('https')
const http = require('http')
const helpers = require('./helpers')
const url = require('url')
const _logs = require('./logs')
// instantiate worker object

const workers = {}

// lookup all checks get then send data to a validator
workers.gatherAllChecks = function () {
    // get all checks
    _data.list('checks', function (err, checks) {
        if (!err && checks && checks.length > 0) {
            checks.forEach(function (check) {
                // read check data
                _data.read('checks', check, function (err, originalCheckData) {
                    if (!err && originalCheckData) {
                        // pass data to check validator and let that function continue or log err
                        workers.validateCheckData(originalCheckData)
                    } else {
                        console.log('err reading one of the checks data')
                    }
                })
            })
        } else {
            console.log('error:  could not find any checks to process')
        }
    })
}

// sanity-check the check-data
workers.validateCheckData = function (originalCheckData) {

    let { id, userPhone, protocol, url, method, successCodes, timeoutSeconds } = originalCheckData

    originalCheckData = typeof (originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {}
    id = typeof (id) == 'string' && id.trim().length == 20 ? id.trim() : false;
    userPhone = typeof (userPhone) == 'string' && userPhone.trim().length == 10 ? userPhone.trim() : false;
    protocol = typeof (protocol) == 'string' && ['http', 'https'].indexOf(protocol) ? protocol : false;
    url = typeof (url) == 'string' && url.trim().length > 0 ? url.trim() : false;
    method = typeof (method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(method) ? method : false;
    successCodes = typeof (successCodes) == 'object' && successCodes instanceof Array && successCodes.length > 0 ? successCodes : false;
    timeoutSeconds = typeof (timeoutSeconds) == 'number' && timeoutSeconds % 1 === 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds : false;

    // set keys that may not be set if the workers have never seen this check
    originalCheckData.state = typeof (originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof (originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    // if all checks pass, data moves to next step
    if (id &&
        userPhone &&
        protocol &&
        method &&
        url &&
        method &&
        successCodes &&
        timeoutSeconds) {
        workers.performCheck(originalCheckData)
    } else {
        console.log('err: one of the checks is not properly formated')
    }
}

// perform check/ send originalCheckData 

workers.performCheck = function (originalCheckData) {
    // prepare initial check outcome
    const checkOutcome = {
        'error': false,
        'responseCode': false
    }
    // mark that the outcome has not been sent
    let outcomeSend = false;

    // parse hostname and path out of original check data
    const parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true)
    const hostName = parsedUrl.hostname
    const path = parsedUrl.path // using path and not "pathname" because we want the query string

    // construct the request
    const requestDetails = {
        'protocol': originalCheckData.protocol + ':',
        'hostname': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000
    }

    // instantiate req object using http(s) module
    const _moduleToUse = originalCheckData.protocol == 'http' ? http : https;

    const req = _moduleToUse.request(requestDetails, function (res) {
        // grab status of sent request 
        const status = res.statusCode;

        // update check outcome and pass data along
        checkOutcome.responseCode = status;
        if (!outcomeSend) {
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSend = true;
        }
    })

    // bind to the error event so it doesn't get thrown
    req.on('error', function (e) {
        // update the checkoutsome and pass data along
        checkOutcome.error = {
            'error': true,
            'value': e
        }
        if (!outcomeSend) {
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSend = true
        }
    })

    // bind to the timeout event
    req.on('timeout', function (e) {
        // update the checkoutsome and pass data along
        checkOutcome.error = {
            'error': true,
            'value': 'timeout'
        }
        if (!outcomeSend) {
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSend = true
        }
    })

    // end request
    req.end();
}

// process checkoutcome and update check data then trigger alert if needed
// special logic for accomdating a check that hasn't been tested (no alert)
workers.processCheckOutcome = function (originalCheckData, checkOutcome) {
    //  decide if the check is up or down in current state
    const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down'

    // decide if alert is warranted
    const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false

    // log outcome
    const timeOfCheck = Date.now()

    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck)


    // update check data
    const newCheckData = originalCheckData
    newCheckData.state = state
    newCheckData.lastChecked = timeOfCheck;

    // save updates 
    _data.update('checks', newCheckData.id, newCheckData, function (err) {
        if (!err) {
            // send new check data to next phase in the process
            if (alertWarranted) {
                workers.alertUserToStatusChange(newCheckData)
            } else {
                console.log('check outcome has not changed, no alert needed')
            }
        } else {
            console.log('error trying to save updates to one of the checks')
        }
    })
}

workers.alertUserToStatusChange = function (newCheckData) {
    const msg = 'alert: your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state
    helpers.sendTwilioSms(newCheckData.userPhone, msg, function (err) {
        if (!err) {
            console.log('success :', msg)
        } else {
            console.log('err:  could not send alert to user who had a state change in their check')
        }
    })
}


workers.log = function (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) {
    // form log data
    let logData = {
        'check': originalCheckData,
        'outcome': checkOutcome,
        'state': state,
        'alert': alertWarranted,
        'time': timeOfCheck
    };

    // convert to string
    const logString = JSON.stringify(logData)

    // determine name of log file
    const logFileName = originalCheckData.id
    // Append log string to file
    _logs.append(logFileName, logString, function (err) {
        if (!err) {
            console.log('file logged success')
        } else {
            console.log('log to file failed')
        }
    })
}


// timer to execute worker process once per minute
workers.loop = function () {
    setInterval(function () {
        workers.gatherAllChecks()
    }, 1000 * 60)
}

// roatate (aka compress)log files
workers.rotateLogs = function () {
    // list all non-compressed files
    _logs.list(false, function (err, logs) {
        if (!err && logs && logs.length > 0) {
            logs.forEach(function (logName) {
                // compress data to different file
                const logId = logName.replace('.log', '')
                const newFileId = logId + '-' + Date.now()
                _logs.compress(logId, newFileId, function (err) {
                    if (!err) {
                        // truncate the log
                        _logs.truncate(logId, function (err) {
                            if (!err) {
                                console.log('success truncating log file')
                            } else {
                                console.log('error truncating')
                            }
                        })
                    } else {
                        console.log('err compressing one of the log files', err)
                    }
                })
            })
        } else {
            console.log('err:  coould not find any logs')
        }

    })
}

// timer to execute the log-rotation process once per day
workers.logRotationLoop = function () {
    setInterval(function () {
        workers.rotateLogs()
    }, 1000 * 60 * 60 * 24)
}

workers.init = function () {
    // execute all the checks
    workers.gatherAllChecks()

    // loop checks to execute later
    workers.loop()

    // compress all logs immediately
    workers.rotateLogs();

    // call compression loop so logs will be compressed later on
    workers.logRotationLoop();
}

workers.init()




module.exports = workers
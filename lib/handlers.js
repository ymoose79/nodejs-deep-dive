/*
    Request handlers
*/

// Dependencies
const _data = require('./data')
const helpers = require('./helpers')
const config = require('./config')
// 
// Define handlers
const handlers = {};

// Users
handlers.users = function (data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback)
    } else {
        callback(405)
    }
}

// container for the users submethods
handlers._users = {};

// Users - Post
// required data: 1st name, last name, phone, password, tosAgreement
// optional data: none
handlers._users.post = function (data, callback) {
    // Check that all required fields are filled out
    const firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
    const lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
    const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false
    const tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false

    if (firstName && lastName && phone && password && tosAgreement) {
        // Make sure that the user doesn't already exist
        _data.read('users', phone, function (err, data) {
            if (err) {
                const hashedPassword = helpers.hash(password);

                if (hashedPassword) {

                    const userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': true,
                    }

                    _data.create('users', phone, userObject, function (err) {
                        if (!err) {
                            callback(200)
                        } else {
                            callback(500, { 'error': 'could not create new user' })
                        }
                    })
                } else {
                    callback(500, {
                        'error': 'could not hash the user password'
                    })
                }

            } else {
                callback(400, { 'error': 'a user with taht number already exists' })
            }
        })
    } else {
        callback(400, { 'error': 'missing required fields', "firstName": firstName })
    }
}
// Users - Get
// required data: phone
// optional: none
handlers._users.get = function (data, callback) {
    // check valid phone number
    const phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false

    if (phone) {
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (tokenIsValid) {
                _data.read('users', phone, function (err, data) {
                    if (!err && data) {
                        // remove hash passwrd from user object before returning it to the requester
                        delete data.hashedPassword;
                        callback(200, data)
                    } else {
                        callback(404)
                    }
                })
            } else {
                callback(403, { 'err': 'missing required token in header or invalid' })
            }
        })
    } else {
        callback(400, { 'err': 'missing required field' })
    }
}

// Users - Put
handlers._users.put = function (data, callback) {
    const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false

    const firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
    const lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
    const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false

    if (phone) {
        if (firstName || lastName || password) {

            const token = typeof (data.headers.token) == 'string' ? data.headers.token : false
            handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
                if (tokenIsValid) {
                    _data.read('users', phone, function (err, userData) {
                        if (!err && userData) {
                            if (firstName) {
                                userData.firstName = firstName
                            }
                            if (lastName) {
                                userData.lastName = lastName
                            }
                            if (password) {
                                userData.hashedPassword = helpers.hash(password)
                            }
                            // store new updates
                            _data.update('users', phone, userData, function (err) {
                                if (!err) {
                                    callback(200)
                                } else {
                                    console.log(err)
                                    callback(500, { 'err': 'couldn not update the user' })
                                }
                            })
                        } else {
                            callback(400, { 'error': 'missing fields to pudate' })
                        }
                    })
                } else {
                    callback(403, { 'err': 'missing required token or is invalid' })
                }
            });
        } else {
            callback(400, { 'err': 'missing fileds to update' })
        }
    } else {
        callback(400, { 'err': 'missing required field' })
    }
}


// Users - delete
handlers._users.delete = function (data, callback) {
    const phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false

    if (phone) {
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (tokenIsValid) {
                _data.read('users', phone, function (e, userData) {
                    if (!e && userData) {
                        _data.delete('users', phone, function (e) {
                            if (!e) {
                                // delete each check associated with user
                                const userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
                                const checksToDelete = userChecks.length
                                if (checksToDelete > 0) {
                                    let checksDeleted = 0
                                    let deletionErrors = false
                                    // loop through checks
                                    userChecks.forEach(function (checkId) {
                                        // Delete check
                                        _data.delete('checks', checkId, function (err) {
                                            if (err) {
                                                deletionErrors = true
                                            }
                                            checksDeleted++
                                            if (checksDeleted == checksToDelete) {
                                                if (!deletionErrors) {
                                                    callback(200)
                                                } else {
                                                    callback(500, { 'err': 'err encountered while trying to delete users checks' })
                                                }
                                            }
                                        })
                                    });
                                } else {
                                    callback(200)
                                }
                            } else {
                                console.log(e)
                                callback(500, 'we couldn not delete user')
                            }
                        })
                    } else {
                        callback(400, { 'error': 'could not find user' })
                    }
                })
            } else {
                callback(403, { 'error': 'missing required token in header or invalid' })
            }
        })
    } else {
        callback(400, { 'error': 'missing required field' })
    }
};

// tokens
handlers.tokens = function (data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback)
    } else {
        callback(405)
    }
}



// Container for all the tokens meehtods
handlers._tokens = {}

// POST
// required : phone & password
handlers._tokens.post = function (data, callback) {
    const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false


    if (phone && password) {
        // lookup matching user
        _data.read('users', phone, function (err, userData) {
            if (!err && userData) {
                // HASH sent password and compare to password stored in user object
                const hashPassword = helpers.hash(password)
                if (hashPassword == userData.hashedPassword) {
                    // if valid, create a new token with random name that expires in an hour
                    let tokenId = helpers.createRandomString(20);
                    let expires = Date.now() + 1000 * 60 * 60 * 24;
                    const tokenObject = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': expires
                    };

                    // store the token
                    _data.create('tokens', tokenId, tokenObject, function (err) {
                        if (!err) {
                            callback(200, tokenObject)
                        } else {
                            callback(500, { 'error': 'could not create new token' })
                        }
                    })
                } else {
                    callback(400, { 'error: ': 'password did not match stored password' })
                }
            } else {
                callback(400, { 'error': 'could not find specified user' })
            }
        })

    } else {
        callback(400, { 'error': 'missing required fields' })
    }
}

handlers._tokens.get = function (data, callback) {
    // check that id is valid
    // check valid phone number
    const id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false
    if (id) {
        _data.read('tokens', id, function (err, tokenData) {
            if (!err && tokenData) {
                callback(200, tokenData)
            } else {
                callback(404)
            }
        })
    } else {
        callback(400, { 'err': 'missing required field' })
    }
}

// extend  true adds an hour to token
handlers._tokens.put = function (data, callback) {
    const id = data.payload.id.trim().length == 20 && typeof data.payload.id == 'string' ? data.payload.id.trim() : false
    const extend = data.payload.extend == true ? data.payload.extend : false
    if (id && extend) {
        if (data) {
            _data.read('tokens', id, function (err, tokenData) {
                if (!err && tokenData) {
                    if (tokenData.expires > Date.now()) {
                        tokenData.expires = Date.now() + 1000 * 60 * 60

                        _data.update('tokens', id, tokenData, function (err) {
                            if (!err) {
                                callback(200)
                            } else {
                                callback(500, { 'error': 'could not update token' })
                            }
                        })
                    } else {
                        callback(400, { 'error': 'the token has expired' })
                    }
                } else {
                    callback(400, { 'error': 'no such token' })
                }
            })
        } else {
            callback(400, { 'error': 'missing data' })
        }
    }
}

handlers._tokens.delete = function (data, callback) {
    const id = data.payload.id.trim().length == 20 && typeof data.payload.id == 'string' ? data.payload.id : false

    if (id) {
        _data.read('tokens', id, function (err, tokenData) {
            if (!err && tokenData) {
                _data.delete('tokens', id, function (err) {
                    if (!err) {
                        callback(200)
                    } else {
                        callback(500, 'something wrong with the server')
                    }
                })
            } else {
                callback(400, { 'error': 'something about a token' })
            }
        })

    } else {
        callback(400, { 'error': 'invalid id' })
    }
}
handlers._tokens.verifyToken = function (id, phone, callback) {
    _data.read('tokens', id, function (err, tokenData) {
        if (!err && tokenData) {
            if (tokenData.phone == phone && tokenData.expires > Date.now()) {
                callback(true)
            } else {
                callback(false)
            }
        } else {
            callback(false)
        }
    })
}

// // sample handlers
// handlers.ping = function (data, callback) {
//     callback(200, { "abc": "123" });
// };


handlers.checks = function (data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data, callback)
    } else {
        callback(405)
    }
}

handlers._checks = {}

// POST
// required data: protocol(http(s)), url, method, successCodes, timeoutSeconds

handlers._checks.post = function (data, callback) {
    // validate inputs
    const protocol = typeof (data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false
    const url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false
    const method = typeof (data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
    const successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
    const timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false

    if (protocol && url && method && successCodes && timeoutSeconds) {
        // get token from headers
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

        // look up user by reading token
        _data.read('tokens', token, function (err, tokenData) {
            if (!err && tokenData) {
                const userPhone = tokenData.phone

                _data.read('users', userPhone, function (err, userData) {
                    if (!err && userData) {

                        const userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []

                        // verify user has less than Max checks allowed
                        if (userChecks.length < config.maxChecks) {
                            // create random ID for check
                            const checkId = helpers.createRandomString(20);

                            // create check obj w/ Users phone
                            const checkObj = {
                                'id': checkId,
                                'userPhone': userPhone,
                                'protocol': protocol,
                                'url': url,
                                'method': method,
                                'successCodes': successCodes,
                                'timeoutSeconds': timeoutSeconds
                            }

                            // save object
                            _data.create('checks', checkId, checkObj, function (err) {
                                if (!err) {
                                    // add check ID to obj
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);

                                    // save the new user data
                                    _data.update('users', userPhone, userData, function (err) {
                                        if (!err) {
                                            // return data about new check to the requester
                                            callback(200, checkObj)
                                        } else {
                                            callback(500, { 'error': 'could not update user with new check' })
                                        }
                                    })
                                } else {
                                    callback(500, { 'err': 'could not create new check' })
                                }
                            })
                        } else {
                            callback(400, { 'error': 'max checks already reached (' + config.maxChecks + ')' })
                        }
                    } else {
                        callback(403)
                    }
                })
            } else {
                callback(403)
            }
        })

    } else {
        callback(400, { 'error': 'missing inputs or are invalid' })
    }
}

// Get Checks
handlers._checks.get = function (data, callback) {


    const id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;


    if (id) {
        // look up the check
        _data.read('checks', id, function (err, checkData) {
            if (!err && checkData) {

                // get token from headers
                const token = typeof (data.headers.token) == 'string' ? data.headers.token : false
                // cerify token is valid
                handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
                    if (tokenIsValid) {
                        // return checkdata
                        callback(200, checkData)
                    } else {
                        callback(403)
                    }
                })
            } else {
                callback(404)
            }
        })
    } else {
        callback(400, { 'err': 'missing required field' })
    }
}

// checks PUT
// required ID
// optional : protocol, url, method, successcodes, timedoutSeconds.  must include 1

handlers._checks.put = function (data, callback) {
    const id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false

    const protocol = typeof (data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false
    const url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false
    const method = typeof (data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
    const successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
    const timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false

    if (id) {
        if (protocol || url || method || successCodes || timeoutSeconds) {
            // lookup check
            _data.read('checks', id, function (err, checkData) {
                if (!err && checkData) {
                    const token = typeof (data.headers.token) == 'string' ? data.headers.token : false
                    handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
                        if (tokenIsValid) {
                            if (protocol) {
                                checkData.protocol = protocol
                            }
                            if (url) {
                                checkData.url = url
                            }
                            if (method) {
                                checkData.method = method
                            }
                            if (successCodes) {
                                checkData.successCodes = successCodes
                            }
                            if (timeoutSeconds) {
                                checkData.timeoutSeconds = timeoutSeconds
                            }
                            _data.update('checks', id, checkData, function (err) {
                                if (!err) {
                                    callback(200)
                                } else {
                                    callback(500, { 'err': 'could not update check' })
                                }
                            })
                        } else {
                            callback(403)
                        }
                    })
                } else {
                    callback(400, { 'error': 'check id does not exist' })
                }
            })
        } else {
            callback(400, { 'err': 'missing fileds to update' })
        }
    } else {
        callback(400, { 'err': 'missing required field' })
    }
}

handlers._checks.delete = function (data, callback) {
    const id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false
    if (id) {
        // look up check
        _data.read('checks', id, function (err, checkData) {


            if (!err && checkData) {
                // get token from headers
                const token = typeof (data.headers.token) == 'string' ? data.headers.token : false
                handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
                    if (tokenIsValid) {
                        // delete checkData
                        _data.delete('checks', id, function (err) {
                            if (!err) {
                                // lookup the user
                                _data.read('users', checkData.userPhone, function (err, userData) {
                                    if (!err && userData) {
                                        const userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                                        // remove the delete check from their list of checks
                                        const checkPosition = userChecks.indexOf(id)
                                        if (checkPosition > -1) {
                                            userChecks.splice(checkPosition, 1)
                                            // resave users data
                                            _data.update('users', checkData.userPhone, userData, function (e) {
                                                if (!e) {
                                                    callback(200)
                                                } else {
                                                    console.log(e)
                                                    callback(500, { 'err': 'could not find or remove check on user object' })
                                                }
                                            })
                                        } else {
                                            callback(500, { 'err': 'could not find or remove check on user object' })
                                        }
                                    } else {
                                        callback(500, { 'err': 'could not delete specified user' })
                                    }
                                })
                            } else {
                                callback(500, { 'err': 'could not find user who created check data' })
                            }
                        })

                    } else {
                        callback(403)
                    }
                })
            } else {
                callback(400, { 'err': 'check id does not exist' })
            }
        })
    } else {
        callback(400, { 'error': 'missing required fields' })
    }
};




// not found handler
handlers.notFound = function (data, callback) {
    callback(404, { "error": "cannot find handler" });
};

// Export the module
module.exports = handlers
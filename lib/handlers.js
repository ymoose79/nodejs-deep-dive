/*
    Request handlers
*/

// Dependencies
const _data = require('./data')
const helpers = require('./helpers')
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
    console.log(data.payload.firstName)
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
                            console.log(err)
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
// TODO only let an authenticated user access their object.  
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
    const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false

    if (phone) {
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (tokenIsValid) {
                _data.read('users', phone, function (e, data) {
                    if (!e && data) {
                        _data.delete('users', phone, function (e) {
                            if (!e) {
                                callback(200)
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
                    let expires = Date.now() + 1000 * 60 * 60;
                    const tokenObject = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': expires
                    };
                    console.log({ tokenObject })

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

// sample handlers
handlers.ping = function (data, callback) {
    callback(200, { "abc": "123" });
};

// not found handler
handlers.notFound = function (data, callback) {
    callback(404, { "error": "cannot find handler" });
};

// Export the module
module.exports = handlers
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
                        'tosAgreement': true
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
        console.log(phone, firstName)
        if (firstName || lastName || password) {
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
                    callback(400, { 'error': 'the specified user doesnt exist' })
                }
            })
        } else {
            callback(400, { 'error': 'missing fields to pudate' })
        }
    } else {
        callback(400, { 'error': 'missing required field' })
    }


}

// Users - delete
handlers._users.delete = function (data, callback) {

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
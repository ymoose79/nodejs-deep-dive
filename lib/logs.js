/*
library for storing/rotating logs
*/

// dependencies
const fs = require('fs')
const path = require('path');
const zlib = require('zlib')

// container for the module
const lib = {}

// base dir of logs folder
lib.baseDir = path.join(__dirname, '/../_logs/')

// append a string to a file.  create file if doesnt exist
lib.append = function (file, str, callback) {

    // Open file for appending
    fs.open(lib.baseDir + file + '.log', 'a', function (err, fileDescriptor) {
        if (!err && fileDescriptor) {
            fs.appendFile(fileDescriptor, str + '\n', function (err) {
                if (!err) {
                    console.log('no err')
                    fs.close(fileDescriptor, function (err) {
                        if (!err) {
                            callback(false)
                        } else {
                            callback('error closing file being appended')
                        }
                    })
                } else {
                    callback('error appending to file')
                }
            })
        } else {
            callback('could not open file for appending')
        }
    })
}


// list all logs and optionaly include compressed logs
lib.list = function (includeCompressedLogs, callback) {
    fs.readdir(lib.baseDir, function (err, data) {
        if (!err && data && data.length > 0) {
            let trimmedFileNames = []
            data.forEach(function (fileName) {
                // add the .log files
                if (fileName.indexOf('.log') > -1) {
                    trimmedFileNames.push(fileName.replace('.log', ''))
                }

                // add on the .gz files
                if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
                    trimmedFileNames.push(fileName.replace('.gz.b64'), '')
                }
            })
            callback(false, trimmedFileNames)
        } else {
            console.log(err, data)
        }
    })
}

// compress contents of one .log file into a gz.b64 file in same dir
lib.compress = function (logId, newFileId, callback) {
    const sourceFile = logId + '.log'
    const destFile = newFileId + '.gz.b64';
    // read source file
    fs.readFile(lib.baseDir + sourceFile, 'utf8', function (err, inputString) {
        if (!err && inputString) {
            // compress datat using gzip
            zlib.gzip(inputString, function (err, buffer) {
                if (!err && buffer) {
                    // send data to destination file
                    fs.open(lib.baseDir + destFile, 'wx', function (err, fileDescriptor) {
                        if (!err && fileDescriptor) {
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), function (err) {
                                if (!err) {
                                    // close destination file
                                    fs.close(fileDescriptor, function (err) {
                                        if (!err) {
                                            callback(false)
                                        } else {
                                            callback(err)
                                        }
                                    })
                                } else {
                                    callback(err)
                                }
                            })
                        } else {
                            callback(err)
                        }
                    })
                } else {
                    callback(err)
                }
            })
        } else {
            console.log(err)
        }
    })
}

// decompress the contents of a .gz.b64 file into a string variable
lib.decompress = function (fileId, callback) {
    const fileName = fileId + '.gz.b64'
    fs.readFile(lib.baseDir + fileName, 'utf8', function (err, str) {
        if (!err && str) {
            // decompress data
            const inputBuffer = Buffer.from(str, 'base64')
            zlib.upzip(inputBuffer, function (err, outputBuffer) {
                if (!err && outputBuffer) {
                    // callback
                    const str = outputBuffer.toString()
                    callback(false, str)
                } else {
                    callback(err)
                }
            })
        } else {
            callback(err)
        }
    })
}

// truncate a log file
lib.truncate = function (logId, callback) {
    fs.truncate(lib.baseDir + logId + '.log', 0, function (err) {
        if (!err) {
            callback(false)
        } else {
            console.log(err)
        }
    })
}





// export module
module.exports = lib;
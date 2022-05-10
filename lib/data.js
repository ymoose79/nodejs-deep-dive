/*
library for storing / editing data
*/

const fs = require("fs");
const { getUnpackedSettings } = require("http2");
const path = require("path");
const helpers = require('./helpers')

// container for the module to be exported
const lib = {};

// base directory of the data folder
lib.baseDir = path.join(__dirname, "/../_data/");

// write data to a file
lib.create = function (dir, file, data, callback) {
  //  OPen file for writing
  fs.open(
    lib.baseDir + dir + "/" + file + ".json",
    "wx",
    function (err, fileDescriptor) {
      if (!err && fileDescriptor) {
        // convert data to string
        const stringData = JSON.stringify(data);

        // write then close file
        fs.writeFile(fileDescriptor, stringData, function (err) {
          if (!err) {
            fs.close(fileDescriptor, function (err) {
              if (!err) {
                callback(false);
              } else {
                callback("error closing new file");
              }
            });
          } else {
            callback("Error writing to new file");
          }
        });
      } else {
        callback("could not creqte new file, does it already exist?..");
      }
    }
  );
};

// Read data from file
lib.read = function (dir, file, callback) {
  fs.readFile(
    lib.baseDir + dir + "/" + file + ".json",
    "utf-8",
    function (err, data) {
      if (!err && data) {
        const parsedData = helpers.parseJsonToObject(data);
        callback(false, parsedData)
      } else {
        callback(err, data);
      }
    }
  );
};

// update data inside a file
lib.update = function (dir, file, data, callback) {
  // Open file for writing
  fs.open(
    lib.baseDir + dir + "/" + file + ".json",
    "r+",
    function (err, fileDescriptor) {
      if (!err && fileDescriptor) {
        // conevrt data to string
        const stringData = JSON.stringify(data);

        // truncate the file
        fs.ftruncate(fileDescriptor, function (err) {
          if (!err) {
            //   write to file and close it
            fs.writeFile(fileDescriptor, stringData, function (err) {
              if (!err) {
                fs.close(fileDescriptor, function (err) {
                  if (!err) {
                    callback(false);
                  } else {
                    callback("error clsing file");
                  }
                });
              } else {
                callback("error writing to exisiting file");
              }
            });
          } else {
            callback("error truncating file");
          }
        });
      } else {
        callback("cold not open file to edit, does it exist?");
      }
    }
  );
};

// Delete file
lib.delete = function (dir, file, callback) {
  // unlink (aka, delete) file
  fs.unlink(lib.baseDir + dir + "/" + file + ".json", function (err) {
    if (!err) {
      callback(false);
    } else {
      callback("error deleting file");
    }
  });
};

// list all items in a directory
lib.list = function (dir, callback) {
  fs.readdir(lib.baseDir + dir + '/', function (err, data) {
    if (!err && data.length > 0) {
      const trimmedFileNames = [];
      data.forEach(function (fileName) {
        trimmedFileNames.push(fileName.replace('.json', ''))
      })
      callback(false, trimmedFileNames)
    } else {
      callback(err, data)
    }
  })
}

module.exports = lib;

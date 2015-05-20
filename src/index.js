// GOALS:
// terse syntax
// all fields required or have a default value supplied

// TODO: return user readable messages with rejections

"use strict";

let _async = require("async");

exports.logRequests = false;
exports.logFailures = false;

// express middleware
exports.expressRequest = function(paramMap) {
  return function(req, res, next) {
    // set default params
    let params = req.safeData = req.body || {};
    // TODO: replace console.log
    if (exports.logRequests) {
      console.log(`params: ${JSON.stringify(params)}`);
    }
    exports.object(paramMap, params, function(validationPassed) {
      if (validationPassed) {
        next();
      }
      else {
        if (exports.logFailures) {
          console.log(`Invalid parameters supplied for ${req.route.path}`);
          console.log(`Expecting: ${JSON.stringify(paramMap)}`);
          console.log(`Received: ${JSON.stringify(params)}`);
        }
        res.send(400);
      }
    });
  };
};

let typeValidators = {};

let baseTypes = [
  "bool",
  "email",
  "int",
  "json",
  "number",
  "string",
];

exports.addBaseTypes = function(typeNames) {
  typeNames = typeNames || baseTypes;
  typeNames.forEach(function(typeName) {
    switch (typeName) {
      case "bool":
        exports.addType(typeName, function(value, args, callback) {
          if (typeof value !== "boolean") {
            callback(false);
            return;
          }
          callback(true);
        }, function(defaultValue) {
          if (defaultValue === "true") {
            return true;
          }
          else if (defaultValue === "false"){
            return false;
          }
          return defaultValue;
        });
        break;
      case "email":
        exports.addType(typeName, function(value, args, callback) {
          if (typeof value !== "string") {
            callback(false);
            return;
          }
          var results = value.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi);
          if (!results || results.length != 1 || results[0].length != value.length) {
            callback(false);
            return;
          }
          callback(true);
        });
        break;
      case "int":
        exports.addType(typeName, function(value, args, callback) {
          if (isNaN(value) || typeof value !== "number" || !/^-?([1-9][0-9]*|0)$/.exec(value.toString())) {
            callback(false);
            return;
          }
          if (args && args.length > 0) {
            if (value < parseInt(args[0])) {
              callback(false);
              return;
            }
          }
          if (args && args.length > 1) {
            if (value > parseInt(args[1])) {
              callback(false);
              return;
            }
          }
          callback(true);
        }, function(defaultValue) {
          return parseInt(defaultValue);
        });
        break;
      case "json":
        exports.addType(typeName, function(value, args, callback) {
          // JSON.parse will work on simple types like "1", but only accept json objects and arrays
          if (typeof value !== "string" || !/^[{[]/.exec(value.toString())) {
            callback(false);
            return;
          }
          try {
            JSON.parse(value);
          }
          catch (err) {
            callback(false);
            return;
          }
          callback(true);
        });
        break;
      case "number":
        exports.addType(typeName, function(value, args, callback) {
          if (isNaN(value) || typeof value !== "number" || !/^-?((0\.|[1-9][0-9]*\.|\.)\.?[0-9]+|[1-9][0-9]*|0)$/.exec(value.toString())) {
            callback(false);
            return;
          }
          callback(true);
        }, function(defaultValue) {
          return parseFloat(defaultValue);
        });
        break;
      case "string":
        exports.addType(typeName, function(value, args, callback) {
          if (typeof value !== "string") {
            callback(false);
            return;
          }
          // args is a list of acceptable strings
          if (args && args.indexOf(value) === -1) {
            callback(false);
            return;
          }
          callback(true);
        });
        break;
      default:
        throw new Error(`Invalid type (${typeName}) specified. addBaseValidators accepts only the following: ${baseTypes.join(",")}`);
    }
  });
};

// validateFunction should take a callback, formatDefaultFunction should be a synchronous function
exports.addType = function(typeName, validateFunction, formatDefaultFunction) {
  if (typeName in typeValidators) {
    throw new Error(`Duplicate validation type name (${typeName}) specified.`);
  }
  else {
    typeValidators[typeName] = {validate: validateFunction, formatDefault: formatDefaultFunction};
  }
};

// adds a new type that is the same as another type but with preset args
exports.extendType = function(baseType, typeName, args) {
 exports.addType(typeName, function(value, ignoredArgs, callback) {
   typeValidators[baseType].validate(value, args, callback);
 }, typeValidators[baseType].formatDefault);
};

// this is for validating a json string response from a service
exports.json = function(map, json, callback) {
  let parsedJson = null;
  try {
    parsedJson = JSON.parse(json);
  }
  catch (err) {
    callback(false, null);
    return;
  }
  exports.object(map, parsedJson, callback);
};

// parent and prop are here so we can save off default values
exports.object = function(map, data, parent, parentProp, callback) {
  if (typeof parent === "function") {
    callback = parent;
    parent = undefined;
  }
  // if map is an object, loop over properties
  // if it's an array, move to enclosed item
  let validationPassed = true;
  if (Array.isArray(map)) {
    if ((data === undefined && map.length === 2) || Array.isArray(data)) {
      let defaultString = null;
      if (data === undefined && map.length === 2) {
        defaultString = map[1].substr(1);
        data = JSON.parse(defaultString);
        // save off default
        if (parent) {
          parent[parentProp] = data;
        }
      }
      if (defaultString === "null") {
        callback(true, data);
      }
      else {
        _async.each(data, function(datum, each) {
          exports.object(map[0], datum, function(validationPassed, transformedValue) {
            if (validationPassed) {
              // set the transformed value on the parent if present
              if (transformedValue !== undefined) {
                data[data.indexOf(datum)] = transformedValue;
              }
              each(null);
            }
            else {
              each("Validation Failed");
            }
          });
        }, function(err) {
          if (err) {
            callback(false, data);
          }
          else {
            callback(true, data);
          }
        });
      }
    }
    else {
      callback(false, data);
    }
  }
  else if (typeof map === "object") {
    let mapKeys = Object.keys(map);

    // delete unexpected keys
    Object.keys(data).forEach(function(dataKey) {
      if (mapKeys.indexOf(dataKey) === -1) {
        delete data[dataKey];
      }
    });

    _async.each(mapKeys, function(key, each) {
      exports.object(map[key], data[key], data, key, function(validationPassed, transformedValue) {
        if (validationPassed) {
          // set the transformed value on the parent if present
          if (transformedValue !== undefined) {
            data[key] = transformedValue;
          }
          each(null);
        }
        else {
          each("Validation Failed");
        }
      });
    }, function(err) {
      if (err) {
        callback(false, data);
      }
      else {
        callback(true, data);
      }
    });
  }
  else {
    // find type
    let type = /^[^(?]*/.exec(map)[0];
    if (!typeValidators.hasOwnProperty(type)) {
      throw new Error(`Nonexistant type (${type}) specified. Valid types are: ${Object.keys(typeValidators).join(", ")}`);
    }
    // find args
    let args = /\(.*\)/.exec(map);
    if (args) {
      args = args[0].substr(1, args[0].length - 2).split(/\s*,\s*/);
    }
    // find default
    let defaultValue = /\?([^?]*)$/.exec(map);
    if (defaultValue) {
      defaultValue = defaultValue[0].substr(1);
    }

    // if there is no value or the value is equal to the provided default
    if (data === undefined || (defaultValue && data + "" === defaultValue)) {
      if (defaultValue === null) {
        callback(false, data);
        return;
      }
      else {
        // default values are always valid
        if (typeValidators[type].formatDefault) {
          data = typeValidators[type].formatDefault(defaultValue);
        }
        else {
          data = defaultValue;
        }

        // save off default value
        if (parent) {
          parent[parentProp] = data;
        }
        callback(true, data);
      }
    }
    else {
      typeValidators[type].validate(data, args, function(validationPassed, transformedValue) {
        callback(validationPassed, transformedValue);
      });
    }
  }
};

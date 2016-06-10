// GOALS:
// declarative terse syntax
// all fields required or have a default value supplied

// TODO: return user readable messages with rejections

"use strict";

const _async = require("async");

exports.requestLogFunction = null;
exports.failureLogFunction = null;
exports.failureReplyFunction = null;

// express middleware
exports.expressRequest = function(paramMap) {
  return function(req, res, next) {
    // set default params (req.body is cloned to prevent overwriting the original request data)
    const params = req.body || {};
    if (exports.requestLogFunction) {
      exports.requestLogFunction(`params: ${JSON.stringify(params)}`);
    }
    exports.object(paramMap, params, (isValid, result) => {
      if (isValid) {
        req.safeData = result;
        next();
      }
      else {
        if (exports.failureLogFunction) {
          exports.failureLogFunction(`Invalid parameters supplied for ${req.route.path}\nExpecting: ${JSON.stringify(paramMap)}\nReceived: ${JSON.stringify(params)}\nFailures: ${JSON.stringify(result)}`);
        }
        if (exports.failureReplyFunction) {
          exports.failureReplyFunction(res, result);
        }
        else {
          res.status(400).send();
        }
      }
    });
  };
};

const typeValidators = {};

const baseTypes = [
  "any",
  "bool",
  "email",
  "int",
  "json",
  "number",
  "string",
  "uuid",
  // TODO: add IP type
];

exports.addBaseTypes = typeNames => {
  typeNames = typeNames || baseTypes;
  typeNames.forEach(typeName => {
    switch (typeName) {
      case "any":
        exports.addType(typeName, (value, args, callback) => {
          callback(true, value);
        });
        break;
      case "bool":
        exports.addType(typeName, (value, args, callback) => {
          if (typeof value === "string") {
            if (value.toLowerCase() === "true") {
              callback(true, true);
              return;
            }
            if (value.toLowerCase() === "false") {
              callback(true, false);
              return;
            }
          }
          if (typeof value !== "boolean") {
            callback(false, "not a bool");
            return;
          }
          callback(true);
        }, defaultValue => {
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
        exports.addType(typeName, (value, args, callback) => {
          if (typeof value !== "string") {
            callback(false, "not an email");
            return;
          }
          value = value.trim();
          const results = value.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi);
          if (!results || results.length !== 1 || results[0].length !== value.length) {
            callback(false, "not an email");
            return;
          }
          callback(true, value);
        });
        break;
      case "int":
        exports.addType(typeName, (value, args, callback) => {
          if (typeof value === "string" && /^-?([1-9][0-9]*|0)$/.exec(value)) {
            callback(true, parseInt(value));
            return;
          }
          if (isNaN(value) || typeof value !== "number" || !/^-?([1-9][0-9]*|0)$/.exec(value.toString())) {
            callback(false, "not an int");
            return;
          }
          if (args && args.length > 0) {
            if (value < parseInt(args[0])) {
              callback(false, "not an int");
              return;
            }
          }
          if (args && args.length > 1) {
            if (value > parseInt(args[1])) {
              callback(false, "not an int");
              return;
            }
          }
          callback(true);
        }, defaultValue => parseInt(defaultValue));
        break;
      case "json":
        exports.addType(typeName, (value, args, callback) => {
          // JSON.parse will work on simple types like "1", but only accept json objects and arrays
          if (typeof value !== "string" || !/^[{[]/.exec(value.toString())) {
            callback(false, "not valid JSON");
            return;
          }
          try {
            JSON.parse(value);
          }
          catch (err) {
            callback(false, "not valid JSON");
            return;
          }
          callback(true);
        });
        break;
      case "number":
        exports.addType(typeName, (value, args, callback) => {
          if (typeof value === "string" && /^-?((0\.|[1-9][0-9]*\.|\.)\.?[0-9]+|[1-9][0-9]*|0)$/.exec(value)) {
            callback(true, parseFloat(value));
            return;
          }
          if (isNaN(value) || typeof value !== "number" || !/^-?((0\.|[1-9][0-9]*\.|\.)\.?[0-9]+|[1-9][0-9]*|0)$/.exec(value.toString())) {
            callback(false, "not a number");
            return;
          }
          callback(true);
        }, defaultValue => parseFloat(defaultValue));
        break;
      case "string":
        exports.addType(typeName, (value, args, callback) => {
          // strings should be case insensitive
          if (args) {
            args = args.map(arg => arg.toLowerCase());
          }

          if (typeof value !== "string") {
            callback(false, "not a string");
            return;
          }
          // args is a list of acceptable strings
          if (args && args.indexOf(value.toLowerCase()) === -1) {
            callback(false, "not in list of acceptable args");
            return;
          }
          callback(true);
        }, defaultValue => defaultValue === "null" ? null : defaultValue);
        break;
      case "uuid":
        exports.addType(typeName, (value, args, callback) => {
          if (typeof value === "string" && /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/.test(value)) {
            callback(true, value);
          }
          else {
            callback(false, "not a uuid");
          }
        }, defaultValue => defaultValue === "null" ? null : defaultValue);
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

const setByPath = (target, path, value) => {
  const keys = path.split(".");
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (i === keys.length - 1) {
      target[key] = value;
    }
    else {
      target = target[key];
    }
  }
};


// parent and prop are here so we can save off default values
exports.object = function(entryMap, entryData, callback) {
  const failureMessages = [];
  // clone data so we don't overwrite original values
  if (typeof entryData === "object") {
    entryData = JSON.parse(JSON.stringify(entryData));
  }

  const validate = (map, data, path, callback) => {
    // if map is an array, move to enclosed item
    if (Array.isArray(map)) {
      // if map is empty array (why would you do this?)
      if (map.length === 0) {
        if (Array.isArray(data) && data.length === 0) {
          callback(true);
        }
        else if (Array.isArray(data) && data.length !== 0) {
          failureMessages.push(`${path}${path ? "." : ""} (${typeof data === "object" ? JSON.stringify(data) : data}) is not empty`);
          callback(false);
        }
        else {
          failureMessages.push(`${path}${path ? "." : ""} (${typeof data === "object" ? JSON.stringify(data) : data}) is missing`);
          callback(false);
        }
      }
      // if array is required but has no data
      else if (map.length === 1 && (!data || !data.length)) {
        failureMessages.push(`${path}${path ? "." : ""} (${typeof data === "object" ? JSON.stringify(data) : data}) is empty`)
        callback(false);
      }
      // if array has data or defaults are available
      else if ((data === undefined && map.length === 2) || Array.isArray(data)) {
        let defaultString = null;
        if (data === undefined && map.length === 2) {
          defaultString = map[1].substr(1);
          data = JSON.parse(defaultString);
          // save off default
          if (path) {
            setByPath(entryData, path, data);
          }
        }
        if (defaultString === "null") {
          callback(true);
        }
        else {
          let elementFailed = false;
          _async.each(data, (datum, each) => {
            const index = data.indexOf(datum);
            // TODO: don't use dot notation for array indices
            validate(map[0], datum, `${path}.${index}`, isValid => {
              if (!isValid) {
                elementFailed = true;
              }
              each(null);
            });
          }, () => {
            if (elementFailed) {
              callback(false);
            }
            else {
              callback(true);
            }
          });
        }
      }
      else {
        failureMessages.push(`${path}${path ? "." : ""} (${typeof data === "object" ? JSON.stringify(data) : data}) is not a valid array`);
        callback(false);
      }
    }
    // if map is an object, loop over properties
    else if (typeof map === "object") {
      const mapKeys = Object.keys(map);

      if (data !== undefined && (typeof data !== "object" || Array.isArray(data))) {
        failureMessages.push(`${path}${path ? "." : ""} (${typeof data === "object" ? JSON.stringify(data) : data}) is not an object`);
        callback(false);
      }
      // optional object param
      else if (mapKeys.length === 1 && mapKeys[0].indexOf("?") === 0) {
        // find default
        const defaultValueMatches = /\?([^?]*)$/.exec(mapKeys[0]);
        let defaultValue = null;
        if (defaultValueMatches) {
          defaultValue = defaultValueMatches[0].substr(1);
        }

        if (data === undefined || JSON.stringify(data) === defaultValue) {
          if (data === undefined) {
            data = JSON.parse(defaultValue);
          }
          if (path) {
            setByPath(entryData, path, data);
          }
          else {
            entryData = data;
          }
          callback(true);
        }
        else {
          validate(map[mapKeys[0]], data, `${path}`, callback);
        }
      }
      // required object param
      else {
        if (data === undefined) {
          failureMessages.push(`${path} (${typeof data === "object" ? JSON.stringify(data) : data}) is required but missing`);
          callback(false);
        }
        else {
          // delete unexpected keys
          if (typeof data === "object" && !Array.isArray(data) && data) {
            Object.keys(data).forEach(dataKey => {
              if (mapKeys.indexOf(dataKey) === -1) {
                delete data[dataKey];
              }
            });
          }
          // validate all keys
          let keyFailed = false;
          _async.each(mapKeys, (key, each) => {
            if (data === null || data === undefined) {
              keyFailed = true;
              failureMessages.push(`${path}.${key} (${typeof data === "object" ? JSON.stringify(data) : data}) is missing`);
              each(null);
            }
            else {
              validate(map[key], data[key], `${path}${path ? "." : ""}${key}`, isValid => {
                if (!isValid) {
                  keyFailed = true;
                }
                each(null);
              });
            }
          }, () => {
            if (keyFailed) {
              callback(false);
            }
            else {
              callback(true);
            }
          });
        }
      }
    }
    else {
      // find type
      const type = /^[^(?]*/.exec(map)[0];
      if (!typeValidators.hasOwnProperty(type)) {
        throw new Error(`Nonexistant type (${type}) specified. Valid types are: ${Object.keys(typeValidators).join(", ")}`);
      }
      // find args
      let args = /\(.*\)/.exec(map);
      if (args) {
        args = args[0].substr(1, args[0].length - 2).split(/\s*,\s*/);
      }
      // find default
      const defaultValueMatches = /\?([^?]*)$/.exec(map);
      let defaultValue = null;
      if (defaultValueMatches) {
        defaultValue = defaultValueMatches[0].substr(1);
      }

      // if there is no value or the value is equal to the provided default
      if (data === undefined || (defaultValueMatches && data + "" === defaultValue)) {
        if (defaultValue === null) {
          failureMessages.push(`${path} (${typeof data === "object" ? JSON.stringify(data) : data}) is required but missing`);
          callback(false);
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
          if (path) {
            setByPath(entryData, path, data);
          }
          else {
            entryData = data;
          }
          callback(true);
        }
      }
      else {
        typeValidators[type].validate(data, args, (isValid, result) => {
          if (isValid && result !== undefined) {
            if (path) {
              setByPath(entryData, path, result);
            }
            else {
              entryData = result;
            }
          }
          else if (!isValid) {
            failureMessages.push(`${path}${path ? " " : ""}(${typeof data === "object" ? JSON.stringify(data) : data}) is ${result}`);
          }
          callback(isValid);
        });
      }
    }
  };
  validate(entryMap, entryData, "", isValid => {
    if (isValid) {
      callback(isValid, entryData);
    }
    else {
      callback(isValid, failureMessages);
    }
  });
};

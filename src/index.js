// GOALS:
// declarative terse syntax
// all fields required or have a default value supplied

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
  for (const typeName of typeNames) {
    if (!baseTypes.includes(typeName)) {
      throw new Error(`Invalid type (${typeName}) specified. addBaseValidators accepts only the following: ${baseTypes.join(",")}`);
    }
    const {name, validate, parseDefault} = require(`./type/${typeName}.js`);
    exports.addType(name, validate, parseDefault);
  }
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
exports.extendType = (baseType, typeName, args) => {
 exports.addType(typeName, (value, ignoredArgs, callback) => {
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

const parseDefault = key => {
  const matches = /[=!]([^=!]*)$/.exec(key);
  if (matches) {
    const type = matches[0].charAt(0);
    const value = matches[0].substr(1);
    return {value, type};
  }

  return null;
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
        failureMessages.push(`${path}${path ? "." : ""} (${typeof data === "object" ? JSON.stringify(data) : data}) is empty`);
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

      // if data isn't an object
      if (data !== undefined && (typeof data !== "object" || Array.isArray(data))) {
        failureMessages.push(`${path}${path ? "." : ""} (${typeof data === "object" ? JSON.stringify(data) : data}) is not an object`);
        callback(false);
      }
      // optional object param
      else if (mapKeys.length === 1 && (mapKeys[0].startsWith("=") || mapKeys[0].startsWith("!"))) {
        const defaults = parseDefault(mapKeys[0]);

        // should we apply a default?
        if (defaults && (
          data === undefined ||
          (data === null && defaults.type === "!" && defaults.value === "null") ||
          data.toString() === defaults.value
        )) {
          if (data === undefined && defaults.type === "=") {
            data = JSON.parse(defaults.value);
          }
          else {
            data = defaults.value === "null" ? null : undefined;
          }

          if (path) {
            if (data !== undefined) {
              setByPath(entryData, path, data);
            }
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
            for (const dataKey of Object.keys(data)) {
              if (!mapKeys.includes(dataKey)) {
                delete data[dataKey];
              }
            }
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
      const type = /^[^(=!]*/.exec(map)[0];
      if (!typeValidators.hasOwnProperty(type)) {
        throw new Error(`Nonexistant type (${type}) specified. Valid types are: ${Object.keys(typeValidators).join(", ")}`);
      }
      // find args
      let args = /\(.*\)/.exec(map);
      if (args) {
        args = args[0].substr(1, args[0].length - 2).split(/\s*,\s*/);
      }
      // find default
      const defaults = parseDefault(map);

      // should we apply a default?
      if (defaults && (
        data === undefined ||
        (data === null && defaults.type === "!" && defaults.value === "null") ||
        data.toString() === defaults.value
      )) {
        if (defaults.type === "=") {
          if (typeValidators[type].formatDefault) {
            data = typeValidators[type].formatDefault(defaults.value);
          }
          else {
            data = defaults.value;
          }
        }
        else {
          data = defaults.value === "null" ? null : undefined;
        }

        // save off default value
        if (path) {
          // don't write out undefined values
          if (data !== undefined) {
            setByPath(entryData, path, data);
          }
        }
        else {
          entryData = data;
        }
        callback(true);
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

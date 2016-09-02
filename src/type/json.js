"use strict";

const jsonRegex = /^[{[]/;

module.exports = {
  name: "json",
  validate(value, args, callback) {
    // JSON.parse will work on simple types like "1", but only accept json objects and arrays
    if (typeof value !== "string" || !jsonRegex.exec(value.toString())) {
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
  },
  parseDefault(defaultValue) {
    let valid = true;
    if (!jsonRegex.exec(defaultValue.toString())) {
      valid = false;
    }
    try {
      JSON.parse(defaultValue);
    }
    catch (err) {
      valid = false;
    }
    if (!valid) {
      throw new Error(`Invalid default value (${defaultValue}) specified for json.`);
    }

    return defaultValue;
  },
};

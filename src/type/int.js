"use strict";

const intRegex = /^-?([1-9][0-9]*|0)$/;

module.exports = {
  name: "int",
  validate(value, args, callback) {
    if (typeof value === "string" && intRegex.test(value)) {
      callback(true, parseInt(value));
      return;
    }
    if (isNaN(value) || typeof value !== "number" || !intRegex.test(value.toString())) {
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
  },
  parseDefault(defaultValue) {
    if (defaultValue !== "NaN" && !intRegex.test(defaultValue)) {
      throw new Error(`Invalid default value (${defaultValue}) specified for int.`);
    }

    return parseInt(defaultValue);
  },
};

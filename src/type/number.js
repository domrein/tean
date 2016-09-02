"use strict";

const numberRegex = /^-?((0\.|[1-9][0-9]*\.|\.)\.?[0-9]+|[1-9][0-9]*|0)$/;

module.exports = {
  name: "number",
  validate(value, args, callback) {
    if (typeof value === "string" && numberRegex.test(value)) {
      callback(true, parseFloat(value));
      return;
    }
    if (isNaN(value) || typeof value !== "number" || !numberRegex.test(value.toString())) {
      callback(false, "not a number");
      return;
    }
    callback(true);
  },
  parseDefault(defaultValue) {
    if (defaultValue !== "NaN" && !numberRegex.test(defaultValue)) {
      throw new Error(`Invalid default value (${defaultValue}) specified for number.`);
    }

    return parseFloat(defaultValue);
  },
};

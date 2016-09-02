"use strict";

module.exports = {
  name: "string",
  validate(value, args, callback) {
    // strings should be case insensitive
    if (args) {
      args = args.map(arg => arg.toLowerCase());
    }

    if (typeof value !== "string") {
      callback(false, "not a string");
      return;
    }
    // args is a list of acceptable strings
    if (args && !args.includes(value.toLowerCase())) {
      callback(false, "not in list of acceptable args");
      return;
    }
    callback(true);
  },
  parseDefault: null,
};

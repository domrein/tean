"use strict";

module.exports = {
  name: "string",
  validate(value, args, callback) {
    // parse arguments
    if (!args || !args.length) {
      throw new Error("string must be supplied a list of accepted constants or a max length");
    }

    // string constants should be case insensitive
    if (typeof value !== "string") {
      callback(false, "not a string");
      return;
    }

    const lcArgs = args.map(arg => arg.toLowerCase());

    const maxLength = Number.parseInt(args[0]);
    if (args.length > 1 || Number.isNaN(maxLength)) {
      const index = lcArgs.indexOf(value.toLowerCase());
      if (index === -1) {
        callback(false, `not in list of accepted constants (${args.join(", ")})`);
        return;
      }
      callback(true, args[index]);
    }
    else {
      if (value.length > maxLength) {
        callback(false, `longer than accepted max length of ${maxLength}`);
        return;
      }
      callback(true);
    }
  },
  parseDefault: null,
};

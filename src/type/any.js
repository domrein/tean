"use strict";

module.exports = {
  name: "any",
  validate(value, args, callback) {
    callback(true, value);
  },
  parseDefault: null,
};

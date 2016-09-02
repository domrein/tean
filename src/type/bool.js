"use strict";

module.exports = {
  name: "bool",
  validate(value, args, callback) {
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
  },
  parseDefault(defaultValue) {
    if (defaultValue === "true") {
      return true;
    }
    else if (defaultValue === "false"){
      return false;
    }
    else {
      throw new Error(`Invalid default value (${defaultValue}) specified for bool.`);
    }
  },
};

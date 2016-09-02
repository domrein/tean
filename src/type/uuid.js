"use strict";

const uuidRegex = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;

module.exports = {
  name: "uuid",
  validate(value, args, callback) {
    if (typeof value === "string"
      && value.length === 36
      && uuidRegex.test(value)) {
      callback(true, value.toLowerCase());
    }
    else {
      callback(false, "not a uuid");
    }
  },
  parseDefault(defaultValue) {
    if (defaultValue.length !== 36 || !uuidRegex.test(defaultValue)) {
      throw new Error(`Invalid default value (${defaultValue}) specified for uuid.`);
    }

    return defaultValue;
  },
};

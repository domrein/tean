"use strict";

const isEmail = email => {
  const results = email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/gi);
  return results && results.length === 1 && results[0].length === email.length;
};

module.exports = {
  name: "email",
  validate(value, args, callback) {
    if (typeof value !== "string") {
      callback(false, "not an email");
      return;
    }
    value = value.trim();
    if (!isEmail(value)) {
      callback(false, "not an email");
      return;
    }
    callback(true, value);
  },
  parseDefault(defaultValue) {
    if (!isEmail(defaultValue)) {
      throw new Error(`Invalid default value (${defaultValue}) specified for email.`);
    }

    return defaultValue;
  },
};

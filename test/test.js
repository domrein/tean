"use strict";

let _assert = require("assert");

let _validate = require("../common/validate.js");

describe("validate", function() {
  describe("#addBaseTypes()", function() {
    it("should not fail when adding base types", function() {
      _validate.addBaseTypes();
    });
  });

  describe("#addType", function() {
    it("should allow adding a custom type", function() {
      // accepts breakfast strings and ids and converts strings to ids
      _validate.addType("breakfastUid", function(value, args, callback) {
        _validate.object("int(0)", value, function(validationPassed) {
          if (validationPassed) {
            callback(true);
          }
          else {
            if (typeof value === "string") {
              switch (value) {
                case "waffle": callback(true, 0); break;
                case "pancake": callback(true, 1); break;
                case "cereal": callback(true, 2); break;
                default: callback(false);
              }
            }
            else {
              callback(false);
            }
          }
        });
      }, function(defaultValue) {
        return parseInt(defaultValue);
      });
    });
  });

  describe("#extendType()", function() {
    it("should allow extending of a base type", function() {
      _validate.extendType("int", "tasteIndex", [0, 5]);
      _validate.object("tasteIndex", 2, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
      _validate.object("tasteIndex", 300, function(validationPassed) {
        _assert.strictEqual(false, validationPassed);
      });
    });
  });

  describe(`#object()`, function() {
    let values = [
      NaN,
      null,
      undefined,
      [],
      {},
      true,
      false,
      "true",
      "false",
      1,
      1.0,
      1.1,
      -1,
      100,
      "1",
      "5",
      "{}",
      "{tasteIndex:}",
      "{\"tasteIndex\":89}",
      "bacon@breakfast.com",
      "sausagegravy@",
    ];

    let testType = function(type, validValues, expectedResult) {
      let testValues;
      if (!expectedResult) {
        testValues = values.filter(function(value) {
          if (validValues.indexOf(value) === -1) {
            return true;
          }
          return false;
        });
      }
      else {
        testValues = validValues;
      }
      testValues.forEach(function(testValue) {
        _validate.object(type, testValue, function(validationPassed) {
          _assert.strictEqual(expectedResult, validationPassed, `value (${testValue}) should return ${expectedResult} for type (${type})`);
        });
      });
    };

    let validBools = [true, false];
    it("should return false when given invalid values for bool", function() {
      testType("bool", validBools, false);
    });
    it("should return true when given valid values for bool", function() {
      testType("bool", validBools, true);
    });
    it("should allow default values for bool", function() {
      _validate.object("bool?true", undefined, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
      _validate.object("bool?false", undefined, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
    });

    let validEmails = ["bacon@breakfast.com"];
    it("should return false when given invalid values for email", function() {
      testType("email", validEmails, false);
    });
    it("should return true when given valid values for email", function() {
      testType("email", validEmails, true);
    });
    it("should allow default values for email", function() {
      _validate.object("email?bacon@breakfast.com", undefined, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
    });

    let validInts = [1, 1.0, -1, 100];
    it("should return false when given invalid values for int", function() {
      testType("int", validInts, false);
    });
    it("should return true when given valid values for int", function() {
      testType("int", validInts, true);
    });
    it("should respect arguments for int", function() {
      _validate.object("int(0)", 0, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
      _validate.object("int(0)", 10, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
      _validate.object("int(0,5)", 3, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
      _validate.object("int(0,5)", 6, function(validationPassed) {
        _assert.strictEqual(false, validationPassed);
      });
      _validate.object("int(0,5)", -1, function(validationPassed) {
        _assert.strictEqual(false, validationPassed);
      });
    });
    it("should allow default values for int", function() {
      _validate.object("int?1", undefined, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
    });

    let validJsons = ["{}", "{\"userId\":89}"];
    it("should return false when given invalid values for json", function() {
      testType("json", validJsons, false);
    });
    it("should return true when given valid values for json", function() {
      testType("json", validJsons, true);
    });
    it("should allow default values for json", function() {
      _validate.object("json?{}", undefined, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
    });

    let validNumbers = [1, 1.0, 1.1, -1, 100];
    it("should return false when given invalid values for number", function() {
      testType("number", validNumbers, false);
    });
    it("should return true when given valid values for number", function() {
      testType("number", validNumbers, true);
    });
    it("should allow default values for number", function() {
      _validate.object("number?9", undefined, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
    });

    let validStrings = ["true", "false", "1", "5", "{}", "{userId:}", "{\"userId\":89}", "bacon@breakfast.com", "paul@"];
    it("should return false when given invalid values for string", function() {
      testType("string", validStrings, false);
    });
    it("should return true when given valid values for string", function() {
      testType("string", validStrings, true);
    });
    it("should respect arguments for string", function() {
      _validate.object("string(bacon,pancakes)", "bacon", function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
      _validate.object("string(bacon,pancakes)", "pancakes", function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
      _validate.object("string(bacon,pancakes)", "waffles", function(validationPassed) { // no waffles! :*(
        _assert.strictEqual(false, validationPassed);
      });
    });
    it("should allow default values for string", function() {
      _validate.object("string?hello", undefined, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
    });

    it("should validate an empty map", function() {
      _validate.object({}, {}, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
    });

    it("should validate a complex map", function() {
      _validate.object({
        duration: "int(0)?3600",
        wakeUpTime: "int(0)",
        meal: "string(breakfast,lunch,dinner)",
        foodIds: ["int(0)", "?[]"],
        fruitBowl: "bool?false",
      }, {
        duration: undefined,
        wakeUpTime: 100000,
        meal: "breakfast",
        foodIds: [0, 1, 2, 3],
        fruitBowl: true,
      }, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
    });

    it("should fail a complex map with invalid params", function() {
      _validate.object({
        duration: "int(0)?3600",
        wakeUpTime: "int(0)",
        meal: "string(breakfast,lunch,dinner)",
        foodIds: ["int(0)", "?[]"],
        fruitBowl: "bool?false",
      }, {
        duration: undefined,
        wakeUpTime: 100000,
        meal: "breakfast",
        foodIds: "I love breakfast!", // foodIds should be an array of foodIds
        fruitBowl: true,
      }, function(validationPassed) {
        _assert.strictEqual(false, validationPassed);
      });
    });

    it("should replace undefined params with defaults where available", function() {
      let patron = {};
      _validate.object({
        id: "int?1",
        email: "email?bacon@breakfast.com",
        foodIdPreferences: ["int(0)", "?[]"],
      }, patron, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
        _assert.strictEqual(1, patron.id);
        _assert.strictEqual("bacon@breakfast.com", patron.email);
        _assert.strictEqual(true, Array.isArray(patron.foodIdPreferences));
        _assert.strictEqual(0, patron.foodIdPreferences.length);
      });
    });

    it("should delete unexpected properties", function() {
      let patron = {id: 1, breakfast: "waffles"};
      _validate.object({
        id: "int",
      }, patron, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
        _assert.strictEqual(1, patron.id);
        _assert.strictEqual(undefined, patron.breakfast);
      });
    });

    it("should validate and transform custom types", function() {
      _validate.object("breakfastUid", "waffle", function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
      _validate.object("breakfastUid", "cereal", function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
      _validate.object("breakfastUid", 0, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
      _validate.object("breakfastUid", -1, function(validationPassed) {
        _assert.strictEqual(false, validationPassed);
      });
      _validate.object("breakfastUid", "steak", function(validationPassed) {
        _assert.strictEqual(false, validationPassed);
      });
      let data = {buid: "waffle"};
      _validate.object({buid: "breakfastUid"}, data, function(validationPassed) {
        _assert.strictEqual(0, data.buid);
      });
      data = {buid: "pancake"};
      _validate.object({buid: "breakfastUid"}, data, function(validationPassed) {
        _assert.strictEqual(1, data.buid);
      });
      data = {buid: 1};
      _validate.object({buid: "breakfastUid"}, data, function(validationPassed) {
        _assert.strictEqual(1, data.buid);
      });
    });

    it("should allow null for array default value", function() {
      let data = {};
      _validate.object({foodIds: ["int(0)", "?null"]}, data, function(validationPassed, tran) {
        _assert.strictEqual(true, validationPassed);
        _assert.strictEqual(null, data.foodIds);
      });
      _validate.object({foodIds: ["int(0)", "?null"]}, {foodIds: [1, 2, 3]}, function(validationPassed) {
        _assert.strictEqual(true, validationPassed);
      });
    });
  });

  describe("#json()", function() {
    it("should validate json string as if it was an object", function() {
      _validate.json({lovesWaffles: "bool", hungerLevel: "int(0, 10)"}, `{"lovesWaffles":true, "hungerLevel": 8}`, function(validationPassed, parsedBody) {
        _assert.strictEqual(true, validationPassed);
      });
    });
    it("should return validated json string as object", function() {
      _validate.json({lovesWaffles: "bool", hungerLevel: "int(0, 10)"}, `{"lovesWaffles":true, "hungerLevel": 8}`, function(validationPassed, parsedBody) {
        _assert.strictEqual(8, parsedBody.hungerLevel);
        _assert.strictEqual(false, parsedBody.status);
      });
    });
  });
});

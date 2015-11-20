"use strict";

const _assert = require("assert");
const _async = require("async");

const _tean = require("../src/index.js");

describe("tean", () => {
  describe("#addBaseTypes()", () => {
    it("should not fail when adding base types", () => {
      _tean.addBaseTypes();
    });
  });

  describe("#addType", () => {
    it("should allow adding a custom type", () => {
      // accepts breakfast strings and ids and converts strings to ids
      _tean.addType("breakfastUid", (value, args, callback) => {
        _tean.object("int(0)", value, (isValid, result) => {
          if (isValid) {
            callback(true, result);
          }
          else {
            if (typeof value === "string") {
              switch (value) {
                case "waffle": setTimeout(() => callback(true, 0), Math.random() * 100); break;
                case "pancake": setTimeout(() => callback(true, 1), Math.random() * 100); break;
                case "cereal": setTimeout(() => callback(true, 2), Math.random() * 100); break;
                default: callback(false, "not a recognized name");
              }
            }
            else {
              callback(false, "not a valid breakfastUid name");
            }
          }
        });
      }, defaultValue => parseInt(defaultValue));
    });
  });

  describe("#extendType()", () => {
    it("should allow extending of a base type", () => {
      _tean.extendType("int", "tasteIndex", [0, 5]);
      _tean.object("tasteIndex", 2, (isValid, result) => {
        _assert.strictEqual(true, isValid);
      });
      _tean.object("tasteIndex", 300, (isValid, result) => {
        _assert.strictEqual(false, isValid);
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
      "[\"one\",\"two\",\"three\"]",
      "bacon@breakfast.com",
      "sausagegravy@",
    ];

    const testType = function(type, validValues, expectedResult) {
      let testValues;
      if (!expectedResult) {
        testValues = values.filter(value => {
          let isValid = false;
          for (const validValue of validValues) {
            if (validValue.input === value) {
              isValid = true;
              break;
            }
          }
          return !isValid;
        });
      }
      else {
        testValues = validValues;
      }
      for (const testValue of testValues) {
        if (expectedResult) {
          _tean.object(type, testValue.input, (isValid, result) => {
            _assert.strictEqual(expectedResult, isValid, `value (${testValue.input}) should return ${expectedResult} for type (${type})`);
            let output = testValue.input;
            if (testValue.hasOwnProperty("output")) {
              output = testValue.output;
            }
            _assert.strictEqual(output, result, `Input of (${testValue.input}) should return result of ${testValue.output} for type (${type})`);
          });
        }
        else {
          _tean.object(type, testValue, (isValid) => {
            _assert.strictEqual(expectedResult, isValid, `value (${testValue}) should return ${expectedResult} for type (${type})`);
          });
        }
      }
    };

    let validBools = [
      {input: true},
      {input: false},
      {input: "true", output: true},
      {input: "false", output: false},
    ];
    it("should return false when given invalid values for bool", () => {
      testType("bool", validBools, false);
    });
    it("should return true when given valid values for bool", () => {
      testType("bool", validBools, true);
    });
    it("should allow default values for bool", () => {
      _tean.object("bool?true", undefined, (isValid, result) => {
        _assert.strictEqual(true, isValid);
        _assert.strictEqual(true, result);
      });
      _tean.object("bool?false", undefined, (isValid, result) => {
        _assert.strictEqual(true, isValid);
        _assert.strictEqual(false, result);
      });
    });

    let validEmails = [
      {input: "bacon@breakfast.com"},
    ];
    it("should return false when given invalid values for email", () => {
      testType("email", validEmails, false);
    });
    it("should return true when given valid values for email", () => {
      testType("email", validEmails, true);
    });
    it("should allow default values for email", () => {
      _tean.object("email?bacon@breakfast.com", undefined, (isValid, result) => {
        _assert.strictEqual(true, isValid);
        _assert.strictEqual("bacon@breakfast.com", result);
      });
    });

    let validInts = [
      {input: 1},
      {input: 1.0},
      {input: -1},
      {input: 100},
      {input: "1", output: 1},
      {input: "5", output: 5},
    ];
    it("should return false when given invalid values for int", () => {
      testType("int", validInts, false);
    });
    it("should return true when given valid values for int", () => {
      testType("int", validInts, true);
    });
    it("should respect arguments for int", () => {
      _tean.object("int(0)", 0, isValid => {
        _assert.strictEqual(true, isValid);
      });
      _tean.object("int(0)", 10, isValid => {
        _assert.strictEqual(true, isValid);
      });
      _tean.object("int(0,5)", 3, isValid => {
        _assert.strictEqual(true, isValid);
      });
      _tean.object("int(0,5)", 6, isValid => {
        _assert.strictEqual(false, isValid);
      });
      _tean.object("int(0,5)", -1, isValid => {
        _assert.strictEqual(false, isValid);
      });
    });
    it("should allow default values for int", () => {
      _tean.object("int?1", undefined, (isValid, result) => {
        _assert.strictEqual(true, isValid);
        _assert.strictEqual(1, result);
      });
    });

    let validJsons = [
      {input: "{}"},
      {input: "{\"tasteIndex\":89}"},
      {input: "[\"one\",\"two\",\"three\"]"},
    ];
    it("should return false when given invalid values for json", () => {
      testType("json", validJsons, false);
    });
    it("should return true when given valid values for json", () => {
      testType("json", validJsons, true);
    });
    it("should allow default values for json", () => {
      _tean.object("json?{}", undefined, (isValid, result) => {
        _assert.strictEqual(true, isValid);
        _assert.strictEqual("{}", result);
      });
    });

    let validNumbers = [
      {input: 1},
      {input: 1.0},
      {input: 1.1},
      {input: -1},
      {input: 100},
      {input: "1", output: 1},
      {input: "5", output: 5},
    ];
    it("should return false when given invalid values for number", () => {
      testType("number", validNumbers, false);
    });
    it("should return true when given valid values for number", () => {
      testType("number", validNumbers, true);
    });
    it("should allow default values for number", () => {
      _tean.object("number?9", undefined, (isValid, result) => {
        _assert.strictEqual(true, isValid);
        _assert.strictEqual(9, result);
      });
    });

    let validStrings = [
      {input: "true"},
      {input: "false"},
      {input: "1"},
      {input: "5"},
      {input: "{}"},
      {input: "{tasteIndex:}"},
      {input: "{\"tasteIndex\":89}"},
      {input: "[\"one\",\"two\",\"three\"]"},
      {input: "bacon@breakfast.com"},
      {input: "sausagegravy@"},
    ];
    it("should return false when given invalid values for string", () => {
      testType("string", validStrings, false);
    });
    it("should return true when given valid values for string", () => {
      testType("string", validStrings, true);
    });
    it("should respect arguments for string", () => {
      _tean.object("string(bacon,pancakes)", "bacon", (isValid) => {
        _assert.strictEqual(true, isValid);
      });
      _tean.object("string(bacon,pancakes)", "pancakes", (isValid) => {
        _assert.strictEqual(true, isValid);
      });

      // string args are case insensitive
      _tean.object("string(bacon,pancakes)", "PaNcakEs", (isValid) => {
        _assert.strictEqual(true, isValid);
      });
      _tean.object("string(baCoN,pancakes)", "bacon", (isValid) => {
        _assert.strictEqual(true, isValid);
      });

      _tean.object("string(bacon,pancakes)", "waffles", (isValid) => { // no waffles! :*(
        _assert.strictEqual(false, isValid);
      });
    });
    it("should allow default values for string", () => {
      _tean.object("string?hello", undefined, (isValid, result) => {
        _assert.strictEqual(true, isValid);
        _assert.strictEqual("hello", result);
      });
      _tean.object("string(pancakes,waffles)?", "", (isValid, result) => {
        _assert.strictEqual(true, isValid);
        _assert.strictEqual("", result);
      });
    });

    it("should validate an empty map", () => {
      _tean.object({}, {}, (isValid) => {
        _assert.strictEqual(true, isValid);
      });
    });

    it("should validate a complex map", function() {
      _tean.object({
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
      }, function(isValid) {
        _assert.strictEqual(true, isValid);
      });
    });

    it("should fail a complex map with invalid params", function() {
      _tean.object({
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
      }, function(isValid) {
        _assert.strictEqual(false, isValid);
      });
    });

    it("should fail a complex map with missing params", function() {
      _tean.object({
        user: {
          id: "int(1)",
          name: "string",
        },
        note: "string?",
        image: "string?",
      }, {
        userId: 7708,
      }, function(isValid) {
        _assert.strictEqual(false, isValid);
      });
    });

    it("should replace undefined params with defaults where available", function() {
      let patron = {};
      _tean.object({
        id: "int?1",
        email: "email?bacon@breakfast.com",
        foodIdPreferences: ["int(0)", "?[]"],
      }, patron, function(isValid, safeData) {
        _assert.strictEqual(true, isValid);
        _assert.strictEqual(1, safeData.id);
        _assert.strictEqual("bacon@breakfast.com", safeData.email);
        _assert.strictEqual(true, Array.isArray(safeData.foodIdPreferences));
        _assert.strictEqual(0, safeData.foodIdPreferences.length);
      });
    });

    it("should not mutate any values passed into the function", function() {
      let patron = {};
      _tean.object({
        id: "int?1",
        email: "email?bacon@breakfast.com",
        foodIdPreferences: ["int(0)", "?[]"],
      }, patron, function(isValid, safeData) {
        _assert.strictEqual(true, isValid);
        _assert.strictEqual("{}", JSON.stringify(patron));
      });
    });

    it("should delete unexpected properties", function() {
      let patron = {id: 1, breakfast: "waffles"};
      _tean.object({
        id: "int",
      }, patron, function(isValid, safeData) {
        _assert.strictEqual(true, isValid);
        _assert.strictEqual(1, safeData.id);
        _assert.strictEqual(undefined, safeData.breakfast);
      });
    });

    it("should validate and transform custom types", (done) => {
      this.timeout(2000);
      _async.parallel([
        parallel => {
          _tean.object("breakfastUid", "waffle", isValid => {
            _assert.strictEqual(true, isValid);
            parallel(null);
          });
        },
        parallel => {
          _tean.object("breakfastUid", "cereal", isValid => {
            _assert.strictEqual(true, isValid);
            parallel(null);
          });
        },
        parallel => {
          _tean.object("breakfastUid", 0, isValid => {
            _assert.strictEqual(true, isValid);
            parallel(null);
          });
        },
        parallel => {
          _tean.object("breakfastUid", -1, isValid => {
            _assert.strictEqual(false, isValid);
            parallel(null);
          });
        },
        parallel => {
          _tean.object("breakfastUid", "steak", isValid => {
            _assert.strictEqual(false, isValid);
            parallel(null);
          });
        },
        parallel => {
          const data = {buid: "waffle"};
          _tean.object({buid: "breakfastUid"}, data, (isValid, safeData) => {
            _assert.strictEqual(0, safeData.buid);
            parallel(null);
          });
        },
        parallel => {
          const data = {buid: "pancake"};
          _tean.object({buid: "breakfastUid"}, data, (isValid, safeData) => {
            _assert.strictEqual(1, safeData.buid);
            parallel(null);
          });
        },
        parallel => {
          const data = {buid: 1};
          _tean.object({buid: "breakfastUid"}, data, (isValid, safeData) => {
            _assert.strictEqual(1, safeData.buid);
            parallel(null);
          });
        },
      ], err => {
        done();
      });
    });

    it("should allow null for array default value", () => {
      let data = {};
      _tean.object({foodIds: ["int(0)", "?null"]}, data, (isValid, result) => {
        _assert.strictEqual(true, isValid);
        _assert.strictEqual(null, result.foodIds);
      });
      _tean.object({foodIds: ["int(0)", "?null"]}, {foodIds: [1, 2, 3]}, isValid => {
        _assert.strictEqual(true, isValid);
      });
    });

    it("should allow optional objects as params", () => {
      const breakfastOrder = {pancakes: {amount: 1, buttered: true}, cereal: {amount: 1}};
      _tean.object({
        pancakes: {"?null": {amount: "int(0)", buttered: "bool"}},
        bacon: {"?null": {amount: "int(0)", buttered: "bool"}},
        toast: {"?{\"amount\": 2, \"buttered\": true}": {amount: "int(0)", buttered: "bool"}},
        cereal: {amount: "int(0)", buttered: "bool?false"},
      }, breakfastOrder, (isValid, result) => {
        _assert.strictEqual(true, isValid);
        _assert.strictEqual(1, result.pancakes.amount);
        _assert.strictEqual(true, result.pancakes.buttered);
        _assert.strictEqual(null, result.bacon);
        _assert.strictEqual(2, result.toast.amount);
        _assert.strictEqual(true, result.toast.buttered);
        _assert.strictEqual(false, result.cereal.buttered);
      });
    });

    it("should validate and populate array of objects", () => {
      _tean.object({
        waffles: [{
          name: "string",
          whippedCream: "bool?true",
          syrup: "bool",
          strawberries: "bool",
        }],
      }, {
        waffles: [{
          name: "Jerry's Finest",
          syrup: false,
          strawberries: true,
        }, {
          name: "Georgia's Best",
          whippedCream: false,
          syrup: true,
          strawberries: false,
        }],
      }, (isValid, result) => {
        _assert.strictEqual(true, isValid);
        _assert.strictEqual(2, result.waffles.length);
      });
    });

    it("should provide a map of failure messages for failed validation", () => {
      _tean.object({
        cereal: {milk: "bool", sugar: "bool?true"},
        recipient: "email",
        puzzleCode: ["int"],
        sideDishes: [{
          id: "int",
          name: "string",
        }],
      }, {
        cereal: {milk: false},
        puzzleCode: [1, "b", 3],
        sideDishes: [{id: 1, name: "grits"}, {id: "a", name: "sausage links"}],
      }, (isValid, result) => {
        _assert.strictEqual(false, isValid);
        _assert.strictEqual(3, result.length);
        _assert.strictEqual(0, result[0].indexOf("recipient"));
        _assert.strictEqual(0, result[1].indexOf("puzzleCode.1"));
        _assert.strictEqual(0, result[2].indexOf("sideDishes.1.id"));
      });
    });
  });

  describe("#json()", function() {
    it("should validate json string as if it was an object", function() {
      _tean.json({lovesWaffles: "bool", hungerLevel: "int(0, 10)"}, `{"lovesWaffles":true, "hungerLevel": 8}`, function(isValid, parsedBody) {
        _assert.strictEqual(true, isValid);
      });
    });
    it("should return validated json string as object", function() {
      _tean.json({lovesWaffles: "bool", hungerLevel: "int(0, 10)"}, `{"lovesWaffles":true, "hungerLevel": 8}`, function(isValid, parsedBody) {
        _assert.strictEqual(8, parsedBody.hungerLevel);
        _assert.strictEqual(true, parsedBody.lovesWaffles);
      });
    });
  });

  describe("#expressRequest()", () => {
    const middlewareFunction = _tean.expressRequest({bacon: "string(yes,no)", grits: "string(yes,no)"});
    it("should return a function", function() {
      _assert.strictEqual("function", typeof middlewareFunction);
    });
    it("should pass validation for valid params using returned function", () => {
      middlewareFunction({body: {bacon: "yes", grits: "no"}, route: {path: "/"}}, {
        status: () => ({send: () => {}}),
      }, () => {
      });
    });
    it("should not pass validation for invalid params using returned function", () => {
      middlewareFunction({body: {bacon: "what?", grits: "no"}, route: {path: "/"}}, {
        status: () => ({send: () => {}}),
      }, () => {
        _assert.fail("Validation passed.", "Validation failed.");
      });
    });
    it("should populate safeData", () => {
      const req = {body: {bacon: "yes", grits: "no", eggs: "maybe"}, route: {path: "/"}};
      middlewareFunction(req, {
        status: () => ({send: () => {}}),
      }, () => {
        _assert.strictEqual("yes", req.safeData.bacon);
        _assert.strictEqual("no", req.safeData.grits);
        _assert.strictEqual(undefined, req.safeData.eggs);
      });
    });
    it("should not alter original request body", () => {
      const req = {body: {bacon: "yes", grits: "no", eggs: "maybe"}, route: {path: "/"}};
      middlewareFunction(req, {
        status: () => ({send: () => {}}),
      }, () => {
        _assert.strictEqual("yes", req.body.bacon);
        _assert.strictEqual("no", req.body.grits);
        _assert.strictEqual("maybe", req.body.eggs);
      });
    });
  });
});

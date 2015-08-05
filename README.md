# Tean
Tean is a declarative, strict and asynchronous way to validate and normalize data. The markup uses plain Javascript objects, so it's easy to pick up and read. Everything is strictly validated and normalized, so you know exactly what you're getting, no exceptions. This makes code more secure and can completely eliminate unexpected type errors. Tean is designed for use with io.js and can be installed by running `npm install tean`.

##Quick Examples
```javascript
// simple validation
tean.object({breakfast: "string"}, {breakfast: "bacon"}, function(validationPassed, safeData) {
  console.log(validationPassed); // true
  console.log(safeData); // {breakfast: "bacon"}
});

// optional parameters
tean.object({breakfast: "string?waffles", addSyrup: "bool?true"}, {breakfast: "pancakes"}, function(validationPassed, safeData) {
  console.log(validationPassed); // true
  console.log(safeData); // {breakfast: "pancakes", addSyrup: true}
  // Note that the original object is not altered! Normalized and validated data is passed into "safeData" in the callback
});
```

##functions
###expressRequest
object

json
Same as object, but accepts a json string

expressRequest
Middleware for Express. Returns 400 if validation fails. Validated and normalized data is attached to the request object as `req.safeData`.

addBaseTypes
Adds all base validators to Tean. Normally `tean.addBaseTypes()` should be called before any other tean functions.

addType
Register a validator with Tean. This must happen before the type can be used in a map.

extendType
Register a new type by setting parameters on an existing one.

##Base Types
bool - Boolean true or false
int - Integer
json - String that can be parsed into an object
number - Floating point number. Can also be an integer
string - String
email - String that is an email address

# Tean
Tean is a declarative, strict and asynchronous way to validate and normalize data. The markup uses plain Javascript objects, so it's easy to pick up and read. Everything is strictly validated and normalized, so you know exactly what you're getting, no exceptions. This makes code more secure and can completely eliminate unexpected type errors. Tean is designed for use with io.js and can be installed by running `npm install tean`.

##Quick Examples
```javascript
// simple validation
tean.object({breakfast: "string"}, {breakfast: "bacon"}, function(validated, safeData) {
  console.log(validated); // true
  console.log(safeData); // {breakfast: "bacon"}
});

// optional parameters
tean.object({breakfast: "string?waffles", addSyrup: "bool?true"}, {breakfast: "pancakes"}, function(validated, safeData) {
  console.log(validated); // true
  console.log(safeData); // {breakfast: "pancakes", addSyrup: true}
  // Note that the original object is not altered! Normalized and validated data is passed into "safeData" in the callback
});
```

##Documentation
###expressRequest(req, res, next)
expressRequest is used as middleware for Express. Replies to request with a 400 error if validation fails. Validated and normalized data is attached to the request object as `req.safeData`.

###object(map, data, callback(validated, safeData))
object is used to validate data and provide it normalized as `safeData` in the callback. object does not alter `data`. safeData contains only object keys that have been validated. This means any object keys not present in the map will not be copied into safeData. Also, any fields not present in data that have default values in map will be present in safeData with the defined default. If validated is false, safeData is null.

###json(map, jsonData, callback(validate, safeData))
json is the same as object, but it accepts a json string instead of a Javascript object.

###addBaseTypes([typeNames])
Adds all base validators to tean. Normally `tean.addBaseTypes()` should be called before any other tean functions. The following types are registered by default with tean by calling this function:
*bool - Boolean true or false
*int - Integer
*json - String that can be parsed into an object
*number - Floating point number. Can also be an integer
*string - String
*email - String that is an email address
Optionally, an array of list names can be passed in e.g. `["int", "number"]`) if you only want to register a subset of base types.

###addType(typeName, validateFunction, formatDefaultFunction)
Register a validator with tean. This must happen before the type can be used in a map. typeName is the new type's name, validateFunction will be called  on data that is to be validated/normalized. formatDefaultFunction accepts a string that is to be parsed into a default value if one is required.

###extendType(baseType, typeName, args)
Register a new type by setting parameters on an existing one. baseType is a type that has already been registered with tean. typeName is the name given to the extended type. args are the parameters passed to the validator. extendType can be useful if you find yourself adding the same arguments to type in a map over and over again. For example, if you need to accept an integer 1 through 15 as a menuItem in several places, you could write "{menuItem: "int(0, 15)"} everywhere in your code. However, it's more maintainable to extend the int type by creating a new "menuItem" type that always has the range 1 through 15 predefined.

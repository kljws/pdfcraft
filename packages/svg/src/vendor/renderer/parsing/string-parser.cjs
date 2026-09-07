module.exports = function installStringParser() {
  var StringParser = function(str) {
    this.match = function(exp, all) {
      let temp = str.match(exp);
      if (!temp || temp.index !== 0) {return;}
      str = str.substring(temp[0].length);
      return (all ? temp : temp[0]);
    };
    this.matchSeparator = function() {
      return this.match(/^(?:\s*,\s*|\s*|)/);
    };
    this.matchSpace = function() {
      return this.match(/^(?:\s*)/);
    };
    this.matchLengthUnit = function() {
      return this.match(/^(?:px|pt|cm|mm|in|pc|em|ex|%|)/);
    };
    this.matchNumber = function() {
      return this.match(/^(?:[-+]?(?:[0-9]+[.][0-9]+|[0-9]+[.]|[.][0-9]+|[0-9]+)(?:[eE][-+]?[0-9]+)?)/);
    };
    this.matchAll = function() {
      return this.match(/^[\s\S]+/);
    };
  };

  return {StringParser};
};

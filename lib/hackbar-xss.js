/**
 * StiffEyes HackBar XSS — XSS payload helpers.
 * Ported from HackBar v2.3.1 XSS.js.
 */
var StiffEyesHackbarXss = (function () {

  function _charCodes(txt) {
    var codes = [];
    for (var i = 0; i < txt.length; i++) {
      codes.push(txt.charCodeAt(i));
    }
    return codes;
  }

  function toFromCharCode(txt) {
    return 'String.fromCharCode(' + _charCodes(txt).join(', ') + ')';
  }

  function toHtmlEntities(txt) {
    return '&#' + _charCodes(txt).join(';&#') + ';';
  }

  return {
    toFromCharCode: toFromCharCode,
    toHtmlEntities: toHtmlEntities
  };
})();

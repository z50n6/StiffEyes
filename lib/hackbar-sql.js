/**
 * StiffEyes HackBar SQL — SQL injection payload helpers.
 * Ported from HackBar v2.3.1 SQL.js.
 */
var StiffEyesHackbarSql = (function () {

  function _charCodes(txt) {
    var codes = [];
    for (var i = 0; i < txt.length; i++) {
      codes.push(txt.charCodeAt(i));
    }
    return codes;
  }

  function toMySQLChar(txt) {
    return 'CHAR(' + _charCodes(txt).join(', ') + ')';
  }

  function toMSSQLChar(txt) {
    return ' CHAR(' + _charCodes(txt).join(') + CHAR(') + ')';
  }

  function toOracleChar(txt) {
    return ' CHR(' + _charCodes(txt).join(') || CHR(') + ')';
  }

  function toUnionSelect(columns) {
    columns = Math.min(1000, parseInt(columns, 10) || 1);
    var nums = [];
    for (var i = 0; i < columns; i++) {
      nums.push(i + 1);
    }
    return 'UNION SELECT ' + nums.join(',');
  }

  function toInlineComments(txt) {
    return txt.replace(/ /g, '/**/');
  }

  function toMySQLConvertUsing(encoding, txt) {
    return 'CONVERT(' + txt + ' USING ' + encoding + ')';
  }

  function basicInfo() {
    return 'CONCAT_WS(CHAR(32,58,32),user(),database(),version())';
  }

  return {
    toMySQLChar: toMySQLChar,
    toMSSQLChar: toMSSQLChar,
    toOracleChar: toOracleChar,
    toUnionSelect: toUnionSelect,
    toInlineComments: toInlineComments,
    toMySQLConvertUsing: toMySQLConvertUsing,
    basicInfo: basicInfo
  };
})();

var StiffEyesPatterns = (function () {
  var SNOW_RESULT_FIELDS = [
    'domains', 'absoluteApis', 'apis', 'moduleFiles', 'docFiles',
    'credentials', 'cookies', 'idKeys', 'secrets', 'phones', 'emails', 'idcards',
    'ips', 'companies', 'jwts', 'imageFiles', 'githubUrls', 'vueFiles',
    'jsFiles', 'urls'
  ];

  var SCAN_TABS = [
    { id: 'domains', label: '域名', kind: 'snow', field: 'domains', copy: true },
    { id: 'absoluteApis', label: 'API接口(绝对路径)', kind: 'snow', field: 'absoluteApis', copy: true, copyUrl: 'absolute' },
    { id: 'apis', label: 'API接口(相对路径)', kind: 'snow', field: 'apis', copy: true, copyUrl: 'relative' },
    { id: 'moduleFiles', label: '模块路径', kind: 'snow', field: 'moduleFiles', copy: true },
    { id: 'docFiles', label: '文档文件', kind: 'snow', field: 'docFiles', copy: true },
    { id: 'credentials', label: '用户名密码', kind: 'snow', field: 'credentials', copy: true },
    { id: 'cookies', label: 'Cookie', kind: 'snow', field: 'cookies', copy: true },
    { id: 'idKeys', label: 'ID密钥', kind: 'snow', field: 'idKeys', copy: true },
    { id: 'secrets', label: '敏感信息泄露', kind: 'snow', field: 'secrets', copy: true },
    { id: 'phones', label: '手机号码', kind: 'snow', field: 'phones', copy: true },
    { id: 'emails', label: '邮箱', kind: 'snow', field: 'emails', copy: true },
    { id: 'idcards', label: '身份证号', kind: 'snow', field: 'idcards', copy: true },
    { id: 'ips', label: 'IP地址', kind: 'snow', field: 'ips', copy: true },
    { id: 'companies', label: '公司机构', kind: 'snow', field: 'companies', copy: true },
    { id: 'jwts', label: 'JWT Token', kind: 'snow', field: 'jwts', copy: true },
    { id: 'imageFiles', label: '音频图片', kind: 'snow', field: 'imageFiles', copy: true },
    { id: 'githubUrls', label: 'GitHub链接', kind: 'snow', field: 'githubUrls', copy: true },
    { id: 'vueFiles', label: 'Vue文件', kind: 'snow', field: 'vueFiles', copy: true },
    { id: 'jsFiles', label: 'JS文件', kind: 'snow', field: 'jsFiles', copy: true },
    { id: 'urls', label: 'URL', kind: 'snow', field: 'urls', copy: true }
  ];

  function isSnowScanResult(data) {
    return (
      data &&
      (Array.isArray(data.absoluteApis) ||
        Array.isArray(data.apis) ||
        (data.domains && data.domains.length && Array.isArray(data.domains[0])))
    );
  }

  function countResults(data) {
    if (!data) return data;
    if (data.counts && typeof data.counts.total === 'number' && data.scanning) {
      return data;
    }
    var n = 0;
    SNOW_RESULT_FIELDS.forEach(function (f) {
      if (Array.isArray(data[f])) n += data[f].length;
    });
    data.counts = { total: n };
    return data;
  }

  function normalizeScanResult(data) {
    if (!data) return data;
    return countResults(data);
  }

  function emptyScanResult(hostname) {
    var empty = {
      hostname: hostname,
      updatedAt: Date.now(),
      counts: { total: 0 },
      blacklisted: false,
      scanning: false
    };
    SNOW_RESULT_FIELDS.forEach(function (f) { empty[f] = []; });
    empty.fingers = [];
    return empty;
  }

  return {
    SCAN_TABS: SCAN_TABS,
    SNOW_RESULT_FIELDS: SNOW_RESULT_FIELDS,
    normalizeScanResult: normalizeScanResult,
    emptyScanResult: emptyScanResult,
    isSnowScanResult: isSnowScanResult,
    countResults: countResults
  };
})();

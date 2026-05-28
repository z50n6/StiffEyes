// 云存储桶被动发现规则引擎
var StiffEyesCloudBucketRules = (function () {
  var VENDOR_HEADERS = [
    {
      vendor: 'AWS',
      label: 'AWS S3',
      patterns: [
        { header: 'x-amz-request-id',    match: /./ },
        { header: 'x-amz-id-2',           match: /./ },
        { header: 'x-amz-bucket-region',  match: /(.+)/, value: 'region' },
        { header: 'server',               match: /AmazonS3/i }
      ]
    },
    {
      vendor: 'Alibaba',
      label: '阿里云 OSS',
      patterns: [
        { header: 'x-oss-request-id', match: /./ },
        { header: 'server',           match: /AliyunOSS/i }
      ]
    },
    {
      vendor: 'Tencent',
      label: '腾讯云 COS',
      patterns: [
        { header: 'x-cos-request-id', match: /./ },
        { header: 'server',           match: /tencent-cos/i }
      ]
    },
    {
      vendor: 'Huawei',
      label: '华为云 OBS',
      patterns: [
        { header: 'x-obs-request-id', match: /./ },
        { header: 'server',           match: /^OBS$/i }
      ]
    }
  ];

  var VENDOR_DOMAINS = [
    { vendor: 'AWS',     label: 'AWS S3',    pattern: /(?:s3[.-]([a-z0-9-]+)\.amazonaws\.com|([a-z0-9][a-z0-9.-]*)\.s3[.-](?:[a-z0-9-]+)?\.?amazonaws\.com)/i, regionGroup: 1 },
    { vendor: 'Alibaba', label: '阿里云 OSS',  pattern: /(?:oss-([a-z0-9-]+)\.aliyuncs\.com|([a-z0-9][a-z0-9-]*)\.oss-[a-z0-9-]+\.aliyuncs\.com)/i, regionGroup: 1 },
    { vendor: 'Tencent', label: '腾讯云 COS',  pattern: /(?:cos\.([a-z0-9-]+)\.myqcloud\.com|([a-z0-9][a-z0-9-]*)\.cos\.[a-z0-9-]+\.myqcloud\.com)/i, regionGroup: 1 },
    { vendor: 'Huawei',  label: '华为云 OBS',  pattern: /(?:obs\.([a-z0-9-]+)\.myhuaweicloud\.com|([a-z0-9][a-z0-9-]*)\.obs\.[a-z0-9-]+\.myhuaweicloud\.com)/i, regionGroup: 1 }
  ];

  function detectVendorFromHeaders(responseHeaders) {
    if (!responseHeaders || !responseHeaders.length) return null;
    var headerMap = new Map();
    for (var i = 0; i < responseHeaders.length; i++) {
      headerMap.set(responseHeaders[i].name.toLowerCase(), responseHeaders[i].value || '');
    }

    for (var v = 0; v < VENDOR_HEADERS.length; v++) {
      var vendor = VENDOR_HEADERS[v];
      var matched = false;
      var region = '';

      for (var p = 0; p < vendor.patterns.length; p++) {
        var rule = vendor.patterns[p];
        var val = headerMap.get(rule.header);
        if (!val) continue;
        if (rule.match.test(val)) {
          matched = true;
          if (rule.value === 'region') {
            var m = val.match(rule.match);
            if (m && m[1]) region = m[1];
          }
        }
      }

      if (matched) {
        return { vendor: vendor.vendor, label: vendor.label, region: region };
      }
    }
    return null;
  }

  function detectVendorFromUrl(url) {
    try {
      var host = new URL(url).hostname.toLowerCase();
      for (var i = 0; i < VENDOR_DOMAINS.length; i++) {
        var d = VENDOR_DOMAINS[i];
        var m = host.match(d.pattern);
        if (m) {
          var region = '';
          if (m[d.regionGroup]) region = m[d.regionGroup];
          return { vendor: d.vendor, label: d.label, region: region };
        }
      }
    } catch (e) {}
    return null;
  }

  function normalizeBucketUrl(url, vendor) {
    try {
      var u = new URL(url);
      var host = u.hostname.toLowerCase();
      var pathParts = u.pathname.split('/').filter(Boolean);

      u.search = '';
      u.hash = '';

      if (vendor === 'AWS') {
        var awsMatch = host.match(/^s3[.-]([a-z0-9-]+)\.amazonaws\.com$/);
        if (awsMatch && pathParts.length > 0) {
          var bucketFromPath = pathParts[0];
          if (bucketFromPath && !bucketFromPath.includes('.')) {
            u.hostname = bucketFromPath + '.s3.amazonaws.com';
            u.pathname = '/' + pathParts.slice(1).join('/');
          }
        }
      } else if (vendor === 'Alibaba') {
        var ossMatch = host.match(/^oss-([a-z0-9-]+)\.aliyuncs\.com$/);
        if (ossMatch && pathParts.length > 0) {
          var bucketFromPath = pathParts[0];
          if (bucketFromPath) {
            u.hostname = bucketFromPath + '.' + host;
            u.pathname = '/' + pathParts.slice(1).join('/');
          }
        }
      }

      if (!u.pathname || u.pathname === '/') u.pathname = '/';
      return u.toString();
    } catch (e) {
      return url;
    }
  }

  function extractBucketName(url, vendor) {
    try {
      var u = new URL(url);
      var host = u.hostname.toLowerCase();

      if (vendor === 'AWS') {
        var m = host.match(/^([a-z0-9][a-z0-9.-]*)\.s3[.-]?/);
        if (m) return m[1];
        m = host.match(/^s3[.-][a-z0-9-]+\.amazonaws\.com$/);
        if (m) {
          var seg = u.pathname.split('/').filter(Boolean);
          return seg[0] || host;
        }
      }
      if (vendor === 'Alibaba') {
        var m = host.match(/^([a-z0-9][a-z0-9-]*)\.oss-/);
        if (m) return m[1];
        m = host.match(/^oss-[a-z0-9-]+\.aliyuncs\.com$/);
        if (m) {
          var seg = u.pathname.split('/').filter(Boolean);
          return seg[0] || host;
        }
      }
      if (vendor === 'Tencent') {
        var m = host.match(/^([a-z0-9][a-z0-9-]*)\.cos\./);
        if (m) return m[1];
      }
      if (vendor === 'Huawei') {
        var m = host.match(/^([a-z0-9][a-z0-9-]*)\.obs\./);
        if (m) return m[1];
      }

      return host;
    } catch (e) {
      return url;
    }
  }

  function generateBucketId(url, vendor) {
    var name = extractBucketName(url, vendor);
    return (vendor || 'unknown') + '::' + name;
  }

  function getLabel(vendor) {
    for (var i = 0; i < VENDOR_HEADERS.length; i++) {
      if (VENDOR_HEADERS[i].vendor === vendor) return VENDOR_HEADERS[i].label;
    }
    return vendor || 'Unknown';
  }

  return {
    VENDOR_HEADERS: VENDOR_HEADERS,
    VENDOR_DOMAINS: VENDOR_DOMAINS,
    detectVendorFromHeaders: detectVendorFromHeaders,
    detectVendorFromUrl: detectVendorFromUrl,
    normalizeBucketUrl: normalizeBucketUrl,
    extractBucketName: extractBucketName,
    generateBucketId: generateBucketId,
    getLabel: getLabel
  };
})();

if (typeof self !== 'undefined') {
  self.StiffEyesCloudBucketRules = StiffEyesCloudBucketRules;
}

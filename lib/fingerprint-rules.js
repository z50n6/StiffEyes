var StiffEyesFingerprint = (function () {
  var HEADER_RULES = [
    { type: 'server', name: 'Nginx', header: 'server', pattern: /nginx\/?([\d.]+)?/i, valueKey: 'version' },
    { type: 'server', name: 'Apache', header: 'server', pattern: /apache\/?([\d.]+)?/i, valueKey: 'version' },
    { type: 'server', name: 'Apache Tomcat', header: 'server', pattern: /apache-coyote\/?([\d.]+)?/i, valueKey: 'version' },
    { type: 'server', name: 'IIS', header: 'server', pattern: /microsoft-iis\/?([\d.]+)?/i, valueKey: 'version' },
    { type: 'server', name: 'Jetty', header: 'server', pattern: /jetty\/?([\d.]+)?/i, valueKey: 'version' },
    { type: 'server', name: 'OpenResty', header: 'server', pattern: /openresty/i },
    { type: 'server', name: 'Tengine', header: 'server', pattern: /tengine/i },
    { type: 'server', name: 'Cloudflare', header: 'server', pattern: /cloudflare/i },
    { type: 'server', name: 'Varnish', header: 'server', pattern: /varnish/i },
    { type: 'server', name: 'Resin', header: 'server', pattern: /resin/i },
    { type: 'framework', name: 'Spring', header: 'x-application-context', pattern: /([a-z0-9.-]+):([a-z0-9-]+):(\d+)/i },
    { type: 'framework', name: 'JFinal', header: 'server', pattern: /jfinal/i },
    { type: 'framework', name: 'ASP.NET', header: 'x-aspnet-version', pattern: /[\d.]+/ },
    { type: 'framework', name: 'ASP.NET MVC', header: 'x-aspnetmvc-version', pattern: /[\d.]+/ },
    { type: 'framework', name: 'Express', header: 'x-powered-by', pattern: /express/i },
    { type: 'technology', name: 'PHP', header: 'x-powered-by', pattern: /php\/?([\d.]+)?/i, valueKey: 'version' },
    { type: 'technology', name: 'Java', header: 'x-powered-by', pattern: /java|servlet/i },
    { type: 'technology', name: 'Python', header: 'server', pattern: /python/i },
    { type: 'security', name: 'HSTS', header: 'strict-transport-security', pattern: /max-age=(\d+)/i, valueKey: 'maxAge' },
    { type: 'security', name: '安全狗 WAF', header: 'x-powered-by', pattern: /^waf/i },
    { type: 'security', name: 'Janusec', header: 'x-powered-by', pattern: /janusec/i },
    { type: 'security', name: '360 防火墙', header: 'x-safe-firewall', pattern: /.+/i },
    { type: 'panel', name: 'Plesk', header: 'x-powered-by', pattern: /plesk/i },
    { type: 'os', name: 'Windows', header: 'server', pattern: /win32|win64|win10|win11/i }
  ];

  var COOKIE_RULES = [
    { type: 'technology', name: 'PHP', pattern: /PHPSESSID/i },
    { type: 'framework', name: 'ASP.NET', pattern: /ASP\.NET_SessionId|ASPSESSIONID/i },
    { type: 'technology', name: 'Java', pattern: /JSESSIONID|jeesite/i }
  ];

  var ANALYTICS_RULES = [
    {
      type: 'analytics',
      name: '百度统计',
      pattern: /hm\.baidu\.com\/hm\.js/i,
      detail: '用户访问数据可能被百度记录'
    },
    {
      type: 'analytics',
      name: 'Google Analytics',
      pattern: /google-analytics\.com|googletagmanager\.com/i,
      detail: '用户访问数据可能被 Google 记录'
    },
    {
      type: 'analytics',
      name: '雅虎统计',
      pattern: /analytics\.yahoo\.com/i,
      detail: '用户访问数据可能被雅虎记录'
    }
  ];

  function matchHeaders(headers) {
    var map = {};
    (headers || []).forEach(function (h) {
      if (h && h.name) map[h.name.toLowerCase()] = h.value || '';
    });
    var found = [];
    var seen = {};

    HEADER_RULES.forEach(function (rule) {
      var val = map[rule.header.toLowerCase()];
      if (!val || !rule.pattern.test(val)) return;
      var m = val.match(rule.pattern);
      var key = rule.type + ':' + rule.name;
      if (seen[key]) return;
      seen[key] = true;
      found.push({
        type: rule.type,
        name: rule.name,
        source: '响应头 ' + rule.header,
        detail: rule.valueKey && m && m[1] ? rule.valueKey + '=' + m[1] : val.slice(0, 120)
      });
    });

    var cookie = map['set-cookie'] || '';
    COOKIE_RULES.forEach(function (rule) {
      if (!rule.pattern.test(cookie)) return;
      var key = rule.type + ':' + rule.name + ':cookie';
      if (seen[key]) return;
      seen[key] = true;
      found.push({
        type: rule.type,
        name: rule.name,
        source: 'Set-Cookie',
        detail: '通过 Cookie 识别技术栈'
      });
    });
    return found;
  }

  function matchAnalyticsUrl(url) {
    if (!url) return null;
    for (var i = 0; i < ANALYTICS_RULES.length; i++) {
      var rule = ANALYTICS_RULES[i];
      if (rule.pattern.test(url)) {
        return {
          type: rule.type,
          name: rule.name,
          source: '网络请求',
          detail: rule.detail
        };
      }
    }
    return null;
  }

  function mergeFingerprints(existing, incoming) {
    var merged = (existing || []).slice();
    var seen = {};
    merged.forEach(function (f) {
      seen[f.type + ':' + f.name + ':' + f.source] = true;
    });
    (incoming || []).forEach(function (f) {
      var key = f.type + ':' + f.name + ':' + f.source;
      if (seen[key]) return;
      seen[key] = true;
      merged.push(f);
    });
    return merged;
  }

  return {
    matchHeaders: matchHeaders,
    matchAnalyticsUrl: matchAnalyticsUrl,
    mergeFingerprints: mergeFingerprints,
    HEADER_RULES: HEADER_RULES
  };
})();

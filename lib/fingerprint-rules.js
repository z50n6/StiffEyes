// 指纹识别配置 (ES module, compatible with importScripts via window global)
const FINGERPRINT_CONFIG = {
  HEADERS: [
    {type: 'server',name: 'Apache',pattern: /apache\/?([\d\.]+)?/i,header: 'server',value:'version'},
    {type: 'server',name: 'Apache Tomcat',pattern: /apache-(coyote)\/?([\d\.]+)?/i,header: 'server',value:'component,version',extType: 'technology', extName: 'Java'},
    {type: 'server',name: 'Nginx',pattern: /nginx\/?([\d\.]+)?/i,header: 'server',value:'version'},
    {type: 'server',name: 'IIS',pattern: /microsoft-iis\/?([\d\.]+)?/i,header: 'server',value:'version',extType: 'os', extName: 'Windows'},
    {type: 'server',name: 'Jetty',pattern: /jetty\s?\/?\(?([0-9a-zA-Z.-]*)\)?/i,header: 'server',value:'version',extType: 'technology', extName: 'Java'},
    {type: 'server',name: 'Resin',pattern: /resin\/?([\d\.]+)?/i,header: 'server',value:'version'},
    {type: 'server',name: 'Cloudflare',pattern: /cloudflare\/?([\d\.]+)?/i,header: 'server',value:'version'},
    {type: 'server',name: 'Varnish',pattern: /varnish\/?([\d\.]+)?/i,header: 'server',value:'version'},
    {type: 'server',name: 'OpenResty',pattern: /openresty\/?([\d\.]+)?/i,header: 'server',value:'version',extType: 'server', extName: 'Nginx'},
    {type: 'server',name: 'Tengine',pattern: /tengine\/?([\d\.]+)?/i,header: 'server',value:'version'},
    {type: 'server',name: 'BWS',pattern: /bws\/?([\d\.]+)?/i,header: 'server',value:'version'},
    {type: 'server',name: 'Zeus',pattern: /zeus\/?([\d\.]+)?/i,header: 'server',value:'version'},
    {type: 'server',name: 'Server',pattern: /waf|server\/?([\d\.]+)?/i,header: 'server',value:'version'},
    {type: 'component',name: 'OpenSSL',pattern: /openssl\s?\/?\(?([0-9a-zA-Z.-]*)\)?/i,header: 'server',value:'version'},
    {type: 'component',name: 'Mod_wsgi',pattern: /mod_wsgi+\s?\/?\(?([0-9a-zA-Z.-]*)\)?/i,header: 'server',value:'version'},
    {type: 'component',name: 'Mod_fcgid',pattern: /mod_fcgid+\s?\/?\(?([0-9a-zA-Z.-]*)\)?/i,header: 'server',value:'version'},
    {type: 'component',name: 'Mod_log_rotate',pattern: /mod_log_rotate+\s?\/?\(?([0-9a-zA-Z.-]*)\)?/i,header: 'server',value:'version'},
    {type: 'os',name: 'Windows',pattern: /win64|win32|win10|win7|win8|win11/i,header: 'server'},
    {type: 'os',name: 'Ubuntu',pattern: /ubuntu/i,header: 'server'},
    {type: 'os',name: 'Unix',pattern: /unix/i,header: 'server'},
    {type: 'framework',name: 'Spring',pattern: /([a-zA-Z0-9\.\-]+):([a-zA-Z0-9\-]+):(\d+)/i,header: 'x-application-context',value:'app,env,port',extType: 'technology', extName: 'Java'},
    {type: 'framework',name: 'JFinal',pattern: /jfinal\s?\/?([\d\.]+)?/i,header: 'server',value:'version',extType: 'technology', extName: 'Java'},
    {type: 'framework',name: 'ASP.NET',pattern: /[0-9.]+/i,header: 'x-aspnet-version',value:'version'},
    {type: 'framework',name: 'ASP.NET',pattern: /asp.net/i,header: 'x-powered-by'},
    {type: 'framework',name: 'ASP.NET',match: /ASP\.NET_SessionId|ASPSESSIONID/i,header: 'set-cookie'},
    {type: 'framework',name: 'ASP.NET MVC',pattern: /[0-9.]+/i,header: 'x-aspnetmvc-version',value:'version'},
    {type: 'framework',name: 'Express',pattern: /express/i,header: 'x-powered-by',extType: 'technology', extName: 'Node.js'},
    {type: 'technology',name: 'PHP',pattern:/php\/?([\d\.]+)?/i,header: 'x-powered-by',value:'version'},
    {type: 'technology',name: 'PHP',pattern:/PHPSESSID/i,header: 'set-cookie',value:'version'},
    {type: 'technology',name: 'Java',pattern: /java/i,header: 'x-powered-by'},
    {type: 'technology',name: 'Java',pattern: /JSESSIONID|jeesite/i,header: 'set-cookie'},
    {type: 'technology',name: 'Python',pattern: /python\/?([\d\.]+)?/i,header: 'server',value:'version'},
    {type: 'security',name: '安全狗',pattern: /^waf\/?([\d\.]+)?$/i,header: 'x-powered-by',value:'version'},
    {type: 'security',name: 'Janusec',pattern: /janusec/i,header: 'x-powered-by'},
    {type: 'security',name: '360',pattern: /([a-zA-Z0-9\-\.]+)\s([0-9.]+)\s([A-Za-z0-9]+)$/i,header: 'x-safe-firewall',value:'app,version,appType'},
    {type: 'security',name: 'HSTS',pattern: /max-age=(\d+)/i,header: 'strict-transport-security',value:'time'},
    {type: 'panel',name: 'Plesk',pattern: /plesk/i,header: 'x-powered-by'},
  ],
  // Cookie 识别配置
  COOKIES: [
    {type: 'technology',name: 'PHP',match: /PHPSESSID/i},
    {type: 'framework',name: 'ASP.NET',match: /ASP\.NET_SessionId|ASPSESSIONID/i},
    {type: 'technology',name: 'Java',match: /JSESSIONID|jeesite/i},
  ],
  ANALYTICS: {
    baidu: {
      pattern: '*://hm.baidu.com/hm.js*',
      name: '百度统计',
      description: '通过网络请求识别到百度统计服务，网站的用户访问数据会被百度记录',
      version: 'Baidu Analytics'
    },
    yahoo: {
      pattern: '*://analytics.yahoo.com/*',
      name: '雅虎统计',
      description: '通过网络请求识别到雅虎统计服务，网站的用户访问数据会被雅虎记录',
      version: 'Yahoo Analytics'
    },
    google: {
      pattern: '*://www.google-analytics.com/*',
      name: '谷歌统计',
      description: '通过网络请求识别到谷歌统计服务，网站的用户访问数据会被谷歌记录',
      version: 'Google Analytics'
    }
  },
  DESCRIPTIONS: [
    {name: 'framework',description: '框架'},
    {name: 'technology',description: '语言'},
    {name: 'security',description: '(安全应用/策略)'},
    {name: 'server',description: '服务器'},
    {name: 'os',description: '操作系统'},
    {name: 'app',description: '应用'},
    {name: 'env',description: '环境'},
    {name: 'port',description: '端口'},
    {name: 'version',description: '版本'},
    {name: 'builder',description: '构建工具'},
    {name: 'appType',description: '应用类型'},
    {name: 'time',description: '时间'},
    {name: 'component',description: '组件'},
    {name: 'panel',description: '面板'},
  ]
};

// For importScripts compatibility (sets global in service worker)
var StiffEyesFingerprint = (function () {
  var HEADER_RULES = FINGERPRINT_CONFIG.HEADERS;
  var COOKIE_RULES = FINGERPRINT_CONFIG.COOKIES;

  function matchHeaders(headers) {
    var headerMap = new Map((headers || []).map(function (h) { return [h.name.toLowerCase(), h.value]; }));
    var found = [];
    var seen = {};

    HEADER_RULES.forEach(function (rule) {
      var val = headerMap.get(rule.header);
      if (!val || !rule.pattern.test(val)) return;
      var m = val.match(rule.pattern);
      var key = rule.type + ':' + rule.name;
      if (seen[key]) return;
      seen[key] = true;
      found.push({
        type: rule.type,
        name: rule.name,
        source: '响应头 ' + rule.header,
        detail: rule.value && m && m[1] ? rule.value + '=' + m[1] : val.slice(0, 120)
      });
    });

    var cookie = headerMap.get('set-cookie') || '';
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
    var rules = [
      { type: 'analytics', name: '百度统计', pattern: /hm\.baidu\.com\/hm\.js/i, detail: '用户访问数据可能被百度记录' },
      { type: 'analytics', name: 'Google Analytics', pattern: /google-analytics\.com|googletagmanager\.com/i, detail: '用户访问数据可能被 Google 记录' },
      { type: 'analytics', name: '雅虎统计', pattern: /analytics\.yahoo\.com/i, detail: '用户访问数据可能被雅虎记录' }
    ];
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].pattern.test(url)) {
        return { type: rules[i].type, name: rules[i].name, source: '网络请求', detail: rules[i].detail };
      }
    }
    return null;
  }

  function mergeFingerprints(existing, incoming) {
    var merged = (existing || []).slice();
    var seen = {};
    merged.forEach(function (f) { seen[f.type + ':' + f.name + ':' + f.source] = true; });
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

// For importScripts in service worker
if (typeof self !== 'undefined') {
  self.StiffEyesFingerprint = StiffEyesFingerprint;
  self.FINGERPRINT_CONFIG = FINGERPRINT_CONFIG;
}

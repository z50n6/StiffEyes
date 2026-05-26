var StiffEyesPatterns = (function () {
  var DOMAIN_BLACKLIST_WORDS = [
    'el.datepicker.today',
    'obj.style.top',
    'window.top',
    'mydragdiv.style.top',
    'container.style.top',
    'location.host',
    'page.info',
    'res.info',
    'item.info'
  ];

  var STATIC_EXT =
    /\.(jpg|jpeg|png|gif|bmp|webp|svg|css|woff2?|ttf|eot|ico|mp3|mp4|m4a|wav|swf|pdf|doc|docx|zip|7z)(\?|$)/i;

  var SKIP_JS_NAMES =
    /^(jquery|vue|react|react-dom|bootstrap|layui|echarts|lodash|moment|axios|element-ui|antd)([\.-]|\.min)/i;

  var SKIP_JS_PATTERNS = [
    /^jquery([.-]?\d*\.?\d*\.?\d*)?(?:[\.-][\w-]+)?(?:[\.-]min)?\.js$/i,
    /^(?:vue|vue-router|vuex)[.-]?\d*\.?\d*\.?\d*(?:\.min)?\.js$/i,
    /^(react|react-dom)[.-]?\d*\.?\d*\.?\d*(?:\.min)?\.js$/i,
    /^bootstrap(?:\.bundle)?[.-]?\d*\.?\d*\.?\d*(?:[\.-][\w-]+)?(?:[\.-]min)?\.js$/i,
    /^(layui|layer|element-ui|ueditor|kindeditor|ant-design)[.-]?\d*\.?\d*\.?\d*(?:[\.-][\w-]+)?(?:[\.-]min)?\.js$/i,
    /^(echarts|chart|highcharts)[.-]?\d*\.?\d*\.?\d*(?:\.min)?\.js$/i,
    /^(lodash|moment|axios|md5|underscore|select2|tinymce|jsencrypt)[.-]?\d*\.?\d*\.?\d*(?:[\.-][\w-]+)?(?:[\.-]min)?\.js$/i,
    /^(?:zh|en|zh-cn|zh-tw|ja|ko)[.-]?\d*\.?\d*\.?\d*(?:\.min)?\.js$/i
  ];

  var VALUE_SHORT = new Set([
    'up', 'in', 'by', 'of', 'is', 'on', 'to', 'no', 'key', 'url', 'uid', 'token', 'null', 'true', 'false'
  ]);

  var VALUE_MEDIUM = new Set([
    'password', 'username', 'account', 'admin', 'localStorage', 'sessionStorage', 'undefined', 'function'
  ]);

  var VALUE_KEY_BLACK = new Set(['size', 'row', 'dict', 'time', 'type', 'name', 'code', 'data', 'list']);

  var PATTERNS = {
    domain:
      /\b(?:(?!this)[a-z0-9-]+\.)+(?:com|cn|net|org|io|dev|app|co|edu|gov|info|biz|top|xyz|club|site|online|tech|shop|cc|tv|me|uk|jp|kr|hk|tw|cloud|pro|vip|live|wang|work|group|pub|run|city|space|host|fun|store|link|fans|asia|studio|vin|news|tax|market|sale)(?::\d{1,5})?\b/gi,
    domainInQuotes:
      /["'](?:(?:[a-z]+:)?\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d{1,5})?)\/?["']/gi,
    ip: /\b(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?::\d{1,5})?\b/g,
    innerIp:
      /\b(?:127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?::\d{1,5})?\b/g,
    urlAbs: /["'](https?:\/\/[^"'<>\s]+)["']/gi,
    urlRel: /["']((?:\/|\.\/|\.\.\/)[^"'<>\s]+)["']/gi,
    /** 匹配引号内的 /、./、../ 路径，以及不含 text/application 的 xxx/yyy 形式 */
    apiInterface:
      /['"`](?:\/|\.\.\/|\.\/)[^\/\>\< \)\(\}\,\'\"\\](?:[^\^\>\< \)\(\,\'\"\\])*?['"`]|['"`][a-zA-Z0-9]+(?<!text|application)\/(?:[^\^\>\< \)\(\{\}\,\'\"\\])*?["'`]/g,
    apiPath:
      /["'](\/(?:api|v\d|rest|graphql|services|gateway|rpc)[^"'<>\s]*)["']/gi,
    adminPath: /["'](\/(?:admin|manage|manager|system|console|dashboard|backend|internal)[^"'<>\s]*)["']/gi,
    jsFile: /["']([^"'<>\s]+\.(?:js|mjs|cjs|jsx|ts|tsx|vue)(?:\?[^"'<>\s]*)?)["']/gi,
    githubUrl: /https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[^\s"'<>]*)?/gi,
    websocket: /wss?:\/\/[^\s"'<>]+/gi,
    s3Url: /https?:\/\/[a-z0-9.-]+\.s3[.-][a-z0-9.-]+\.amazonaws\.com[^\s"'<>]*/gi,
    endpoint:
      /["'](\/[^"'<>\s]*?\.(?:php|jsp|aspx|ashx|asmx|do|action|cgi|pl|py|rb|cfm|htm|html|json|xml)(?:\?[^"'<>\s]*)?)["']/gi,
    endpointNamed:
      /["'](\/(?:api|v\d|rest|graphql|services|gateway|rpc|user|auth|login|register|upload|download|file|pay|order|admin|manage|system|config|search|export|import|report|message|notify|webhook|callback|oauth|sso)[^"'<>\s]*)["']/gi,
    jwt:
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9._-]{8,}\.[A-Za-z0-9._-]{8,}\b/g,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(?!png|jpg|jpeg|gif|svg)[a-zA-Z]{2,}/g,
    phone: /\b1[3-9]\d{9}\b/g,
    idCard:
      /\b\d{6}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g,
    credentials:
      /(?:['"]?\w*(?:pwd|pass|user|member|account|password|passwd|admin|root|system)[\w-]*['"]?\s*[:=]\s*['"][^,'"\s()]{2,}['"])/gi,
    idKey:
      /(?:access[_-]?token|api[_-]?key|secret[_-]?key|auth[_-]?token|app[_-]?secret|client[_-]?secret)\s*[=:]\s*['"][^'"]{8,}['"]/gi,
    cookie: /\b\w*(?:token|PHPSESSID|JSESSIONID)\s*[:=]\s*['"]?(?!localStorage)[a-zA-Z0-9._-]{4,}['"]?/gi,
    idParam: /\b(?:id|\w+id)\s*=\s*\d{2,15}\b/gi,
    shiro: /(?:=deleteMe|rememberMe=)/gi,
    swagger: /(?:swagger-ui\.html|"swagger"\s*:|Swagger UI|swaggerUi)/gi,
    jdbc: /jdbc:[a-z:]+:\/\/[^\s"'<>]+/gi,
    redirectParam:
      /[?&](?:goto|redirect_to|redirect_url|jump_to|return_url|target|next|url)\s*=/gi,
    privateKey: /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/gi,
    githubToken: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}\b/g,
    aliyunKey: /\bLTAI[A-Za-z\d]{12,30}\b/g,
    tencentKey: /\bAKID[A-Za-z\d]{13,40}\b/g,
    jingdongKey: /\bJDC_[0-9A-Z]{25,40}\b/g,
    baiduAk: /\bAK[A-Za-z0-9]{10,40}\b/g,
    awsKey: /\b(?:AKIA|ASIA|AIDA|AROA)[0-9A-Z]{16}\b/g,
    googleKey: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    huoshanKey: /\b(?:AKLT|AKTP)[a-zA-Z0-9]{16,50}\b/g,
    wechatKey: /\bwx[a-z0-9]{15,18}\b/g,
    workWechatKey: /\bww[a-z0-9]{15,18}\b/g,
    gitlabToken: /\bglpat-[a-zA-Z0-9\-=_]{20,}\b/g,
    token: /\b(?:token|access_token|bearer)\s*[=:]\s*['"]?[A-Za-z0-9._-]{16,}/gi
  };

  var CLOUD_SENSITIVE_KEYS = [
    'aliyunKey',
    'tencentKey',
    'jingdongKey',
    'baiduAk',
    'awsKey',
    'googleKey',
    'huoshanKey',
    'wechatKey',
    'workWechatKey'
  ];

  var CRED_SENSITIVE_KEYS = [
    'jwt',
    'token',
    'credentials',
    'idKey',
    'privateKey',
    'githubToken',
    'gitlabToken',
    'cookie'
  ];

  var PII_SENSITIVE_KEYS = ['email', 'phone', 'idCard'];

  var SECURITY_SENSITIVE_KEYS = [
    'shiro',
    'swagger',
    'jdbc',
    'redirectParam',
    'innerIp',
    'idParam'
  ];

  /** 信息收集分类（与扫描引擎输出字段一致） */
  var SCAN_TABS = [
    { id: 'domains', label: '域名', kind: 'snow', field: 'domains', copy: true },
    {
      id: 'absoluteApis',
      label: 'API接口(绝对路径)',
      kind: 'snow',
      field: 'absoluteApis',
      copy: true,
      copyUrl: 'absolute'
    },
    {
      id: 'apis',
      label: 'API接口(相对路径)',
      kind: 'snow',
      field: 'apis',
      copy: true,
      copyUrl: 'relative'
    },
    { id: 'moduleFiles', label: '模块路径', kind: 'snow', field: 'moduleFiles', copy: true },
    { id: 'docFiles', label: '文档文件', kind: 'snow', field: 'docFiles', copy: true },
    { id: 'credentials', label: '用户名密码', kind: 'snow', field: 'credentials', copy: true },
    { id: 'cookies', label: 'Cookie', kind: 'snow', field: 'cookies', copy: true },
    { id: 'idKeys', label: 'ID密钥', kind: 'snow', field: 'idKeys', copy: true },
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

  var SNOW_RESULT_FIELDS = [
    'domains',
    'absoluteApis',
    'apis',
    'moduleFiles',
    'docFiles',
    'credentials',
    'cookies',
    'idKeys',
    'phones',
    'emails',
    'idcards',
    'ips',
    'companies',
    'jwts',
    'imageFiles',
    'githubUrls',
    'vueFiles',
    'jsFiles',
    'urls'
  ];

  var SENSITIVE_LABELS = {
    email: '邮箱',
    phone: '手机号',
    idCard: '身份证',
    jwt: 'JWT',
    credentials: '账密片段',
    idKey: '密钥字段',
    cookie: 'Cookie',
    idParam: 'ID 参数',
    shiro: 'Shiro',
    swagger: 'Swagger',
    jdbc: 'JDBC',
    redirectParam: '跳转参数',
    privateKey: '私钥',
    githubToken: 'GitHub Token',
    innerIp: '内网 IP',
    aliyunKey: '阿里云 Key',
    tencentKey: '腾讯云 Key',
    jingdongKey: '京东云 Key',
    baiduAk: '百度云 Key',
    awsKey: 'AWS Key',
    googleKey: 'Google API Key',
    huoshanKey: '火山引擎 Key',
    wechatKey: '微信开放平台 Key',
    workWechatKey: '企业微信 Key',
    gitlabToken: 'GitLab Token',
    token: 'Token'
  };

  var PAGE_FINGERPRINTS = [
    {
      type: 'builder',
      name: 'Webpack',
      pattern: /(?:webpackJsonp|__webpack_require__|webpackChunk|webpack-dev-server)/i,
      description: 'Webpack 打包运行时'
    },
    {
      type: 'builder',
      name: 'Webpack 产物',
      pattern: /(?:chunk|main|app|vendor|common)s?(?:[-.][a-f0-9]{8,20})+\.(?:css|js)/i,
      description: 'Webpack 分块产物命名'
    },
    {
      type: 'framework',
      name: 'Vue',
      pattern: /(?:Vue\.version|createApp\(|__VUE__|data-v-[a-f0-9]{8})/i,
      description: 'Vue 框架'
    },
    {
      type: 'framework',
      name: 'React',
      pattern: /(?:react-dom|__REACT_DEVTOOLS|createRoot\(|data-reactroot)/i,
      description: 'React 框架'
    },
    {
      type: 'framework',
      name: 'Django',
      pattern: /csrfmiddlewaretoken/i,
      description: 'Django 框架'
    },
    {
      type: 'framework',
      name: 'Angular',
      pattern: /(?:ng-version|angular\.module|@angular\/core)/i,
      description: 'Angular 框架'
    },
    {
      type: 'cdn',
      name: 'jsDelivr',
      pattern: /cdn\.jsdelivr\.net/i,
      description: 'jsDelivr CDN'
    },
    {
      type: 'cdn',
      name: 'Cloudflare CDN',
      pattern: /cdnjs\.cloudflare\.com/i,
      description: 'Cloudflare CDN'
    },
    {
      type: 'builder',
      name: 'Visual Studio',
      pattern: /visual\sstudio/i,
      description: 'Visual Studio 构建痕迹'
    }
  ];

  var STATIC_TAG_ATTRS = ['href', 'src', 'action', 'data-src', 'data-url', 'poster'];

  var API_ASSET = {
    FONT: /\.(ttf|eot|woff2?|otf|css)(?:\?|$)/i,
    IMAGE: /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|mp3|mp4|m4a|wav|swf)(?:\?|$)/i,
    JS: /\.(js|jsx|ts|tsx|less|mjs|cjs)(?:\?|$)/i,
    DOC: /\.(pdf|doc|docx|xls|xlsx|ppt|exe|apk|zip|7z|dll|dmg|pptx|txt|rar|md|csv)(?:\?|$)/i
  };

  var API_FILTERED = [
    'multipart/form-data',
    'node_modules/',
    'pause/break',
    'partial/ajax',
    'chrome/',
    'firefox/',
    'edge/',
    'static/js/',
    'static/css/',
    'stylesheet/less',
    'jpg/jpeg/png/pdf',
    'zrender/vml/vml'
  ];

  var API_REL_PREFIX_BLACK =
    /^(audio|blots|core|ace|icon|css|formats|image|js|modules|text|themes|ui|video|static|attributors|application)/;

  function stripApiQuotes(s) {
    s = String(s || '').trim();
    var q = s.charAt(0);
    if ((q === '"' || q === "'" || q === '`') && s.charAt(s.length - 1) === q) {
      return s.slice(1, -1);
    }
    return s;
  }

  function routeStaticAsset(match, state) {
    if (API_ASSET.FONT.test(match)) return true;
    if (API_ASSET.IMAGE.test(match)) return true;
    if (API_ASSET.JS.test(match)) {
      if (state.assets && state.assets.jsFiles) {
        if (!state.skipThirdPartyJs || !shouldSkipJsUrl(match)) {
          state.assets.jsFiles.add(match);
        }
      }
      return true;
    }
    if (API_ASSET.DOC.test(match)) return true;
    return false;
  }

  /** 将 apiPath / 端点 等已识别路径并入 API 接口分类 */
  function feedApiCandidates(state) {
    if (!state || !state.apiInterface || !state.assets) return;
    ['apis', 'adminPaths', 'endpoints'].forEach(function (field) {
      var bucket = state.assets[field];
      if (!bucket || !bucket.forEach) return;
      bucket.forEach(function (p) {
        classifyApiMatch('"' + p + '"', state);
      });
    });
  }

  /** 以 / 开头 → 绝对路径；否则 → 相对路径 */
  function classifyApiMatch(raw, state) {
    if (!state.apiInterface) {
      state.apiInterface = { absolute: new Set(), relative: new Set() };
    }
    var match = stripApiQuotes(raw);
    if (!match || match.length < 2) return;
    var lc = match.toLowerCase();
    if (API_FILTERED.some(function (t) {
      return lc === t.toLowerCase();
    })) {
      return;
    }
    if (routeStaticAsset(match, state)) return;

    if (match.indexOf('./') === 0) return;

    if (match.charAt(0) === '/') {
      if (match.length <= 4 && /[A-Z\.\/\#\+\?23]/.test(match.slice(1))) return;
      state.apiInterface.absolute.add(match);
      return;
    }

    if (API_REL_PREFIX_BLACK.test(match)) return;
    if (match.length <= 4) return;
    if (/^[A-Za-z]+\/[A-Za-z_]+$/.test(match) && lc.indexOf('api') < 0) return;

    state.apiInterface.relative.add(match);
  }

  function classifyHttpUrl(url, state, pageHost) {
    try {
      var u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
      var host = (pageHost || '').toLowerCase();
      if (host && u.host.toLowerCase() === host) {
        classifyApiMatch(u.pathname + (u.search || ''), state);
      } else if (/github\.com/i.test(u.href) && state.assets && state.assets.githubUrls) {
        state.assets.githubUrls.add(u.href);
      }
    } catch (e) {}
  }

  function isValidIp(ip) {
    if (!ip) return false;
    var host = String(ip).split(':')[0];
    if (host === '0.0.0.0' || host === '255.255.255.255') return false;
    var parts = host.split('.');
    if (parts.length !== 4) return false;
    for (var i = 0; i < 4; i++) {
      var n = parseInt(parts[i], 10);
      if (isNaN(n) || n < 0 || n > 255) return false;
    }
    return true;
  }

  function isDomainBlacklisted(domain) {
    var d = String(domain || '').toLowerCase();
    return DOMAIN_BLACKLIST_WORDS.some(function (w) {
      return d.indexOf(w) >= 0;
    });
  }

  function shouldSkipJsUrl(url) {
    try {
      var name = (url.split('/').pop() || '').split('?')[0];
      if (!name) return false;
      if (SKIP_JS_NAMES.test(name)) return true;
      return SKIP_JS_PATTERNS.some(function (re) {
        return re.test(name);
      });
    } catch (e) {
      return false;
    }
  }

  function filterSensitiveMatch(key, raw) {
    var value = String(raw || '').trim();
    if (value.length < 4) return true;
    var lower = value.toLowerCase();
    if (VALUE_SHORT.has(lower)) return true;
    if (VALUE_MEDIUM.has(lower) && value.length < 14) return true;
    if ((key === 'idKey' || key === 'token' || key === 'cookie') && VALUE_KEY_BLACK.has(lower)) {
      return true;
    }
    if (key === 'email' && /\.(png|jpg|jpeg|gif|svg|css|js)$/i.test(value)) return true;
    if (key === 'baiduAk' && /^AKID/i.test(value)) return true;
    if (key === 'phone' && !/^1[3-9]\d{9}$/.test(value.replace(/[-\s]/g, ''))) {
      return true;
    }
    return false;
  }

  function isSnowScanResult(data) {
    return (
      data &&
      (Array.isArray(data.absoluteApis) ||
        Array.isArray(data.apis) ||
        (data.domains && data.domains.length && Array.isArray(data.domains[0])))
    );
  }

  function normalizeScanResult(data) {
    if (!data) return data;
    if (isSnowScanResult(data)) {
      return countResults(data);
    }
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
    SNOW_RESULT_FIELDS.forEach(function (f) {
      empty[f] = [];
    });
    empty.fingers = [];
    return empty;
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

  return {
    DOMAIN_BLACKLIST_WORDS: DOMAIN_BLACKLIST_WORDS,
    STATIC_EXT: STATIC_EXT,
    SKIP_JS_NAMES: SKIP_JS_NAMES,
    SKIP_JS_PATTERNS: SKIP_JS_PATTERNS,
    STATIC_TAG_ATTRS: STATIC_TAG_ATTRS,
    PATTERNS: PATTERNS,
    SENSITIVE_LABELS: SENSITIVE_LABELS,
    SCAN_TABS: SCAN_TABS,
    SNOW_RESULT_FIELDS: SNOW_RESULT_FIELDS,
    CLOUD_SENSITIVE_KEYS: CLOUD_SENSITIVE_KEYS,
    CRED_SENSITIVE_KEYS: CRED_SENSITIVE_KEYS,
    PII_SENSITIVE_KEYS: PII_SENSITIVE_KEYS,
    SECURITY_SENSITIVE_KEYS: SECURITY_SENSITIVE_KEYS,
    PAGE_FINGERPRINTS: PAGE_FINGERPRINTS,
    isValidIp: isValidIp,
    isDomainBlacklisted: isDomainBlacklisted,
    shouldSkipJsUrl: shouldSkipJsUrl,
    filterSensitiveMatch: filterSensitiveMatch,
    classifyApiMatch: classifyApiMatch,
    classifyHttpUrl: classifyHttpUrl,
    feedApiCandidates: feedApiCandidates,
    normalizeScanResult: normalizeScanResult,
    emptyScanResult: emptyScanResult,
    countResults: countResults
  };
})();

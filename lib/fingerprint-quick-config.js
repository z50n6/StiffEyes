// 指纹识别配置 - Header/Cookie/Analytics 检测
// 用于 background.js 中的快速指纹匹配，补充 fingerprint-core.js 的深度检测
var StiffEyesFingerprintConfig = {
  HEADERS: [
    // === 服务器 ===
    {type: 'server', name: 'Apache', pattern: /apache\/?([\d\.]+)?/i, header: 'server', value: 'version'},
    {type: 'server', name: 'Apache Tomcat', pattern: /apache-(coyote)\/?([\d\.]+)?/i, header: 'server', value: 'component,version', extType: 'technology', extName: 'Java'},
    {type: 'server', name: 'Nginx', pattern: /nginx\/?([\d\.]+)?/i, header: 'server', value: 'version'},
    {type: 'server', name: 'IIS', pattern: /microsoft-iis\/?([\d\.]+)?/i, header: 'server', value: 'version', extType: 'os', extName: 'Windows'},
    {type: 'server', name: 'Jetty', pattern: /jetty\s?\/?\(?([0-9a-zA-Z.-]*)\)?/i, header: 'server', value: 'version', extType: 'technology', extName: 'Java'},
    {type: 'server', name: 'Resin', pattern: /resin\/?([\d\.]+)?/i, header: 'server', value: 'version'},
    {type: 'server', name: 'Cloudflare', pattern: /cloudflare\/?([\d\.]+)?/i, header: 'server', value: 'version'},
    {type: 'server', name: 'Varnish', pattern: /varnish\/?([\d\.]+)?/i, header: 'server', value: 'version'},
    {type: 'server', name: 'OpenResty', pattern: /openresty\/?([\d\.]+)?/i, header: 'server', value: 'version', extType: 'server', extName: 'Nginx'},
    {type: 'server', name: 'Tengine', pattern: /tengine\/?([\d\.]+)?/i, header: 'server', value: 'version'},
    {type: 'server', name: 'BWS', pattern: /bws\/?([\d\.]+)?/i, header: 'server', value: 'version'},
    {type: 'server', name: 'Zeus', pattern: /zeus\/?([\d\.]+)?/i, header: 'server', value: 'version'},
    {type: 'server', name: 'LiteSpeed', pattern: /litespeed/i, header: 'server'},
    {type: 'server', name: 'Caddy', pattern: /caddy/i, header: 'server'},
    {type: 'server', name: 'Envoy', pattern: /envoy/i, header: 'server'},
    // === 组件 ===
    {type: 'component', name: 'OpenSSL', pattern: /openssl\s?\/?\(?([0-9a-zA-Z.-]*)\)?/i, header: 'server', value: 'version'},
    {type: 'component', name: 'Mod_wsgi', pattern: /mod_wsgi+\s?\/?\(?([0-9a-zA-Z.-]*)\)?/i, header: 'server', value: 'version'},
    {type: 'component', name: 'Mod_fcgid', pattern: /mod_fcgid+\s?\/?\(?([0-9a-zA-Z.-]*)\)?/i, header: 'server', value: 'version'},
    {type: 'component', name: 'Mod_log_rotate', pattern: /mod_log_rotate+\s?\/?\(?([0-9a-zA-Z.-]*)\)?/i, header: 'server', value: 'version'},
    // === 操作系统 ===
    {type: 'os', name: 'Windows', pattern: /win64|win32|win10|win7|win8|win11/i, header: 'server'},
    {type: 'os', name: 'Ubuntu', pattern: /ubuntu/i, header: 'server'},
    {type: 'os', name: 'Unix', pattern: /unix/i, header: 'server'},
    {type: 'os', name: 'CentOS', pattern: /centos|rhel/i, header: 'server'},
    {type: 'os', name: 'Debian', pattern: /debian/i, header: 'server'},
    // === 框架 ===
    {type: 'framework', name: 'Spring', pattern: /([a-zA-Z0-9\.\-]+):([a-zA-Z0-9\-]+):(\d+)/i, header: 'x-application-context', value: 'app,env,port', extType: 'technology', extName: 'Java'},
    {type: 'framework', name: 'JFinal', pattern: /jfinal\s?\/?([\d\.]+)?/i, header: 'server', value: 'version', extType: 'technology', extName: 'Java'},
    {type: 'framework', name: 'ASP.NET', pattern: /[0-9.]+/i, header: 'x-aspnet-version', value: 'version'},
    {type: 'framework', name: 'ASP.NET', pattern: /asp.net/i, header: 'x-powered-by'},
    {type: 'framework', name: 'ASP.NET MVC', pattern: /[0-9.]+/i, header: 'x-aspnetmvc-version', value: 'version'},
    {type: 'framework', name: 'Express', pattern: /express/i, header: 'x-powered-by', extType: 'technology', extName: 'Node.js'},
    {type: 'framework', name: 'Laravel', pattern: /laravel/i, header: 'x-powered-by', extType: 'technology', extName: 'PHP'},
    // === 编程语言/技术 ===
    {type: 'technology', name: 'PHP', pattern: /php\/?([\d\.]+)?/i, header: 'x-powered-by', value: 'version'},
    {type: 'technology', name: 'PHP', pattern: /PHPSESSID/i, header: 'set-cookie'},
    {type: 'technology', name: 'Java', pattern: /java/i, header: 'x-powered-by'},
    {type: 'technology', name: 'Java', pattern: /JSESSIONID|jeesite/i, header: 'set-cookie'},
    {type: 'technology', name: 'Python', pattern: /python\/?([\d\.]+)?/i, header: 'server', value: 'version'},
    {type: 'technology', name: 'Python', pattern: /django/i, header: 'x-powered-by', extType: 'framework', extName: 'Django'},
    {type: 'technology', name: 'Ruby', pattern: /ruby|passenger/i, header: 'x-powered-by', extType: 'technology', extName: 'Ruby'},
    {type: 'technology', name: 'Go', pattern: /go-server|golang/i, header: 'x-powered-by', extType: 'technology', extName: 'Go'},
    {type: 'technology', name: 'Node.js', pattern: /node\s*express|node\.js/i, header: 'x-powered-by'},
    // === 安全组件 ===
    {type: 'security', name: '安全狗', pattern: /^waf\/?([\d\.]+)?$/i, header: 'x-powered-by', value: 'version'},
    {type: 'security', name: 'Janusec', pattern: /janusec/i, header: 'x-powered-by'},
    {type: 'security', name: '360网站卫士', pattern: /([a-zA-Z0-9\-\.]+)\s([0-9.]+)\s([A-Za-z0-9]+)$/i, header: 'x-safe-firewall', value: 'app,version,appType'},
    {type: 'security', name: 'HSTS', pattern: /max-age=(\d+)/i, header: 'strict-transport-security', value: 'time'},
    {type: 'security', name: 'XSS Protection', pattern: /mode=block/i, header: 'x-xss-protection'},
    {type: 'security', name: 'Content Security Policy', pattern: /.+/i, header: 'content-security-policy'},
    {type: 'security', name: 'X-Frame-Options', pattern: /.+/i, header: 'x-frame-options'},
    {type: 'security', name: 'Imperva Incapsula', pattern: /incap_ses|X-CDN/i, header: 'set-cookie'},
    {type: 'security', name: 'reCAPTCHA', pattern: /google\.com\/recaptcha/i, description: 'reCAPTCHA验证服务'},
    {type: 'security', name: 'Cloudflare WAF', pattern: /cf-ray|cf-cache-status/i, header: ''},
    // === 面板 ===
    {type: 'panel', name: 'Plesk', pattern: /plesk/i, header: 'x-powered-by'},
    {type: 'panel', name: 'cPanel', pattern: /cpanel/i, header: 'server'},
    {type: 'panel', name: '宝塔面板', pattern: /bt\.cn|BaoTiao/i, header: 'server'},
  ],

  // Cookie 技术识别规则
  COOKIES: [
    {type: 'technology', name: 'PHP', match: /PHPSESSID/i, description: '通过cookie识别到PHP技术栈'},
    {type: 'framework', name: 'ASP.NET', match: /ASP\.NET_SessionId|ASPSESSIONID/i, description: '通过cookie识别到ASP.NET框架'},
    {type: 'technology', name: 'Java', match: /JSESSIONID|jeesite/i, description: '通过cookie识别到Java技术栈'},
    {type: 'framework', name: 'ThinkPHP', match: /think_language|think_template/i, description: '通过cookie识别到ThinkPHP框架'},
    {type: 'framework', name: 'Laravel', match: /laravel_session|XSRF-TOKEN/i, description: '通过cookie识别到Laravel框架'},
    {type: 'technology', name: 'Django', match: /csrftoken|sessionid/i, description: '通过cookie识别到Django/Python'},
    {type: 'framework', name: 'Shiro', match: /rememberMe/i, description: '通过cookie识别到Apache Shiro'},
    {type: 'panel', name: '宝塔面板', match: /bt\.cn.*token/i, description: '通过cookie识别到宝塔面板'},
  ],

  // 统计分析工具 URL 模式 - 通过 webRequest 检测
  ANALYTICS: {
    baidu:   { pattern: '*://hm.baidu.com/hm.js*',       name: '百度统计',   description: '通过网络请求识别到百度统计服务' },
    yahoo:   { pattern: '*://analytics.yahoo.com/*',     name: '雅虎统计',   description: '通过网络请求识别到雅虎统计服务' },
    google:  { pattern: '*://www.google-analytics.com/*',name: '谷歌统计',   description: '通过网络请求识别到Google Analytics' },
    cnzz:    { pattern: '*://s.cnzz.com/*',              name: 'CNZZ统计',  description: '通过网络请求识别到CNZZ统计服务' },
    sensors: { pattern: '*://sensorsdata.cn/*',          name: '神策数据',  description: '通过网络请求识别到神策数据分析' },
    growingio:{pattern: '*://www.growing.io/*',         name: 'GrowingIO', description: '通过网络请求识别到GrowingIO' },
    baiduTongji:{pattern:'*://tongji.baidu.com/*',      name: '百度商桥',   description: '通过网络请求识别到百度商桥/统计' },
    microsoft:{pattern:'*://www.clarity.ms/*',          name: 'Microsoft Clarity',description: '识别到Microsoft Clarity分析' },
  },

  // 类型描述映射
  DESCRIPTIONS: {
    server: '服务器', technology: '编程语言', security: '安全策略',
    framework: '框架', os: '操作系统', component: '组件',
    app: '应用', env: '环境', port: '端口', version: '版本',
    builder: '构建工具', appType: '应用类型', time: '时间',
    panel: '控制面板', cdn: 'CDN/加速', analytics: '统计分析'
  }
};

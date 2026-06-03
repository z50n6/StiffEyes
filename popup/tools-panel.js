/**
 * 绷着脸 工具面板 — UA-Switcher 等渗透工具
 * 依赖 declarativeNetRequest 权限
 */
var StiffEyesToolsPanel = (function () {
  'use strict';

  var initialized = false;
  var activeTool = '';
  var selectedIndex = -1;
  var activeUA = '';
  var activeUALabel = '';

  function $(id) { return document.getElementById(id); }

  // ==================== UA 预设数据 ====================
  var UA_PRESETS = [
    // ---- Chrome Windows ----
    { browser:'Chrome',  platform:'Windows',  version:'131.0', label:'Chrome 131 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'Windows',  version:'130.0', label:'Chrome 130 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'Windows',  version:'129.0', label:'Chrome 129 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'Windows',  version:'128.0', label:'Chrome 128 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'Windows',  version:'127.0', label:'Chrome 127 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'Windows',  version:'126.0', label:'Chrome 126 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'Windows',  version:'120.0', label:'Chrome 120 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'Windows',  version:'110.0', label:'Chrome 110 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'Windows',  version:'100.0', label:'Chrome 100 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36' },
    { browser:'Chrome',  platform:'Windows',  version:'90.0',  label:'Chrome 90 · Windows 10',      ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36' },
    { browser:'Chrome',  platform:'Windows',  version:'80.0',  label:'Chrome 80 · Windows 10',      ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36' },
    { browser:'Chrome',  platform:'macOS',    version:'131.0', label:'Chrome 131 · macOS 15',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'macOS',    version:'130.0', label:'Chrome 130 · macOS 15',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'macOS',    version:'129.0', label:'Chrome 129 · macOS 15',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'Linux',    version:'131.0', label:'Chrome 131 · Linux',           ua:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'Linux',    version:'130.0', label:'Chrome 130 · Linux',           ua:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'Android',  version:'131.0', label:'Chrome 131 · Android 14',      ua:'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.135 Mobile Safari/537.36' },
    { browser:'Chrome',  platform:'Android',  version:'130.0', label:'Chrome 130 · Android 14',      ua:'Mozilla/5.0 (Linux; Android 14; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 Mobile Safari/537.36' },
    { browser:'Chrome',  platform:'ChromeOS', version:'131.0', label:'Chrome 131 · ChromeOS',        ua:'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },

    // ---- Firefox ----
    { browser:'Firefox', platform:'Windows',  version:'134.0', label:'Firefox 134 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0' },
    { browser:'Firefox', platform:'Windows',  version:'133.0', label:'Firefox 133 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0' },
    { browser:'Firefox', platform:'Windows',  version:'132.0', label:'Firefox 132 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0' },
    { browser:'Firefox', platform:'macOS',    version:'134.0', label:'Firefox 134 · macOS 15',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:134.0) Gecko/20100101 Firefox/134.0' },
    { browser:'Firefox', platform:'macOS',    version:'133.0', label:'Firefox 133 · macOS 15',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0' },
    { browser:'Firefox', platform:'Linux',    version:'134.0', label:'Firefox 134 · Linux',           ua:'Mozilla/5.0 (X11; Linux x86_64; rv:134.0) Gecko/20100101 Firefox/134.0' },
    { browser:'Firefox', platform:'Android',  version:'134.0', label:'Firefox 134 · Android 14',      ua:'Mozilla/5.0 (Android 14; Mobile; rv:134.0) Gecko/134.0 Firefox/134.0' },

    // ---- Safari ----
    { browser:'Safari',  platform:'macOS',    version:'18.2',  label:'Safari 18.2 · macOS 15',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15' },
    { browser:'Safari',  platform:'macOS',    version:'18.1',  label:'Safari 18.1 · macOS 15',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15' },
    { browser:'Safari',  platform:'macOS',    version:'17.6',  label:'Safari 17.6 · macOS 14',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15' },
    { browser:'Safari',  platform:'iOS',      version:'18.2',  label:'Safari 18.2 · iOS 18',          ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1' },
    { browser:'Safari',  platform:'iOS',      version:'18.1',  label:'Safari 18.1 · iOS 18',          ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1' },

    // ---- Edge ----
    { browser:'Edge',    platform:'Windows',  version:'131.0', label:'Edge 131 · Windows 10/11',      ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0' },
    { browser:'Edge',    platform:'Windows',  version:'130.0', label:'Edge 130 · Windows 10/11',      ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0' },
    { browser:'Edge',    platform:'macOS',    version:'131.0', label:'Edge 131 · macOS 15',            ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0' },
    { browser:'Edge',    platform:'macOS',    version:'130.0', label:'Edge 130 · macOS 15',            ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0' },

    // ---- Opera ----
    { browser:'Opera',   platform:'Windows',  version:'115.0', label:'Opera 115 · Windows 10/11',     ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/115.0.0.0' },
    { browser:'Opera',   platform:'Windows',  version:'114.0', label:'Opera 114 · Windows 10/11',     ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/114.0.0.0' },
    { browser:'Opera',   platform:'macOS',    version:'115.0', label:'Opera 115 · macOS 15',           ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/115.0.0.0' },

    // ---- Brave ----
    { browser:'Brave',   platform:'Windows',  version:'1.73',  label:'Brave 1.73 · Windows 10/11',    ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
    { browser:'Brave',   platform:'Windows',  version:'1.72',  label:'Brave 1.72 · Windows 10/11',    ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' },
    { browser:'Brave',   platform:'macOS',    version:'1.73',  label:'Brave 1.73 · macOS 15',          ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },

    // ---- Vivaldi ----
    { browser:'Vivaldi', platform:'Windows',  version:'7.0',   label:'Vivaldi 7.0 · Windows 10/11',   ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Vivaldi/7.0.3495.18' },
    { browser:'Vivaldi', platform:'macOS',    version:'7.0',   label:'Vivaldi 7.0 · macOS 15',         ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Vivaldi/7.0.3495.18' },

    // ---- Crawlers ----
    { browser:'Googlebot', platform:'-', version:'2.1', label:'Googlebot (Smartphone)',  ua:'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.135 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    { browser:'Googlebot', platform:'-', version:'2.1', label:'Googlebot (Desktop)',     ua:'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    { browser:'Bingbot',   platform:'-', version:'2.0', label:'Bingbot',                 ua:'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' },

    // ---- WeChat ----
    { browser:'WeChat',  platform:'Android', version:'8.0',  label:'WeChat 8.0 · Android 14',   ua:'Mozilla/5.0 (Linux; Android 14; 22127RK46C Build/TKQ1.220905.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.141 Mobile Safari/537.36 XWEB/5127 MMWEBSDK/20230604 MMWEBID/7189 MicroMessenger/8.0.38.2400(0x28002639) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64' },
    { browser:'WeChat',  platform:'Android', version:'7.0',  label:'WeChat 7.0 · Android 10',   ua:'Mozilla/5.0 (Linux; Android 10; Nexus 5 Build/MRA58N; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/99.0.4844.51 Mobile Safari/537.36 MicroMessenger/7.0.1' },
    { browser:'WeChat',  platform:'iOS',     version:'8.0',  label:'WeChat 8.0 · iOS 17',        ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.43(0x18002b2e) NetType/WIFI Language/zh_CN' },
    { browser:'WeChat',  platform:'iOS',     version:'7.0',  label:'WeChat 7.0 · iOS 12',        ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/7.0.12(0x17000c2f) NetType/4G Language/zh_CN' },

    // ---- 华为浏览器 ----
    { browser:'Huawei',  platform:'Android', version:'15.0', label:'华为浏览器 15.0 · Android 14', ua:'Mozilla/5.0 (Linux; Android 14; ELS-NX9; HMSCore 6.15.0.322) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 HuaweiBrowser/15.0.10.302 Mobile Safari/537.36' },
    { browser:'Huawei',  platform:'Android', version:'14.0', label:'华为浏览器 14.0 · Android 13', ua:'Mozilla/5.0 (Linux; Android 13; NOP-AN00; HMSCore 6.14.0.312) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.5359.128 HuaweiBrowser/14.0.10.302 Mobile Safari/537.36' },

    // ---- Internet Explorer ----
    { browser:'IE',  platform:'Windows', version:'11.0', label:'IE 11 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko' },
    { browser:'IE',  platform:'Windows', version:'10.0', label:'IE 10 · Windows 8',     ua:'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)' },
    { browser:'IE',  platform:'Windows', version:'9.0',  label:'IE 9 · Windows 7',      ua:'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)' },
    { browser:'IE',  platform:'macOS',   version:'5.5',  label:'IE 5.5 · Mac OS X',     ua:'Mozilla/4.0 (compatible; MSIE 5.5; Mac_PowerPC)' },
    { browser:'IE',  platform:'Linux',   version:'11.0', label:'IE 11 (模拟) · Linux',   ua:'Mozilla/5.0 (X11; Linux x86_64; Trident/7.0; rv:11.0) like Gecko' },

    // ---- Mobile Chrome (额外版本) ----
    { browser:'Chrome', platform:'Android', version:'128.0', label:'Chrome 128 · Android 14', ua:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36' },
    { browser:'Chrome', platform:'Android', version:'120.0', label:'Chrome 120 · Android 13', ua:'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36' },

    // ---- Android Browser (AOSP 原生浏览器) ----
    { browser:'Android', platform:'Android', version:'4.0', label:'Android Browser 4.0 · KitKat', ua:'Mozilla/5.0 (Linux; Android 4.4.2; Nexus 7 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.1599.105 Safari/537.36' },
    { browser:'Android', platform:'Android', version:'4.0', label:'Android Browser · Android 10', ua:'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/80.0.3987.119 Mobile Safari/537.36' }
  ];

  var BROWSERS = [
    { id:'Chrome',   name:'Chrome' },
    { id:'Firefox',  name:'Firefox' },
    { id:'Safari',   name:'Safari' },
    { id:'Edge',     name:'Edge' },
    { id:'Opera',    name:'Opera' },
    { id:'Brave',    name:'Brave' },
    { id:'Vivaldi',  name:'Vivaldi' },
    { id:'Googlebot',name:'Googlebot' },
    { id:'Bingbot',  name:'Bingbot' },
    { id:'WeChat',   name:'WeChat' },
    { id:'Huawei',   name:'华为浏览器' },
    { id:'IE',       name:'Internet Explorer' },
    { id:'Android',  name:'Android Browser' }
  ];

  // 每个浏览器支持的平台
  var BROWSER_PLATFORMS = {
    Chrome:   ['Windows','macOS','Linux','Android','ChromeOS'],
    Firefox:  ['Windows','macOS','Linux','Android'],
    Safari:   ['macOS','iOS'],
    WeChat:   ['Android','iOS'],
    Huawei:   ['Android'],
    IE:       ['Windows','macOS','Linux'],
    Android:  ['Android'],
    Edge:     ['Windows','macOS'],
    Opera:    ['Windows','macOS'],
    Brave:    ['Windows','macOS'],
    Vivaldi:  ['Windows','macOS'],
    Googlebot:['-'],
    Bingbot:  ['-']
  };

  var PLATFORM_NAMES = {
    'Windows':'Windows 10/11',
    'macOS':'macOS 15',
    'Linux':'Linux',
    'Android':'Android 14',
    'iOS':'iOS 18',
    'ChromeOS':'ChromeOS',
    '-':'通用'
  };

  // ==================== 渲染 ====================

  function buildPlatformsFor(browserId) {
    return BROWSER_PLATFORMS[browserId] || ['-'];
  }

  function renderBrowserSelect() {
    var sel = $('toolsUaBrowser');
    if (!sel) return;
    sel.innerHTML = '';
    BROWSERS.forEach(function (b) {
      var opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      sel.appendChild(opt);
    });
  }

  function renderPlatformSelect(browserId) {
    var sel = $('toolsUaPlatform');
    if (!sel) return;
    sel.innerHTML = '';
    var platforms = buildPlatformsFor(browserId);
    platforms.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p;
      opt.textContent = PLATFORM_NAMES[p] || p;
      sel.appendChild(opt);
    });
  }

  function getMatches(browser, platform) {
    return UA_PRESETS.filter(function (p) {
      return p.browser === browser && p.platform === platform;
    });
  }

  function renderMatchList(browser, platform) {
    var el = $('toolsUaList');
    if (!el) return;
    var matches = getMatches(browser, platform);
    el.innerHTML = '';

    if (!matches.length) {
      el.innerHTML = '<div class="tools-empty">该组合暂无预设 UA</div>';
      return;
    }

    matches.forEach(function (m, idx) {
      var row = document.createElement('div');
      row.className = 'tools-ua-row' + (idx === selectedIndex ? ' active' : '');
      row.dataset.index = String(idx);

      var badge = document.createElement('span');
      badge.className = 'tools-ua-row-badge';
      badge.textContent = 'v' + m.version;

      var infoDiv = document.createElement('div');
      infoDiv.className = 'tools-ua-row-info';

      var nameEl = document.createElement('span');
      nameEl.className = 'tools-ua-row-name';
      nameEl.textContent = m.browser + ' · ' + (PLATFORM_NAMES[m.platform] || m.platform);

      var metaEl = document.createElement('span');
      metaEl.className = 'tools-ua-row-meta';
      metaEl.textContent = m.label;

      infoDiv.appendChild(nameEl);
      infoDiv.appendChild(metaEl);

      var check = document.createElement('span');
      check.className = 'tools-ua-row-check';
      check.textContent = '✓';

      row.appendChild(badge);
      row.appendChild(infoDiv);
      row.appendChild(check);

      // 单击选中，双击应用
      row.addEventListener('click', function () {
        if (selectedIndex === idx) {
          // 再次点击同一行 → 应用
          applyUA(m.ua, m.label);
        } else {
          selectedIndex = idx;
          renderMatchList(browser, platform);
          $('toolsUaCustom').value = m.ua;
        }
      });

      el.appendChild(row);
    });

    // 如果已有激活 UA，尝试高亮匹配行
    if (activeUA) {
      var found = false;
      matches.forEach(function (m, idx) {
        if (m.ua === activeUA) { selectedIndex = idx; found = true; }
      });
      if (found) renderMatchList(browser, platform); // 重新渲染以更新高亮
    }
  }

  function refreshMatchList() {
    var browser = $('toolsUaBrowser')?.value || 'Chrome';
    var platform = $('toolsUaPlatform')?.value || 'Windows';
    selectedIndex = -1;
    renderMatchList(browser, platform);
  }

  // ==================== UA 操作 ====================

  function applyUA(ua, label) {
    activeUA = ua;
    activeUALabel = label;

    // 写入 storage
    chrome.storage.local.set({ ua_override: ua, ua_active_label: label });

    // 写入 DNR 规则
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [10001],
      addRules: [{
        id: 10001,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [{
            header: 'user-agent',
            operation: 'set',
            value: ua
          }]
        },
        condition: {
          urlFilter: '*',
          resourceTypes: ['main_frame', 'sub_frame', 'script', 'xmlhttprequest',
                          'websocket', 'image', 'font', 'stylesheet',
                          'media', 'ping', 'csp_report', 'other']
        }
      }]
    }).catch(function (err) {
      console.warn('DNR update failed:', err);
    });

    updateStatusBar();
  }

  function resetUA() {
    activeUA = '';
    activeUALabel = '';
    selectedIndex = -1;
    $('toolsUaCustom').value = '';

    chrome.storage.local.set({ ua_override: '', ua_active_label: '' });
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [10001]
    }).catch(function (err) {
      console.warn('DNR remove failed:', err);
    });

    updateStatusBar();
    refreshMatchList();
  }

  function applyCustom() {
    var ua = $('toolsUaCustom')?.value?.trim();
    if (!ua) return;
    applyUA(ua, '自定义 UA');
  }

  function testUA() {
    chrome.tabs.create({
      url: 'https://www.whatismybrowser.com/detect/what-is-my-user-agent/',
      active: true
    });
  }

  function updateStatusBar() {
    var bar = $('toolsStatusBar');
    var text = $('toolsStatusText');
    var resetBtn = $('toolsBtnReset');
    var testBtn = $('toolsBtnTest');

    if (activeUA) {
      bar.classList.remove('hidden');
      text.textContent = '● 已伪装: ' + activeUALabel;
      if (resetBtn) resetBtn.classList.remove('hidden');
      if (testBtn) testBtn.classList.remove('hidden');
    } else {
      bar.classList.add('hidden');
      if (resetBtn) resetBtn.classList.add('hidden');
      if (testBtn) testBtn.classList.add('hidden');
    }
  }

  function restoreState() {
    chrome.storage.local.get(['ua_override', 'ua_active_label'], function (data) {
      if (data.ua_override) {
        activeUA = data.ua_override;
        activeUALabel = data.ua_active_label || '自定义 UA';

        // 确保 DNR 规则存在（SW 重启后需重新应用）
        chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [10001],
          addRules: [{
            id: 10001,
            priority: 1,
            action: {
              type: 'modifyHeaders',
              requestHeaders: [{
                header: 'user-agent',
                operation: 'set',
                value: activeUA
              }]
            },
            condition: {
              urlFilter: '*',
              resourceTypes: ['main_frame', 'sub_frame', 'script', 'xmlhttprequest',
                              'websocket', 'image', 'font', 'stylesheet',
                              'media', 'ping', 'csp_report', 'other']
            }
          }]
        }).catch(function () {});

        $('toolsUaCustom').value = activeUA;
        updateStatusBar();
      }
    });
  }

  // ==================== 工具切换 ====================

  function showDropdown() {
    activeTool = '';
    var dropdown = $('toolsDropdown');
    var uaPanel = $('toolsPanelUa');
    if (dropdown) dropdown.classList.remove('hidden');
    if (uaPanel) uaPanel.classList.add('hidden');
    $('toolsBtnReset').classList.add('hidden');
    $('toolsBtnTest').classList.add('hidden');
    $('toolsStatusBar').classList.add('hidden');
  }

  function switchTool(toolId) {
    activeTool = toolId;
    var dropdown = $('toolsDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    if (toolId === 'ua-switcher') {
      var uaPanel = $('toolsPanelUa');
      if (uaPanel) uaPanel.classList.remove('hidden');
      renderBrowserSelect();
      renderPlatformSelect('Chrome');
      renderMatchList('Chrome', 'Windows');
      updateStatusBar();
    }
  }

  // ==================== 事件 ====================

  function wireEvents() {
    // 悬浮下拉菜单项点击
    var dropdown = $('toolsDropdown');
    if (dropdown) {
      dropdown.querySelectorAll('.tools-dropdown-item').forEach(function (item) {
        item.addEventListener('click', function () {
          switchTool(item.dataset.tool);
        });
      });
    }

    var browserSel = $('toolsUaBrowser');
    var platformSel = $('toolsUaPlatform');

    if (browserSel) {
      browserSel.addEventListener('change', function () {
        renderPlatformSelect(browserSel.value);
        selectedIndex = -1;
        renderMatchList(browserSel.value, platformSel?.value || 'Windows');
      });
    }

    if (platformSel) {
      platformSel.addEventListener('change', function () {
        selectedIndex = -1;
        renderMatchList(browserSel?.value || 'Chrome', platformSel.value);
      });
    }

    var resetBtn = $('toolsBtnReset');
    if (resetBtn) resetBtn.addEventListener('click', resetUA);

    var testBtn = $('toolsBtnTest');
    if (testBtn) testBtn.addEventListener('click', testUA);

    var customBtn = $('toolsBtnCustom');
    if (customBtn) customBtn.addEventListener('click', applyCustom);

    // 自定义输入框回车应用
    var customInput = $('toolsUaCustom');
    if (customInput) {
      customInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); applyCustom(); }
      });
    }
  }

  function init() {
    if (!initialized) {
      wireEvents();
      initialized = true;
    }
    // 初始显示悬浮下拉
    showDropdown();
    restoreState();
  }

  return { init: init, showDropdown: showDropdown };
})();

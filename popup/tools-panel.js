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
    // ---- Chrome ----
    { browser:'Chrome',  platform:'Windows',  version:'131.0', label:'Chrome 131 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'Windows',  version:'130.0', label:'Chrome 130 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'Windows',  version:'129.0', label:'Chrome 129 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36' },
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
    { browser:'Bingbot',   platform:'-', version:'2.0', label:'Bingbot',                 ua:'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' }
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
    { id:'Bingbot',  name:'Bingbot' }
  ];

  // 每个浏览器支持的平台
  var BROWSER_PLATFORMS = {
    Chrome:   ['Windows','macOS','Linux','Android','ChromeOS'],
    Firefox:  ['Windows','macOS','Linux','Android'],
    Safari:   ['macOS','iOS'],
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
      row.dataset.browser = m.browser;
      row.dataset.platform = m.platform;
      row.dataset.version = m.version;

      var radio = document.createElement('span');
      radio.className = 'tools-radio';
      radio.textContent = idx === selectedIndex ? '●' : '○';

      var info = document.createElement('span');
      info.className = 'tools-ua-info';
      info.textContent = m.label;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tools-btn-apply';
      btn.textContent = '应用';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        applyUA(m.ua, m.label);
        // 高亮当前行
        selectedIndex = idx;
        renderMatchList(browser, platform);
      });

      row.addEventListener('click', function () {
        selectedIndex = idx;
        renderMatchList(browser, platform);
        // 填入自定义框方便查看完整 UA
        $('toolsUaCustom').value = m.ua;
      });

      row.appendChild(radio);
      row.appendChild(info);
      row.appendChild(btn);
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

  function switchTool(toolId) {
    if (!toolId) {
      activeTool = '';
      var uaPanel = $('toolsPanelUa');
      if (uaPanel) uaPanel.classList.add('hidden');
      $('toolsBtnReset').classList.add('hidden');
      $('toolsBtnTest').classList.add('hidden');
      $('toolsStatusBar').classList.add('hidden');
      return;
    }

    activeTool = toolId;

    if (toolId === 'ua-switcher') {
      var uaPanel2 = $('toolsPanelUa');
      if (uaPanel2) uaPanel2.classList.remove('hidden');
      renderBrowserSelect();
      renderPlatformSelect('Chrome');
      renderMatchList('Chrome', 'Windows');
      updateStatusBar();
    }
  }

  // ==================== 事件 ====================

  function wireEvents() {
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

    var toolSel = $('toolsSelect');
    if (toolSel) {
      toolSel.addEventListener('change', function () {
        switchTool(toolSel.value);
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
    // 初始显示下拉选择，不展示任何工具
    $('toolsSelect').value = '';
    switchTool('');
    restoreState();
  }

  return { init: init };
})();

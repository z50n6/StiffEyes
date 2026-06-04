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
    { browser:'Chrome',  platform:'macOS',    version:'120.0', label:'Chrome 120 · macOS 14',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'macOS',    version:'110.0', label:'Chrome 110 · macOS 13',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'macOS',    version:'100.0', label:'Chrome 100 · macOS 12',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36' },
    { browser:'Chrome',  platform:'macOS',    version:'90.0',  label:'Chrome 90 · macOS 11',         ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36' },
    { browser:'Chrome',  platform:'Linux',    version:'131.0', label:'Chrome 131 · Linux',           ua:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'Linux',    version:'130.0', label:'Chrome 130 · Linux',           ua:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' },
    { browser:'Chrome',  platform:'Android',  version:'131.0', label:'Chrome 131 · Android 14',      ua:'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.135 Mobile Safari/537.36' },
    { browser:'Chrome',  platform:'Android',  version:'130.0', label:'Chrome 130 · Android 14',      ua:'Mozilla/5.0 (Linux; Android 14; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 Mobile Safari/537.36' },
    { browser:'Chrome',  platform:'Android',  version:'128.0', label:'Chrome 128 · Android 14',      ua:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36' },
    { browser:'Chrome',  platform:'Android',  version:'120.0', label:'Chrome 120 · Android 13',      ua:'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36' },
    { browser:'Chrome',  platform:'Android',  version:'110.0', label:'Chrome 110 · Android 13',      ua:'Mozilla/5.0 (Linux; Android 13; SM-G990B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.5481.65 Mobile Safari/537.36' },
    { browser:'Chrome',  platform:'Android',  version:'100.0', label:'Chrome 100 · Android 12',      ua:'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.58 Mobile Safari/537.36' },
    { browser:'Chrome',  platform:'Android',  version:'90.0',  label:'Chrome 90 · Android 11',       ua:'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.82 Mobile Safari/537.36' },
    { browser:'Chrome',  platform:'ChromeOS', version:'131.0', label:'Chrome 131 · ChromeOS',        ua:'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },

    // ---- Firefox Windows ----
    { browser:'Firefox', platform:'Windows', version:'134.0', label:'Firefox 134 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0' },
    { browser:'Firefox', platform:'Windows', version:'133.0', label:'Firefox 133 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0' },
    { browser:'Firefox', platform:'Windows', version:'132.0', label:'Firefox 132 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0' },
    { browser:'Firefox', platform:'Windows', version:'128.0', label:'Firefox 128 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0' },
    { browser:'Firefox', platform:'Windows', version:'125.0', label:'Firefox 125 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0' },
    { browser:'Firefox', platform:'Windows', version:'120.0', label:'Firefox 120 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0' },
    { browser:'Firefox', platform:'Windows', version:'115.0', label:'Firefox 115 ESR · Windows 10', ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Firefox/115.0' },
    { browser:'Firefox', platform:'Windows', version:'110.0', label:'Firefox 110 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:110.0) Gecko/20100101 Firefox/110.0' },
    { browser:'Firefox', platform:'Windows', version:'100.0', label:'Firefox 100 · Windows 10/11',  ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:100.0) Gecko/20100101 Firefox/100.0' },
    { browser:'Firefox', platform:'Windows', version:'90.0',  label:'Firefox 90 · Windows 10',      ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0' },
    { browser:'Firefox', platform:'Windows', version:'78.0',  label:'Firefox 78 ESR · Windows 10',   ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:78.0) Gecko/20100101 Firefox/78.0' },
    { browser:'Firefox', platform:'Windows', version:'68.0',  label:'Firefox 68 ESR · Windows 10',   ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:68.0) Gecko/20100101 Firefox/68.0' },
    { browser:'Firefox', platform:'Windows', version:'60.0',  label:'Firefox 60 · Windows 10',       ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:60.0) Gecko/20100101 Firefox/60.0' },

    // ---- Firefox macOS ----
    { browser:'Firefox', platform:'macOS', version:'134.0', label:'Firefox 134 · macOS 15',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:134.0) Gecko/20100101 Firefox/134.0' },
    { browser:'Firefox', platform:'macOS', version:'133.0', label:'Firefox 133 · macOS 15',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0' },
    { browser:'Firefox', platform:'macOS', version:'132.0', label:'Firefox 132 · macOS 15',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0' },
    { browser:'Firefox', platform:'macOS', version:'128.0', label:'Firefox 128 · macOS 15',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0' },
    { browser:'Firefox', platform:'macOS', version:'120.0', label:'Firefox 120 · macOS 14',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0' },
    { browser:'Firefox', platform:'macOS', version:'110.0', label:'Firefox 110 · macOS 13',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:110.0) Gecko/20100101 Firefox/110.0' },
    { browser:'Firefox', platform:'macOS', version:'100.0', label:'Firefox 100 · macOS 12',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:100.0) Gecko/20100101 Firefox/100.0' },
    { browser:'Firefox', platform:'macOS', version:'90.0',  label:'Firefox 90 · macOS 11',         ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:90.0) Gecko/20100101 Firefox/90.0' },

    // ---- Firefox Linux ----
    { browser:'Firefox', platform:'Linux', version:'134.0', label:'Firefox 134 · Linux',           ua:'Mozilla/5.0 (X11; Linux x86_64; rv:134.0) Gecko/20100101 Firefox/134.0' },
    { browser:'Firefox', platform:'Linux', version:'133.0', label:'Firefox 133 · Linux',           ua:'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0' },
    { browser:'Firefox', platform:'Linux', version:'128.0', label:'Firefox 128 · Linux',           ua:'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0' },
    { browser:'Firefox', platform:'Linux', version:'120.0', label:'Firefox 120 · Linux',           ua:'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0' },
    { browser:'Firefox', platform:'Linux', version:'110.0', label:'Firefox 110 · Linux',           ua:'Mozilla/5.0 (X11; Linux x86_64; rv:110.0) Gecko/20100101 Firefox/110.0' },
    { browser:'Firefox', platform:'Linux', version:'100.0', label:'Firefox 100 · Linux',           ua:'Mozilla/5.0 (X11; Linux x86_64; rv:100.0) Gecko/20100101 Firefox/100.0' },
    { browser:'Firefox', platform:'Linux', version:'90.0',  label:'Firefox 90 · Linux',            ua:'Mozilla/5.0 (X11; Linux x86_64; rv:90.0) Gecko/20100101 Firefox/90.0' },

    // ---- Firefox Android ----
    { browser:'Firefox', platform:'Android', version:'143.0', label:'Firefox 143 · Android 15',    ua:'Mozilla/5.0 (Android 15; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0' },
    { browser:'Firefox', platform:'Android', version:'140.0', label:'Firefox 140 · Android 14',    ua:'Mozilla/5.0 (Android 14; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0' },
    { browser:'Firefox', platform:'Android', version:'137.0', label:'Firefox 137 · Android 14',    ua:'Mozilla/5.0 (Android 14; Mobile; rv:137.0) Gecko/137.0 Firefox/137.0' },
    { browser:'Firefox', platform:'Android', version:'134.0', label:'Firefox 134 · Android 14',    ua:'Mozilla/5.0 (Android 14; Mobile; rv:134.0) Gecko/134.0 Firefox/134.0' },
    { browser:'Firefox', platform:'Android', version:'133.0', label:'Firefox 133 · Android 14',    ua:'Mozilla/5.0 (Android 14; Mobile; rv:133.0) Gecko/133.0 Firefox/133.0' },
    { browser:'Firefox', platform:'Android', version:'129.0', label:'Firefox 129 · Android 14',    ua:'Mozilla/5.0 (Android 14; Mobile; rv:129.0) Gecko/129.0 Firefox/129.0' },
    { browser:'Firefox', platform:'Android', version:'127.0', label:'Firefox 127 · Android 14',    ua:'Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0' },
    { browser:'Firefox', platform:'Android', version:'120.0', label:'Firefox 120 · Android 13',    ua:'Mozilla/5.0 (Android 13; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0' },
    { browser:'Firefox', platform:'Android', version:'102.0', label:'Firefox 102 · Android 12',    ua:'Mozilla/5.0 (Android 12; Mobile; rv:102.0) Gecko/102.0 Firefox/102.0' },
    { browser:'Firefox', platform:'Android', version:'84.0',  label:'Firefox 84 · Android 10',     ua:'Mozilla/5.0 (Android 10; Mobile; rv:84.0) Gecko/84.0 Firefox/84.0' },
    { browser:'Firefox', platform:'Android', version:'68.0',  label:'Firefox 68 · Android 9',      ua:'Mozilla/5.0 (Android 9; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0' },

    // ---- Firefox iOS (FxiOS) ----
    { browser:'Firefox', platform:'iOS', version:'143.1', label:'Firefox iOS 143 · iOS 18',        ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/143.1.1 Mobile/15E148 Safari/604.1' },
    { browser:'Firefox', platform:'iOS', version:'138.3', label:'Firefox iOS 138 · iOS 18',        ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/138.3 Mobile/15E148 Safari/605.1.15' },
    { browser:'Firefox', platform:'iOS', version:'129.2', label:'Firefox iOS 129 · iOS 17',        ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/129.2 Mobile/15E148 Safari/605.1.15' },
    { browser:'Firefox', platform:'iOS', version:'33.0',  label:'Firefox iOS 33 · iOS 11',         ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 11_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/33.0 Mobile/15E148 Safari/605.1.15' },

    // ---- Safari ----
    { browser:'Safari',  platform:'macOS',    version:'18.2',  label:'Safari 18.2 · macOS 15',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15' },
    { browser:'Safari',  platform:'macOS',    version:'18.1',  label:'Safari 18.1 · macOS 15',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15' },
    { browser:'Safari',  platform:'macOS',    version:'17.6',  label:'Safari 17.6 · macOS 14',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15' },
    { browser:'Safari',  platform:'macOS',    version:'17.4',  label:'Safari 17.4 · macOS 14',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15' },
    { browser:'Safari',  platform:'macOS',    version:'16.6',  label:'Safari 16.6 · macOS 13',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15' },
    { browser:'Safari',  platform:'macOS',    version:'15.6',  label:'Safari 15.6 · macOS 12',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Safari/605.1.15' },
    { browser:'Safari',  platform:'macOS',    version:'14.1',  label:'Safari 14.1 · macOS 11',        ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Safari/605.1.15' },
    { browser:'Safari',  platform:'iOS',      version:'18.2',  label:'Safari 18.2 · iOS 18',          ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1' },
    { browser:'Safari',  platform:'iOS',      version:'18.1',  label:'Safari 18.1 · iOS 18',          ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1' },
    { browser:'Safari',  platform:'iOS',      version:'17.4',  label:'Safari 17.4 · iOS 17',          ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1' },

    // ---- Edge Windows ----
    { browser:'Edge', platform:'Windows', version:'131.0', label:'Edge 131 · Windows 10/11',      ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0' },
    { browser:'Edge', platform:'Windows', version:'130.0', label:'Edge 130 · Windows 10/11',      ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0' },
    { browser:'Edge', platform:'Windows', version:'128.0', label:'Edge 128 · Windows 10/11',      ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0' },
    { browser:'Edge', platform:'Windows', version:'120.0', label:'Edge 120 · Windows 10/11',      ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0' },
    { browser:'Edge', platform:'Windows', version:'110.0', label:'Edge 110 · Windows 10/11',      ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edg/110.0.0.0' },
    { browser:'Edge', platform:'Windows', version:'100.0', label:'Edge 100 · Windows 10/11',      ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36 Edg/100.0.0.0' },

    // ---- Edge macOS ----
    { browser:'Edge', platform:'macOS', version:'131.0', label:'Edge 131 · macOS 15',            ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0' },
    { browser:'Edge', platform:'macOS', version:'130.0', label:'Edge 130 · macOS 15',            ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0' },
    { browser:'Edge', platform:'macOS', version:'128.0', label:'Edge 128 · macOS 15',            ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0' },

    // ---- Edge Linux ----
    { browser:'Edge', platform:'Linux', version:'131.0', label:'Edge 131 · Linux',               ua:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0' },
    { browser:'Edge', platform:'Linux', version:'128.0', label:'Edge 128 · Linux',               ua:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0' },
    { browser:'Edge', platform:'Linux', version:'120.0', label:'Edge 120 · Linux',               ua:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0' },
    { browser:'Edge', platform:'Linux', version:'107.0', label:'Edge 107 · Linux',               ua:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.28' },

    // ---- Edge Android (EdgA) ----
    { browser:'Edge', platform:'Android', version:'141.0', label:'Edge 141 · Android 14',        ua:'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 EdgA/141.0.0.0' },
    { browser:'Edge', platform:'Android', version:'135.0', label:'Edge 135 · Android 14',        ua:'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36 EdgA/135.0.0.0' },
    { browser:'Edge', platform:'Android', version:'126.0', label:'Edge 126 · Android 14',        ua:'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 EdgA/126.0.0.0' },
    { browser:'Edge', platform:'Android', version:'104.0', label:'Edge 104 · Android 13',        ua:'Mozilla/5.0 (Linux; Android 10; HLK-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.102 Mobile Safari/537.36 EdgA/104.0.1293.70' },
    { browser:'Edge', platform:'Android', version:'97.0',  label:'Edge 97 · Android 12',         ua:'Mozilla/5.0 (Linux; Android 11; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Mobile Safari/537.36 EdgA/97.0.1072.78' },

    // ---- Edge iOS (EdgiOS) ----
    { browser:'Edge', platform:'iOS', version:'46.3',  label:'Edge iOS 46 · iOS 14',             ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 EdgiOS/46.3.7 Mobile/15E148 Safari/605.1.15' },

    // ---- Opera ----
    { browser:'Opera', platform:'Windows', version:'115.0', label:'Opera 115 · Windows 10/11',     ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/115.0.0.0' },
    { browser:'Opera', platform:'Windows', version:'114.0', label:'Opera 114 · Windows 10/11',     ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/114.0.0.0' },
    { browser:'Opera', platform:'macOS',   version:'115.0', label:'Opera 115 · macOS 15',           ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/115.0.0.0' },
    { browser:'Opera', platform:'Linux',   version:'115.0', label:'Opera 115 · Linux',              ua:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/115.0.0.0' },

    // ---- Brave ----
    { browser:'Brave', platform:'Windows', version:'1.73',  label:'Brave 1.73 · Windows 10/11',    ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
    { browser:'Brave', platform:'Windows', version:'1.72',  label:'Brave 1.72 · Windows 10/11',    ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' },
    { browser:'Brave', platform:'macOS',   version:'1.73',  label:'Brave 1.73 · macOS 15',          ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
    { browser:'Brave', platform:'Linux',   version:'1.73',  label:'Brave 1.73 · Linux',             ua:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
    { browser:'Brave', platform:'Android', version:'1.73',  label:'Brave 1.73 · Android 14',        ua:'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Brave Chrome/131.0.0.0 Mobile Safari/537.36' },

    // ---- Vivaldi ----
    { browser:'Vivaldi', platform:'Windows', version:'7.0',   label:'Vivaldi 7.0 · Windows 10/11',   ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Vivaldi/7.0.3495.18' },
    { browser:'Vivaldi', platform:'macOS',   version:'7.0',   label:'Vivaldi 7.0 · macOS 15',         ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Vivaldi/7.0.3495.18' },
    { browser:'Vivaldi', platform:'Linux',   version:'7.0',   label:'Vivaldi 7.0 · Linux',            ua:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Vivaldi/7.0.3495.18' },

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
    { browser:'Android', platform:'Android', version:'4.0', label:'Android Browser 4.0 · Android 10',   ua:'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/80.0.3987.119 Mobile Safari/537.36' },
    { browser:'Android', platform:'Android', version:'4.0', label:'Android Browser 4.0 · KitKat',      ua:'Mozilla/5.0 (Linux; Android 4.4.2; Nexus 7 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.1599.105 Safari/537.36' },
    { browser:'Android', platform:'Android', version:'4.0', label:'Android Browser · Jelly Bean',      ua:'Mozilla/5.0 (Linux; Android 4.1.2; Nexus 7 Build/JZO54K) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.166 Safari/535.19' },
    { browser:'Android', platform:'Android', version:'4.0', label:'Android Browser · Ice Cream',       ua:'Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.133 Mobile Safari/535.19' }
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
    Firefox:  ['Windows','macOS','Linux','Android','iOS'],
    Safari:   ['macOS','iOS'],
    WeChat:   ['Android','iOS'],
    Huawei:   ['Android'],
    IE:       ['Windows','macOS','Linux'],
    Android:  ['Android'],
    Edge:     ['Windows','macOS','Linux','Android','iOS'],
    Opera:    ['Windows','macOS','Linux'],
    Brave:    ['Windows','macOS','Linux','Android'],
    Vivaldi:  ['Windows','macOS','Linux'],
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

  // 浏览器 → CSS 类名映射（用于颜色徽章）
  var BROWSER_CSS_CLASS = {
    'Chrome':   'chrome',
    'Firefox':  'firefox',
    'Safari':   'safari',
    'Edge':     'edge',
    'Opera':    'opera',
    'Brave':    'brave',
    'Vivaldi':  'vivaldi',
    'Googlebot':'googlebot',
    'Bingbot':  'bingbot',
    'WeChat':   'wechat',
    'Huawei':   'huawei',
    'IE':       'ie',
    'Android':  'android'
  };

  // 浏览器 SVG 图标（真实浏览器 logo 简化版）
  var BROWSER_SVG_ICONS = {
    'Chrome':   '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#fff"/><path d="M8 1.5A6.5 6.5 0 002 5l2.8 1.5L8 4l3.2 2.5L14 5A6.5 6.5 0 008 1.5z" fill="#ea4335"/><path d="M14 5a6.5 6.5 0 011 3.5 6.5 6.5 0 01-1 3.5l-2.8-1.5L8 4.5 14 5z" fill="#fbbc04"/><path d="M8 14.5A6.5 6.5 0 011.5 8l2.5-1.5L8 12l4-5.5 2.5 1.5A6.5 6.5 0 018 14.5z" fill="#34a853"/><circle cx="8" cy="8" r="3" fill="#fff"/><circle cx="8" cy="8" r="2.4" fill="#1a73e8"/></svg>',
    'Firefox':  '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#e66000"/><path d="M3.5 7c0-3 2-5.5 4.5-6l-.3 1.2C7 3.5 7 5 7.5 6.5 8 8 8.5 9.5 8 11c-.5 1.5-1.5 2.5-2 3.5-2-1-3-3.5-3-6.5l.5-1z" fill="#ff9500" opacity=".7"/><circle cx="10.2" cy="6" r="2.2" fill="#0250bb"/><circle cx="10.2" cy="6" r="1.2" fill="#fff" opacity=".25"/></svg>',
    'Safari':   '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#0066cc"/><circle cx="8" cy="8" r="5.2" fill="none" stroke="#fff" stroke-width=".7" opacity=".35"/><circle cx="8" cy="8" r="3.5" fill="none" stroke="#fff" stroke-width=".5" opacity=".25"/><line x1="8" y1="1.5" x2="8" y2="3.8" stroke="#fff" stroke-width="1.8" opacity=".55"/><line x1="8" y1="12.2" x2="8" y2="14.5" stroke="#fff" stroke-width="1.8" opacity=".55"/><line x1="1.5" y1="8" x2="3.8" y2="8" stroke="#fff" stroke-width="1.8" opacity=".55"/><line x1="12.2" y1="8" x2="14.5" y2="8" stroke="#fff" stroke-width="1.8" opacity=".55"/><circle cx="8" cy="2.3" r=".95" fill="#ff3b30"/></svg>',
    'Edge':     '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#0078d7"/><path d="M3.5 4.5c3.5-1.5 7.5 0 9 1.5L9.5 7C8.5 6 6.5 5.5 4.5 6L3.5 4.5z" fill="#34d399" opacity=".75"/><path d="M3.5 4.5C2 7 2.2 10.5 4.2 12.8c1.5 1.5 3.5 2.2 5.8 1.7L8.2 12.5C7 12 6 10.5 5.5 9L3.5 4.5z" fill="#fff" opacity=".22"/></svg>',
    'Opera':    '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#ff1b2d"/><ellipse cx="8" cy="8" rx="3.2" ry="4.8" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="8" cy="8" r="1.8" fill="#fff"/></svg>',
    'Brave':    '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#fb542b"/><path d="M3.2 5.5c1.3-1.8 3-3 4.8-3s3.5 1.2 4.8 3l-1-.6C10.3 3.5 9.2 3 8 3s-2.3.5-3.8 1.9l-1 .6z" fill="#fff"/><path d="M5.5 6.5h1.5L8 7.5l1-1h1.5l.3 2.5-1.3 1.7L8 12l-1.5-1.3-1.3-1.7.3-2.5z" fill="#fff"/><circle cx="6.3" cy="7.8" r=".8" fill="#fb542b"/><circle cx="9.7" cy="7.8" r=".8" fill="#fb542b"/><path d="M7.2 9.2h1.6l-.8 1.3z" fill="#fb542b"/></svg>',
    'Vivaldi':  '<svg viewBox="0 0 16 16" width="16" height="16"><rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="#ef3939"/><path d="M5.5 5l2.5 5.5 2.5-5.5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    'Googlebot':'<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#34a853"/><rect x="5" y="3" width="6" height="4" rx="1.5" fill="#fff"/><circle cx="6" cy="5" r=".7" fill="#34a853"/><circle cx="10" cy="5" r=".7" fill="#34a853"/><rect x="6" y="7" width="4" height="3" rx="1" fill="#fff"/><line x1="5" y1="9" x2="3" y2="10" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/><line x1="11" y1="9" x2="13" y2="10" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/><circle cx="3.5" cy="10.5" r="1" fill="none" stroke="#fff" stroke-width=".8"/><circle cx="12.5" cy="10.5" r="1" fill="none" stroke="#fff" stroke-width=".8"/><circle cx="7" cy="9.5" r=".5" fill="#34a853"/><circle cx="9" cy="9.5" r=".5" fill="#34a853"/></svg>',
    'Bingbot':  '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#008373"/><circle cx="7" cy="6.5" r="3.5" fill="none" stroke="#fff" stroke-width="1.3"/><line x1="9.5" y1="9" x2="13" y2="12.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
    'WeChat':   '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#07c160"/><ellipse cx="6.5" cy="8.5" rx="3.5" ry="3" fill="#fff"/><circle cx="5.5" cy="8" r=".7" fill="#07c160"/><circle cx="7.5" cy="8" r=".7" fill="#07c160"/><ellipse cx="11.5" cy="5.5" rx="2.5" ry="2.2" fill="#fff" opacity=".9"/><circle cx="10.5" cy="5" r=".5" fill="#07c160"/><circle cx="12.5" cy="5" r=".5" fill="#07c160"/></svg>',
    'Huawei':   '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#cf0a2c"/><path d="M8 2c-1.5 2-3 4-3 6s1.5 4 3 6c1.5-2 3-4 3-6s-1.5-4-3-6z" fill="#fff"/><path d="M4 5c1 1.5 1.5 3 1.5 3s-.5 1.5-1.5 3" fill="none" stroke="#cf0a2c" stroke-width=".6" opacity=".5"/><path d="M12 5c-1 1.5-1.5 3-1.5 3s.5 1.5 1.5 3" fill="none" stroke="#cf0a2c" stroke-width=".6" opacity=".5"/></svg>',
    'IE':       '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#1ebbee"/><path d="M4 3.2c-1 1.8-1.2 4-.5 6 .5 1.5 2 3.5 4.5 4.5" fill="none" stroke="#fff" stroke-width="1.2" opacity=".45" stroke-linecap="round"/><path d="M5 5.2h5c2 0 2.8 1 2.8 2.5S12 10 10 10H6.5L5 12.5" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'Android':  '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#3ddc84"/><rect x="4" y="3" width="8" height="5" rx="2" fill="#fff"/><circle cx="5.5" cy="5" r=".6" fill="#3ddc84"/><circle cx="10.5" cy="5" r=".6" fill="#3ddc84"/><path d="M5 8v3a1 1 0 002 0V8" fill="#fff"/><path d="M9 8v3a1 1 0 002 0V8" fill="#fff"/><line x1="6" y1="2" x2="7" y2="3.5" stroke="#fff" stroke-width="1" stroke-linecap="round"/><line x1="10" y1="2" x2="9" y2="3.5" stroke="#fff" stroke-width="1" stroke-linecap="round"/></svg>'
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

    // 更新计数
    var countEl = $('toolsUaCount');
    if (countEl) {
      countEl.textContent = matches.length ? matches.length + ' 个预设' : '无匹配';
    }

    if (!matches.length) {
      el.innerHTML = '<div class="tools-empty">该组合暂无预设 UA</div>';
      return;
    }

    var cssClass = BROWSER_CSS_CLASS[browser] || '';

    matches.forEach(function (m, idx) {
      var row = document.createElement('div');
      row.className = 'tools-ua-row' + (idx === selectedIndex ? ' active' : '');
      row.dataset.index = String(idx);

      var badge = document.createElement('span');
      badge.className = 'tools-ua-row-badge ' + cssClass;
      badge.textContent = 'v' + m.version;

      var infoDiv = document.createElement('div');
      infoDiv.className = 'tools-ua-row-info';

      var nameEl = document.createElement('span');
      nameEl.className = 'tools-ua-row-name';

      // 浏览器 SVG 图标
      var iconContainer = document.createElement('span');
      iconContainer.className = 'tools-ua-row-icon';
      iconContainer.innerHTML = BROWSER_SVG_ICONS[browser] || '';

      var labelSpan = document.createElement('span');
      labelSpan.textContent = m.browser + ' · ' + (PLATFORM_NAMES[m.platform] || m.platform);

      nameEl.appendChild(iconContainer);
      nameEl.appendChild(labelSpan);

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
          var customInput = $('toolsUaCustom');
          if (customInput) customInput.value = m.ua;
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
    var customInput = $('toolsUaCustom');
    if (customInput) customInput.value = '';

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
      text.textContent = '已伪装: ' + activeUALabel;
      if (resetBtn) resetBtn.classList.remove('hidden');
      if (testBtn) testBtn.classList.remove('hidden');
    } else {
      bar.classList.add('hidden');
      // 按钮随父容器隐藏即可，不需要单独 toggle
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

        var customInput = $('toolsUaCustom');
        if (customInput) customInput.value = activeUA;
        updateStatusBar();
      }
    });
  }

  // ==================== 工具切换 ====================

  function showDropdown() {
    activeTool = '';
    var dropdown = $('toolsDropdown');
    var uaPanel = $('toolsPanelUa');
    var cookiePanel = $('toolsPanelCookie');
    if (dropdown) dropdown.classList.remove('hidden');
    var clearDataPanel = $('toolsPanelClearData');
    if (uaPanel) uaPanel.classList.add('hidden');
    if (cookiePanel) cookiePanel.classList.add('hidden');
    if (clearDataPanel) clearDataPanel.classList.add('hidden');
    if ($('toolsStatusBar')) $('toolsStatusBar').classList.add('hidden');
  }

  function hideAllToolPanels() {
    ['toolsPanelUa', 'toolsPanelCookie', 'toolsPanelClearData'].forEach(function (id) {
      var p = $(id); if (p) p.classList.add('hidden');
    });
    if ($('toolsStatusBar')) $('toolsStatusBar').classList.add('hidden');
  }

  function switchTool(toolId) {
    activeTool = toolId;
    var dropdown = $('toolsDropdown');
    if (dropdown) dropdown.classList.add('hidden');
    hideAllToolPanels();

    if (toolId === 'ua-switcher') {
      var uaPanel = $('toolsPanelUa');
      if (uaPanel) uaPanel.classList.remove('hidden');
      renderBrowserSelect();
      renderPlatformSelect('Chrome');
      renderMatchList('Chrome', 'Windows');
      updateStatusBar();
    }

    if (toolId === 'cookie-editor') {
      var cookiePanel = $('toolsPanelCookie');
      if (cookiePanel) cookiePanel.classList.remove('hidden');
      initCookiePanel();
    }

    if (toolId === 'clear-data') {
      var clearPanel = $('toolsPanelClearData');
      if (clearPanel) clearPanel.classList.remove('hidden');
    }
  }

  // ==================== Cookie 管理器 ====================

  var cookieEditTarget = null; // 当前编辑的 cookie（null=新建）

  function getCurrentTabUrl(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]?.url) {
        callback(tabs[0].url);
      } else {
        callback(null);
      }
    });
  }

  function initCookiePanel() {
    cookieEditTarget = null;
    refreshCookieList();
  }

  function refreshCookieList() {
    getCurrentTabUrl(function (url) {
      if (!url) {
        $('cookieList').innerHTML = '<div class="tools-empty">无法获取当前页面</div>';
        return;
      }
      var domain = extractHost(url);
      chrome.cookies.getAll({ domain: domain }, function (cookies) {
        renderCookieList(cookies, domain);
      });
      // 也尝试不带前导点的根域
      chrome.cookies.getAll({}, function (all) {
        var matched = all.filter(function (c) {
          return url.indexOf(c.domain.replace(/^\./, '')) !== -1 ||
                 c.domain.replace(/^\./, '').indexOf(domain.replace(/^\./, '')) !== -1;
        });
        if (matched.length > 0) {
          renderCookieList(matched, domain);
        }
      });
    });
  }

  function extractHost(url) {
    try {
      var u = new URL(url);
      return u.hostname;
    } catch (e) {
      return '';
    }
  }

  function renderCookieList(cookies, domain) {
    var el = $('cookieList');
    $('cookieCount').textContent = cookies.length + ' 个 Cookie';

    if (!cookies.length) {
      el.innerHTML = '<div class="tools-empty">该站点暂无 Cookie</div>';
      return;
    }

    // 按名称排序
    cookies.sort(function (a, b) { return a.name.localeCompare(b.name); });

    var html = '';
    cookies.forEach(function (c) {
      var secureBadge = c.secure ? '<span class="tools-cookie-row-badge">🔒</span>' : '';
      var httpBadge = c.httpOnly ? '<span class="tools-cookie-row-badge">H</span>' : '';
      var sessionBadge = c.session ? '<span class="tools-cookie-row-badge">⏳</span>' : '';
      html += '<div class="tools-cookie-row" data-name="' + escAttr(c.name) + '" data-domain="' + escAttr(c.domain) + '" data-path="' + escAttr(c.path) + '">' +
        '<span class="tools-cookie-row-name" title="' + escAttr(c.name) + '">' + escHtml(c.name) + '</span>' +
        '<span class="tools-cookie-row-value" title="' + escAttr(c.value) + '">' + escHtml(c.value) + '</span>' +
        secureBadge + httpBadge + sessionBadge +
        '<button class="tools-cookie-row-del" title="删除" data-action="delete">×</button>' +
      '</div>';
    });
    el.innerHTML = html;

    // 事件委托：单击行编辑，点×删除
    el.querySelectorAll('.tools-cookie-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.dataset.action === 'delete') {
          e.stopPropagation();
          deleteCookieRow(row);
          return;
        }
        openEditForm(row);
      });
    });
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function deleteCookieRow(row) {
    var name = row.dataset.name;
    var url = 'https://' + row.dataset.domain.replace(/^\./, '') + row.dataset.path;
    chrome.cookies.remove({ url: url, name: name }, function (result) {
      refreshCookieList();
    });
  }

  function deleteAllCookies() {
    getCurrentTabUrl(function (url) {
      if (!url) return;
      var domain = extractHost(url);
      chrome.cookies.getAll({}, function (all) {
        var matched = all.filter(function (c) {
          return url.indexOf(c.domain.replace(/^\./, '')) !== -1;
        });
        if (matched.length === 0) {
          refreshCookieList();
          return;
        }
        var count = matched.length;
        matched.forEach(function (c) {
          var cookieUrl = (c.secure ? 'https://' : 'http://') + c.domain.replace(/^\./, '') + c.path;
          chrome.cookies.remove({ url: cookieUrl, name: c.name }, function () {
            count--;
            if (count <= 0) refreshCookieList();
          });
        });
      });
    });
  }

  function openEditForm(row) {
    cookieEditTarget = row || null;
    var form = $('cookieFormOverlay');
    var title = $('cookieFormTitle');
    form.classList.remove('hidden');

    if (row) {
      title.textContent = '编辑 Cookie';
      $('cookieFieldName').value = row.dataset.name || '';
      $('cookieFieldValue').value = '';
      $('cookieFieldDomain').value = row.dataset.domain || '';
      $('cookieFieldPath').value = row.dataset.path || '';
      $('cookieFieldExpires').value = '';
      $('cookieFieldSameSite').value = 'unspecified';
      $('cookieFieldSecure').checked = false;
      $('cookieFieldHttpOnly').checked = false;
    } else {
      title.textContent = '新建 Cookie';
      $('cookieFieldName').value = '';
      $('cookieFieldValue').value = '';
      $('cookieFieldDomain').value = '';
      $('cookieFieldPath').value = '/';
      $('cookieFieldExpires').value = '';
      $('cookieFieldSameSite').value = 'unspecified';
      $('cookieFieldSecure').checked = false;
      $('cookieFieldHttpOnly').checked = false;
      // 预填当前 domain
      getCurrentTabUrl(function (url) {
        if (url) $('cookieFieldDomain').value = '.' + extractHost(url);
      });
    }
  }

  function closeCookieForm() {
    $('cookieFormOverlay').classList.add('hidden');
    cookieEditTarget = null;
  }

  function saveCookieFromForm() {
    var name = $('cookieFieldName').value.trim();
    var value = $('cookieFieldValue').value;
    var domain = $('cookieFieldDomain').value.trim();
    var path = $('cookieFieldPath').value.trim() || '/';
    var expiresStr = $('cookieFieldExpires').value.trim();
    var sameSite = $('cookieFieldSameSite').value;
    var secure = $('cookieFieldSecure').checked;
    var httpOnly = $('cookieFieldHttpOnly').checked;

    if (!name || !domain) return;

    var cookieProps = {
      url: (secure ? 'https://' : 'http://') + domain.replace(/^\./, '') + path,
      name: name,
      value: value,
      domain: domain,
      path: path,
      secure: secure,
      httpOnly: httpOnly,
      sameSite: sameSite
    };

    if (expiresStr) {
      try {
        var d = new Date(expiresStr);
        if (!isNaN(d.getTime())) {
          cookieProps.expirationDate = d.getTime() / 1000;
        }
      } catch (e) {}
    }

    // 如果是编辑模式且名称或域名变了，先删旧
    if (cookieEditTarget) {
      var oldName = cookieEditTarget.dataset.name;
      var oldDomain = cookieEditTarget.dataset.domain;
      var oldPath = cookieEditTarget.dataset.path;
      var oldSecure = cookieEditTarget.dataset.secure === 'true';
      var oldUrl = (oldSecure ? 'https://' : 'http://') + oldDomain.replace(/^\./, '') + oldPath;
      if (oldName !== name || oldDomain !== domain) {
        chrome.cookies.remove({ url: oldUrl, name: oldName }, function () {
          chrome.cookies.set(cookieProps, function () {
            closeCookieForm();
            refreshCookieList();
          });
        });
        return;
      }
    }

    chrome.cookies.set(cookieProps, function (result) {
      if (result) {
        closeCookieForm();
        refreshCookieList();
      } else {
        // 设置失败，可能是 secure 不匹配
        if (cookieProps.secure) {
          cookieProps.url = 'https://' + domain.replace(/^\./, '') + path;
          chrome.cookies.set(cookieProps, function (r2) {
            closeCookieForm();
            refreshCookieList();
          });
        }
      }
    });
  }

  // ==================== 清除数据 ====================

  function clearBrowsingData() {
    var statusEl = $('clearDataStatus');
    var btn = $('clearDataBtn');

    // 收集选中的数据类型
    var dataTypes = {};
    var checks = document.querySelectorAll('#clearDataTypes input[type="checkbox"]:checked');
    checks.forEach(function (cb) { dataTypes[cb.value] = true; });

    if (!Object.keys(dataTypes).length) {
      statusEl.className = 'tools-cleardata-status error';
      statusEl.textContent = '请至少选择一种数据类型';
      statusEl.classList.remove('hidden');
      return;
    }

    // 时间范围
    var since = parseInt($('clearDataSince').value, 10) || 0;

    // 禁用按钮
    btn.disabled = true;
    btn.textContent = '清除中…';

    statusEl.classList.add('hidden');
    var options = since ? { since: new Date().getTime() - since } : { since: 0 };

    chrome.browsingData.remove(options, dataTypes, function () {
      if (chrome.runtime.lastError) {
        statusEl.className = 'tools-cleardata-status error';
        statusEl.textContent = '清除失败: ' + chrome.runtime.lastError.message;
        statusEl.classList.remove('hidden');
      } else {
        statusEl.className = 'tools-cleardata-status success';
        statusEl.textContent = '✓ 已成功清除所选数据';
        statusEl.classList.remove('hidden');
        setTimeout(function () {
          statusEl.classList.add('hidden');
        }, 4000);
      }
      btn.disabled = false;
      btn.textContent = '🧹 立即清除';
    });
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

    // ── Cookie 管理器事件 ──
    var cookieRefreshBtn = $('cookieBtnRefresh');
    if (cookieRefreshBtn) cookieRefreshBtn.addEventListener('click', refreshCookieList);

    var cookieCreateBtn = $('cookieBtnCreate');
    if (cookieCreateBtn) cookieCreateBtn.addEventListener('click', function () { openEditForm(null); });

    var cookieDeleteAllBtn = $('cookieBtnDeleteAll');
    if (cookieDeleteAllBtn) cookieDeleteAllBtn.addEventListener('click', function () {
      if (confirm('确定要删除当前站点所有 Cookie 吗？')) deleteAllCookies();
    });

    var cookieBtnSave = $('cookieBtnSave');
    if (cookieBtnSave) cookieBtnSave.addEventListener('click', saveCookieFromForm);

    var cookieBtnCancel = $('cookieBtnCancel');
    if (cookieBtnCancel) cookieBtnCancel.addEventListener('click', closeCookieForm);

    // 点击弹层背景关闭
    var cookieOverlay = $('cookieFormOverlay');
    if (cookieOverlay) {
      cookieOverlay.addEventListener('click', function (e) {
        if (e.target === cookieOverlay) closeCookieForm();
      });
    }

    // Cookie 表单回车保存
    ['cookieFieldName', 'cookieFieldValue', 'cookieFieldDomain', 'cookieFieldPath', 'cookieFieldExpires'].forEach(function (id) {
      var el = $('cookieField' + id.replace('cookieField', ''));
      if (!el) el = $(id);
      if (el) {
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); saveCookieFromForm(); }
        });
      }
    });

    // ── 清除数据事件 ──
    var clearBtn = $('clearDataBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearBrowsingData);
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

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
    var charsetPanel = $('toolsPanelCharset');
    var batchPanel = $('toolsPanelBatchUrls');
    if (uaPanel) uaPanel.classList.add('hidden');
    if (cookiePanel) cookiePanel.classList.add('hidden');
    if (clearDataPanel) clearDataPanel.classList.add('hidden');
    if (charsetPanel) charsetPanel.classList.add('hidden');
    if (batchPanel) batchPanel.classList.add('hidden');
    if ($('toolsStatusBar')) $('toolsStatusBar').classList.add('hidden');
  }

  function hideAllToolPanels() {
    ['toolsPanelUa', 'toolsPanelCookie', 'toolsPanelClearData', 'toolsPanelCharset', 'toolsPanelBatchUrls'].forEach(function (id) {
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
      syncSelectAllState();
    }

    if (toolId === 'charset') {
      var charsetPanel = $('toolsPanelCharset');
      if (charsetPanel) charsetPanel.classList.remove('hidden');
      initCharsetPanel();
    }

    if (toolId === 'batch-urls') {
      var batchPanel = $('toolsPanelBatchUrls');
      if (batchPanel) batchPanel.classList.remove('hidden');
      initBatchUrlsPanel();
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
      // 通过完整匹配获取当前站点的所有 cookie
      chrome.cookies.getAll({ url: url }, function (cookies) {
        renderCookieList(cookies);
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

  function renderCookieList(cookies) {
    var el = $('cookieList');
    var query = ($('cookieSearch')?.value || '').toLowerCase();

    // 搜索过滤
    if (query) {
      cookies = cookies.filter(function (c) {
        return c.name.toLowerCase().indexOf(query) !== -1 || c.value.toLowerCase().indexOf(query) !== -1;
      });
    }

    $('cookieCount').textContent = cookies.length;

    if (!cookies.length) {
      el.innerHTML = '<div class="tools-empty">' + (query ? '无匹配 Cookie' : '该站点暂无 Cookie') + '</div>';
      return;
    }

    // 按名称排序
    cookies.sort(function (a, b) { return a.name.localeCompare(b.name); });

    var html = '';
    cookies.forEach(function (c) {
      var secureBadge = c.secure ? '<span class="tools-cookie-row-badge">🔒</span>' : '';
      var httpBadge = c.httpOnly ? '<span class="tools-cookie-row-badge">H</span>' : '';
      var sessionBadge = c.session ? '<span class="tools-cookie-row-badge">⏳</span>' : '';
      var cookieData = escAttr(JSON.stringify({
        name: c.name, value: c.value, domain: c.domain, path: c.path,
        secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite || 'unspecified',
        session: c.session, expirationDate: c.expirationDate || 0
      }));
      html += '<div class="tools-cookie-row" data-cookie="' + cookieData + '">' +
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
    var c = parseCookieData(row);
    if (!c) return;
    var protocol = c.secure ? 'https://' : 'http://';
    var url = protocol + c.domain.replace(/^\./, '') + c.path;
    chrome.cookies.remove({ url: url, name: c.name }, function () {
      if (chrome.runtime.lastError) {
        // 如果 secure 判断错了，尝试另一种协议
        var altProtocol = c.secure ? 'http://' : 'https://';
        chrome.cookies.remove({ url: altProtocol + c.domain.replace(/^\./, '') + c.path, name: c.name }, function () {
          refreshCookieList();
        });
      } else {
        refreshCookieList();
      }
    });
  }

  function parseCookieData(row) {
    try {
      return JSON.parse(row.dataset.cookie || 'null');
    } catch (e) {
      return null;
    }
  }

  function deleteAllCookies() {
    getCurrentTabUrl(function (url) {
      if (!url) return;
      chrome.cookies.getAll({ url: url }, function (cookies) {
        if (!cookies.length) { refreshCookieList(); return; }
        var count = cookies.length;
        cookies.forEach(function (c) {
          var cookieUrl = (c.secure ? 'https://' : 'http://') + c.domain.replace(/^\./, '') + c.path;
          chrome.cookies.remove({ url: cookieUrl, name: c.name }, function () {
            count--;
            if (count <= 0) refreshCookieList();
          });
        });
      });
    });
  }

  function exportCookiesJSON() {
    getCurrentTabUrl(function (url) {
      if (!url) return;
      chrome.cookies.getAll({ url: url }, function (cookies) {
        var exportData = cookies.map(function (c) {
          return {
            name: c.name, value: c.value, domain: c.domain, path: c.path,
            secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite,
            session: c.session, expirationDate: c.expirationDate
          };
        });
        var json = JSON.stringify(exportData, null, '  ');
        navigator.clipboard.writeText(json).then(function () {
          // 视觉反馈
        }).catch(function () {});
      });
    });
  }

  function showImportForm() {
    $('cookieImportText').value = '';
    $('cookieImportWrap').classList.remove('hidden');
    $('cookieFormWrap').classList.add('hidden');
  }

  function hideImportForm() {
    $('cookieImportWrap').classList.add('hidden');
  }

  function doImportCookies() {
    var text = $('cookieImportText').value.trim();
    if (!text) return;
    try {
      var arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error('不是数组');
      var count = arr.length;
      arr.forEach(function (c) {
        var url = (c.secure ? 'https://' : 'http://') + (c.domain || '').replace(/^\./, '') + (c.path || '/');
        chrome.cookies.set({
          url: url, name: c.name, value: c.value || '',
          domain: c.domain, path: c.path || '/',
          secure: !!c.secure, httpOnly: !!c.httpOnly,
          sameSite: c.sameSite || 'unspecified',
          expirationDate: c.expirationDate
        }, function () {
          count--;
          if (count <= 0) { hideImportForm(); refreshCookieList(); }
        });
      });
    } catch (e) {
      console.warn('JSON parse error:', e.message);
    }
  }

  function openEditForm(row) {
    cookieEditTarget = row || null;
    var form = $('cookieFormWrap');
    var title = $('cookieFormTitle');
    form.classList.remove('hidden');

    if (row) {
      title.textContent = '编辑 Cookie';
      var c = parseCookieData(row);
      if (c) {
        $('cookieFieldName').value = c.name;
        $('cookieFieldValue').value = c.value;
        $('cookieFieldDomain').value = c.domain;
        $('cookieFieldPath').value = c.path;
        $('cookieFieldSecure').checked = c.secure;
        $('cookieFieldHttpOnly').checked = c.httpOnly;
        $('cookieFieldSameSite').value = c.sameSite || 'unspecified';
        if (c.expirationDate && !c.session) {
          $('cookieFieldExpires').value = new Date(c.expirationDate * 1000).toISOString().slice(0, 19).replace('T', ' ');
        } else {
          $('cookieFieldExpires').value = '';
        }
      }
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
      getCurrentTabUrl(function (url) {
        if (url) $('cookieFieldDomain').value = '.' + extractHost(url);
      });
    }
  }

  function closeCookieForm() {
    $('cookieFormWrap').classList.add('hidden');
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
      var oldData = parseCookieData(cookieEditTarget);
      if (oldData && (oldData.name !== name || oldData.domain !== domain)) {
        var oldUrl = (oldData.secure ? 'https://' : 'http://') + oldData.domain.replace(/^\./, '') + oldData.path;
        chrome.cookies.remove({ url: oldUrl, name: oldData.name }, function () {
          chrome.cookies.set(cookieProps, function (result) {
            if (chrome.runtime.lastError) {
              console.warn('cookie set failed:', chrome.runtime.lastError.message);
            }
            closeCookieForm();
            refreshCookieList();
          });
        });
        return;
      }
    }

    chrome.cookies.set(cookieProps, function (result) {
      if (chrome.runtime.lastError) {
        console.warn('cookie set failed:', chrome.runtime.lastError.message);
      }
      if (result) {
        closeCookieForm();
        refreshCookieList();
      } else {
        // 尝试另一种协议
        cookieProps.url = (secure ? 'http://' : 'https://') + domain.replace(/^\./, '') + path;
        chrome.cookies.set(cookieProps, function () {
          if (chrome.runtime.lastError) {
            console.warn('cookie set retry failed:', chrome.runtime.lastError.message);
          }
          closeCookieForm();
          refreshCookieList();
        });
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
    var scope = $('clearDataScope')?.value || 'site';

    btn.disabled = true;
    btn.textContent = '清除中…';
    statusEl.classList.add('hidden');

    var options = since ? { since: new Date().getTime() - since } : { since: 0 };

    function doClear(origins) {
      if (origins) options.origins = origins;
      chrome.browsingData.remove(options, dataTypes, function () {
        if (chrome.runtime.lastError) {
          statusEl.className = 'tools-cleardata-status error';
          statusEl.textContent = '清除失败: ' + chrome.runtime.lastError.message;
          statusEl.classList.remove('hidden');
          btn.disabled = false;
          btn.textContent = '🧹 立即清除';
        } else {
          var desc = origins ? '当前站点' : '全局';
          var reloadCb = $('clearDataReload');
          if (reloadCb && reloadCb.checked) {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
              if (tabs[0]?.id) {
                chrome.tabs.reload(tabs[0].id, { bypassCache: true });
              }
            });
          }
          statusEl.className = 'tools-cleardata-status success';
          statusEl.textContent = '✓ 已成功清除（' + desc + '）';
          statusEl.classList.remove('hidden');
          setTimeout(function () { statusEl.classList.add('hidden'); }, 4000);
          btn.disabled = false;
          btn.textContent = '🧹 立即清除';
        }
      });
    }

    if (scope === 'site') {
      getCurrentTabUrl(function (url) {
        if (!url) {
          statusEl.className = 'tools-cleardata-status error';
          statusEl.textContent = '无法获取当前站点信息';
          statusEl.classList.remove('hidden');
          btn.disabled = false;
          btn.textContent = '🧹 立即清除';
          return;
        }
        var origin = new URL(url).origin;
        doClear([origin]);
      });
    } else {
      doClear(null);
    }
  }

  function syncSelectAllState() {
    var selectAllCb = $('clearDataSelectAll');
    if (!selectAllCb) return;
    var checks = document.querySelectorAll('#clearDataTypes input[type="checkbox"]:not(#clearDataSelectAll)');
    var all = checks.length > 0;
    checks.forEach(function (cb) { if (!cb.checked) all = false; });
    selectAllCb.checked = all;
  }

  // ==================== 编码切换 ====================

  var ENCODINGS = [
    { id:'UTF-8',       name:'UTF-8',           desc:'Unicode 通用' },
    { id:'GBK',         name:'GBK',             desc:'中文简体' },
    { id:'GB18030',     name:'GB18030',         desc:'中文简体扩展' },
    { id:'Big5',        name:'Big5',            desc:'中文繁体' },
    { id:'Shift_JIS',   name:'Shift_JIS',       desc:'日文' },
    { id:'EUC-JP',      name:'EUC-JP',          desc:'日文' },
    { id:'ISO-2022-JP', name:'ISO-2022-JP',     desc:'日文邮件' },
    { id:'EUC-KR',      name:'EUC-KR',          desc:'韩文' },
    { id:'windows-1256',name:'Windows-1256',    desc:'阿拉伯文' },
    { id:'windows-1255',name:'Windows-1255',    desc:'希伯来文' },
    { id:'windows-1251',name:'Windows-1251',    desc:'西里尔文' },
    { id:'windows-1253',name:'Windows-1253',    desc:'希腊文' },
    { id:'windows-1254',name:'Windows-1254',    desc:'土耳其文' },
    { id:'windows-1257',name:'Windows-1257',    desc:'波罗的文' },
    { id:'windows-1258',name:'Windows-1258',    desc:'越南文' },
    { id:'windows-874', name:'Windows-874',     desc:'泰文' },
    { id:'ISO-8859-2',  name:'ISO-8859-2',      desc:'中欧' },
    { id:'ISO-8859-7',  name:'ISO-8859-7',      desc:'希腊文' },
    { id:'ISO-8859-15', name:'ISO-8859-15',     desc:'西欧扩展' },
    { id:'KOI8-R',      name:'KOI8-R',          desc:'俄文' },
    { id:'KOI8-U',      name:'KOI8-U',          desc:'乌克兰文' },
    { id:'Macintosh',   name:'Macintosh',       desc:'西欧 Mac' },
    { id:'IBM866',      name:'IBM866',          desc:'西里尔 DOS' },
    { id:'UTF-16LE',    name:'UTF-16LE',        desc:'Unicode LE' }
  ];

  var currentCharset = '';
  var charsetRuleIds = [];

  function initCharsetPanel() {
    getCurrentTabUrl(function (url) {
      if (!url) {
        $('charsetCurrent').textContent = '无法获取页面';
        return;
      }
      detectCurrentEncoding();
    });
  }

  function detectCurrentEncoding() {
    $('charsetCurrent').textContent = '检测中…';
    $('charsetCurrent').title = '';
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs[0];
      if (!tab?.id) {
        $('charsetCurrent').textContent = '无法获取标签页';
        return;
      }
      // 检查是否为受限页面
      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:'))) {
        $('charsetCurrent').textContent = '受限页面';
        $('charsetCurrent').title = 'chrome:// / about: 等内部页面无法检测和修改编码';
        renderCharsetList();
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: function () { return document.characterSet || document.charset || ''; }
      }, function (results) {
        if (chrome.runtime.lastError) {
          $('charsetCurrent').textContent = '无法访问';
          $('charsetCurrent').title = chrome.runtime.lastError.message;
        } else if (results && results[0] && results[0].result) {
          currentCharset = results[0].result;
          $('charsetCurrent').textContent = currentCharset;
          $('charsetCurrent').title = '';
        } else {
          $('charsetCurrent').textContent = '未知';
          $('charsetCurrent').title = '页面未声明字符编码';
        }
        renderCharsetList();
      });
    });
  }

  function renderCharsetList() {
    var el = $('charsetList');
    el.innerHTML = '';
    ENCODINGS.forEach(function (enc) {
      var row = document.createElement('div');
      row.className = 'tools-charset-row' + (enc.id === currentCharset ? ' active' : '');
      row.dataset.encoding = enc.id;

      var nameEl = document.createElement('span');
      nameEl.className = 'tools-charset-row-name';
      nameEl.textContent = enc.name;

      var descEl = document.createElement('span');
      descEl.className = 'tools-charset-row-desc';
      descEl.textContent = enc.desc;

      var check = document.createElement('span');
      check.className = 'tools-charset-row-check';
      check.textContent = '✓';

      row.appendChild(nameEl);
      row.appendChild(descEl);
      row.appendChild(check);

      row.addEventListener('click', function () {
        applyCharset(enc.id, enc.name);
      });

      el.appendChild(row);
    });
  }

  function applyCharset(encoding, name) {
    // 视觉反馈：显示正在应用
    var statusEl = $('charsetCurrent');
    var prevText = statusEl.textContent;
    statusEl.textContent = '应用 ' + name + '…';

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs[0];
      if (!tab?.id) { statusEl.textContent = prevText; return; }
      var tabId = tab.id;

      // 一步检测 Content-Type 并用简单 ID 生成规则
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: function () { return document.contentType || 'text/html'; }
      }, function (results) {
        var ct = 'text/html';
        if (!chrome.runtime.lastError && results && results[0] && results[0].result) {
          ct = results[0].result;
        }

        // 简单规则 ID：基于时间戳避免冲突
        var baseId = Date.now() % 1000000;
        while (baseId < 100) baseId += 1;
        var removeIds = charsetRuleIds.slice();
        charsetRuleIds = [baseId, baseId + 1, baseId + 2, baseId + 3];

        var ruleDefs = [
          { ct: ct,                        rt: 'main_frame' },
          { ct: 'text/html',               rt: 'sub_frame' },
          { ct: 'application/javascript',  rt: 'script' },
          { ct: 'text/css',                rt: 'stylesheet' }
        ];

        var addRules = ruleDefs.map(function (def, idx) {
          return {
            id: baseId + idx,
            priority: 10,
            action: {
              type: 'modifyHeaders',
              responseHeaders: [{
                header: 'content-type',
                operation: 'set',
                value: def.ct + '; charset=' + encoding
              }]
            },
            condition: { tabIds: [tabId], resourceTypes: [def.rt] }
          };
        });

        chrome.declarativeNetRequest.updateSessionRules(
          { removeRuleIds: removeIds, addRules: addRules },
          function () {
            if (chrome.runtime.lastError) {
              console.error('charset apply failed:', chrome.runtime.lastError.message);
              charsetRuleIds = removeIds;
              statusEl.textContent = prevText;
              return;
            }
            currentCharset = encoding;
            trackRecentCharset(encoding);
            renderCharsetList();
            chrome.tabs.reload(tabId, { bypassCache: true });
          }
        );
      });
    });
  }

  function resetCharset() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tabId = tabs[0]?.id;
      var removeIds = charsetRuleIds.slice();
      charsetRuleIds = [];
      chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: removeIds
      }, function () {
        if (chrome.runtime.lastError) {
          console.warn('resetCharset updateSessionRules failed:', chrome.runtime.lastError.message);
          charsetRuleIds = removeIds;
          return;
        }
        currentCharset = '';
        $('charsetCurrent').textContent = '已还原';
        if (tabId) {
          chrome.tabs.reload(tabId, { bypassCache: true });
        }
        renderCharsetList();
        setTimeout(function () { detectCurrentEncoding(); }, 1500);
      });
    });
  }

  function trackRecentCharset(encoding) {
    chrome.storage.local.get(['charset_recent'], function (data) {
      var recent = data.charset_recent || [];
      recent = recent.filter(function (e) { return e !== encoding; });
      recent.unshift(encoding);
      if (recent.length > 5) recent = recent.slice(0, 5);
      chrome.storage.local.set({ charset_recent: recent });
    });
  }

  // ==================== 批量网址 ====================

  function initBatchUrlsPanel() {
    loadBatchUrlInput();
    switchBatchTab('batchOpen');
    loadCurrentWindowUrls();
  }

  function switchBatchTab(panelId) {
    var tabs = document.querySelectorAll('.tools-batch-tab');
    tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.panel === panelId); });
    $('batchOpenPanel').classList.toggle('hidden', panelId !== 'batchOpen');
    $('batchSavePanel').classList.toggle('hidden', panelId !== 'batchSave');
  }

  function countBatchLines(text) {
    return (text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).length;
  }

  function updateBatchOpenCount() {
    var text = $('batchUrlInput').value;
    $('batchOpenCount').textContent = countBatchLines(text) + ' 个网址';
  }

  function loadBatchUrlInput() {
    chrome.storage.local.get(['batch_url_text'], function (data) {
      $('batchUrlInput').value = data.batch_url_text || '';
      updateBatchOpenCount();
    });
  }

  function saveBatchUrlInput() {
    chrome.storage.local.set({ batch_url_text: $('batchUrlInput').value });
    updateBatchOpenCount();
  }

  function openBatchUrls() {
    var text = $('batchUrlInput').value;
    var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    // 去重
    var urls = [];
    var seen = {};
    lines.forEach(function (line) {
      if (!seen[line]) { seen[line] = true; urls.push(line); }
    });
    if (!urls.length) return;

    // 逐个打开标签页
    var count = 0;
    urls.forEach(function (url) {
      chrome.tabs.create({ url: url, active: false }, function () {
        count++;
        if (count >= urls.length && urls.length > 1 && chrome.tabs.group) {
          chrome.tabs.query({ currentWindow: true }, function (tabs) {
            var recentIds = tabs.slice(-urls.length).map(function (t) { return t.id; }).filter(Boolean);
            if (recentIds.length > 1) {
              chrome.tabs.group({ tabIds: recentIds }, function (groupId) {
                chrome.tabGroups.update(groupId, { title: '批量打开 (' + urls.length + ')', color: 'red', collapsed: false });
              });
            }
          });
        }
      });
    });
  }

  function loadCurrentWindowUrls() {
    chrome.tabs.query({ currentWindow: true }, function (tabs) {
      var urls = tabs.map(function (t) { return t.url; }).filter(function (url) { return url && url.length > 0; });
      $('batchUrlOutput').value = urls.join('\n');
      updateBatchSaveCount();
    });
  }

  function updateBatchSaveCount() {
    $('batchSaveCount').textContent = countBatchLines($('batchUrlOutput').value) + ' 个网址';
  }

  function copyBatchUrls() {
    var text = $('batchUrlOutput').value;
    navigator.clipboard.writeText(text).then(function () {
      // 视觉反馈
    }).catch(function () {});
  }

  function exportBatchUrls() {
    var text = $('batchUrlOutput').value;
    var blob = new Blob([text], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'tabs-urls.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ==================== JS 泄露扫描 ====================

  // ── JS 敏感信息检测规则 ──
  var JSLEAK_PATTERNS = [
    // 🔴 严重：云服务密钥 / 私钥 / Token
    { label:'阿里云 AccessKey',    pattern:/LTAI[A-Za-z0-9]{12,32}/g,             level:'critical' },
    { label:'腾讯云 SecretId',     pattern:/AKID[A-Za-z0-9]{13,40}/g,               level:'critical' },
    { label:'AWS Access Key',      pattern:/AKIA[0-9A-Z]{16}/g,                     level:'critical' },
    { label:'Google API Key',      pattern:/AIza[0-9A-Za-z\-_]{35}/g,               level:'critical' },
    { label:'GitHub Token',        pattern:/gh[pousr]_[A-Za-z0-9]{36,255}/g,         level:'critical' },
    { label:'百度云 AK',           pattern:/\bAK[A-Za-z0-9]{10,40}\b/g,              level:'critical' },
    { label:'京东云 AK',           pattern:/JDC_[A-Z0-9]{28,32}/g,                   level:'critical' },
    { label:'火山引擎 AK',         pattern:/AKLT[a-zA-Z0-9\-_]{8,}/g,                level:'critical' },
    { label:'私有密钥(PEM)',       pattern:/-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/g, level:'critical' },
    { label:'JWT Token',           pattern:/eyJ[A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,}/g, level:'critical' },
    { label:'数据库连接串',        pattern:/(?:jdbc|mongodb|redis|mysql|postgresql):\/\/[^\s"']{10,}/gi, level:'critical' },
    { label:'OpenAI API Key',      pattern:/sk-[A-Za-z0-9]{32,}/g,                   level:'critical' },
    { label:'通用 API Key',        pattern:/(?:api[_-]?key|secretKey|appSecret|authToken)\s*[:=]\s*["'][A-Za-z0-9\-_]{12,}["']/gi, level:'critical' },
    { label:'硬编码 Secret',       pattern:/(?:secret|secretKey|secret_key)\s*[:=]\s*["'][A-Za-z0-9\/+=_\-]{8,}["']/gi, level:'critical' },
    { label:'SaaS 密钥泄露',       pattern:/(?:access_?key|access_?token|api_?secret|client_?secret|secret_?key|encryption_?key|db_?password|bucket_?password)\s*[:=]\s*["'][A-Za-z0-9\/+=_\-]{12,}["']/gi, level:'critical' },

    // 🟠 高：Webhook / 密码 / 令牌
    { label:'Webhook URL',         pattern:/https?:\/\/(?:hooks\.(?:slack|discord)|oapi\.dingtalk|qyapi\.weixin|open\.feishu)\/[^\s"']{20,}/gi, level:'high' },
    { label:'硬编码密码',          pattern:/(?:"[^"]*pass(?:w(?:or)?d)?[^"]*"\s*[:=]\s*"[^"]{4,}")|(?:'[^']*pass(?:w(?:or)?d)?[^']*'\s*[:=]\s*'[^']{4,}')|(?:\bpass(?:w(?:or)?d|wd)?\s*[:=]\s*["'][^"'\s]{4,}["'])/gi, level:'high' },
    { label:'硬编码账号',          pattern:/(?:user_?name|username|account|账号|用户名)\s*[:=]\s*["'][^"'\s]{2,}["']/gi, level:'high' },
    { label:'内网 IP',             pattern:/\b(?:127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g, level:'high' },
    { label:'银行卡号',            pattern:/\b[1-9]\d{15,18}\b/g,                     level:'high' },
    { label:'CTF Flag',            pattern:/(?:flag\{|666c6167|Zmxh|&#102|464C4147)/gi, level:'high' },

    // 🟡 中：路径 / 配置 / 加密
    { label:'Swagger 文档',        pattern:/(?:swagger-ui\.html|swagger-ui\/|swagger\.json|\/api-docs|"swagger":|swaggerUi|swaggerVersion|Swagger UI)/gi, level:'medium' },
    { label:'Spring Actuator',     pattern:/(?:\/actuator\/(?:env|heapdump|mappings|beans|configprops|gateway))/gi, level:'medium' },
    { label:'敏感管理路径',        pattern:/\/(?:admin|manage|manager|system|console|dashboard|\.git)\b/gi, level:'medium' },
    { label:'CORS 配置',           pattern:/(?:Access-Control-Allow-Origin|allow_origin|cors_allow)\s*[:=]\s*\*/gi, level:'medium' },
    { label:'明文 ID 泄露',        pattern:/(?:[?&](?:id|user_?id|uid|order_?id)=\d{3,})|(?:"[a-z_]*[Ii][Dd]"\s*:\s*\d{2,15})/gi, level:'medium' },
    { label:'URL 跳转参数',        pattern:/[?&](?:redirect|goto|jump|next|return|to|target|url)=[^&\s]+/gi, level:'medium' },
    { label:'弱加密算法',          pattern:/\b(?:md5|aes|des|rc4|ecb|base64)\b/gi,    level:'medium' },
    { label:'Shiro RememberMe',    pattern:/(?:rememberMe=|deleteMe)/gi,               level:'medium' },

    // 🔵 低：个人信息
    { label:'手机号',              pattern:/\b(?:\+?86)?1[3-9]\d{9}\b/g,              level:'low' },
    { label:'邮箱地址',            pattern:/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, level:'low' },
    { label:'身份证号',            pattern:/\b\d{6}(?:18|19|20)?\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g, level:'low' },
    { label:'车牌号',              pattern:/[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]/g, level:'low' },
  ];

  function saveFindings(findings, mode) {
    chrome.storage.local.set({
      jsleak_results: findings,
      jsleak_timestamp: Date.now(),
      jsleak_mode: mode
    });
    // 更新面板时间戳
    var meta = $('jsleakPanelMeta');
    if (meta) {
      var ago = Math.floor((Date.now() - Date.now()) / 60000);
      meta.textContent = '刚刚扫描 (' + (mode === 'deep' ? '深层' : '页面') + ')';
    }
  }

  function loadFindings() {
    chrome.storage.local.get(['jsleak_results', 'jsleak_timestamp', 'jsleak_mode'], function (data) {
      if (data.jsleak_results && data.jsleak_results.length) {
        renderFindings(data.jsleak_results);
        var meta = $('jsleakPanelMeta');
        if (meta) {
          var ago = Math.floor((Date.now() - data.jsleak_timestamp) / 60000);
          var timeStr = ago < 1 ? '刚刚' : ago < 60 ? ago + ' 分钟前' : Math.floor(ago / 60) + ' 小时前';
          meta.textContent = timeStr + ' 扫描 (' + (data.jsleak_mode === 'deep' ? '深层' : '页面') + ') · 点击按钮重新扫描';
        }
      }
    });
  }

  function collectFindings(content) {
    var findings = [];
    JSLEAK_PATTERNS.forEach(function (rule) {
      var matches = content.match(rule.pattern);
      if (matches && matches.length) {
        var unique = [];
        var seen = {};
        matches.forEach(function (m) {
          var key = m.substring(0, 50);
          if (!seen[key]) { seen[key] = true; unique.push(m.length > 100 ? m.substring(0, 100) + '…' : m); }
        });
        findings.push({ label: rule.label, level: rule.level, values: unique.slice(0, 10) });
      }
    });
    return findings;
  }

  function renderFindings(findings) {
    var listEl = $('jsleakList');
    var summaryEl = $('jsleakSummary');
    var total = findings.reduce(function (s, f) { return s + f.values.length; }, 0);
    summaryEl.textContent = findings.length + ' 类 / ' + total + ' 条';

    if (!findings.length) {
      listEl.innerHTML = '<div class="tools-empty">🎉 未检测到敏感信息</div>';
      return;
    }

    var order = { critical:0, high:1, medium:2, low:3, info:4 };
    findings.sort(function (a, b) { return (order[a.level]||9) - (order[b.level]||9); });

    var html = '';
    findings.forEach(function (f) {
      var sourceTag = f._file ? ' <span style="color:var(--text-faint);font-size:9px">[' + escHtml(f._file) + ']</span>' : '';
      html += '<div class="tools-jsleak-item">' +
        '<span class="tools-jsleak-badge ' + f.level + '">' + f.level + '</span>' +
        '<div class="tools-jsleak-content">' +
          '<div class="tools-jsleak-label">' + escHtml(f.label) + ' (' + f.values.length + ')' + sourceTag + '</div>' +
          '<div class="tools-jsleak-values">' + f.values.map(function (v) { return escHtml(v); }).join('<br>') + '</div>' +
        '</div>' +
      '</div>';
    });
    listEl.innerHTML = html;
  }

  function scanJsleak() {
    var btn = $('jsleakQuickBtn') || $('jsleakBtnScan');
    var listEl = $('jsleakList');
    if (btn) { btn.disabled = true; btn.textContent = '检测中…'; }
    var summary = $('jsleakSummary'); if (summary) summary.textContent = '';
    if (listEl) listEl.innerHTML = '<div class="tools-empty">扫描中…</div>';

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0]?.id) {
        if (listEl) listEl.innerHTML = '<div class="tools-empty">无法获取页面</div>';
        if (btn) { btn.disabled = false; btn.textContent = '🧪 页面检测'; }
        return;
      }
      // 完整 HTML + 内联脚本 + 事件属性
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: function () {
          var texts = [document.documentElement.outerHTML];
          // 收集所有内联脚本
          document.querySelectorAll('script:not([src])').forEach(function (s) { texts.push(s.textContent); });
          // 收集内联事件和 data 属性
          document.querySelectorAll('[onclick],[onload],[onsubmit],[onerror]').forEach(function (el) { texts.push(el.outerHTML); });
          return texts.join('\n');
        }
      }, function (results) {
        var content = (results && results[0] && results[0].result) || '';
        var findings = collectFindings(content);
        saveFindings(findings, 'quick');
        renderFindings(findings);
        if (btn) { btn.disabled = false; btn.textContent = '🧪 页面检测'; }
      });
    });
  }

  function deepScanJsleak() {
    var btn = $('jsleakDeepBtn') || $('jsleakBtnDeep');
    var listEl = $('jsleakList');
    if (btn) { btn.disabled = true; btn.textContent = '深层扫描中…'; }
    var summary = $('jsleakSummary'); if (summary) summary.textContent = '';

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0]?.id) {
        if (listEl) listEl.innerHTML = '<div class="tools-empty">无法获取页面</div>';
        if (btn) { btn.disabled = false; btn.textContent = '🔬 深层检测'; }
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: function () {
          var scripts = document.querySelectorAll('script[src]');
          var urls = [];
          scripts.forEach(function (s) { if (s.src) urls.push(s.src); });
          return urls;
        }
      }, function (urlResults) {
        var jsUrls = (urlResults && urlResults[0] && urlResults[0].result) || [];
        // 先收集页面内容
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: function () {
            var texts = [document.documentElement.outerHTML];
            document.querySelectorAll('script:not([src])').forEach(function (s) { texts.push(s.textContent); });
            return texts.join('\n');
          }
        }, function (inlineResults) {
          var allContent = (inlineResults && inlineResults[0] && inlineResults[0].result) || '';
          var pending = jsUrls.length;
          var allFindings = collectFindings(allContent);

          if (!pending) {
            renderFindings(allFindings);
            if (btn) { btn.disabled = false; btn.textContent = '🔬 深层检测'; }
            return;
          }

          // 逐个 fetch 外部 JS
          listEl.innerHTML = '<div class="tools-empty">正在拉取外部 JS… 0/' + pending + '</div>';
          jsUrls.forEach(function (url) {
            fetch(url).then(function (r) { return r.text(); }).then(function (text) {
              var ff = collectFindings(text);
              // 标记来源文件
              var shortUrl = url.replace(/^https?:\/\/[^\/]+\//, '…/');
              if (shortUrl.length > 60) shortUrl = '…' + shortUrl.slice(-50);
              ff.forEach(function (f) { f._file = shortUrl; allFindings.push(f); });
            }).catch(function () {}).finally(function () {
              pending--;
              var done = jsUrls.length - pending;
              listEl.innerHTML = '<div class="tools-empty">正在拉取外部 JS… ' + done + '/' + jsUrls.length + '</div>';
              if (pending <= 0) {
                // 合并同类项，保留首次文件来源
                var merged = {};
                allFindings.forEach(function (f) {
                  if (!merged[f.label]) {
                    merged[f.label] = { label: f.label, level: f.level, seen: {}, values: [], _file: f._file };
                  }
                  f.values.forEach(function (v) {
                    var k = v.substring(0, 50);
                    if (!merged[f.label].seen[k]) { merged[f.label].seen[k] = true; merged[f.label].values.push(v); }
                  });
                });
                var finalFindings = Object.values(merged);
                finalFindings.forEach(function (f) { f.values = f.values.slice(0, 10); });
                saveFindings(finalFindings, 'deep');
                renderFindings(finalFindings);
                if (btn) { btn.disabled = false; btn.textContent = '🔬 深层检测'; }
              }
            });
          });
        });
      });
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

    var cookieSearch = $('cookieSearch');
    if (cookieSearch) {
      cookieSearch.addEventListener('input', function () { refreshCookieList(); });
    }

    var cookieBtnExport = $('cookieBtnExport');
    if (cookieBtnExport) cookieBtnExport.addEventListener('click', exportCookiesJSON);

    var cookieBtnImport = $('cookieBtnImport');
    if (cookieBtnImport) cookieBtnImport.addEventListener('click', showImportForm);

    var cookieBtnImportDo = $('cookieBtnImportDo');
    if (cookieBtnImportDo) cookieBtnImportDo.addEventListener('click', doImportCookies);

    var cookieBtnImportCancel = $('cookieBtnImportCancel');
    if (cookieBtnImportCancel) cookieBtnImportCancel.addEventListener('click', hideImportForm);

    var cookieBtnSave = $('cookieBtnSave');
    if (cookieBtnSave) cookieBtnSave.addEventListener('click', saveCookieFromForm);

    var cookieBtnCancel = $('cookieBtnCancel');
    if (cookieBtnCancel) cookieBtnCancel.addEventListener('click', closeCookieForm);

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

    // 全选/取消全选
    var selectAllCb = $('clearDataSelectAll');
    if (selectAllCb) {
      selectAllCb.addEventListener('change', function () {
        var checked = selectAllCb.checked;
        document.querySelectorAll('#clearDataTypes input[type="checkbox"]:not(#clearDataSelectAll)').forEach(function (cb) {
          cb.checked = checked;
        });
      });
    }

    // 子复选框变动时同步全选状态
    var clearDataTypes = $('clearDataTypes');
    if (clearDataTypes) {
      clearDataTypes.addEventListener('change', function (e) {
        if (e.target === selectAllCb) return;
        syncSelectAllState();
      });
    }

    // ── 编码切换事件 ──
    var resetCharsetBtn = $('charsetBtnReset');
    if (resetCharsetBtn) resetCharsetBtn.addEventListener('click', resetCharset);

    // ── 批量网址事件 ──
    var batchTabs = document.querySelectorAll('.tools-batch-tab');
    batchTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        switchBatchTab(tab.dataset.panel);
        if (tab.dataset.panel === 'batchSave') loadCurrentWindowUrls();
      });
    });

    var batchInput = $('batchUrlInput');
    if (batchInput) {
      batchInput.addEventListener('input', function () { saveBatchUrlInput(); });
    }

    var batchBtnClear = $('batchBtnClear');
    if (batchBtnClear) {
      batchBtnClear.addEventListener('click', function () {
        $('batchUrlInput').value = '';
        saveBatchUrlInput();
      });
    }

    var batchBtnOpen = $('batchBtnOpen');
    if (batchBtnOpen) batchBtnOpen.addEventListener('click', openBatchUrls);

    var batchBtnCopy = $('batchBtnCopy');
    if (batchBtnCopy) batchBtnCopy.addEventListener('click', copyBatchUrls);

    var batchBtnExport = $('batchBtnExport');
    if (batchBtnExport) batchBtnExport.addEventListener('click', exportBatchUrls);

    // ── JS 泄露扫描 ──
    var jsleakScanBtn = $('jsleakBtnScan');
    if (jsleakScanBtn) jsleakScanBtn.addEventListener('click', scanJsleak);

    var jsleakDeepBtn = $('jsleakBtnDeep');
    if (jsleakDeepBtn) jsleakDeepBtn.addEventListener('click', deepScanJsleak);
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

  return { init: init, showDropdown: showDropdown, scanJsleak: scanJsleak, deepScanJsleak: deepScanJsleak, loadFindings: loadFindings };
})();

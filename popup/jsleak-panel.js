// ==================== JS 泄露扫描面板（独立 Tab）====================
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

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
    { label:'明文 ID 参数',        pattern:/(?:\b(?:id|\w+id)=\d{2,15}\b(?![-_\\/]))/gi, level:'medium' },
    { label:'JSON ID 参数',        pattern:/(?:["'][a-zA-Z_]*[Ii][Dd]["']\s*:\s*\d{2,15})/g, level:'medium' },
    { label:'URL 跳转参数',        pattern:/[?&](?:redirect|goto|jump|next|return|to|target|url)=[^&\s]+/gi, level:'medium' },
    { label:'加密算法',            pattern:/(?:md5|aes|des|rc4|ecb|base64|bs4)/gi,    level:'medium' },
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
    var meta = $('jsleakPanelMeta');
    if (meta) {
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
        var seen = {};
        var unique = [];
        matches.forEach(function (m) {
          var key = m.toLowerCase();
          if (!seen[key]) { seen[key] = true; unique.push(m); }
        });
        findings.push({ label: rule.label, level: rule.level, values: unique });
      }
    });
    return findings;
  }

  function renderFindings(findings) {
    var listEl = $('jsleakList');
    var summaryEl = $('jsleakSummary');
    var total = findings.reduce(function (s, f) { return s + f.values.length; }, 0);
    if (summaryEl) summaryEl.textContent = findings.length + ' 类 / ' + total + ' 条';

    if (!listEl) return;
    if (!findings.length) {
      listEl.innerHTML = '<div class="tools-empty">🎉 未检测到敏感信息</div>';
      return;
    }

    var order = { critical:0, high:1, medium:2, low:3, info:4 };
    findings.sort(function (a, b) { return (order[a.level]||9) - (order[b.level]||9); });

    var html = '';
    findings.forEach(function (f) {
      var sourceTag = '';
      if (f._fileUrl) {
        var shortName = f._fileUrl.replace(/^https?:\/\/[^\/]+\//, '…/');
        if (shortName.length > 50) shortName = '…' + shortName.slice(-45);
        sourceTag = ' <a class="tools-jsleak-source" href="' + escAttr(f._fileUrl) + '" target="_blank" title="' + escAttr(f._fileUrl) + '">[' + escHtml(shortName) + ']</a>';
      }
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
    var btn = $('jsleakQuickBtn');
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
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: function () {
          var texts = [document.documentElement.outerHTML];
          document.querySelectorAll('script:not([src])').forEach(function (s) { texts.push(s.textContent); });
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
    var btn = $('jsleakDeepBtn');
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
            saveFindings(allFindings, 'deep');
            renderFindings(allFindings);
            if (btn) { btn.disabled = false; btn.textContent = '🔬 深层检测'; }
            return;
          }

          listEl.innerHTML = '<div class="tools-empty">正在拉取外部 JS… 0/' + pending + '</div>';
          jsUrls.forEach(function (url) {
            fetch(url).then(function (r) { return r.text(); }).then(function (text) {
              var ff = collectFindings(text);
              ff.forEach(function (f) { f._fileUrl = url; allFindings.push(f); });
            }).catch(function () {}).finally(function () {
              pending--;
              var done = jsUrls.length - pending;
              listEl.innerHTML = '<div class="tools-empty">正在拉取外部 JS… ' + done + '/' + jsUrls.length + '</div>';
              if (pending <= 0) {
                var merged = {};
                allFindings.forEach(function (f) {
                  if (!merged[f.label]) {
                    merged[f.label] = { label: f.label, level: f.level, seen: {}, values: [], _fileUrl: f._fileUrl };
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

  function init() {
    var quickBtn = $('jsleakQuickBtn');
    var deepBtn = $('jsleakDeepBtn');
    if (quickBtn) quickBtn.addEventListener('click', scanJsleak);
    if (deepBtn) deepBtn.addEventListener('click', deepScanJsleak);
    // 加载上次缓存结果
    loadFindings();
  }

  window.StiffEyesJsleakPanel = { init: init, scanJsleak: scanJsleak, deepScanJsleak: deepScanJsleak, loadFindings: loadFindings };
})();

/**
 * StiffEyes HackBar Panel Controller
 * Integrates HackBar v2.3.1 features into the popup as a tab panel.
 */
var StiffEyesHackbarPanel = (function () {
  'use strict';

  var currentTabId = null;
  var method = 'GET';
  var initialized = false;

  function $(id) { return document.getElementById(id); }

  // ---- DOM refs ----
  var urlInput, postInput, refererInput, uaInput, uaSelect, cookieInput;
  var enablePost, enableReferer, enableUA, enableCookie;
  var getBtn, postBtn, executeBtn;
  var toolInput, toolOutput;
  var currentToolCat = 'encrypt';

  function init(tabId) {
    if (currentTabId === tabId && initialized) return;
    currentTabId = tabId;

    // Cache DOM refs
    urlInput = $('hbUrlInput');
    postInput = $('hbPostInput');
    refererInput = $('hbRefererInput');
    uaInput = $('hbUAInput');
    uaSelect = $('hbUASelect');
    cookieInput = $('hbCookieInput');
    enablePost = $('hbEnablePost');
    enableReferer = $('hbEnableReferer');
    enableUA = $('hbEnableUA');
    enableCookie = $('hbEnableCookie');
    getBtn = $('hbGetBtn');
    postBtn = $('hbPostBtn');
    executeBtn = $('hbExecute');
    toolInput = $('hbToolInput');
    toolOutput = $('hbToolOutput');

    if (!initialized) {
      wireRequestEvents();
      wireToggleEvents();
      wireToolEvents();
      buildLfiList();
      buildUAPresets();
      wireKeyboardShortcut();
      wireModal();
      initialized = true;
    }

    // Default method state
    getBtn.classList.add('active');
    postBtn.classList.remove('active');
    method = 'GET';

    // Load URL from current tab
    loadUrl();
  }

  // ========== Request Events ==========

  function wireRequestEvents() {
    $('hbLoadUrl').addEventListener('click', loadUrl);
    $('hbSplitUrl').addEventListener('click', splitUrl);
    $('hbExecute').addEventListener('click', execute);

    getBtn.addEventListener('click', function () {
      method = 'GET';
      getBtn.classList.add('active');
      postBtn.classList.remove('active');
    });
    postBtn.addEventListener('click', function () {
      method = 'POST';
      postBtn.classList.add('active');
      getBtn.classList.remove('active');
    });
  }

  function loadUrl() {
    if (currentTabId == null) return;
    chrome.runtime.sendMessage({
      type: 'HACKBAR_LOAD_URL',
      tabId: currentTabId
    }, function (res) {
      if (chrome.runtime.lastError || !res) return;
      if (res.url) urlInput.value = res.url;
      if (res.postData && !postInput.value) {
        postInput.value = res.postData;
        enablePost.checked = true;
        toggleBlock($('hbPostBlock'), true);
      }
      // Load captured headers if present
      if (res.headers) {
        if (res.headers.referer && !refererInput.value) {
          refererInput.value = res.headers.referer;
          enableReferer.checked = true;
          toggleBlock($('hbRefererBlock'), true);
        }
        if (res.headers.cookie && !cookieInput.value) {
          cookieInput.value = res.headers.cookie;
          enableCookie.checked = true;
          toggleBlock($('hbCookieBlock'), true);
        }
      }
    });
  }

  function splitUrl() {
    // Check if user has text selected in URL input
    var start = urlInput.selectionStart;
    var end = urlInput.selectionEnd;
    if (start !== end) {
      // Split only the selected portion
      var text = urlInput.value.substring(start, end);
      text = text.replace(/&/g, '\n&');
      text = text.replace(/\?/g, '\n?');
      urlInput.value = urlInput.value.substring(0, start) + text + urlInput.value.substring(end);
    } else {
      var uri = urlInput.value;
      uri = uri.replace(/&/g, '\n&');
      uri = uri.replace(/\?/g, '\n?');
      urlInput.value = uri;
    }
  }

  function execute() {
    if (!currentTabId) return;
    var url = urlInput.value.replace(/\n|\r/g, '').trim();
    if (!url) return;
    if (!/^(https?:\/\/|view-source:)/i.test(url)) {
      url = 'http://' + url;
    }

    var headers = {
      referer: enableReferer.checked ? refererInput.value.trim() : null,
      ua: enableUA.checked ? uaInput.value.trim() : null,
      cookie: enableCookie.checked ? cookieInput.value.trim() : null
    };

    // Set headers in background (persists until cleared)
    chrome.runtime.sendMessage({
      type: 'HACKBAR_SET_HEADERS',
      tabId: currentTabId,
      headers: headers
    });

    if (method === 'GET') {
      chrome.tabs.update(currentTabId, { url: url });
    } else {
      var params = parsePostData(postInput.value);
      chrome.runtime.sendMessage({
        type: 'HACKBAR_EXECUTE',
        tabId: currentTabId,
        url: url,
        method: 'POST',
        postParams: params
      });
    }
  }

  function parsePostData(dataStr) {
    var params = {};
    if (!dataStr) return params;
    var parts = dataStr.trim().split('&');
    for (var i = 0; i < parts.length; i++) {
      var m = parts[i].match(/^([^=]*)=(.*)/);
      if (m && m.length === 3) {
        try {
          params[m[1]] = decodeURIComponent(m[2].replace(/\+/g, ' '));
        } catch (e) {
          params[m[1]] = m[2];
        }
      }
    }
    return params;
  }

  // ========== Toggle Events ==========

  function wireToggleEvents() {
    enablePost.addEventListener('change', function () { toggleBlock($('hbPostBlock'), enablePost.checked); });
    enableReferer.addEventListener('change', function () { toggleBlock($('hbRefererBlock'), enableReferer.checked); });
    enableUA.addEventListener('change', function () { toggleBlock($('hbUABlock'), enableUA.checked); });
    enableCookie.addEventListener('change', function () { toggleBlock($('hbCookieBlock'), enableCookie.checked); });

    $('hbClearHeaders').addEventListener('click', function () {
      refererInput.value = '';
      uaInput.value = '';
      cookieInput.value = '';
      chrome.runtime.sendMessage({
        type: 'HACKBAR_CLEAR_HEADERS',
        tabId: currentTabId
      });
    });
  }

  function toggleBlock(el, show) {
    if (show) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }

  function buildUAPresets() {
    var presets = StiffEyesHackbarPayloads.UA_PRESETS;
    for (var i = 0; i < presets.length; i++) {
      var opt = document.createElement('option');
      opt.value = presets[i];
      opt.textContent = presets[i].length > 60 ? presets[i].substring(0, 57) + '…' : presets[i];
      uaSelect.appendChild(opt);
    }
    uaSelect.addEventListener('change', function () {
      if (uaSelect.value) uaInput.value = uaSelect.value;
    });
  }

  // ========== Tool Events ==========

  function wireToolEvents() {
    // Sub-tab switching
    var subtabs = document.querySelectorAll('#panel-hackbar .hackbar-subtab');
    subtabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        subtabs.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentToolCat = btn.dataset.toolcat;
        showToolPanel(currentToolCat);
      });
    });

    // Tool button clicks
    var toolBtns = document.querySelectorAll('#panel-hackbar .hackbar-tool-btn');
    toolBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyTool(btn.dataset.tool);
      });
    });

    // Copy output
    $('hbCopyOutput').addEventListener('click', function () {
      copyOutput();
    });

    // Push to URL
    $('hbPushToUrl').addEventListener('click', function () {
      if (toolOutput.value) {
        urlInput.value = toolOutput.value;
        urlInput.focus();
      }
    });
  }

  function copyOutput() {
    if (!toolOutput.value) return;
    toolOutput.select();
    document.execCommand('copy');
    flashBtn($('hbCopyOutput'), '✓ 已复制', '复制');
  }

  function showToolPanel(cat) {
    var panels = ['hbPanelEncrypt', 'hbPanelEncode', 'hbPanelSql', 'hbPanelXss', 'hbPanelLfi', 'hbPanelOther'];
    panels.forEach(function (id) {
      var el = $(id);
      if (el) el.classList.add('hidden');
    });
    var mapping = { encrypt: 'hbPanelEncrypt', encode: 'hbPanelEncode', sql: 'hbPanelSql', xss: 'hbPanelXss', lfi: 'hbPanelLfi', other: 'hbPanelOther' };
    var target = mapping[cat];
    if (target && $(target)) $(target).classList.remove('hidden');
  }

  function getToolInput() {
    // First, check tool input textarea
    if (toolInput.value.trim()) return toolInput.value;

    // If empty, check if user has text selected in URL input
    var start = urlInput.selectionStart;
    var end = urlInput.selectionEnd;
    if (start !== end) {
      return urlInput.value.substring(start, end);
    }

    // Finally, check if user has text selected in POST input (if visible)
    if (!postInput.classList.contains('hidden')) {
      var ps = postInput.selectionStart;
      var pe = postInput.selectionEnd;
      if (ps !== pe) return postInput.value.substring(ps, pe);
    }

    return '';
  }

  function applyTool(tool) {
    var input = getToolInput();

    // Some tools don't need input
    if (tool === 'basic_info') {
      toolOutput.value = StiffEyesHackbarSql.basicInfo();
      return;
    }
    if (tool === 'xss_alert') {
      toolOutput.value = '<script>alert(1)</script>';
      return;
    }
    if (tool === 'union_select') {
      var cols = prompt('输入 SELECT 列数:', '1');
      if (cols === null || cols === '') return;
      cols = parseInt(cols, 10);
      if (isNaN(cols) || cols < 1 || cols > 1000) return;
      toolOutput.value = StiffEyesHackbarSql.toUnionSelect(cols);
      return;
    }

    if (!input) {
      showModal(function (text) {
        if (text) {
          toolInput.value = text;
          applyToolDirect(tool, text);
        }
      });
      return;
    }
    applyToolDirect(tool, input);
  }

  function applyToolDirect(tool, input) {
    var result = '';
    switch (tool) {
      // Crypto
      case 'md5':       result = StiffEyesHackbarCrypto.md5(input); break;
      case 'sha1':      result = StiffEyesHackbarCrypto.sha1(input); break;
      case 'sha256':    result = StiffEyesHackbarCrypto.sha256(input); break;
      case 'rot13':     result = StiffEyesHackbarCrypto.rot13(input); break;
      // Encode — match original HackBar: URL encode produces lowercase
      case 'b64enc':    result = StiffEyesHackbarCrypto.base64Encode(input); break;
      case 'b64dec':    result = StiffEyesHackbarCrypto.base64Decode(input); break;
      case 'urlenc':    result = encodeURIComponent(input).toLowerCase(); break;
      case 'urldec':
        try { result = decodeURIComponent(input.replace(/\+/g, ' ')); }
        catch (e) { result = '无效 URL 编码'; }
        break;
      case 'hexenc':    result = StiffEyesHackbarCrypto.hexEncode(input); break;
      case 'hexdec':    result = StiffEyesHackbarCrypto.hexDecode(input); break;
      // SQL
      case 'mysql_char':      result = StiffEyesHackbarSql.toMySQLChar(input); break;
      case 'mssql_char':      result = StiffEyesHackbarSql.toMSSQLChar(input); break;
      case 'oracle_char':     result = StiffEyesHackbarSql.toOracleChar(input); break;
      case 'convert_utf8':    result = StiffEyesHackbarSql.toMySQLConvertUsing('utf8', input); break;
      case 'convert_latin1':  result = StiffEyesHackbarSql.toMySQLConvertUsing('latin1', input); break;
      case 'inline_comment':  result = StiffEyesHackbarSql.toInlineComments(input); break;
      // XSS
      case 'xss_fromcharcode': result = StiffEyesHackbarXss.toFromCharCode(input); break;
      case 'xss_htmlent':      result = StiffEyesHackbarXss.toHtmlEntities(input); break;
      // Other
      case 'jsonify':
        try { result = JSON.stringify(JSON.parse(input), null, 4); }
        catch (e) { result = '无效 JSON'; }
        break;
      case 'uppercase':  result = input.toUpperCase(); break;
      case 'lowercase':  result = input.toLowerCase(); break;
      default: result = '';
    }
    toolOutput.value = result;
  }

  function flashBtn(btn, flashText, origText) {
    btn.textContent = flashText;
    setTimeout(function () { btn.textContent = origText; }, 1200);
  }

  // ========== LFI List ==========

  function buildLfiList() {
    var container = $('hbLfiList');
    if (!container) return;
    var groups = StiffEyesHackbarPayloads.LFI_PAYLOADS;
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var groupLabel = document.createElement('div');
      groupLabel.className = 'hackbar-lfi-group';
      groupLabel.textContent = group.group;
      container.appendChild(groupLabel);
      for (var i = 0; i < group.items.length; i++) {
        var item = group.items[i];
        var btn = document.createElement('button');
        btn.className = 'hackbar-lfi-item';
        btn.innerHTML = '<span class="lfi-label">' + escapeHtml(item.label) + '</span>' + escapeHtml(item.value);
        btn.addEventListener('click', (function (val) {
          return function () {
            var cur = urlInput.value;
            var sep = cur && cur.charAt(cur.length - 1) !== '&' && cur.indexOf('?') >= 0 ? '&' : '';
            urlInput.value = cur + sep + val;
            urlInput.focus();
          };
        })(item.value));
        container.appendChild(btn);
      }
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ========== Modal ==========

  function wireModal() {
    $('hbModalCancel').addEventListener('click', hideModal);
    $('hbModalOverlay').addEventListener('click', function (e) {
      if (e.target === $('hbModalOverlay')) hideModal();
    });
  }

  function showModal(callback) {
    var overlay = $('hbModalOverlay');
    var input = $('hbModalInput');
    overlay.classList.remove('hidden');
    input.value = '';
    input.focus();
    var okBtn = $('hbModalOk');
    var newOk = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    newOk.addEventListener('click', function () {
      hideModal();
      callback(input.value);
    });
    input.addEventListener('keydown', function onEnter(e) {
      if (e.key === 'Enter') {
        hideModal();
        callback(input.value);
        input.removeEventListener('keydown', onEnter);
      }
    });
  }

  function hideModal() {
    $('hbModalOverlay').classList.add('hidden');
  }

  // ========== Keyboard Shortcut ==========

  function wireKeyboardShortcut() {
    document.addEventListener('keydown', function (e) {
      var panel = $('panel-hackbar');
      if (!panel || !panel.classList.contains('active')) return;
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        execute();
      }
    });
  }

  return {
    init: init
  };
})();

(function () {
  var Core = StiffEyesWebpackCore;
  var state = {
    tabId: null,
    raw: null,
    entries: [],
    analyzeHits: [],
    parsedChunks: []
  };

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(el, text, kind) {
    if (!el) return;
    el.textContent = text || '';
    el.classList.remove('hidden', 'success', 'error');
    if (!text) {
      el.classList.add('hidden');
      return;
    }
    if (kind) el.classList.add(kind);
  }

  function renderResults(listEl, lines, emptyText) {
    listEl.innerHTML = '';
    if (!lines || !lines.length) {
      var li = document.createElement('li');
      li.className = 'empty';
      li.textContent = emptyText || '暂无数据';
      listEl.appendChild(li);
      return;
    }
    lines.forEach(function (line) {
      var li = document.createElement('li');
      if (typeof line === 'string') {
        li.textContent = line;
        li.title = line;
      } else {
        li.className = line.className || '';
        li.innerHTML = line.html;
        li.title = line.title || '';
      }
      listEl.appendChild(li);
    });
  }

  function setButtons(enabled) {
    ['wpCopyBtn', 'wpLoadBtn', 'wpAnalyzeBtn', 'wpDownloadBtn'].forEach(function (id) {
      $(id).disabled = !enabled;
    });
  }

  function showProgress(wrapId, fillId, textId, pct, done, total, url) {
    var wrap = $(wrapId);
    if (!wrap) return;
    wrap.classList.remove('hidden');
    $(fillId).style.width = pct + '%';
    $(textId).textContent = pct + '% (' + done + '/' + total + ')';
    var urlEl = $('wpProgressUrl');
    if (urlEl) urlEl.textContent = url || '';
  }

  function hideProgress(wrapId) {
    var wrap = $(wrapId);
    if (wrap) wrap.classList.add('hidden');
  }

  function entryLines(entries) {
    return entries.map(function (e, i) {
      var label = e.mapUrl || e.scriptUrl || '条目 ' + (i + 1);
      return {
        html:
          '<span class="tag">MAP</span>' +
          label +
          (e.mapUrl && e.scriptUrl ? '<br><span class="tag">JS</span>' + e.scriptUrl : ''),
        title: (e.mapUrl || '') + '\n' + (e.scriptUrl || '')
      };
    });
  }

  function setWebpackStatus(text) {
    $('webpackStatus').textContent = text;
  }

  async function extractMaps() {
    if (!state.tabId) return;
    setWebpackStatus('正在提取…');
    $('wpExtractBtn').disabled = true;
    renderResults($('wpResults'), [], '提取中…');
    setButtons(false);

    try {
      var raw = await chrome.tabs.sendMessage(state.tabId, { type: 'WEBPACK_EXTRACT' });
      state.raw = raw;
      state.entries = Core.buildEntries(raw);
      state.entries = await Core.enrichEntries(state.entries);
      state.analyzeHits = [];

      var n = state.entries.length;
      var wp = raw.isWebpack ? '已检测到 Webpack' : '未明确检测到 Webpack 特征';
      setWebpackStatus(wp + '，共 ' + n + ' 条映射相关条目');
      renderResults(
        $('wpResults'),
        entryLines(state.entries),
        '未发现 Source Map，可尝试在目标页刷新后重试'
      );
      setButtons(n > 0);

      if ($('wpChunkEntry') && raw.suggestedEntry) {
        $('wpChunkEntry').value = raw.suggestedEntry;
      }
      if ($('wpChunkBase') && raw.suggestedBase) {
        $('wpChunkBase').value = raw.suggestedBase;
      }
    } catch (e) {
      setWebpackStatus('提取失败：' + (e.message || '请刷新目标页'));
      renderResults($('wpResults'), [], '内容脚本未就绪，请刷新页面');
      setButtons(false);
    }
    $('wpExtractBtn').disabled = false;
  }

  async function copyAll() {
    var lines = [];
    state.entries.forEach(function (e) {
      if (e.mapUrl) lines.push(e.mapUrl);
      if (e.scriptUrl) lines.push(e.scriptUrl);
    });
    if (!lines.length) {
      setStatus($('wpStatusMsg'), '没有可复制的内容', 'error');
      return;
    }
    await Core.copyText(lines.join('\n'));
    setStatus($('wpStatusMsg'), '已复制 ' + lines.length + ' 行到剪贴板', 'success');
  }

  async function loadSources() {
    var payload = state.entries
      .filter(function (e) {
        return e.jsContent || e.mapContent;
      })
      .map(function (e) {
        return {
          scriptUrl: e.scriptUrl,
          mapUrl: e.mapUrl,
          jsContent: e.jsContent,
          mapContent: e.mapContent
        };
      });
    if (!payload.length) {
      setStatus($('wpStatusMsg'), '请先提取并确保已拉取到 JS/Map 内容', 'error');
      return;
    }
    var res = await chrome.runtime.sendMessage({
      type: 'WEBPACK_LOAD_SOURCES',
      tabId: state.tabId,
      entries: payload
    });
    if (res && res.success) {
      setStatus(
        $('wpStatusMsg'),
        '已向页面注入 ' + res.count + ' 个脚本，请在 DevTools → Sources 查看',
        'success'
      );
    } else {
      setStatus($('wpStatusMsg'), (res && res.error) || '加载失败', 'error');
    }
  }

  async function analyzeAll() {
    if (!state.entries.length) return;
    var rules = await Core.getMergedRules();
    var allHits = [];
    var total = state.entries.length;
    showProgress('wpProgressWrap', 'wpProgressFill', 'wpProgressText', 0, 0, total, '');

    for (var i = 0; i < state.entries.length; i++) {
      var e = state.entries[i];
      var pct = Math.round(((i + 1) / total) * 100);
      showProgress(
        'wpProgressWrap',
        'wpProgressFill',
        'wpProgressText',
        pct,
        i + 1,
        total,
        e.scriptUrl || e.mapUrl
      );
      var text = (e.jsContent || '') + '\n' + (e.mapContent || '');
      if (!text.trim() && e.scriptUrl) {
        text = await Core.fetchText(e.scriptUrl);
        e.jsContent = text;
      }
      if (e.mapUrl && !e.mapContent) {
        e.mapContent = await Core.fetchText(e.mapUrl);
      }
      text = (e.jsContent || '') + '\n' + (e.mapContent || '');
      Core.analyzeText(text, rules).forEach(function (h) {
        allHits.push(h);
      });
    }

    hideProgress('wpProgressWrap');
    state.analyzeHits = allHits;
    var lines = allHits.slice(0, 200).map(function (h) {
      return {
        html:
          '<span class="tag">' +
          h.group +
          '</span>[' +
          h.name +
          '] ' +
          escapeHtml(h.match),
        className: 'hit-' + (h.color || 'gray'),
        title: h.name
      };
    });
    renderResults(
      $('wpResults'),
      lines,
      allHits.length ? '' : '分析完成，未命中规则'
    );
    setStatus(
      $('wpStatusMsg'),
      '分析完成，共 ' + allHits.length + ' 处命中',
      allHits.length ? 'success' : 'error'
    );
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function safeFilename(url, fallback) {
    try {
      var name = new URL(url).pathname.split('/').pop() || fallback;
      return name.replace(/[<>:"/\\|?*]/g, '_') || fallback;
    } catch (e) {
      return fallback;
    }
  }

  async function downloadAll() {
    if (!state.entries.length) return;
    var total = state.entries.length;
    var ok = 0;
    showProgress('wpProgressWrap', 'wpProgressFill', 'wpProgressText', 0, 0, total, '');

    for (var i = 0; i < state.entries.length; i++) {
      var e = state.entries[i];
      var pct = Math.round(((i + 1) / total) * 100);
      showProgress(
        'wpProgressWrap',
        'wpProgressFill',
        'wpProgressText',
        pct,
        i + 1,
        total,
        e.mapUrl || e.scriptUrl
      );

      if (e.scriptUrl && e.scriptUrl.indexOf('inline') !== 0) {
        if (!e.jsContent) e.jsContent = await Core.fetchText(e.scriptUrl);
        if (e.jsContent) {
          var jsName = safeFilename(e.scriptUrl, 'bundle-' + i + '.js');
          var r1 = await Core.downloadDataUrl(jsName, e.jsContent, 'application/javascript');
          if (r1 && r1.success) ok += 1;
        }
      }
      if (e.mapUrl) {
        if (!e.mapContent) e.mapContent = await Core.fetchText(e.mapUrl);
        if (e.mapContent) {
          var mapName = safeFilename(e.mapUrl, 'bundle-' + i + '.js.map');
          var r2 = await Core.downloadDataUrl(
            mapName,
            e.mapContent,
            'application/json'
          );
          if (r2 && r2.success) ok += 1;
        }
      }
    }

    hideProgress('wpProgressWrap');
    setStatus($('wpStatusMsg'), '下载任务已提交（' + ok + ' 个文件）', 'success');
  }

  function parseRulesFile(text) {
    text = text.trim();
    if (text.indexOf('{') >= 0) {
      var jsonStart = text.indexOf('{');
      var jsonPart = text.slice(jsonStart);
      if (text.indexOf('const ') === 0 || text.indexOf('var ') === 0) {
        var eq = text.indexOf('=');
        if (eq >= 0) jsonPart = text.slice(eq + 1).replace(/;\s*$/, '');
      }
      return JSON.parse(jsonPart);
    }
    return JSON.parse(text);
  }

  async function importRules(file) {
    var text = await file.text();
    var rules = parseRulesFile(text);
    if (!rules.rules) throw new Error('规则格式无效');
    await chrome.storage.local.set({ webpackCustomRules: rules });
    var backupName =
      'webpack-rules-backup-' + Date.now() + '.json';
    await Core.downloadDataUrl(backupName, JSON.stringify(rules, null, 2), 'application/json');
    setStatus($('wpStatusMsg'), '规则已导入并备份到下载目录', 'success');
  }

  async function exportCustomRules() {
    var data = await chrome.storage.local.get(['webpackCustomRules']);
    if (!data.webpackCustomRules) {
      setStatus($('wpStatusMsg'), '暂无自定义规则', 'error');
      return;
    }
    await Core.downloadDataUrl(
      'webpack-custom-rules.json',
      JSON.stringify(data.webpackCustomRules, null, 2),
      'application/json'
    );
    setStatus($('wpStatusMsg'), '自定义规则已导出', 'success');
  }

  async function exportDefaultRules() {
    var rules =
      typeof StiffEyesWebpackRules !== 'undefined'
        ? StiffEyesWebpackRules
        : { rules: [] };
    await Core.downloadDataUrl(
      'webpack-default-rules.json',
      JSON.stringify(rules, null, 2),
      'application/json'
    );
    setStatus($('wpStatusMsg'), '默认规则已导出', 'success');
  }

  async function resetRules() {
    await chrome.storage.local.remove(['webpackCustomRules']);
    setStatus($('wpStatusMsg'), '已恢复为默认规则', 'success');
  }

  async function parseChunks() {
    var entry = ($('wpChunkEntry').value || '').trim();
    var base = ($('wpChunkBase').value || '').trim();
    if (!entry || !base) return;

    state.parsedChunks = [];
    $('wpChunkStartBtn').disabled = true;
    renderResults($('wpChunkResults'), [], '正在解析入口 JS…');
    setStatus($('wpChunkStatusMsg'), '', '');

    var jsText = await Core.fetchText(entry);
    if (!jsText) {
      renderResults($('wpChunkResults'), [], '无法获取入口 JS，请检查地址');
      setStatus($('wpChunkStatusMsg'), '入口 JS 获取失败', 'error');
      $('wpChunkStartBtn').disabled = false;
      return;
    }

    var parsed = await chrome.tabs.sendMessage(state.tabId, {
      type: 'WEBPACK_PARSE_CHUNKS',
      entryUrl: entry,
      basePath: base,
      jsText: jsText
    });

    var chunks = (parsed && parsed.chunks) || [];
    state.parsedChunks = chunks;
    if (!chunks.length) {
      renderResults($('wpChunkResults'), [], '未解析到分包，请检查基础路径');
      setStatus($('wpChunkStatusMsg'), '解析完成，0 个分包', 'error');
      $('wpChunkStartBtn').disabled = false;
      return;
    }

    var lines = chunks.map(function (url, i) {
      var fname = safeFilename(url, 'chunk-' + i + '.js');
      return { html: '<span class="tag">CHUNK</span>' + url, title: fname };
    });
    renderResults($('wpChunkResults'), lines, '');
    setStatus($('wpChunkStatusMsg'), '解析到 ' + chunks.length + ' 个分包，点击下载', 'success');
    $('wpChunkStartBtn').disabled = false;
  }

  async function chunkDownload() {
    var entry = ($('wpChunkEntry').value || '').trim();
    var base = ($('wpChunkBase').value || '').trim();
    if (!entry || !base) {
      setStatus($('wpChunkStatusMsg'), '请填写入口 JS 与基础路径', 'error');
      return;
    }
    if (base.indexOf('http') !== 0 && base.indexOf('/') !== 0) {
      setStatus($('wpChunkStatusMsg'), '基础路径需为完整 URL 或以 / 开头', 'error');
      return;
    }

    var chunks = state.parsedChunks;

    // If no pre-parsed chunks, fetch and parse now
    if (!chunks.length) {
      $('wpChunkStartBtn').disabled = true;
      renderResults($('wpChunkResults'), [], '正在拉取入口 JS…');
      showProgress('wpChunkProgressWrap', 'wpChunkProgressFill', 'wpChunkProgressText', 0, 0, 1, entry);

      var jsText = await Core.fetchText(entry);
      if (!jsText) {
        setStatus($('wpChunkStatusMsg'), '无法获取入口 JS', 'error');
        $('wpChunkStartBtn').disabled = false;
        hideProgress('wpChunkProgressWrap');
        return;
      }

      var parsed = await chrome.tabs.sendMessage(state.tabId, {
        type: 'WEBPACK_PARSE_CHUNKS',
        entryUrl: entry,
        basePath: base,
        jsText: jsText
      });

      chunks = (parsed && parsed.chunks) || [];
      state.parsedChunks = chunks;
      if (!chunks.length) {
        renderResults($('wpChunkResults'), [], '未解析到分包地址，请检查基础路径');
        setStatus($('wpChunkStatusMsg'), '解析完成，0 个分包', 'error');
        $('wpChunkStartBtn').disabled = false;
        hideProgress('wpChunkProgressWrap');
        return;
      }
    }

    $('wpChunkStartBtn').disabled = true;
    var lines = [];
    var total = chunks.length;
    var ok = 0;

    for (var i = 0; i < chunks.length; i++) {
      var url = chunks[i];
      var pct = Math.round(((i + 1) / total) * 100);
      showProgress(
        'wpChunkProgressWrap',
        'wpChunkProgressFill',
        'wpChunkProgressText',
        pct,
        i + 1,
        total,
        url
      );
      var body = await Core.fetchText(url);
      if (body) {
        var fname = safeFilename(url, 'chunk-' + i + '.js');
        var dr = await Core.downloadDataUrl(fname, body, 'application/javascript');
        lines.push({
          html: '<span class="tag ok">OK</span>' + url,
          title: fname
        });
        if (dr && dr.success) ok += 1;
      } else {
        lines.push({
          html: '<span class="tag fail">FAIL</span>' + url,
          title: '下载失败'
        });
      }
    }

    hideProgress('wpChunkProgressWrap');
    renderResults($('wpChunkResults'), lines, '');
    setStatus(
      $('wpChunkStatusMsg'),
      '分包下载完成：' + ok + '/' + total,
      ok ? 'success' : 'error'
    );
    $('wpChunkStartBtn').disabled = false;
  }

  function bindEvents() {
    $('wpExtractBtn').addEventListener('click', extractMaps);
    $('wpCopyBtn').addEventListener('click', copyAll);
    $('wpLoadBtn').addEventListener('click', loadSources);
    $('wpAnalyzeBtn').addEventListener('click', analyzeAll);
    $('wpDownloadBtn').addEventListener('click', downloadAll);

    $('wpChunkNavBtn').addEventListener('click', function () {
      $('webpackMainView').classList.add('hidden');
      $('webpackChunkView').classList.remove('hidden');
      if (($('wpChunkEntry').value || '').trim() && ($('wpChunkBase').value || '').trim()) {
        parseChunks();
      }
    });
    $('wpBackBtn').addEventListener('click', function () {
      $('webpackChunkView').classList.add('hidden');
      $('webpackMainView').classList.remove('hidden');
    });
    $('wpChunkParseBtn').addEventListener('click', parseChunks);
    $('wpChunkStartBtn').addEventListener('click', chunkDownload);

    $('wpImportRulesBtn').addEventListener('click', function () {
      $('wpRulesFile').click();
    });
    $('wpRulesFile').addEventListener('change', function (ev) {
      var file = ev.target.files && ev.target.files[0];
      ev.target.value = '';
      if (!file) return;
      importRules(file).catch(function (e) {
        setStatus($('wpStatusMsg'), '导入失败：' + e.message, 'error');
      });
    });
    $('wpExportRulesBtn').addEventListener('click', exportCustomRules);
    $('wpExportDefaultBtn').addEventListener('click', exportDefaultRules);
    $('wpResetRulesBtn').addEventListener('click', resetRules);

    $('wpReplaceMode').addEventListener('change', function () {
      chrome.storage.local.set({ webpackReplaceMode: $('wpReplaceMode').checked });
    });
  }

  window.StiffEyesWebpackPanel = {
    init: function (tabId) {
      state.tabId = tabId;
      chrome.storage.local.get(['webpackReplaceMode'], function (data) {
        $('wpReplaceMode').checked = !!data.webpackReplaceMode;
      });
    },
    autoExtractIfNeeded: function () {
      if (state.entries.length) return;
      extractMaps();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();

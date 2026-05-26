var SENSITIVE_LABELS = StiffEyesPatterns.SENSITIVE_LABELS;
var SCAN_TABS = StiffEyesPatterns.SCAN_TABS;

var currentTabId = null;
var currentScan = null;
var currentFinger = [];
var activeScanTabId = 'domains';
var scanUiBuilt = false;

const $ = (id) => document.getElementById(id);

function statusClass(code) {
  if (code >= 200 && code < 300) return 'status-2xx';
  if (code >= 300 && code < 400) return 'status-3xx';
  if (code >= 400 && code < 500) return 'status-4xx';
  if (code >= 500) return 'status-5xx';
  return '';
}

function renderList(el, items, emptyText = '暂无数据') {
  if (!el) return;
  el.innerHTML = '';
  if (!items?.length) {
    el.innerHTML = `<li class="empty">${emptyText}</li>`;
    return;
  }
  items.forEach((item) => {
    const li = document.createElement('li');
    if (typeof item === 'string') {
      li.textContent = item;
      li.title = item;
    } else if (item.html) {
      li.innerHTML = item.html;
      li.className = item.className || '';
      li.title = item.title || '';
    } else {
      li.textContent = item.text || '';
      li.title = item.title || item.text || '';
    }
    el.appendChild(li);
  });
}

function snowEntryValue(entry) {
  if (Array.isArray(entry)) return String(entry[0] || '');
  return String(entry || '');
}

function snowEntrySource(entry) {
  if (Array.isArray(entry) && entry[1]) return String(entry[1]);
  return '';
}

function getByPath(obj, path) {
  if (!obj || !path) return [];
  return path.split('.').reduce(function (acc, key) {
    return acc && acc[key] != null ? acc[key] : null;
  }, obj) || [];
}

function collectTabItems(data, tab) {
  if (!data || data.blacklisted) return [];

  if (tab.kind === 'snow') {
    return (data[tab.field] || []).map(function (entry) {
      var val = snowEntryValue(entry);
      var src = snowEntrySource(entry);
      return { text: val, title: src ? '来源: ' + src : val };
    });
  }

  if (tab.kind === 'path') {
    return getByPath(data, tab.path).slice();
  }

  if (tab.kind === 'asset') {
    return (data.assets?.[tab.field] || []).slice();
  }

  if (tab.kind === 'sensitive') {
    var out = [];
    (tab.keys || []).forEach(function (key) {
      var arr = data.sensitive?.[key] || [];
      var label = SENSITIVE_LABELS[key] || key;
      arr.forEach(function (v) {
        out.push({ text: `[${label}] ${v}`, title: v });
      });
    });
    return out;
  }

  return [];
}

function countTabItems(data, tab) {
  return collectTabItems(data, tab).length;
}

function copyTabItems(data, tab) {
  if (!data) return '';
  if (tab.kind === 'snow') {
    return (data[tab.field] || []).map(snowEntryValue).filter(Boolean).join('\n');
  }
  if (tab.kind === 'path') {
    return getByPath(data, tab.path).join('\n');
  }
  if (tab.kind === 'asset') {
    return (data.assets?.[tab.field] || []).join('\n');
  }
  if (tab.kind === 'sensitive') {
    var lines = [];
    (tab.keys || []).forEach(function (key) {
      (data.sensitive?.[key] || []).forEach(function (v) {
        lines.push(v);
      });
    });
    return lines.join('\n');
  }
  return '';
}

async function copyTabUrls(tab) {
  if (!currentScan || !tab.copyUrl) return;
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageTab = tabs[0];
  if (!pageTab?.url) return;
  let baseUrl;
  let currentUrl;
  try {
    currentUrl = new URL(pageTab.url);
    baseUrl = currentUrl.origin;
  } catch {
    return;
  }
  const items = currentScan[tab.field] || [];
  const lines = items.map(function (entry) {
    const path = snowEntryValue(entry);
    if (tab.copyUrl === 'absolute') return baseUrl + path;
    try {
      return new URL(path, currentUrl.href).href;
    } catch {
      return path;
    }
  });
  if (lines.length) navigator.clipboard.writeText(lines.join('\n'));
}

function buildScanUi() {
  if (scanUiBuilt) return;
  var subtabsEl = $('scanSubtabs');
  var panelsEl = $('scanPanels');
  if (!subtabsEl || !panelsEl) return;

  SCAN_TABS.forEach(function (tab, index) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'subtab' + (index === 0 ? ' active' : '');
    btn.dataset.sub = tab.id;
    btn.innerHTML =
      '<span class="subtab-label">' +
      tab.label +
      '</span><span class="count" data-count-for="' +
      tab.id +
      '">0</span>';
    btn.addEventListener('click', function () {
      document.querySelectorAll('#scanSubtabs .subtab').forEach(function (b) {
        b.classList.remove('active');
      });
      document.querySelectorAll('#scanPanels .list-wrap').forEach(function (w) {
        w.classList.add('hidden');
      });
      btn.classList.add('active');
      activeScanTabId = tab.id;
      $(`panel-${tab.id}`).classList.remove('hidden');
    });
    subtabsEl.appendChild(btn);

    var wrap = document.createElement('div');
    wrap.className = 'list-wrap' + (index === 0 ? '' : ' hidden');
    wrap.id = `panel-${tab.id}`;

    var head = document.createElement('div');
    head.className = 'panel-head';
    head.innerHTML =
      '<h3 class="panel-title">' +
      tab.label +
      '</h3><span class="panel-meta" data-meta-for="' +
      tab.id +
      '">0 条</span>';
    wrap.appendChild(head);

    if (tab.copy) {
      var toolbar = document.createElement('div');
      toolbar.className = 'toolbar';
      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn btn-sm';
      copyBtn.textContent = '复制全部';
      copyBtn.addEventListener('click', function () {
        if (!currentScan) return;
        var text = copyTabItems(currentScan, tab);
        if (text) navigator.clipboard.writeText(text);
      });
      toolbar.appendChild(copyBtn);
      if (tab.copyUrl) {
        var copyUrlBtn = document.createElement('button');
        copyUrlBtn.type = 'button';
        copyUrlBtn.className = 'btn btn-sm';
        copyUrlBtn.textContent = '复制 URL';
        copyUrlBtn.addEventListener('click', function () {
          copyTabUrls(tab);
        });
        toolbar.appendChild(copyUrlBtn);
      }
      wrap.appendChild(toolbar);
    }

    var ul = document.createElement('ul');
    ul.className = 'list';
    ul.id = `list-${tab.id}`;
    wrap.appendChild(ul);
    panelsEl.appendChild(wrap);
  });

  scanUiBuilt = true;
}

function updateScanStatus(data) {
  var el = $('scanStatus');
  if (!el) return;
  if (data && data.scanning) {
    el.textContent = '深度扫描进行中，正在拉取外链 JS…';
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

function renderScan(data) {
  buildScanUi();
  updateScanStatus(data);

  if (data) {
    currentScan = data;
  } else {
    currentScan = null;
  }

  if (!currentScan) {
    SCAN_TABS.forEach(function (tab) {
      renderList($(`list-${tab.id}`), [], '页面加载后自动扫描，请稍候');
      var badge = document.querySelector(`[data-count-for="${tab.id}"]`);
      if (badge) badge.textContent = '0';
    });
    renderList($('listFinger'), [], '暂无指纹，请刷新页面后重试');
    return;
  }

  if (currentScan.blacklisted) {
    SCAN_TABS.forEach(function (tab) {
      renderList($(`list-${tab.id}`), [], '当前域名在黑名单中，已跳过采集');
      var badge = document.querySelector(`[data-count-for="${tab.id}"]`);
      if (badge) badge.textContent = '0';
    });
    return;
  }

  SCAN_TABS.forEach(function (tab) {
    var items = collectTabItems(currentScan, tab);
    var emptyText = currentScan.scanning
      ? '扫描中，请稍候…'
      : tab.emptyText || (tab.kind === 'sensitive' ? '未发现匹配项' : '暂无数据');
    renderList($(`list-${tab.id}`), items, emptyText);
    var badge = document.querySelector(`[data-count-for="${tab.id}"]`);
    if (badge) badge.textContent = String(items.length);
    var meta = document.querySelector(`[data-meta-for="${tab.id}"]`);
    if (meta) meta.textContent = items.length + ' 条';
  });

  var scanFingers = currentScan.fingers || currentScan.fingerprints || [];
  if (scanFingers.length && Array.isArray(scanFingers[0])) {
    scanFingers = scanFingers.map(function (e) {
      return { name: e[0], type: 'builder', source: e[1] || '页面', detail: '' };
    });
  } else if (scanFingers.length && typeof scanFingers[0] === 'string') {
    scanFingers = scanFingers.map(function (name) {
      return { name: name, type: 'builder', source: '页面', detail: '' };
    });
  }
  var fingers = [
    ...scanFingers,
    ...currentFinger.filter(
      (f) =>
        !(currentScan.fingerprints || []).some(
          (x) => x.type === f.type && x.name === f.name && x.source === f.source
        )
    )
  ];
  renderList(
    $('listFinger'),
    fingers.map((f) => {
      const typeLabel =
        f.type === 'analytics'
          ? '统计'
          : f.type === 'security'
            ? '安全'
            : f.type === 'server'
              ? '服务器'
              : f.type;
      return `[${typeLabel}] ${f.name} — ${f.source}${f.detail ? ': ' + f.detail : ''}`;
    }),
    '暂无指纹，请刷新页面后重试'
  );
}

async function loadResults() {
  if (!currentTabId) return;
  const res = await chrome.runtime.sendMessage({
    type: 'GET_SCAN_RESULTS',
    tabId: currentTabId
  });
  currentFinger = res?.fingerprints || [];
  if (res?.scan) {
    StiffEyesPatterns.normalizeScanResult(res.scan);
  }
  renderScan(res?.scan);

  if (res?.springResults) {
    renderSpringResults(res.springResults);
  } else {
    renderList($('listSpring'), [], '暂无扫描结果');
  }
  if (res?.springState) {
    if (res.springState.scanning) {
      applySpringProgress(res.springState);
    } else if (res.springState.error) {
      failSpringScan(res.springState.error);
    }
  }
}

async function init() {
  buildScanUi();
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) {
    $('currentHost').textContent = '无法获取标签页';
    return;
  }
  currentTabId = tab.id;

  try {
    const u = new URL(tab.url || '');
    $('currentHost').textContent =
      u.hostname || tab.url || '受限页面（chrome:// 等无法扫描）';
  } catch {
    $('currentHost').textContent = tab.url || '—';
  }

  if (
    !tab.url ||
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('chrome-extension://')
  ) {
    renderScan(null);
    return;
  }

  await loadResults();
  if (window.StiffEyesWebpackPanel) {
    window.StiffEyesWebpackPanel.init(currentTabId);
  }
  if (!currentScan) {
    renderScan({ scanning: true, blacklisted: false, counts: { total: 0 } });
  }
}

document.querySelectorAll('#mainTabs .tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#mainTabs .tab').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('main .panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.panel).classList.add('active');
    if (
      btn.dataset.panel === 'panel-webpack' &&
      window.StiffEyesWebpackPanel &&
      currentTabId
    ) {
      window.StiffEyesWebpackPanel.init(currentTabId);
      window.StiffEyesWebpackPanel.autoExtractIfNeeded();
    }
  });
});

$('btnSettings')?.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('pages/settings.html') });
});

function renderSpringResults(scanText) {
  if (!scanText || !scanText.trim()) {
    renderList($('listSpring'), [], '暂无扫描结果');
    return;
  }

  const lines = scanText.split('\n').filter((line) => line.trim());
  lines.sort((a, b) => {
    const aStatus = a.match(/\[(\d+)\]/)?.[1];
    const bStatus = b.match(/\[(\d+)\]/)?.[1];
    if (aStatus === '200') return -1;
    if (bStatus === '200') return 1;
    return 0;
  });

  const items = lines.map((line) => {
    const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
    const statusMatch = line.match(/\[(\d+)\]/);
    const isError = /\[Error\]/.test(line);

    let statusLabel = 'ERR';
    let code = 0;
    if (statusMatch) {
      code = parseInt(statusMatch[1], 10);
      statusLabel = String(code);
    } else if (isError) {
      statusLabel = 'Error';
    }

    const url = urlMatch ? urlMatch[1] : line;
    const html = `<span class="tag">${statusLabel}</span><a href="${url}" target="_blank" rel="noopener">${url}</a>`;

    return {
      html,
      className: isError ? 'status-5xx' : statusClass(code),
      title: line
    };
  });

  renderList($('listSpring'), items, '未发现响应条目');
}

function applySpringProgress(st) {
  if (!st) return;
  const pct = st.progress != null ? st.progress : 0;
  $('springProgress').style.width = `${pct}%`;
  if (st.total) {
    $('springProgressText').textContent = `${pct}% (${st.completed || 0}/${st.total})`;
  } else {
    $('springProgressText').textContent = `${pct}%`;
  }
}

var springScanFinishing = false;

function failSpringScan(message) {
  springScanFinishing = false;
  $('btnSpringScan').disabled = false;
  $('springProgressText').textContent = message || '扫描失败';
  renderList($('listSpring'), [], message || '扫描失败');
}

function finishSpringScan(resultsText) {
  if (springScanFinishing) return;
  springScanFinishing = true;
  $('springProgress').style.width = '100%';
  $('springProgressText').textContent = '100%';
  $('btnSpringScan').disabled = false;
  renderSpringResults(resultsText);
}

function isSpringForCurrentTab(msg) {
  return msg.tabId == null || msg.tabId === currentTabId;
}

$('btnSpringScan').addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab?.id || !tab.url || !/^https?:/i.test(tab.url)) {
    $('springProgressText').textContent = '请先打开 http(s) 网页再扫描';
    return;
  }

  springScanFinishing = false;
  $('btnSpringScan').disabled = true;
  $('springProgress').style.width = '0%';
  $('springProgressText').textContent = '0%';
  renderList($('listSpring'), [], '扫描中…');

  chrome.storage.local.set({
    springScanState: { progress: 0, completed: 0, total: 0, scanning: true, tabId: tab.id }
  });

  const ensureDirs = () =>
    new Promise((resolve) => {
      chrome.storage.local.get(['directories'], (data) => {
        if (!Array.isArray(data.directories) || !data.directories.length) {
          chrome.storage.local.set(
            { directories: StiffEyesPaths.DEFAULT_SPRING_PATHS.slice() },
            resolve
          );
        } else {
          resolve();
        }
      });
    });

  await ensureDirs();

  chrome.runtime.sendMessage(
    {
      action: 'scanDirectories',
      tabId: tab.id,
      tabUrl: tab.url
    },
    (resp) => {
      if (resp && resp.error) {
        failSpringScan(resp.error);
      }
    }
  );
});

// Spring 路径配置已并入总设置页（pages/settings.html）

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SCAN_READY' && msg.tabId === currentTabId) {
    renderScan(msg.scan);
    return;
  }
  if (msg.action === 'updateProgress' && isSpringForCurrentTab(msg)) {
    applySpringProgress(msg);
  }
  if (msg.action === 'updateResults' && msg.results && isSpringForCurrentTab(msg)) {
    finishSpringScan(msg.results);
  }
  if (msg.action === 'springScanError' && msg.error && isSpringForCurrentTab(msg)) {
    failSpringScan(msg.error);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.springScanState?.newValue) {
    const st = changes.springScanState.newValue;
    if (!isSpringForCurrentTab(st)) return;
    if (st.error && !st.scanning) {
      failSpringScan(st.error);
      return;
    }
    if (st.scanning) {
      applySpringProgress(st);
      return;
    }
    if (st.results) {
      finishSpringScan(st.results);
      return;
    }
    if (st.progress != null) {
      applySpringProgress(st);
    }
  }
});

document.querySelectorAll('a[href*="settings.html"]').forEach((a) => {
  a.href = chrome.runtime.getURL('pages/settings.html');
});

/* 首屏即构建侧栏，避免空布局导致弹窗被 Chrome 压窄 */
buildScanUi();
init();

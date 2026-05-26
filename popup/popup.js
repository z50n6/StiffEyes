var SCAN_TABS = StiffEyesPatterns.SCAN_TABS;

var currentTabId = null;
var currentScan = null;
var currentFinger = [];
var activeScanTabId = 'domains';
var scanUiBuilt = false;

const $ = (id) => document.getElementById(id);

function springStorageKey(tabId) {
  return 'springScan_' + tabId;
}

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

function collectTabItems(data, tab) {
  if (!data || data.blacklisted) return [];

  return (data[tab.field] || []).map(function (entry) {
    var val = snowEntryValue(entry);
    var src = snowEntrySource(entry);
    return { text: val, title: src ? '来源: ' + src : val };
  });
}

function countTabItems(data, tab) {
  return collectTabItems(data, tab).length;
}

function copyTabItems(data, tab) {
  if (!data) return '';
  return (data[tab.field] || []).map(snowEntryValue).filter(Boolean).join('\n');
}

async function copyTabUrls(tab) {
  if (!currentScan || !tab.copyUrl) return;
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageTab = tabs[0];
  if (!pageTab?.url) return;
  const stored = await chrome.storage.local.get(['base_path']);
  const configuredBase = (stored.base_path || '').trim();
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
    if (tab.copyUrl === 'absolute') {
      if (path.startsWith('http://') || path.startsWith('https://')) return path;
      return baseUrl + (path.startsWith('/') ? path : '/' + path);
    }
    if (tab.copyUrl === 'relative' && configuredBase) {
      const norm = configuredBase.startsWith('/')
        ? configuredBase
        : '/' + configuredBase;
      const joined =
        baseUrl +
        norm.replace(/\/$/, '') +
        '/' +
        String(path).replace(/^\//, '');
      try {
        return new URL(joined).href;
      } catch {
        return joined;
      }
    }
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
      : tab.emptyText || '暂无数据';
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
    } else if (res.springState.cancelled) {
      onSpringCancelled(res.springState, res.springResults);
    } else if (res.springState.error) {
      failSpringScan(res.springState.error);
    } else {
      setSpringScanningUi(false);
    }
  } else {
    setSpringScanningUi(false);
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
  if (st.scanning) {
    setSpringScanningUi(true);
  }
}

function setSpringScanningUi(scanning) {
  const startBtn = $('btnSpringScan');
  const cancelBtn = $('btnSpringCancel');
  if (startBtn) startBtn.disabled = !!scanning;
  if (cancelBtn) {
    cancelBtn.disabled = !scanning;
    cancelBtn.classList.toggle('hidden', !scanning);
  }
}

var springScanFinishing = false;

function failSpringScan(message) {
  springScanFinishing = false;
  setSpringScanningUi(false);
  $('springProgressText').textContent = message || '扫描失败';
  renderList($('listSpring'), [], message || '扫描失败');
}

function finishSpringScan(resultsText) {
  if (springScanFinishing) return;
  springScanFinishing = true;
  $('springProgress').style.width = '100%';
  $('springProgressText').textContent = '100%';
  setSpringScanningUi(false);
  renderSpringResults(resultsText);
}

function onSpringCancelled(st, resultsText) {
  springScanFinishing = false;
  setSpringScanningUi(false);
  const pct = st && st.progress != null ? st.progress : 0;
  $('springProgress').style.width = `${pct}%`;
  if (st && st.total) {
    $('springProgressText').textContent = `已中止 ${pct}% (${st.completed || 0}/${st.total})`;
  } else {
    $('springProgressText').textContent = '已中止';
  }
  const text = resultsText || (st && st.results) || '';
  if (text.trim()) {
    renderSpringResults(text);
  } else {
    renderList($('listSpring'), [], '扫描已中止，无 2xx/3xx 命中');
  }
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
  setSpringScanningUi(true);
  $('springProgress').style.width = '0%';
  $('springProgressText').textContent = '0%';
  renderList($('listSpring'), [], '扫描中…');

  chrome.storage.local.set({
    [springStorageKey(tab.id)]: {
      progress: 0,
      completed: 0,
      total: 0,
      scanning: true,
      tabId: tab.id
    }
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

$('btnSpringCancel')?.addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) return;

  $('btnSpringCancel').disabled = true;
  $('springProgressText').textContent = '正在中止…';

  chrome.runtime.sendMessage(
    {
      type: 'SPRING_SCAN_CANCEL',
      tabId: tab.id
    },
    (resp) => {
      if (chrome.runtime.lastError) {
        failSpringScan('中止失败');
        return;
      }
      if (!resp || !resp.ok) {
        setSpringScanningUi(false);
        $('springProgressText').textContent = '当前无进行中的扫描';
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
    applySpringProgress({
      progress: msg.progress,
      completed: msg.completed,
      total: msg.total,
      scanning: true
    });
  }
  if (msg.action === 'updateResults' && msg.results && isSpringForCurrentTab(msg)) {
    finishSpringScan(msg.results);
  }
  if (msg.action === 'springScanCancelled' && isSpringForCurrentTab(msg)) {
    onSpringCancelled(msg, msg.results);
  }
  if (msg.action === 'springScanError' && msg.error && isSpringForCurrentTab(msg)) {
    failSpringScan(msg.error);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !currentTabId) return;
  const springChange = changes[springStorageKey(currentTabId)];
  if (springChange?.newValue) {
    const st = springChange.newValue;
    if (!isSpringForCurrentTab(st)) return;
    if (st.error && !st.scanning) {
      failSpringScan(st.error);
      return;
    }
    if (st.cancelled && !st.scanning) {
      onSpringCancelled(st, st.results);
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

function applyAppVersion() {
  var footer = $('appFooter');
  if (!footer) return;
  var v = chrome.runtime.getManifest().version;
  footer.textContent = '仅限授权安全测试 · 绷着脸 StiffEyes v' + v;
}

/* 首屏即构建侧栏，避免空布局导致弹窗被 Chrome 压窄 */
applyAppVersion();
buildScanUi();
init();

var SCAN_TABS = StiffEyesPatterns.SCAN_TABS;

var currentTabId = null;
var currentScan = null;
var currentFinger = [];
var activeScanTabId = 'domains';
var scanUiBuilt = false;
var cloudBuckets = [];
var activeCloudBucketId = null;
var activePayloadCatId = null;
var activePayloadSub = null;
var activeTransformId = null;

const $ = (id) => document.getElementById(id);

function springStorageKey(tabId) {
  return 'springScan_' + tabId;
}

async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tabs[0]?.id;
  return tabs[0] || null;
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
      // 显示来源信息
      if (item.source) {
        li.dataset.src = item.source;
        li.title = (item.text || '') + '\n来源: ' + item.source;
      }
    }
    // 右键复制内容
    li.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      var val = item.text || item.title || '';
      if (val) navigator.clipboard.writeText(val).catch(function () {});
    });
    // Ctrl+点击在新标签页打开来源
    li.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey) {
        var src = li.dataset.src;
        if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
          chrome.tabs.create({ url: src, active: false });
        }
      }
    });
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
    return { text: val, title: src ? '来源: ' + src : val, source: src || '' };
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
  var badge = $('headerProgressBadge');
  if (el) {
    if (data && data.scanning) {
      el.textContent = '扫描结果加载中…';
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }
  // 更新 header 进度徽章
  if (badge) {
    if (data && data.scanning) {
      badge.textContent = '扫描中…';
      badge.classList.remove('hidden');
    } else if (data && data.counts && data.counts.total > 0) {
      badge.textContent = data.counts.total + ' 条';
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
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

// ========== Cloud Bucket Panel ==========
function renderCloudBucketList() {
  var el = $('listCloudBuckets');
  if (!el) return;
  el.innerHTML = '';
  if (!cloudBuckets.length) {
    el.innerHTML = '<li class="empty">浏览页面时自动发现云存储 Bucket…</li>';
    return;
  }
  cloudBuckets.forEach(function (b) {
    var li = document.createElement('li');
    var statusDot = '';
    if (b.scanned && b.scanSummary) {
      if (b.scanSummary.critical > 0) statusDot = '<span class="dot dot-critical" title="严重漏洞"></span>';
      else if (b.scanSummary.high > 0) statusDot = '<span class="dot dot-high" title="高危漏洞"></span>';
      else statusDot = '<span class="dot dot-safe" title="未发现漏洞"></span>';
    } else {
      statusDot = '<span class="dot dot-new" title="待扫描"></span>';
    }
    li.innerHTML = statusDot + '<span class="vendor-tag">' + (b.label || b.vendor) + '</span><br><span class="bucket-name">' + (b.bucketName || 'Unknown') + '</span>';
    li.title = (b.url || '') + '\n来源: ' + (b.sourceUrl || '') + '\n检测: ' + (b.detectedVia || '');
    if (activeCloudBucketId === b.id) li.classList.add('active');
    li.addEventListener('click', function () {
      selectCloudBucket(b.id);
    });
    el.appendChild(li);
  });
}

function selectCloudBucket(bucketId) {
  activeCloudBucketId = bucketId;
  var bucket = cloudBuckets.find(function (b) { return b.id === bucketId; });
  if (!bucket) return;

  $('cloudDetailTitle').textContent = bucket.bucketName || bucket.url || '';
  $('cloudDetailMeta').textContent = (bucket.label || bucket.vendor) + ' | ' + (bucket.region || '?');
  $('cloudDetailToolbar').style.display = 'flex';

  renderCloudBucketList();

  if (bucket.scanned && bucket.scanResults) {
    renderCloudScanResults(bucket.scanResults);
  } else {
    renderCloudScanResults(null);
  }
}

function renderCloudScanResults(results) {
  var el = $('listCloudScanResults');
  if (!el) return;
  el.innerHTML = '';
  if (!results || !results.length) {
    el.innerHTML = '<li class="empty">点击「扫描此 Bucket」进行漏洞检测</li>';
    return;
  }
  results.forEach(function (r) {
    var sevClass = r.vulnerable ? ('tag-' + (r.severity || 'info')) : 'tag-info';
    var tagText = r.vulnerable ? (r.severity === 'critical' ? '严重' : r.severity === 'high' ? '高危' : r.severity === 'medium' ? '中危' : '信息') : '安全';
    var li = document.createElement('li');
    li.innerHTML = '<span class="cloud-result-tag ' + sevClass + '">' + tagText + '</span>' +
      '<span class="cloud-result-check">' + r.check + '</span>' +
      '<span class="cloud-result-meta">[' + r.method + ' ' + r.status + ']</span>' +
      '<span class="cloud-result-desc">' + (r.description || '') + '</span>';
    el.appendChild(li);
  });
}

function initCloudPanel() {
  chrome.runtime.sendMessage({ type: 'CLOUD_BUCKETS_GET_ALL' }, function (resp) {
    if (resp && resp.buckets) {
      cloudBuckets = resp.buckets;
      renderCloudBucketList();
    }
  });

  var btnScanOne = $('btnCloudScanOne');
  var btnScanAll = $('btnCloudScanAll');
  var btnClear = $('btnCloudClear');
  var btnDeleteOne = $('btnCloudDeleteOne');
  var btnOpenUrl = $('btnCloudOpenUrl');

  if (btnScanOne) {
    btnScanOne.onclick = function () {
      if (!activeCloudBucketId) return;
      btnScanOne.disabled = true;
      chrome.runtime.sendMessage({
        type: 'CLOUD_BUCKET_SCAN',
        bucketId: activeCloudBucketId
      });
    };
  }

  if (btnScanAll) {
    btnScanAll.onclick = function () {
      btnScanAll.disabled = true;
      $('cloudProgressWrap')?.classList.remove('hidden');
      $('cloudProgressFill').style.width = '0%';
      $('cloudProgressText').textContent = '扫描中…';
      chrome.runtime.sendMessage({ type: 'CLOUD_BUCKET_SCAN_ALL' });
    };
  }

  if (btnClear) {
    btnClear.onclick = function () {
      if (!confirm('确定要清除所有发现的云存储 Bucket 吗？')) return;
      chrome.runtime.sendMessage({ type: 'CLOUD_BUCKET_CLEAR' }, function () {
        cloudBuckets = [];
        activeCloudBucketId = null;
        renderCloudBucketList();
        renderCloudScanResults(null);
        $('cloudDetailTitle').textContent = '选择 Bucket';
        $('cloudDetailMeta').textContent = '';
        $('cloudDetailToolbar').style.display = 'none';
      });
    };
  }

  if (btnDeleteOne) {
    btnDeleteOne.onclick = function () {
      if (!activeCloudBucketId) return;
      chrome.runtime.sendMessage({ type: 'CLOUD_BUCKET_DELETE', bucketId: activeCloudBucketId }, function () {
        cloudBuckets = cloudBuckets.filter(function (b) { return b.id !== activeCloudBucketId; });
        activeCloudBucketId = null;
        renderCloudBucketList();
        renderCloudScanResults(null);
        $('cloudDetailTitle').textContent = '选择 Bucket';
        $('cloudDetailMeta').textContent = '';
        $('cloudDetailToolbar').style.display = 'none';
      });
    };
  }

  if (btnOpenUrl) {
    btnOpenUrl.onclick = function () {
      if (!activeCloudBucketId) return;
      var bucket = cloudBuckets.find(function (b) { return b.id === activeCloudBucketId; });
      if (bucket) chrome.tabs.create({ url: bucket.url, active: false });
    };
  }
}

// ========== Payload Panel ==========
function renderPayloadCatList() {
  var el = $('listPayloadCats');
  if (!el) return;
  el.innerHTML = '';
  var cats = StiffEyesPayloads.CATEGORIES;
  var allLi = document.createElement('li');
  allLi.innerHTML = '<span class="payload-cat-icon">📋</span>全部';
  if (!activePayloadCatId) allLi.classList.add('active');
  allLi.addEventListener('click', function () {
    activePayloadCatId = null;
    activePayloadSub = null;
    selectPayloadCat(null);
  });
  el.appendChild(allLi);

  cats.forEach(function (cat) {
    var li = document.createElement('li');
    li.innerHTML = '<span class="payload-cat-icon">' + cat.icon + '</span>' + cat.label;
    li.title = cat.label;
    if (activePayloadCatId === cat.id) li.classList.add('active');
    li.addEventListener('click', function () {
      activePayloadCatId = cat.id;
      activePayloadSub = null;
      selectPayloadCat(cat.id);
    });
    el.appendChild(li);
  });
}

function selectPayloadCat(catId) {
  renderPayloadCatList();
  var catLabel = catId ? StiffEyesPayloads.getCategoryLabel(catId) : '全部类别';
  $('payloadCatTitle').textContent = catLabel;
  renderPayloadSubtags(catId);
  renderScenarioList(catId, activePayloadSub);
}

var payloadFilterVisible = false;

function renderPayloadSubtags(catId) {
  var el = $('payloadSubtags');
  var toggleBtn = $('btnPayloadFilter');
  if (!el) return;
  el.innerHTML = '';
  var subs = StiffEyesPayloads.getSubcategories(catId);
  if (subs.length <= 1) {
    el.classList.add('hidden');
    if (toggleBtn) toggleBtn.classList.add('hidden');
    return;
  }
  if (toggleBtn) {
    toggleBtn.classList.remove('hidden');
    toggleBtn.classList.toggle('active', payloadFilterVisible);
    toggleBtn.textContent = payloadFilterVisible ? '筛选 ▴' : '筛选 ▾';
    toggleBtn.onclick = function () {
      payloadFilterVisible = !payloadFilterVisible;
      renderPayloadSubtags(catId);
      el.classList.toggle('hidden', !payloadFilterVisible);
      if (payloadFilterVisible) el.style.display = 'flex';
    };
  }
  if (!payloadFilterVisible) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.style.display = 'flex';

  var allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'payload-subtag' + (!activePayloadSub ? ' active' : '');
  allBtn.textContent = '全部';
  allBtn.addEventListener('click', function () {
    activePayloadSub = null;
    renderPayloadSubtags(catId);
    renderScenarioList(catId, null);
  });
  el.appendChild(allBtn);
  subs.forEach(function (sub) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'payload-subtag' + (activePayloadSub === sub ? ' active' : '');
    btn.textContent = sub;
    btn.addEventListener('click', function () {
      activePayloadSub = sub;
      renderPayloadSubtags(catId);
      renderScenarioList(catId, sub);
    });
    el.appendChild(btn);
  });
}

function renderScenarioList(catId, sub) {
  var el = $('listPayloads');
  if (!el) return;
  el.innerHTML = '';

  var scenarios = catId ? StiffEyesPayloads.getByCategory(catId) : StiffEyesPayloads.SCENARIOS;
  if (sub) {
    scenarios = scenarios.filter(function (s) { return s.sub === sub; });
  }
  var flatItems = StiffEyesPayloads.flattenScenarios(scenarios);

  var meta = flatItems.length + ' 条';
  if (sub) meta = '[' + sub + '] ' + meta;
  $('payloadCatMeta').textContent = meta;

  if (!flatItems.length) {
    el.innerHTML = '<li class="empty">暂无 payload</li>';
    return;
  }

  flatItems.forEach(function (item) {
    var li = document.createElement('li');
    li.className = 'payload-item';
    li.title = item.scenarioTitle + ' — ' + item.title + '\n' + (item.desc || '');

    // DB tag
    var dbTagHtml = item.db ? '<span class="db-tag db-' + item.db + '">' + dbLabel(item.db) + '</span>' : '';
    // Bypass tag
    var bypassTagHtml = item.isBypass ? '<span class="bypass-tag">Bypass</span>' : '';

    li.innerHTML = dbTagHtml + bypassTagHtml +
      '<code class="payload-cmd">' + escapeHTML(item.cmd) + '</code>' +
      '<span class="payload-meta"><span class="payload-context">' + escapeHTML(item.sub) + '</span>' +
      '<span class="payload-copy-icon" title="复制">📋</span></span>';

    li.querySelector('.payload-copy-icon').addEventListener('click', function (e) {
      e.stopPropagation();
      navigator.clipboard.writeText(item.cmd);
    });
    li.addEventListener('click', function () {
      $('payloadInput').value = item.cmd;
      activeTransformId = null;
      renderTransformBtns();
      applyAndShowTransform();
    });
    el.appendChild(li);
  });
}

function dbLabel(db) {
  switch (db) {
    case 'mysql': return 'MySQL';
    case 'postgresql': return 'PostgreSQL';
    case 'mssql': return 'MSSQL';
    case 'oracle': return 'Oracle';
    default: return db;
  }
}

function renderTransformBtns() {
  var el = $('payloadTransformBtns');
  if (!el) return;
  el.innerHTML = '';
  StiffEyesPayloads.TRANSFORMS.forEach(function (t) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'payload-transform-btn' + (activeTransformId === t.id ? ' active' : '');
    btn.textContent = t.label;
    btn.addEventListener('click', function () {
      activeTransformId = activeTransformId === t.id ? null : t.id;
      renderTransformBtns();
      applyAndShowTransform();
    });
    el.appendChild(btn);
  });
}

function applyAndShowTransform() {
  var input = ($('payloadInput').value || '').trim();
  var outputEl = $('payloadTransformOutput');
  if (!outputEl) return;
  if (!input) {
    outputEl.innerHTML = '<span style="color:var(--text-faint)">选择一条 payload 或输入原文</span>';
    return;
  }
  if (!activeTransformId) {
    outputEl.innerHTML = '<span class="payload-output-text" style="color:var(--text-muted)">' + escapeHTML(input) + '</span><button class="payload-output-copy" id="btnPayloadOutputCopy">复制</button>';
    bindOutputCopy();
    return;
  }
  var result = StiffEyesPayloads.applyTransform(input, activeTransformId);
  outputEl.innerHTML = '<span class="payload-output-text">' + escapeHTML(result) + '</span><button class="payload-output-copy" id="btnPayloadOutputCopy">复制</button>';
  bindOutputCopy();
}

function bindOutputCopy() {
  var btn = $('btnPayloadOutputCopy');
  if (btn) {
    btn.onclick = function () {
      var text = document.querySelector('.payload-output-text');
      if (text) navigator.clipboard.writeText(text.textContent);
    };
  }
}

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function initPayloadPanel() {
  activePayloadCatId = null;
  activePayloadSub = null;
  activeTransformId = null;
  renderPayloadCatList();
  renderTransformBtns();
  selectPayloadCat(null);

  $('payloadInput').addEventListener('input', function () {
    activeTransformId = null;
    renderTransformBtns();
    applyAndShowTransform();
  });

  $('btnPayloadCopy').onclick = function () {
    var val = $('payloadInput').value.trim();
    if (val) navigator.clipboard.writeText(val);
  };

  // Transform toggle
  var transformWrap = $('payloadTransform');
  var transformToggle = $('payloadTransformToggle');
  var transformBody = $('payloadTransformBody');
  var transformExpanded = false;
  transformToggle.addEventListener('click', function () {
    transformExpanded = !transformExpanded;
    transformBody.classList.toggle('hidden', !transformExpanded);
    transformWrap.classList.toggle('expanded', transformExpanded);
    transformToggle.querySelector('.transform-toggle-hint').textContent = transformExpanded ? '点击折叠' : '点击展开';
    if (transformExpanded) {
      renderTransformBtns();
      applyAndShowTransform();
    }
  });

  $('payloadSearch').addEventListener('input', function () {
    var q = this.value;
    if (!q.trim()) {
      selectPayloadCat(activePayloadCatId);
      return;
    }
    var results = StiffEyesPayloads.search(q);
    var flatItems = StiffEyesPayloads.flattenScenarios(results);
    $('payloadCatTitle').textContent = '搜索: ' + q;
    $('payloadCatMeta').textContent = flatItems.length + ' 条';
    $('payloadSubtags').style.display = 'none';
    var el = $('listPayloads');
    el.innerHTML = '';
    if (!flatItems.length) {
      el.innerHTML = '<li class="empty">无匹配 payload</li>';
      return;
    }
    flatItems.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'payload-item';
      li.title = item.scenarioTitle + ' — ' + item.title;
      var dbTagHtml = item.db ? '<span class="db-tag db-' + item.db + '">' + dbLabel(item.db) + '</span>' : '';
      var bypassTagHtml = item.isBypass ? '<span class="bypass-tag">Bypass</span>' : '';
      li.innerHTML = dbTagHtml + bypassTagHtml +
        '<code class="payload-cmd">' + escapeHTML(item.cmd) + '</code>' +
        '<span class="payload-meta"><span class="payload-context">' + escapeHTML(item.sub) + '</span>' +
        '<span class="payload-copy-icon" title="复制">📋</span></span>';
      li.querySelector('.payload-copy-icon').addEventListener('click', function (e) {
        e.stopPropagation();
        navigator.clipboard.writeText(item.cmd);
      });
      li.addEventListener('click', function () {
        $('payloadInput').value = item.cmd;
        activeTransformId = null;
        renderTransformBtns();
        applyAndShowTransform();
      });
      el.appendChild(li);
    });
  });
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
    if (btn.dataset.panel === 'panel-webpack' && window.StiffEyesWebpackPanel && currentTabId) {
      window.StiffEyesWebpackPanel.init(currentTabId);
      window.StiffEyesWebpackPanel.autoExtractIfNeeded();
    }
    if (btn.dataset.panel === 'panel-cloud') {
      initCloudPanel();
    }
    if (btn.dataset.panel === 'panel-payload') {
      initPayloadPanel();
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

  // Cloud bucket messages
  if (msg.type === 'CLOUD_BUCKET_DETECTED' && msg.bucket) {
    var exists = cloudBuckets.some(function (b) { return b.id === msg.bucket.id; });
    if (!exists) {
      cloudBuckets.push(msg.bucket);
      renderCloudBucketList();
    }
    return;
  }
  if (msg.type === 'CLOUD_BUCKET_SCAN_COMPLETE' && msg.bucketId) {
    var b = cloudBuckets.find(function (x) { return x.id === msg.bucketId; });
    if (b) {
      b.scanned = true;
      b.scanResults = msg.results;
      b.scanSummary = msg.summary;
    }
    renderCloudBucketList();
    if (activeCloudBucketId === msg.bucketId) {
      renderCloudScanResults(msg.results);
      if ($('btnCloudScanOne')) $('btnCloudScanOne').disabled = false;
    }
    return;
  }
  if (msg.type === 'CLOUD_BUCKET_SCAN_PROGRESS') {
    if (msg.total) {
      var pct = Math.round((msg.completed / msg.total) * 100);
      $('cloudProgressWrap')?.classList.remove('hidden');
      $('cloudProgressFill').style.width = pct + '%';
      $('cloudProgressText').textContent = pct + '% (' + msg.completed + '/' + msg.total + ')';
    }
    return;
  }
  if (msg.type === 'CLOUD_BUCKET_SCAN_ALL_COMPLETE') {
    $('cloudProgressFill').style.width = '100%';
    $('cloudProgressText').textContent = '扫描完成 (' + (msg.total || 0) + ' 个)';
    if ($('btnCloudScanAll')) $('btnCloudScanAll').disabled = false;
    chrome.runtime.sendMessage({ type: 'CLOUD_BUCKETS_GET_ALL' }, function (resp) {
      if (resp && resp.buckets) {
        cloudBuckets = resp.buckets;
        renderCloudBucketList();
      }
    });
    return;
  }
  if (msg.type === 'CLOUD_BUCKET_SCAN_ERROR' && msg.bucketId === activeCloudBucketId) {
    if ($('btnCloudScanOne')) $('btnCloudScanOne').disabled = false;
    $('cloudProgressText').textContent = '扫描出错: ' + (msg.error || 'unknown');
    return;
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

importScripts(
  'lib/patterns.js',
  'lib/fingerprint-rules.js',
  'lib/spring-paths.js',
  'lib/cloud-bucket-rules.js',
  'lib/cloud-bucket-vuln.js'
);

// ========== Tab State & Badge ==========
const tabCountsCache = new Map();
const tabJsMap = {};

// ========== Cloud Bucket State ==========
let cloudBuckets = [];
let cloudBucketsLoaded = false;
const cloudBucketScanJobs = new Map();

function setTabCount(tabId, count) {
  tabCountsCache.set(tabId, count);
  chrome.storage.session.set({ [`tab_${tabId}`]: count });
}
function getTabCount(tabId, callback) {
  if (tabCountsCache.has(tabId)) {
    callback(tabCountsCache.get(tabId));
    return;
  }
  chrome.storage.session.get(`tab_${tabId}`, (data) => {
    const count = data[`tab_${tabId}`] || 0;
    tabCountsCache.set(tabId, count);
    callback(count);
  });
}
function setBadgeUI(tabId, count) {
  const hasCount = count > 0;
  chrome.action.setBadgeText({ text: hasCount ? String(count) : '', tabId });
  chrome.action.setBadgeBackgroundColor({ color: hasCount ? '#0d9488' : '#71717a', tabId });
}

function updateBadge(results, tabId) {
  const fields = [
    'domains', 'absoluteApis', 'apis', 'moduleFiles', 'docFiles', 'ips', 'phones',
    'emails', 'idcards', 'jwts', 'imageFiles', 'jsFiles', 'vueFiles', 'urls',
    'githubUrls', 'companies', 'credentials', 'cookies', 'idKeys'
  ];
  const count = fields.reduce((acc, field) => {
    const arr = results[field];
    return acc + (Array.isArray(arr) && arr.length > 0 ? 1 : 0);
  }, 0);
  setTabCount(tabId, count);
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs?.[0];
    if (activeTab?.id === tabId) setBadgeUI(tabId, count);
  });
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  getTabCount(tabId, (count) => setBadgeUI(tabId, count));
});

// ========== Navigation & Cleanup ==========
chrome.webNavigation.onCommitted.addListener((details) => {
  const { tabId, frameId } = details;
  if (frameId === 0) {
    tabCountsCache.delete(tabId);
    chrome.storage.session.remove([`tab_${tabId}`, `analysis_${tabId}`]);
    if (tabJsMap[tabId]) tabJsMap[tabId].clear();
    Object.values(analyticsDetected).forEach(map => map.delete(tabId));
    serverFingerprints.delete(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabCountsCache.delete(tabId);
  chrome.storage.session.remove([`tab_${tabId}`, `analysis_${tabId}`]);
  if (tabJsMap[tabId]) tabJsMap[tabId].clear();
  Object.values(analyticsDetected).forEach(map => map.delete(tabId));
  serverFingerprints.delete(tabId);
});

// ========== Fingerprint State ==========
let serverFingerprints = new Map();
const analyticsDetected = { baidu: new Map(), yahoo: new Map(), google: new Map() };

function getFingerprints(tabId) {
  if (serverFingerprints.has(tabId)) return serverFingerprints.get(tabId);
  let fingerprints = {
    server: [], component: [], technology: [], security: [],
    analytics: [], builder: [], framework: [], os: [], panel: [], cdn: [],
    nameMap: new Map()
  };
  serverFingerprints.set(tabId, fingerprints);
  return fingerprints;
}

// ========== Analytics Detection ==========
const analyticsPatterns = Object.entries(FINGERPRINT_CONFIG.ANALYTICS).map(([type, config]) => ({
  pattern: config.pattern,
  type: type
}));

function handleAnalyticsDetection(details, type) {
  if (analyticsDetected[type].get(details.tabId)) return;
  let fingerprints = getFingerprints(details.tabId);
  analyticsDetected[type].set(details.tabId, true);
  fingerprints.analytics.push({
    name: FINGERPRINT_CONFIG.ANALYTICS[type].name,
    description: FINGERPRINT_CONFIG.ANALYTICS[type].description,
    version: FINGERPRINT_CONFIG.ANALYTICS[type].version
  });
  serverFingerprints.set(details.tabId, fingerprints);
}

// ========== webRequest: JS tracking + Analytics ==========
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const matchedAnalytics = analyticsPatterns.find(item =>
      details.url.match(new RegExp(item.pattern.replace(/[*]/g, '.*')))
    );
    if (matchedAnalytics) handleAnalyticsDetection(details, matchedAnalytics.type);

    const { tabId, url, type } = details;

    // === Cloud bucket URL detection (all request types) ===
    if (tabId >= 0) {
      var urlVendor = StiffEyesCloudBucketRules.detectVendorFromUrl(details.url);
      if (urlVendor) {
        addCloudBucket(details.url, urlVendor.vendor, urlVendor.region, details.tabId, details.url, 'url');
      }
    }

    if (type !== 'script' || tabId < 0) return;
    try {
      const initiator_url = new URL(details.initiator);
      const current_url = new URL(url);
      if (initiator_url.hostname !== current_url.hostname) return;
    } catch (e) { return; }
    if (!tabJsMap[tabId]) tabJsMap[tabId] = new Set();
    tabJsMap[tabId].add(url);
  },
  { urls: ['<all_urls>'] },
  []
);

// ========== Header + Cookie Fingerprint ==========
function identifyTechnologyFromCookie(cookieHeader) {
  for (const cookie of FINGERPRINT_CONFIG.COOKIES) {
    if (cookie.match.test(cookieHeader)) {
      return {
        type: cookie.type,
        name: cookie.name,
        description: `通过cookie识别到网站使用${cookie.name}作为服务端${FINGERPRINT_CONFIG.DESCRIPTIONS.find(item => item.name === cookie.type)?.description || ''}`
      };
    }
  }
  return null;
}

function processHeaders(headers, tabId) {
  let fingerprints = getFingerprints(tabId);
  const headerMap = new Map(headers.map(h => [h.name.toLowerCase(), h.value]));
  for (const config of FINGERPRINT_CONFIG.HEADERS) {
    const headerValue = headerMap.get(config.header);
    if (!headerValue) continue;
    const result = headerValue.match(config.pattern);
    if (!result || fingerprints.nameMap.has(config.name)) continue;

    var fingerprint = Object.assign({}, config);
    fingerprint['description'] = `通过${fingerprint.header}识别到网站使用${fingerprint.name}${FINGERPRINT_CONFIG.DESCRIPTIONS.find(item => item.name === config.type)?.description || ''}`;

    if (config.extType && !fingerprints.nameMap.has(config.extName)) {
      var ext = { type: config.extType, name: config.extName, header: config.header,
        description: `通过${config.header}识别到网站使用${config.extName}${FINGERPRINT_CONFIG.DESCRIPTIONS.find(item => item.name === config.extType)?.description || ''}` };
      fingerprints[ext.type].push(ext);
      fingerprints.nameMap.set(config.extName, true);
    }

    if (config.value && result.length > 1) {
      var i = 1;
      for (const value of config.value.split(',')) {
        fingerprint[value] = result[i] || null;
        fingerprint['description'] += `，${FINGERPRINT_CONFIG.DESCRIPTIONS.find(item => item.name === value)?.description || ''}为${fingerprint[value] || '未知'}`;
        i++;
      }
    } else if (config.value && result[0]) {
      fingerprint[config.value] = result[0];
      fingerprint['description'] += `，${FINGERPRINT_CONFIG.DESCRIPTIONS.find(item => item.name === config.value)?.description || ''}为${fingerprint[config.value] || '未知'}`;
    }

    fingerprints[config.type].push(fingerprint);
    fingerprints.nameMap.set(config.name, true);
  }
  return fingerprints;
}

chrome.webRequest.onHeadersReceived.addListener(
  async (details) => {
    if (details.type !== 'main_frame') return { responseHeaders: details.responseHeaders };
    if (!details.responseHeaders) return { responseHeaders: details.responseHeaders };
    setTimeout(() => {
      const fingerprints = processHeaders(details.responseHeaders, details.tabId);
      serverFingerprints.set(details.tabId, fingerprints);
      chrome.cookies.getAll({ url: details.url }, (cookies) => {
        if (cookies.length > 0) {
          const cookieNames = cookies.map(cookie => cookie.name).join(';');
          const techFromCookies = identifyTechnologyFromCookie(cookieNames);
          if (techFromCookies && !fingerprints.nameMap.has(techFromCookies.name)) {
            fingerprints[techFromCookies.type].push(techFromCookies);
            fingerprints.nameMap.set(techFromCookies.name, true);
          }
        }
      });
    }, 0);
    return { responseHeaders: details.responseHeaders };
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// ========== Cloud Bucket Passive Detection - Response Headers ==========
chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    if (!details.responseHeaders || details.tabId < 0) return;
    var detected = StiffEyesCloudBucketRules.detectVendorFromHeaders(details.responseHeaders);
    if (detected) {
      addCloudBucket(details.url, detected.vendor, detected.region, details.tabId, details.url, 'header');
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// ========== JS Fetching (2-layer fallback) ==========
async function tryFetchContent(url) {
  const response = await fetch(url, {
    headers: {
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    credentials: 'omit'
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.text();
}

async function fallbackFetchContentViaTab(tabId, url) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: (url) => fetch(url, { credentials: 'omit' }).then(res => res.text()),
    args: [url]
  });
  return result?.result ?? null;
}

async function handleFetchRequest(request, sender, sendResponse) {
  try {
    const content = await tryFetchContent(request.url);
    sendResponse({ content });
  } catch (error) {
    console.warn('Primary fetch failed:', error.message);
    if (sender.tab?.id) {
      try {
        const fallbackContent = await fallbackFetchContentViaTab(sender.tab.id, request.url);
        sendResponse({ content: fallbackContent });
      } catch (e2) {
        console.warn('Fallback fetch via tab failed:', e2.message);
        sendResponse({ content: null });
      }
    } else {
      sendResponse({ content: null });
    }
  }
}

// ========== Regex Matching (for heavy patterns in background) ==========
function performRegexMatching(chunk, patterns, patternType) {
  const matches = [];
  let maxIterations = 10000;
  try {
    for (const patternInfo of patterns) {
      const { pattern: patternString } = patternInfo;
      let regex;
      try {
        const match = patternString.match(/^\/(.+)\/([gimuy]*)$/);
        if (match) regex = new RegExp(match[1], match[2]);
      } catch (e) { continue; }
      let patternLastIndex = 0;
      let match;
      while ((match = regex.exec(chunk)) !== null) {
        if (regex.lastIndex <= patternLastIndex) break;
        patternLastIndex = regex.lastIndex;
        if (--maxIterations <= 0) break;
        matches.push({ match: match[0] });
      }
      regex.lastIndex = 0;
    }
  } catch (e) { console.error(`${patternType} 匹配出错:`, e); }
  return matches;
}

// ========== Session helpers ==========
function sessionKey(tabId, suffix) { return 'bl_' + suffix + '_' + tabId; }
function saveSession(tabId, suffix, data) {
  var obj = {}; obj[sessionKey(tabId, suffix)] = data;
  return chrome.storage.session.set(obj);
}
function loadSession(tabId, suffix) {
  return chrome.storage.session.get(sessionKey(tabId, suffix)).then(o => o[sessionKey(tabId, suffix)] || null);
}

function springLocalKey(tabId) { return 'springScan_' + tabId; }
function saveSpringLocal(tabId, state) {
  if (tabId == null) return Promise.resolve();
  var patch = {}; patch[springLocalKey(tabId)] = state;
  return chrome.storage.local.set(patch);
}

function dedupePaths(list) {
  var seen = Object.create(null);
  return list.filter(function (p) { if (seen[p]) return false; seen[p] = true; return true; });
}

function resolveTabId(msg, sender) {
  var raw = msg.tabId != null ? msg.tabId : sender?.tab?.id ?? null;
  if (raw == null) return null;
  var id = typeof raw === 'string' ? parseInt(raw, 10) : raw;
  return typeof id === 'number' && !isNaN(id) ? id : null;
}

function broadcastScanReady(tabId, scan) {
  chrome.runtime.sendMessage({ type: 'SCAN_READY', tabId, scan }).catch(function () {});
}

// ========== Spring Scanning ==========
var SPRING_FETCH_TIMEOUT_MS = 8000;
var SPRING_FETCH_CONCURRENCY = 12;
var springJobs = new Map();

function cancelSpringScan(tabId) {
  var job = springJobs.get(tabId);
  if (!job || job.settled) return false;
  job.cancelled = true;
  job.queue.length = 0;
  job.controllers.forEach(function (ctrl) { try { ctrl.abort(); } catch (e) {} });
  if (job.active === 0) job.finish(false, true);
  return true;
}

function springFetchOne(url, job) {
  if (job.cancelled) return Promise.resolve({ ok: false, status: 0, skipped: true });
  var ctrl = new AbortController();
  job.controllers.add(ctrl);
  var timer = setTimeout(function () { ctrl.abort(); }, SPRING_FETCH_TIMEOUT_MS);
  return fetch(url, { method: 'GET', signal: ctrl.signal, credentials: 'omit', redirect: 'follow' })
    .then(function (response) { return { ok: true, status: response.status }; })
    .catch(function () { return { ok: false, status: 0 }; })
    .finally(function () { clearTimeout(timer); job.controllers.delete(ctrl); });
}

function pushSpringProgress(completed, total, scanning, tabId) {
  var progress = total ? Math.round((completed / total) * 100) : 0;
  var state = { progress, completed, total, scanning, tabId, updatedAt: Date.now() };
  if (tabId != null) { saveSession(tabId, 'spring', state); saveSpringLocal(tabId, state); }
  chrome.runtime.sendMessage({ action: 'updateProgress', progress, completed, total, tabId }).catch(function () {});
}

function pushSpringComplete(resultsText, tabId) {
  var payload = { progress: 100, completed: 0, total: 0, scanning: false, cancelled: false, results: resultsText, tabId, updatedAt: Date.now() };
  if (tabId != null) { saveSession(tabId, 'springResults', resultsText); saveSession(tabId, 'spring', payload); saveSpringLocal(tabId, payload); }
  chrome.runtime.sendMessage({ action: 'updateResults', results: resultsText, tabId }).catch(function () {});
}

function pushSpringCancelled(resultsText, tabId, completed, total) {
  var progress = total ? Math.round((completed / total) * 100) : 0;
  var payload = { progress, completed, total, scanning: false, cancelled: true, results: resultsText, tabId, updatedAt: Date.now() };
  if (tabId != null) { saveSession(tabId, 'springResults', resultsText); saveSession(tabId, 'spring', payload); saveSpringLocal(tabId, payload); }
  chrome.runtime.sendMessage({ action: 'springScanCancelled', results: resultsText, progress, completed, total, tabId }).catch(function () {});
}

function scanDirectories(tabId, tabUrl) {
  cancelSpringScan(tabId);
  return new Promise(function (resolve, reject) {
    chrome.storage.local.get(['directories'], function (stored) {
      var paths = stored.directories;
      if (!Array.isArray(paths) || !paths.length) paths = StiffEyesPaths.DEFAULT_SPRING_PATHS.slice();
      paths = dedupePaths(paths);
      var parsed;
      try { parsed = new URL(tabUrl); } catch (e) { reject({ error: '无效 URL' }); return; }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') { reject({ error: '仅支持 http(s) 页面' }); return; }
      var total = paths.length;
      if (!total) { reject({ error: '路径列表为空，请先在设置中配置' }); return; }

      var job = {
        tabId, cancelled: false, settled: false, active: 0, completed: 0, total,
        resultsText: '', queue: paths.slice(), controllers: new Set(),
        finish: function (success, wasCancelled) {
          if (job.settled) return;
          job.settled = true; springJobs.delete(tabId);
          if (wasCancelled) { pushSpringCancelled(job.resultsText, tabId, job.completed, job.total); resolve({ results: job.resultsText, cancelled: true }); }
          else if (success) { pushSpringComplete(job.resultsText, tabId); resolve({ results: job.resultsText }); }
        }
      };
      springJobs.set(tabId, job);
      pushSpringProgress(0, total, true, tabId);

      function pump() {
        if (job.cancelled) { if (job.active === 0) job.finish(false, true); return; }
        while (job.active < SPRING_FETCH_CONCURRENCY && job.queue.length && !job.cancelled) {
          (function (directory) {
            job.active += 1;
            var fullUrl = StiffEyesPaths.buildSpringUrl(parsed.origin, parsed.pathname, directory);
            springFetchOne(fullUrl, job).then(function (out) {
              if (!job.cancelled && out.ok && out.status >= 200 && out.status < 400) {
                job.resultsText += fullUrl + ' [' + out.status + ']\n';
              }
            }).finally(function () {
              job.active -= 1;
              if (!job.cancelled) {
                job.completed += 1;
                pushSpringProgress(job.completed, job.total, job.completed < job.total, tabId);
                if (job.completed >= job.total) job.finish(true, false);
                else pump();
              } else if (job.active === 0) job.finish(false, true);
            });
          })(job.queue.shift());
        }
      }
      pump();
    });
  });
}

// ========== Install ==========
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get(['directories'], function (data) {
    if (!data.directories || !data.directories.length) {
      chrome.storage.local.set({ directories: StiffEyesPaths.DEFAULT_SPRING_PATHS });
    }
  });
});

// ========== Proxy Fetch ==========
function proxyFetch(url, timeoutMs) {
  timeoutMs = timeoutMs || 12000;
  var ctrl = new AbortController();
  var t = setTimeout(function () { ctrl.abort(); }, timeoutMs);
  return fetch(url, { signal: ctrl.signal, credentials: 'omit', headers: { Accept: '*/*' } })
    .then(function (res) { return res.text().then(function (text) { return { ok: res.ok, status: res.status, text: text }; }); })
    .finally(function () { clearTimeout(t); });
}

function proxyFetchWithOpts(url, options, signal) {
  var opts = Object.assign({ credentials: 'omit' }, options || {});
  if (signal) {
    opts.signal = signal;
  }
  return fetch(url, opts);
}

function injectFetchIntoPage(tabId, jsUrl) {
  return new Promise(function (resolve) {
    chrome.scripting.executeScript({
      target: { tabId }, world: 'MAIN',
      func: function (url) {
        try {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, false); xhr.timeout = 10000; xhr.send();
          if (xhr.status >= 200 && xhr.status < 400) {
            var text = xhr.responseText || '';
            if (text.length > 3 * 1024 * 1024) text = text.slice(0, 3 * 1024 * 1024);
            return { content: text };
          }
          return { content: null };
        } catch (e) { return { content: null }; }
      },
      args: [jsUrl]
    }, function (results) {
      if (chrome.runtime.lastError || !results || !results[0]) { resolve({ content: null }); return; }
      resolve(results[0].result || { content: null });
    });
  });
}

// ========== Cloud Bucket Helpers ==========
function persistCloudBuckets() {
  chrome.storage.local.set({ cloudBuckets: cloudBuckets }).catch(function () {});
}

function loadCloudBuckets() {
  return new Promise(function (resolve) {
    chrome.storage.local.get(['cloudBuckets'], function (data) {
      cloudBuckets = data.cloudBuckets || [];
      cloudBucketsLoaded = true;
      resolve(cloudBuckets);
    });
  });
}

function addCloudBucket(url, vendor, region, tabId, sourceUrl, via) {
  var normalized = StiffEyesCloudBucketRules.normalizeBucketUrl(url, vendor);
  var bucketName = StiffEyesCloudBucketRules.extractBucketName(normalized || url, vendor);
  var id = StiffEyesCloudBucketRules.generateBucketId(normalized || url, vendor);

  if (cloudBuckets.some(function (b) { return b.id === id; })) return;

  var entry = {
    id: id,
    url: normalized || url,
    vendor: vendor,
    label: StiffEyesCloudBucketRules.getLabel(vendor),
    region: region || '',
    bucketName: bucketName,
    sourceUrl: sourceUrl || '',
    sourceTabId: tabId,
    detectedVia: via || 'unknown',
    timestamp: Date.now(),
    scanned: false,
    scanResults: null,
    scanSummary: null
  };

  cloudBuckets.push(entry);
  persistCloudBuckets();

  chrome.runtime.sendMessage({
    type: 'CLOUD_BUCKET_DETECTED',
    bucket: entry
  }).catch(function () {});
}

function scanCloudBucket(bucketId) {
  var bucket = cloudBuckets.find(function (b) { return b.id === bucketId; });
  if (!bucket) return Promise.resolve({ error: 'Bucket not found' });

  var controller = new AbortController();
  var signal = controller.signal;
  var job = { bucketId: bucketId, cancelled: false, controller: controller };
  cloudBucketScanJobs.set(bucketId, job);

  return StiffEyesCloudBucketVuln.scanBucket(
    bucket.url,
    bucket.vendor,
    proxyFetchWithOpts,
    signal
  ).then(function (results) {
    if (job.cancelled) return { cancelled: true };
    bucket.scanned = true;
    bucket.scanResults = results;
    bucket.scanSummary = StiffEyesCloudBucketVuln.summarizeScanResults(results);
    persistCloudBuckets();
    cloudBucketScanJobs.delete(bucketId);
    chrome.runtime.sendMessage({
      type: 'CLOUD_BUCKET_SCAN_COMPLETE',
      bucketId: bucketId,
      results: results,
      summary: bucket.scanSummary
    }).catch(function () {});
    return { bucketId: bucketId, results: results };
  }).catch(function (err) {
    cloudBucketScanJobs.delete(bucketId);
    chrome.runtime.sendMessage({
      type: 'CLOUD_BUCKET_SCAN_ERROR',
      bucketId: bucketId,
      error: err.message || 'unknown'
    }).catch(function () {});
    return { bucketId: bucketId, error: err.message };
  });
}

function scanAllCloudBuckets() {
  var unscanned = cloudBuckets.filter(function (b) { return !b.scanned; });
  var total = unscanned.length;
  var completed = 0;

  if (total === 0) {
    chrome.runtime.sendMessage({ type: 'CLOUD_BUCKET_SCAN_ALL_COMPLETE', total: 0 }).catch(function () {});
    return;
  }

  (function scanNext() {
    if (completed >= total) {
      chrome.runtime.sendMessage({ type: 'CLOUD_BUCKET_SCAN_ALL_COMPLETE', total: total }).catch(function () {});
      return;
    }
    var bucket = unscanned[completed];
    scanCloudBucket(bucket.id).then(function () {
      completed++;
      chrome.runtime.sendMessage({
        type: 'CLOUD_BUCKET_SCAN_PROGRESS',
        completed: completed,
        total: total,
        bucketId: bucket.id
      }).catch(function () {});
      scanNext();
    });
  })();
}

function cancelCloudBucketScan(bucketId) {
  var job = cloudBucketScanJobs.get(bucketId);
  if (!job) return false;
  job.cancelled = true;
  try { job.controller.abort(); } catch (e) {}
  cloudBucketScanJobs.delete(bucketId);
  return true;
}

// Pre-load on startup
loadCloudBuckets();

// ========== Message Handler ==========
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  var tabId = resolveTabId(msg, sender);

  // Only process messages explicitly directed to background, OR messages without a 'to' field (popup webpack/spring)
  if (msg.to && msg.to !== 'background') return false;

  switch (msg.type || msg.action) {
    case 'UPDATE_BUILDER': {
      let fingerprints = getFingerprints(sender.tab.id);
      if (!fingerprints.nameMap.has(msg.finger.name)) {
        if (msg.finger.extType && !fingerprints.nameMap.has(msg.finger.extName)) {
          var extf = { type: msg.finger.extType, name: msg.finger.extName, header: msg.finger.name,
            description: `通过${extf.header}识别到网站使用${extf.name}${FINGERPRINT_CONFIG.DESCRIPTIONS.find(function (item) { return item.name === msg.finger.extType; })?.description || ''}` };
          fingerprints[extf.type].push(extf);
          fingerprints.nameMap.set(msg.finger.extName, true);
        }
        fingerprints.nameMap.set(msg.finger.name, true);
        fingerprints[msg.finger.type].push(msg.finger);
        serverFingerprints.set(sender.tab.id, fingerprints);
      }
      return true;
    }
    case 'GET_FINGERPRINTS': {
      sendResponse(getFingerprints(msg.tabId));
      return true;
    }
    case 'FETCH_JS': {
      var jsUrl = msg.url;
      var fetchTabId = resolveTabId(msg, sender);
      if (!jsUrl) { sendResponse({ content: null }); return true; }
      proxyFetch(jsUrl, 15000).then(function (res) {
        if (!res.ok) {
          if (fetchTabId) return injectFetchIntoPage(fetchTabId, jsUrl);
          return { content: null };
        }
        var text = res.text || '';
        if (text.length > 3 * 1024 * 1024) text = text.slice(0, 3 * 1024 * 1024);
        return { content: text };
      }).then(function (result) {
        if (result.content) { sendResponse(result); return; }
        if (!result.content && fetchTabId) {
          injectFetchIntoPage(fetchTabId, jsUrl).then(function (r) { sendResponse(r); }).catch(function () { sendResponse({ content: null }); });
          return;
        }
        sendResponse(result);
      }).catch(function () {
        if (fetchTabId) {
          injectFetchIntoPage(fetchTabId, jsUrl).then(function (r) { sendResponse(r); }).catch(function () { sendResponse({ content: null }); });
        } else { sendResponse({ content: null }); }
      });
      return true;
    }
    case 'REGISTER_CONTENT': {
      const tabJs = Array.from(tabJsMap[sender.tab.id] || []);
      sendResponse({ tabJs: tabJs, tabId: sender.tab.id });
      return true;
    }
    case 'UPDATE_BADGE': {
      updateBadge(msg.results, msg.tabId);
      return true;
    }
    case 'GET_TAB_ID': {
      sendResponse({ tabId: sender.tab?.id });
      return true;
    }
    case 'REGEX_MATCH': {
      const matches = performRegexMatching(msg.chunk, msg.patterns, msg.patternType);
      sendResponse({ matches });
      return true;
    }
    // Spring scanning
    case 'SPRING_SCAN_CANCEL': {
      var cancelTabId = msg.tabId != null ? msg.tabId : tabId;
      if (cancelTabId == null) { sendResponse({ ok: false, error: '无标签页' }); return false; }
      sendResponse({ ok: cancelSpringScan(cancelTabId) });
      return false;
    }
    case 'SPRING_SCAN':
    case 'scanDirectories': {
      function runSpring(tab) {
        if (!tab || !tab.id || !tab.url) { sendResponse({ error: '无活动标签页' }); return; }
        if (!/^https?:/i.test(tab.url)) { sendResponse({ error: '仅支持 http(s) 页面' }); return; }
        sendResponse({ started: true });
        scanDirectories(tab.id, tab.url).catch(function (err) {
          var errMsg = (err && err.error) || '扫描异常中止';
          var errState = { scanning: false, error: errMsg, progress: 0, tabId: tab.id, updatedAt: Date.now() };
          saveSession(tab.id, 'spring', errState);
          saveSpringLocal(tab.id, errState);
          chrome.runtime.sendMessage({ action: 'springScanError', error: errMsg, tabId: tab.id }).catch(function () {});
        });
      }
      if (msg.tabId && msg.tabUrl) { runSpring({ id: msg.tabId, url: msg.tabUrl }); }
      else {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          var tab = tabs[0];
          if (!tab || !tab.id || !tab.url) { sendResponse({ error: '无活动标签页' }); return; }
          runSpring(tab);
        });
      }
      return true;
    }

    // Scan results & session
    case 'SCAN_UPDATE': {
      if (!tabId) { sendResponse({ ok: false, error: 'no_tab' }); return false; }
      var scanData = msg.data || msg.results || {};
      if (typeof StiffEyesPatterns !== 'undefined' && StiffEyesPatterns.normalizeScanResult) {
        StiffEyesPatterns.normalizeScanResult(scanData);
      }
      saveSession(tabId, 'scan', scanData).then(function () {
        broadcastScanReady(tabId, scanData);
        sendResponse({ ok: true });
      });
      return true;
    }
    case 'GET_SCAN_RESULTS': {
      Promise.all([
        tabId ? loadSession(tabId, 'scan') : Promise.resolve(null),
        tabId ? loadSession(tabId, 'finger') : Promise.resolve(null),
        tabId ? loadSession(tabId, 'springResults') : Promise.resolve(null),
        tabId ? loadSession(tabId, 'spring') : Promise.resolve(null)
      ]).then(function (arr) {
        var scan = arr[0];
        if (scan && StiffEyesPatterns.normalizeScanResult) StiffEyesPatterns.normalizeScanResult(scan);
        var finger = arr[1] || [];
        sendResponse({ scan: scan, fingerprints: finger, springResults: arr[2] || '', springState: arr[3] || null });
      });
      return true;
    }
    case 'PROXY_FETCH': {
      proxyFetch(msg.url, msg.timeout || 12000).then(function (out) { sendResponse(out); })
        .catch(function (e) { sendResponse({ ok: false, text: '', error: e.message }); });
      return true;
    }

    // Webpack
    case 'WEBPACK_DOWNLOAD': {
      var mime = msg.mime || 'application/octet-stream';
      var dataUrl = 'data:' + mime + ';charset=utf-8,' + encodeURIComponent(msg.content || '');
      chrome.downloads.download({ url: dataUrl, filename: msg.filename || 'download.txt', saveAs: false }, function (id) {
        if (chrome.runtime.lastError) sendResponse({ success: false, error: chrome.runtime.lastError.message });
        else sendResponse({ success: true, downloadId: id });
      });
      return true;
    }
    case 'WEBPACK_LOAD_SOURCES': {
      var loadTabId = msg.tabId || tabId;
      if (!loadTabId) { sendResponse({ success: false, error: '无标签页' }); return true; }
      chrome.scripting.executeScript({
        target: { tabId: loadTabId }, world: 'MAIN',
        func: function (items) {
          (items || []).forEach(function (item) {
            var js = item.jsContent || '';
            if (!js && !item.mapContent) return;
            if (item.mapContent) {
              try {
                var b64 = btoa(unescape(encodeURIComponent(item.mapContent)));
                js += '\n//# sourceMappingURL=data:application/json;base64,' + b64;
              } catch (e) { if (item.mapUrl) js += '\n//# sourceMappingURL=' + item.mapUrl; }
            } else if (item.mapUrl) { js += '\n//# sourceMappingURL=' + item.mapUrl; }
            var blob = new Blob([js], { type: 'application/javascript' });
            var url = URL.createObjectURL(blob);
            var el = document.createElement('script');
            el.src = url; el.async = false;
            (document.head || document.documentElement).appendChild(el);
          });
        },
        args: [msg.entries || []]
      }).then(function () { sendResponse({ success: true, count: (msg.entries || []).length }); })
        .catch(function (e) { sendResponse({ success: false, error: e.message }); });
      return true;
    }

    // ========== Cloud Bucket ==========
    case 'CLOUD_BUCKETS_GET_ALL': {
      if (!cloudBucketsLoaded) {
        loadCloudBuckets().then(function () { sendResponse({ buckets: cloudBuckets }); });
      } else {
        sendResponse({ buckets: cloudBuckets });
      }
      return true;
    }

    case 'CLOUD_BUCKET_SCAN': {
      if (!msg.bucketId) { sendResponse({ error: 'No bucketId' }); return false; }
      sendResponse({ started: true });
      scanCloudBucket(msg.bucketId);
      return true;
    }

    case 'CLOUD_BUCKET_SCAN_ALL': {
      sendResponse({ started: true });
      scanAllCloudBuckets();
      return true;
    }

    case 'CLOUD_BUCKET_SCAN_CANCEL': {
      if (!msg.bucketId) { sendResponse({ ok: false }); return false; }
      sendResponse({ ok: cancelCloudBucketScan(msg.bucketId) });
      return false;
    }

    case 'CLOUD_BUCKET_CLEAR': {
      cloudBucketScanJobs.forEach(function (job) {
        try { job.controller.abort(); } catch (e) {}
      });
      cloudBucketScanJobs.clear();
      cloudBuckets = [];
      chrome.storage.local.remove(['cloudBuckets'], function () {
        sendResponse({ ok: true });
      });
      return true;
    }

    case 'CLOUD_BUCKET_DELETE': {
      if (!msg.bucketId) { sendResponse({ ok: false }); return false; }
      cancelCloudBucketScan(msg.bucketId);
      cloudBuckets = cloudBuckets.filter(function (b) { return b.id !== msg.bucketId; });
      persistCloudBuckets();
      sendResponse({ ok: true });
      return false;
    }
  }
  return false;
});

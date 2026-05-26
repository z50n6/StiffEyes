/* eslint-disable no-undef */
importScripts(
  'lib/patterns.js',
  'lib/fingerprint-rules.js',
  'lib/spring-paths.js'
);

var tabFingerprints = new Map();

function sessionKey(tabId, suffix) {
  return 'bl_' + suffix + '_' + tabId;
}

function saveSession(tabId, suffix, data) {
  var obj = {};
  obj[sessionKey(tabId, suffix)] = data;
  return chrome.storage.session.set(obj);
}

function loadSession(tabId, suffix) {
  var key = sessionKey(tabId, suffix);
  return chrome.storage.session.get(key).then(function (o) {
    return o[key] || null;
  });
}

function springLocalKey(tabId) {
  return 'springScan_' + tabId;
}

function saveSpringLocal(tabId, state) {
  if (tabId == null) return Promise.resolve();
  var patch = {};
  patch[springLocalKey(tabId)] = state;
  return chrome.storage.local.set(patch);
}

function dedupePaths(list) {
  var seen = Object.create(null);
  return list.filter(function (p) {
    if (seen[p]) return false;
    seen[p] = true;
    return true;
  });
}

function updateBadge(tabId, count) {
  var text = count > 0 ? String(Math.min(count, 99)) : '';
  chrome.action.setBadgeText({ tabId: tabId, text: text });
  chrome.action.setBadgeBackgroundColor({
    tabId: tabId,
    color: count > 0 ? '#0f766e' : '#71717a'
  });
}

function resolveTabId(msg, sender) {
  var raw =
    msg.tabId != null
      ? msg.tabId
      : sender && sender.tab && sender.tab.id != null
        ? sender.tab.id
        : null;
  if (raw == null) return null;
  var id = typeof raw === 'string' ? parseInt(raw, 10) : raw;
  return typeof id === 'number' && !isNaN(id) ? id : null;
}

function broadcastScanReady(tabId, scan) {
  chrome.runtime
    .sendMessage({
      type: 'SCAN_READY',
      tabId: tabId,
      scan: scan
    })
    .catch(function () {});
}

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get(['directories'], function (data) {
    if (!data.directories || !data.directories.length) {
      chrome.storage.local.set({ directories: StiffEyesPaths.DEFAULT_SPRING_PATHS });
    }
  });
});

chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    if (details.type !== 'main_frame' || details.tabId < 0) return;
    var matched = StiffEyesFingerprint.matchHeaders(details.responseHeaders);
    if (!matched.length) return;
    var prev = tabFingerprints.get(details.tabId) || [];
    var merged = StiffEyesFingerprint.mergeFingerprints(prev, matched);
    tabFingerprints.set(details.tabId, merged);
    saveSession(details.tabId, 'finger', merged);
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    if (details.tabId < 0) return;
    var hit = StiffEyesFingerprint.matchAnalyticsUrl(details.url);
    if (!hit) return;
    var prev = tabFingerprints.get(details.tabId) || [];
    var merged = StiffEyesFingerprint.mergeFingerprints(prev, [hit]);
    tabFingerprints.set(details.tabId, merged);
    saveSession(details.tabId, 'finger', merged);
  },
  { urls: ['<all_urls>'] }
);

chrome.tabs.onRemoved.addListener(function (tabId) {
  tabFingerprints.delete(tabId);
});

function proxyFetch(url, timeoutMs) {
  timeoutMs = timeoutMs || 12000;
  var ctrl = new AbortController();
  var t = setTimeout(function () {
    ctrl.abort();
  }, timeoutMs);
  return fetch(url, {
    signal: ctrl.signal,
    credentials: 'omit',
    headers: { Accept: '*/*' }
  })
    .then(function (res) {
      return res.text().then(function (text) {
        return { ok: res.ok, status: res.status, text: text };
      });
    })
    .finally(function () {
      clearTimeout(t);
    });
}

var SPRING_FETCH_TIMEOUT_MS = 8000;
var SPRING_FETCH_CONCURRENCY = 12;
var springJobs = new Map();

function cancelSpringScan(tabId) {
  var job = springJobs.get(tabId);
  if (!job || job.settled) return false;
  job.cancelled = true;
  job.queue.length = 0;
  job.controllers.forEach(function (ctrl) {
    try {
      ctrl.abort();
    } catch (e) {}
  });
  if (job.active === 0) {
    job.finish(false, true);
  }
  return true;
}

function springFetchOne(url, job) {
  if (job.cancelled) {
    return Promise.resolve({ ok: false, status: 0, skipped: true });
  }
  var ctrl = new AbortController();
  job.controllers.add(ctrl);
  var timer = setTimeout(function () {
    ctrl.abort();
  }, SPRING_FETCH_TIMEOUT_MS);
  return fetch(url, {
    method: 'GET',
    signal: ctrl.signal,
    credentials: 'omit',
    redirect: 'follow'
  })
    .then(function (response) {
      return { ok: true, status: response.status };
    })
    .catch(function () {
      return { ok: false, status: 0 };
    })
    .finally(function () {
      clearTimeout(timer);
      job.controllers.delete(ctrl);
    });
}

function pushSpringProgress(completed, total, scanning, tabId) {
  var progress = total ? Math.round((completed / total) * 100) : 0;
  var state = {
    progress: progress,
    completed: completed,
    total: total,
    scanning: scanning,
    tabId: tabId,
    updatedAt: Date.now()
  };
  if (tabId != null) {
    saveSession(tabId, 'spring', state);
    saveSpringLocal(tabId, state);
  }
  chrome.runtime
    .sendMessage({
      action: 'updateProgress',
      progress: progress,
      completed: completed,
      total: total,
      tabId: tabId
    })
    .catch(function () {});
}

function pushSpringComplete(resultsText, tabId) {
  var payload = {
    progress: 100,
    completed: 0,
    total: 0,
    scanning: false,
    cancelled: false,
    results: resultsText,
    tabId: tabId,
    updatedAt: Date.now()
  };
  if (tabId != null) {
    saveSession(tabId, 'springResults', resultsText);
    saveSession(tabId, 'spring', payload);
    saveSpringLocal(tabId, payload);
  }
  chrome.runtime
    .sendMessage({
      action: 'updateResults',
      results: resultsText,
      tabId: tabId
    })
    .catch(function () {});
}

function pushSpringCancelled(resultsText, tabId, completed, total) {
  var progress = total ? Math.round((completed / total) * 100) : 0;
  var payload = {
    progress: progress,
    completed: completed,
    total: total,
    scanning: false,
    cancelled: true,
    results: resultsText,
    tabId: tabId,
    updatedAt: Date.now()
  };
  if (tabId != null) {
    saveSession(tabId, 'springResults', resultsText);
    saveSession(tabId, 'spring', payload);
    saveSpringLocal(tabId, payload);
  }
  chrome.runtime
    .sendMessage({
      action: 'springScanCancelled',
      results: resultsText,
      progress: progress,
      completed: completed,
      total: total,
      tabId: tabId
    })
    .catch(function () {});
}

function scanDirectories(tabId, tabUrl) {
  cancelSpringScan(tabId);

  return new Promise(function (resolve, reject) {
    chrome.storage.local.get(['directories'], function (stored) {
      var paths = stored.directories;
      if (!Array.isArray(paths) || !paths.length) {
        paths = StiffEyesPaths.DEFAULT_SPRING_PATHS.slice();
      }
      paths = dedupePaths(paths);

      var parsed;
      try {
        parsed = new URL(tabUrl);
      } catch (e) {
        reject({ error: '无效 URL' });
        return;
      }

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        reject({ error: '仅支持 http(s) 页面' });
        return;
      }

      var total = paths.length;
      if (!total) {
        reject({ error: '路径列表为空，请先在设置中配置' });
        return;
      }

      var job = {
        tabId: tabId,
        cancelled: false,
        settled: false,
        active: 0,
        completed: 0,
        total: total,
        resultsText: '',
        queue: paths.slice(),
        controllers: new Set(),
        finish: function (success, wasCancelled) {
          if (job.settled) return;
          job.settled = true;
          springJobs.delete(tabId);
          if (wasCancelled) {
            pushSpringCancelled(job.resultsText, tabId, job.completed, job.total);
            resolve({ results: job.resultsText, cancelled: true });
          } else if (success) {
            pushSpringComplete(job.resultsText, tabId);
            resolve({ results: job.resultsText });
          }
        }
      };

      springJobs.set(tabId, job);
      pushSpringProgress(0, total, true, tabId);

      function pump() {
        if (job.cancelled) {
          if (job.active === 0) job.finish(false, true);
          return;
        }
        while (
          job.active < SPRING_FETCH_CONCURRENCY &&
          job.queue.length &&
          !job.cancelled
        ) {
          (function (directory) {
            job.active += 1;
            var fullUrl = StiffEyesPaths.buildSpringUrl(
              parsed.origin,
              parsed.pathname,
              directory
            );

            springFetchOne(fullUrl, job)
              .then(function (out) {
                if (
                  !job.cancelled &&
                  out.ok &&
                  out.status >= 200 &&
                  out.status < 400
                ) {
                  job.resultsText += fullUrl + ' [' + out.status + ']\n';
                }
              })
              .finally(function () {
                job.active -= 1;
                if (!job.cancelled) {
                  job.completed += 1;
                  pushSpringProgress(
                    job.completed,
                    job.total,
                    job.completed < job.total,
                    tabId
                  );
                  if (job.completed >= job.total) {
                    job.finish(true, false);
                  } else {
                    pump();
                  }
                } else if (job.active === 0) {
                  job.finish(false, true);
                }
              });
          })(job.queue.shift());
        }
      }

      pump();
    });
  });
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  var tabId = resolveTabId(msg, sender);

  if (msg.type === 'FETCH_JS') {
    var jsUrl = msg.url;
    if (!jsUrl) {
      sendResponse({ content: null });
      return true;
    }
    proxyFetch(jsUrl, 15000)
      .then(function (res) {
        if (!res.ok) {
          sendResponse({ content: null });
          return;
        }
        var text = res.text || '';
        if (text.length > 3 * 1024 * 1024) text = text.slice(0, 3 * 1024 * 1024);
        sendResponse({ content: text });
      })
      .catch(function () {
        sendResponse({ content: null });
      });
    return true;
  }

  if (msg.type === 'SCAN_UPDATE') {
    if (!tabId) {
      sendResponse({ ok: false, error: 'no_tab' });
      return false;
    }
    var scanData = msg.data || msg.results || {};
    if (typeof StiffEyesPatterns !== 'undefined' && StiffEyesPatterns.normalizeScanResult) {
      StiffEyesPatterns.normalizeScanResult(scanData);
    }
    saveSession(tabId, 'scan', scanData).then(function () {
      var badgeCount = (scanData.counts && scanData.counts.total) || 0;
      if (!scanData.scanning) {
        updateBadge(tabId, badgeCount);
      }
      broadcastScanReady(tabId, scanData);
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'GET_SCAN_RESULTS') {
    Promise.all([
      tabId ? loadSession(tabId, 'scan') : Promise.resolve(null),
      tabId ? loadSession(tabId, 'finger') : Promise.resolve(null),
      tabId ? loadSession(tabId, 'springResults') : Promise.resolve(null),
      tabId ? loadSession(tabId, 'spring') : Promise.resolve(null)
    ]).then(function (arr) {
      var scan = arr[0];
      if (scan && StiffEyesPatterns.normalizeScanResult) {
        StiffEyesPatterns.normalizeScanResult(scan);
      }
      var finger = arr[1] || tabFingerprints.get(tabId) || [];
      if (tabId && finger.length) {
        tabFingerprints.set(tabId, finger);
      }
      sendResponse({
        scan: scan,
        fingerprints: finger,
        springResults: arr[2] || '',
        springState: arr[3] || null
      });
    });
    return true;
  }

  if (msg.type === 'SPRING_SCAN_CANCEL' || msg.action === 'cancelSpringScan') {
    var cancelTabId = msg.tabId != null ? msg.tabId : tabId;
    if (cancelTabId == null) {
      sendResponse({ ok: false, error: '无标签页' });
      return false;
    }
    sendResponse({ ok: cancelSpringScan(cancelTabId) });
    return false;
  }

  if (msg.type === 'SPRING_SCAN' || msg.action === 'scanDirectories') {
    function runSpring(tab) {
      if (!tab || !tab.id || !tab.url) {
        sendResponse({ error: '无活动标签页' });
        return;
      }
      if (!/^https?:/i.test(tab.url)) {
        sendResponse({ error: '仅支持 http(s) 页面' });
        return;
      }
      sendResponse({ started: true });
      scanDirectories(tab.id, tab.url).catch(function (err) {
        var errMsg = (err && err.error) || '扫描异常中止';
        var errState = {
          scanning: false,
          error: errMsg,
          progress: 0,
          tabId: tab.id,
          updatedAt: Date.now()
        };
        saveSession(tab.id, 'spring', errState);
        saveSpringLocal(tab.id, errState);
        chrome.runtime
          .sendMessage({ action: 'springScanError', error: errMsg, tabId: tab.id })
          .catch(function () {});
      });
    }

    if (msg.tabId && msg.tabUrl) {
      runSpring({ id: msg.tabId, url: msg.tabUrl });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var tab = tabs[0];
        if (!tab || !tab.id || !tab.url) {
          sendResponse({ error: '无活动标签页' });
          return;
        }
        runSpring(tab);
      });
    }
    return true;
  }

  if (msg.type === 'PROXY_FETCH') {
    proxyFetch(msg.url, msg.timeout || 12000)
      .then(function (out) {
        sendResponse(out);
      })
      .catch(function (e) {
        sendResponse({ ok: false, text: '', error: e.message });
      });
    return true;
  }

  if (msg.type === 'WEBPACK_DOWNLOAD') {
    var mime = msg.mime || 'application/octet-stream';
    var dataUrl =
      'data:' +
      mime +
      ';charset=utf-8,' +
      encodeURIComponent(msg.content || '');
    chrome.downloads.download(
      {
        url: dataUrl,
        filename: msg.filename || 'download.txt',
        saveAs: false
      },
      function (id) {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId: id });
        }
      }
    );
    return true;
  }

  if (msg.type === 'WEBPACK_LOAD_SOURCES') {
    var loadTabId = msg.tabId || tabId;
    if (!loadTabId) {
      sendResponse({ success: false, error: '无标签页' });
      return true;
    }
    chrome.scripting
      .executeScript({
        target: { tabId: loadTabId },
        world: 'MAIN',
        func: function (items) {
          (items || []).forEach(function (item) {
            var js = item.jsContent || '';
            if (!js && !item.mapContent) return;
            if (item.mapContent) {
              try {
                var b64 = btoa(
                  unescape(encodeURIComponent(item.mapContent))
                );
                js +=
                  '\n//# sourceMappingURL=data:application/json;base64,' + b64;
              } catch (e) {
                if (item.mapUrl) {
                  js += '\n//# sourceMappingURL=' + item.mapUrl;
                }
              }
            } else if (item.mapUrl) {
              js += '\n//# sourceMappingURL=' + item.mapUrl;
            }
            var blob = new Blob([js], { type: 'application/javascript' });
            var url = URL.createObjectURL(blob);
            var el = document.createElement('script');
            el.src = url;
            el.async = false;
            (document.head || document.documentElement).appendChild(el);
          });
        },
        args: [msg.entries || []]
      })
      .then(function () {
        sendResponse({ success: true, count: (msg.entries || []).length });
      })
      .catch(function (e) {
        sendResponse({ success: false, error: e.message });
      });
    return true;
  }

  return false;
});

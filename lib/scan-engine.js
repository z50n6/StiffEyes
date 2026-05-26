/**
 * 页面资产扫描引擎（content script）
 * 依赖：StiffEyesScanConfig、StiffEyesScanFilter
 */
var StiffEyesScanEngine = (function () {
  var CFG = StiffEyesScanConfig;
  var FIL = StiffEyesScanFilter;

  var dynamicScanEnabled = false;
  var deepScanEnabled = true;
  var skipThirdPartyJs = true;
  var currentTabId = null;
  var scanTimeout = null;
  var observerInitialized = false;
  var isWhitelisted = false;
  var hostname = null;
  var isUseWebpack = false;
  var tree = {};
  var jsQueue = [];
  var queueSet = new Set();
  var jsFileMap = new Map();
  var inFlightSet = new Set();
  var tabResults = new Map();
  var MAX_CONCURRENT = 10;
  var MAX_CHUNK_SIZE = 50000;

  function noop() {}

  function performRegexMatching(chunk, patterns) {
    var matches = [];
    var maxIterations = 10000;
    for (var i = 0; i < patterns.length; i++) {
      var patternString = patterns[i].pattern;
      var regex;
      try {
        var m = patternString.match(/^\/(.+)\/([gimuy]*)$/);
        if (m) regex = new RegExp(m[1], m[2]);
        else continue;
      } catch (e) {
        continue;
      }
      var patternLastIndex = 0;
      var match;
      while ((match = regex.exec(chunk)) !== null) {
        if (regex.lastIndex <= patternLastIndex) break;
        patternLastIndex = regex.lastIndex;
        if (--maxIterations <= 0) break;
        matches.push({ match: match[0] });
      }
      regex.lastIndex = 0;
    }
    return matches;
  }

  function isThirdPartyLib(url) {
    if (!skipThirdPartyJs) return false;
    var fileName = url.split('/').pop()?.split('?')[0]?.toLowerCase() || '';
    return CFG.API.SKIP_JS_PATTERNS.some(function (pattern) {
      return pattern.test(fileName);
    });
  }

  function getBasePath(url) {
    var filePath = new URL(url).pathname;
    var pathArray = filePath.split('/');
    pathArray.pop();
    return pathArray.join('/') + '/';
  }

  function buildTree(path) {
    var parts = path.split('/').filter(Boolean);
    var current = tree;
    parts.forEach(function (part) {
      if (!current[part]) current[part] = {};
      current = current[part];
    });
    return tree;
  }

  function findFullPath(treeObj, target, currentPath) {
    currentPath = currentPath || '';
    for (var key in treeObj) {
      var nextPath = currentPath + '/' + key;
      if (key === target.split('/')[1]) return nextPath;
      var result = findFullPath(treeObj[key], target, nextPath);
      if (result) return result;
    }
    return '';
  }

  function enqueueJsUrl(url, source, basePath) {
    source = source || 'page';
    basePath = basePath || '';
    if (!queueSet.has(url) && !isThirdPartyLib(url) && !isWhitelisted) {
      var fileName = url.split('/').pop()?.split('?')[0];
      var filePath = new URL(url).pathname;
      var fileBasePath = getBasePath(url);
      var existFilePath = jsFileMap.get(fileName);
      if (source === 'page' && deepScanEnabled) {
        if (existFilePath && existFilePath.includes(filePath)) return;
        if (!existFilePath && basePath) {
          var fullPathParts = findFullPath(tree, fileBasePath)?.split('/');
          if (fullPathParts) {
            fullPathParts.pop();
            var fullPath = fullPathParts.join('/') + fileBasePath;
            url = url.replace(fileBasePath, fullPath);
          }
        }
      }
      buildTree(fileBasePath);
      jsFileMap.set(fileName, filePath);
      queueSet.add(url);
      jsQueue.push(url);
      tabResults.get(currentTabId).jsFiles.set(url, '暂无法展示来源');
      processJsQueue();
    }
  }

  function splitIntoChunks(text) {
    var chunks = [];
    if (text.length <= MAX_CHUNK_SIZE) {
      chunks.push(text);
      return chunks;
    }
    var lines = text.split(/\r?\n/);
    var currentLines = [];
    var currentSize = 0;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var lineSize = line.length + 1;
      if (currentSize + lineSize > MAX_CHUNK_SIZE) {
        if (currentSize > 0) {
          chunks.push(currentLines.join('\n') + '\n');
          currentLines = [];
          currentSize = 0;
        }
        if (line.length > MAX_CHUNK_SIZE) {
          for (var j = 0; j < line.length; j += MAX_CHUNK_SIZE) {
            chunks.push(line.slice(j, j + MAX_CHUNK_SIZE));
          }
        } else {
          currentLines.push(line);
          currentSize = lineSize;
        }
      } else {
        currentLines.push(line);
        currentSize += lineSize;
      }
    }
    if (currentLines.length > 0) chunks.push(currentLines.join('\n') + '\n');
    return chunks;
  }

  function getTabResults(tabId) {
    if (!tabResults.has(tabId)) {
      tabResults.set(tabId, {
        domains: new Map(),
        absoluteApis: new Map(),
        apis: new Map(),
        moduleFiles: new Map(),
        docFiles: new Map(),
        ips: new Map(),
        phones: new Map(),
        emails: new Map(),
        idcards: new Map(),
        jwts: new Map(),
        imageFiles: new Map(),
        jsFiles: new Map(),
        vueFiles: new Map(),
        urls: new Map(),
        githubUrls: new Map(),
        companies: new Map(),
        credentials: new Map(),
        cookies: new Map(),
        idKeys: new Map(),
        fingers: new Map(),
        progress: new Map()
      });
    }
    return tabResults.get(tabId);
  }

  function matchPatterns(chunk, isHtmlContent, url) {
    var patterns = Object.entries(CFG.PATTERNS);
    var resultsSet = tabResults.get(currentTabId);
    var update = false;

    for (var pi = 0; pi < patterns.length; pi++) {
      var key = patterns[pi][0];
      var pattern = patterns[pi][1];
      var filter = FIL[key.toLowerCase()];
      if (!filter) continue;

      var match;
      var lastIndex = 0;
      var maxIterations = 10000;

      try {
        if (key === 'FINGER') {
          for (var fi = 0; fi < pattern.patterns.length; fi++) {
            var fp = pattern.patterns[fi];
            if (resultsSet.fingers.has(fp.class)) continue;
            var fmatches = chunk.match(fp.pattern);
            if (
              fmatches &&
              filter(
                fp.name,
                fp.class,
                fp.type,
                fp.description,
                url,
                resultsSet,
                fp.extType,
                fp.extName
              )
            ) {
              update = true;
            }
          }
          continue;
        }

        if (key === 'IP') {
          var ipPattern = isHtmlContent ? pattern : CFG.PATTERNS.IP_RESOURCE;
          var ipMatches = chunk.match(ipPattern);
          if (ipMatches) {
            ipMatches.forEach(function (m) {
              if (filter(m, url, resultsSet)) update = true;
            });
          }
          continue;
        }

        if (key === 'DOMAIN') {
          var domainPattern = isHtmlContent ? pattern : CFG.PATTERNS.DOMAIN_RESOURCE;
          while ((match = domainPattern.exec(chunk)) !== null) {
            if (domainPattern.lastIndex <= lastIndex) break;
            lastIndex = domainPattern.lastIndex;
            if (--maxIterations <= 0) break;
            if (filter(match[0], url, resultsSet)) update = true;
          }
          continue;
        }

        if (key === 'API') {
          var apiPattern = CFG.API.PATTERN;
          apiPattern.lastIndex = 0;
          while ((match = apiPattern.exec(chunk)) !== null) {
            if (apiPattern.lastIndex <= lastIndex) break;
            lastIndex = apiPattern.lastIndex;
            if (--maxIterations <= 0) break;
            if (filter(match[0], url, resultsSet)) update = true;
          }
          continue;
        }

        if (key === 'CREDENTIALS' || key === 'ID_KEY' || key === 'EMAIL') {
          var patternList = [];
          if (key === 'EMAIL') {
            patternList = [{ pattern: CFG.PATTERNS.EMAIL.toString() }];
          } else {
            patternList = pattern.patterns.map(function (p) {
              return { pattern: p.pattern.toString() };
            });
          }
          var regexMatches = performRegexMatching(chunk, patternList);
          regexMatches.forEach(function (item) {
            if (filter(item.match, url, resultsSet)) update = true;
          });
          continue;
        }

        while ((match = pattern.exec(chunk)) !== null) {
          if (pattern.lastIndex <= lastIndex) break;
          lastIndex = pattern.lastIndex;
          if (--maxIterations <= 0) break;
          if (filter(match[0], url, resultsSet)) update = true;
          if (!pattern.global) break;
        }
      } catch (e) {
        console.error('matchPatterns', key, e);
      }
    }
    return update;
  }

  function collectJsUrls(content, isHtmlContent) {
    var jsUrls = new Set();
    var baseUrl = window.location.origin;
    var jsPattern = /['"](?:[^'"]+\.(?:js)(?:\?[^\s'"]*)?)['"]/g;
    var chunkCodePattern =
      /("[a-z/]*")[+|()\[\]\{\}a-z]*\+"."\+{(?:"?[0-9a-z-]*"?:"?[0-9a-z-]{1,}"?,?){1,}}\[[a-z]\]\+".js"/i;
    var chunkJsPattern = /"?[0-9a-z-]*"?\s*:\s*"?[0-9a-z-]*"?/g;
    var chunkMatch = content.match(chunkCodePattern);
    if (chunkMatch) {
      isUseWebpack = true;
      var chunkBasePath = chunkMatch[1].slice(1, -1);
      if (!chunkBasePath.startsWith('/')) chunkBasePath = '/' + chunkBasePath;
      Array.from(chunkMatch[0].matchAll(chunkJsPattern)).forEach(function (chunkJsMatch) {
        var chunkId = chunkJsMatch[0].split(':')[0];
        var chunkHash = chunkJsMatch[0].split(':')[1];
        if (chunkId.includes('"') || chunkId.includes("'")) chunkId = chunkId.slice(1, -1);
        if (chunkHash.includes('"') || chunkHash.includes("'")) chunkHash = chunkHash.slice(1, -1);
        jsUrls.add(baseUrl + chunkBasePath + chunkId + '.' + chunkHash + '.js');
      });
    }
    if ((!isUseWebpack && deepScanEnabled) || isHtmlContent) {
      Array.from(content.matchAll(jsPattern))
        .map(function (m) {
          var path = m[0].slice(1, -1);
          try {
            if (path.startsWith('http')) return path;
            if (path.startsWith('//')) return window.location.protocol + path;
            if (path.startsWith('/')) return baseUrl + path;
            return new URL(path, baseUrl).href;
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)
        .forEach(function (u) {
          jsUrls.add(u);
        });
    }
    return jsUrls;
  }

  function scanSources(sources, isHtmlContent, url) {
    return (async function () {
      for (var si = 0; si < sources.length; si++) {
        var source = sources[si];
        if (!source) continue;
        var chunks = splitIntoChunks(source);
        for (var ci = 0; ci < chunks.length; ci++) {
          if (matchPatterns(chunks[ci], isHtmlContent, url)) sendUpdate(true);
          await new Promise(function (r) {
            setTimeout(r, 0);
          });
        }
      }
    })();
  }

  function serializeForPopup(scanning) {
    var state = tabResults.get(currentTabId);
    var results = {};
    var total = 0;
    for (var key in state) {
      if (state[key] instanceof Map) {
        results[key] = Array.from(state[key]);
        if (key !== 'progress' && key !== 'fingers') {
          total += results[key].length;
        }
      }
    }
    results.hostname = hostname;
    results.updatedAt = Date.now();
    results.blacklisted = isWhitelisted;
    results.scanning = !!scanning;
    results.counts = { total: total };
    return results;
  }

  function sendUpdate(scanning) {
    try {
      var payload = serializeForPopup(scanning);
      chrome.runtime.sendMessage({ type: 'SCAN_UPDATE', data: payload }).catch(noop);
    } catch (e) {
      if (e.message !== 'Extension context invalidated.') console.error(e);
    }
  }

  function handleJsTask(url) {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage({ type: 'FETCH_JS', url: url }, function (response) {
        if (!response || !response.content) {
          resolve();
          return;
        }
        scanSources([response.content], false, url)
          .then(function () {
            var newJsUrls = collectJsUrls(response.content, false);
            if (newJsUrls) {
              newJsUrls.forEach(function (jsUrl) {
                enqueueJsUrl(jsUrl, 'page', getBasePath(url));
              });
            }
          })
          .finally(resolve);
      });
    });
  }

  function processJsQueue() {
    while (jsQueue.length > 0 && inFlightSet.size < MAX_CONCURRENT) {
      var url = jsQueue.shift();
      inFlightSet.add(url);
      handleJsTask(url).finally(function () {
        inFlightSet.delete(url);
        if (inFlightSet.size === 0) sendUpdate(false);
        if (jsQueue.length > 0) processJsQueue();
      });
    }
  }

  function debounceScan() {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(function () {
      var htmlContent = document.documentElement.innerHTML;
      if (htmlContent) scanSources([htmlContent], true, document.location.href);
    }, 1000);
  }

  var observer = new MutationObserver(function (mutations) {
    if (!dynamicScanEnabled) return;
    var significant = mutations.filter(function (m) {
      if (m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'style')) {
        return false;
      }
      return true;
    });
    if (significant.length > 0) debounceScan();
  });

  function clearState(tabId) {
    var state = getTabResults(tabId);
    Object.keys(state).forEach(function (key) {
      if (state[key] instanceof Map) state[key].clear();
    });
  }

  function initScan() {
    return loadSettings().then(function () {
      currentTabId = 'local';
      clearState(currentTabId);
      tree = {};
      jsQueue = [];
      queueSet.clear();
      jsFileMap.clear();
      inFlightSet.clear();
      isUseWebpack = false;

      if (isWhitelisted) {
        sendUpdate(false);
        return;
      }

      sendUpdate(true);
      var htmlContent = document.documentElement.innerHTML;
      if (!htmlContent) {
        sendUpdate(false);
        return;
      }

      return scanSources([htmlContent], true, document.location.href).then(function () {
        var initialJs = collectJsUrls(htmlContent, true);
        initialJs.forEach(function (u) {
          enqueueJsUrl(u, 'page');
        });
        if (!observerInitialized && document.body) {
          observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributeFilter: ['src', 'href', 'data-*'],
            characterDataOldValue: false
          });
          observerInitialized = true;
        }
        if (jsQueue.length === 0 && inFlightSet.size === 0) sendUpdate(false);
      });
    });
  }

  function loadSettings() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(
        ['blacklist_domains', 'deepScan', 'skip_third_party_js', 'dynamicScan', 'customWhitelist'],
        function (result) {
          hostname = window.location.hostname.toLowerCase();
          deepScanEnabled = result.deepScan !== false;
          skipThirdPartyJs = result.skip_third_party_js !== false;
          dynamicScanEnabled = result.dynamicScan === true;
          var list = result.blacklist_domains || result.customWhitelist || [];
          isWhitelisted = list.some(function (domain) {
            var d = String(domain).toLowerCase();
            return hostname === d || hostname.endsWith('.' + d);
          });
          resolve();
        }
      );
    });
  }

  function runScan() {
    if (!/^https?:/i.test(window.location.href)) return Promise.resolve();
    return loadSettings().then(function () {
      return initScan();
    });
  }

  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (msg.type === 'REFRESH_SCAN') {
      runScan().then(function () {
        sendResponse({ ok: true });
      });
      return true;
    }
    if (msg.type === 'UPDATE_DYNAMIC_SCAN') {
      dynamicScanEnabled = Boolean(msg.enabled);
      sendResponse({ success: true });
      return true;
    }
    if (msg.type === 'UPDATE_DEEP_SCAN') {
      deepScanEnabled = Boolean(msg.enabled);
      sendResponse({ success: true });
      return true;
    }
    if (msg.type === 'UPDATE_SKIP_THIRD_PARTY_JS') {
      skipThirdPartyJs = Boolean(msg.enabled);
      sendResponse({ success: true });
      return true;
    }
    return false;
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runScan);
  } else {
    runScan();
  }

  return { runScan: runScan };
})();

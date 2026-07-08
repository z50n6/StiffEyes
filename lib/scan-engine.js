let dynamicScanEnabled = false;
let deepScanEnabled = false;
let currentTabId = null;
let scanTimeout = null;
let observerInitialized = false;
let maxDepth = 3;
let tabJs = new Set();
let isWhitelisted = false;
let hostname = null;
let isUseWebpack = false;
const tree = {};
const jsQueue = [];
const queueSet = new Set();
const jsFileMap = new Map();
const inFlightSet = new Set();
const tabResults = new Map();
const MAX_CONCURRENT = 10;
const MAX_CHUNK_SIZE = 50000;
// ── 扫描保护（防止页面卡死）──
let scanInProgress = false;
let lastScanTime = 0;
const MIN_SCAN_INTERVAL = 5000;  // 两次全量扫描最小间隔 5 秒
const SCAN_THROTTLE = 3000;      // 防抖延迟 3 秒
// ── JS 爬取限制 ──
const MAX_JS_TOTAL = 50;         // 最多处理 50 个 JS 文件
const MAX_JS_DEPTH = 2;          // 最多 2 层深度
let jsTotalProcessed = 0;
const jsDepthMap = new Map();    // url → depth
// ── sendUpdate 节流 ──
let sendUpdateTimeout = null;
const SEND_UPDATE_THROTTLE = 1500; // 1500ms 节流（减少 storage 写入频率）
// ── 正则超时保护 ──
const REGEX_TIMEOUT = 200;       // 单条正则最多执行 200ms

async function initSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['dynamicScan', 'deepScan', 'customWhitelist'], async (result) => {
      hostname = window.location.hostname.toLowerCase();
      dynamicScanEnabled = result.dynamicScan === true;
      deepScanEnabled = result.deepScan === true;
      isWhitelisted = result.customWhitelist?.some(domain => hostname === domain || hostname.endsWith('.' + domain));
      chrome.runtime.sendMessage({ type: 'REGISTER_CONTENT', from: 'content', to: 'background' }, (response) => {
        if(isWhitelisted) return;
        tabJs = response.tabJs;
        currentTabId = response.tabId;
        getTabResults(currentTabId);
        tabJs.forEach(url => {
          enqueueJsUrl(url, 'background');
        });
      });
      resolve();
    });
  });
}
const waitForDependencies = () => {
  const deps = [
    'SCANNER_CONFIG',
    'SCANNER_FILTER',
    'logger'
  ];
  return new Promise(resolve => {
    (function check() {
      deps.every(dep => window[dep]) ? resolve() : setTimeout(check, 20);
    })();
  });
};
const getTabId = () => {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'GET_TAB_ID', from: 'content', to: 'background'}, response => {
      currentTabId = response.tabId;
      resolve(currentTabId);
    });
  });
};
const isThirdPartyLib = (url) => {
  const fileName = url.split('/').pop()?.split('?')[0]?.toLowerCase() || '';
  return SCANNER_CONFIG.API.SKIP_JS_PATTERNS.some(pattern => pattern.test(fileName));
};
function getBasePath(url){
  const filePath = new URL(url).pathname;
  let pathArray = filePath.split('/');
  pathArray.pop();
  return pathArray.join('/')+'/';
}
function buildTree(path) {
  const parts = path.split('/').filter(Boolean);
    let current = tree;
    parts.forEach(part => {
      if (!current[part]) current[part] = {};
      current = current[part];
    });
  return tree;
}
function findFullPath(tree, target, currentPath = '') {
  for (const key in tree) {
    const nextPath = currentPath + '/' + key;
    if (key === target.split('/')[1]) {
      return nextPath;
    }
    const result = findFullPath(tree[key], target, nextPath);
    if (result) return result;
  }
  return '';
}
function enqueueJsUrl(url, source='page', basePath = '') {
  // ── 爬取限制 ──
  if (jsTotalProcessed >= MAX_JS_TOTAL) return;
  const parentDepth = basePath ? (jsDepthMap.get(basePath) || 0) : 0;
  const newDepth = parentDepth + 1;
  if (newDepth > MAX_JS_DEPTH) return;
  // ── 原有逻辑 ──
  if (!queueSet.has(url) && !isThirdPartyLib(url) && !isWhitelisted) {
    const fileName = url.split('/').pop()?.split('?')[0];
    const filePath = new URL(url).pathname;
    const fileBasePath = getBasePath(url);
    const existFilePath = jsFileMap.get(fileName);
    if(source === 'page' && deepScanEnabled){
      if(existFilePath && existFilePath.includes(filePath)){
        return;
      }
      if(!existFilePath && basePath){
        let fullPathParts = findFullPath(tree, fileBasePath)?.split('/');
        if (fullPathParts) {
          fullPathParts.pop();
          let fullPath = fullPathParts.join('/')+fileBasePath;
          url = url.replace(fileBasePath, fullPath);
        }
      }
    }
    buildTree(fileBasePath);
    jsFileMap.set(fileName, filePath);
    queueSet.add(url);
    jsDepthMap.set(fileBasePath, newDepth);
    jsQueue.push(url);
    tabResults.get(currentTabId).jsFiles.set(url, "暂无法展示来源");
    processJsQueue();
  }
}
function* splitIntoChunks(text) {
  if (text.length <= MAX_CHUNK_SIZE) {
    yield text;
    return;
  }
  const lines = text.split(/\r?\n/);
  let currentLines = [];
  let currentSize = 0;

  for (const line of lines) {
    const lineSize = line.length + 1;

    if (currentSize + lineSize > MAX_CHUNK_SIZE) {
      if (currentSize > 0) {
        yield currentLines.join('\n') + '\n';
        currentLines = [];
        currentSize = 0;
      }
      if (line.length > MAX_CHUNK_SIZE) {
        for (let i = 0; i < line.length; i += MAX_CHUNK_SIZE) {
          yield line.slice(i, i + MAX_CHUNK_SIZE);
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

  if (currentLines.length > 0) {
    yield currentLines.join('\n') + '\n';
  }
}
//匹配函数
const matchPatterns = async (chunk, isHtmlContent = false, url) => {
  const patterns = Object.entries(SCANNER_CONFIG.PATTERNS);
  const resultsSet = tabResults.get(currentTabId);
  let update = false;
  for (const [key, pattern] of patterns) {
    const filter = SCANNER_FILTER[key.toLowerCase()];
    if (!filter) continue;

    let match;
    let lastIndex = 0;
    let maxIterations = 10000;

    try {
      if (key === 'FINGER') {
        for (const {pattern: fingerPattern, name: fingerName, class: fingerClass, type: fingerType, description: fingerDescription, extType: fingerExtType, extName: fingerExtName} of pattern.patterns) {
          if (resultsSet.fingers.has(fingerClass)) continue;
          const matches = chunk.match(fingerPattern);
          if (matches && filter(fingerName, fingerClass, fingerType, fingerDescription, url, resultsSet, fingerExtType, fingerExtName)) {
            update = true;
          }
        }
        continue;
      }
      if (key === 'IP') {
        const ipPattern = isHtmlContent ? pattern : SCANNER_CONFIG.PATTERNS.IP_RESOURCE;
        const matches = chunk.match(ipPattern);
        if (matches) {
          matches.forEach(match => {
            if (filter(match, url, resultsSet)) {
              update = true;
            }
          });
        }
        continue;
      }
      if (key === 'DOMAIN') {
        const domainPattern = isHtmlContent ? pattern : SCANNER_CONFIG.PATTERNS.DOMAIN_RESOURCE;
        const regexStartTime = performance.now();
        while ((match = domainPattern.exec(chunk)) !== null) {
          if (performance.now() - regexStartTime > REGEX_TIMEOUT) {
            window.logger.warn('正则匹配超时: ' + key);
            break;
          }
          if (domainPattern.lastIndex <= lastIndex) {
            window.logger.warn('检测到可能的无限循环: ' + key);
            break;
          }
          lastIndex = domainPattern.lastIndex;

          if (--maxIterations <= 0) {
            window.logger.warn('达到最大迭代次数: ' + key);
            break;
          }

          if (filter(match[0], url, resultsSet)) {
            update = true;
          }
        }
        continue;
      }
      if (key === 'API') {
        const apiPattern = SCANNER_CONFIG.API.PATTERN;
        apiPattern.lastIndex = 0;
        const regexStartTime = performance.now();
        while ((match = apiPattern.exec(chunk)) !== null) {
          if (performance.now() - regexStartTime > REGEX_TIMEOUT) {
            window.logger.warn('正则匹配超时: API');
            break;
          }
          if (apiPattern.lastIndex <= lastIndex) {
            window.logger.warn('检测到可能的无限循环: API Pattern');
            break;
          }
          lastIndex = apiPattern.lastIndex;

          if (--maxIterations <= 0) {
            window.logger.warn('达到最大迭代次数: API');
            break;
          }
          if (filter(match[0], url, resultsSet)) {
              update = true;
          }
        }
        continue;
      }
      // 本地执行正则匹配（避免跨进程序列化 chunk 的开销）
      if (key === 'CREDENTIALS' || key === 'ID_KEY' || key === 'EMAIL' || key === 'SECRETS') {
        const localPatterns = (key === 'EMAIL')
          ? [{ pattern: SCANNER_CONFIG.PATTERNS.EMAIL, name: '' }]
          : (pattern.patterns || []).map(p => ({ pattern: p.pattern, name: p.name || '' }));
        try {
          let localIter = 2000; // 本地匹配迭代保护
          for (const lp of localPatterns) {
            const lpRegex = lp.pattern;
            if (!(lpRegex instanceof RegExp)) continue;
            lpRegex.lastIndex = 0;
            let lm;
            let llIdx = 0;
            while ((lm = lpRegex.exec(chunk)) !== null) {
              if (lpRegex.lastIndex <= llIdx) break;
              llIdx = lpRegex.lastIndex;
              if (--localIter <= 0) break;
              if (filter(lm[0], url, resultsSet, lp.name)) update = true;
              if (!lpRegex.global) break;
            }
          }
        } catch (e) {
          window.logger.error(key + '匹配出错:', e);
        }
        continue;
      }
      const regexStartTime = performance.now();
      while ((match = pattern.exec(chunk)) !== null) {
        if (performance.now() - regexStartTime > REGEX_TIMEOUT) {
          window.logger.warn('正则匹配超时: ' + key);
          break;
        }
        if (pattern.lastIndex <= lastIndex) {
          window.logger.warn('检测到可能的无限循环: ' + pattern);
          break;
        }
        lastIndex = pattern.lastIndex;

        if (--maxIterations <= 0) {
          window.logger.warn('达到最大迭代次数: ' + key);
          break;
        }

        if (filter(match[0], url, resultsSet)) {
          update = true;
        }
        if (!pattern.global) break;
      }
    } catch (e) {
      window.logger.error('匹配' + key + '出错:', e);
    }
  }
  return update;
};
const collectJsUrls = (content, isHtmlContent = false) => {
  const jsUrls = new Set();
  const baseUrl = window.location.origin;
  const jsPattern = /['"](?:[^'"]+\.(?:js)(?:\?[^\s'"]*)?)['"]/g;
  const chunkCodePattern = /("[a-z/]*")[+|()\[\]\{\}a-z]*\+"."\+{(?:"?[0-9a-z-]*"?:"?[0-9a-z-]{1,}"?,?){1,}}\[[a-z]\]\+".js"/i;
  const chunkJsPattern = /"?[0-9a-z-]*"?\s*:\s*"?[0-9a-z-]*"?/g;
  const chunkMatch = content.match(chunkCodePattern);
  if (chunkMatch) {
    isUseWebpack = true;
    let chunkBasePath = chunkMatch[1].slice(1, -1);
    if (!chunkBasePath.startsWith('/')) {
      chunkBasePath = '/' + chunkBasePath;
    }
    Array.from(chunkMatch[0].matchAll(chunkJsPattern)).forEach(chunkJsMatch => {
      let chunkId = chunkJsMatch[0].split(":")[0];
      if(chunkId.includes("\"")||chunkId.includes("\'")){
        chunkId = chunkId.slice(1, -1);
      }
      let chunkHash = chunkJsMatch[0].split(":")[1];
      if(chunkHash.includes("\"")||chunkHash.includes("\'")){
        chunkHash = chunkHash.slice(1, -1);
      }
      const chunkUrl = baseUrl + chunkBasePath + chunkId + '.' + chunkHash + '.js';
      jsUrls.add(chunkUrl);
    });
  }
  if ((!isUseWebpack && deepScanEnabled) || isHtmlContent) {
    const matches = Array.from(content.matchAll(jsPattern))
    .map(match => {
      const path = match[0].slice(1, -1);
      let url = null
      try {
        if (path.startsWith('http')) {
          url = path;
        } else if (path.startsWith('//')) {
          url = window.location.protocol + path;
        } else if (path.startsWith('/')) {
          url = baseUrl + path;
        } else {
          url = new URL(path, baseUrl).href;
        }
        return url;
      } catch (e) {
        console.error('Error processing JS path:', e);
        return null;
      }
    })
    .filter(url => url !== null);
    matches.forEach(url => jsUrls.add(url));
  }
  return jsUrls;
};
// ── 让出主线程 ──
const yieldToMain = () => new Promise(resolve => {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(resolve, { timeout: 50 });
  } else {
    setTimeout(resolve, 0);
  }
});

//扫描函数
async function scanSources(sources, isHtmlContent = false, url) {
  try {
    for (const source of sources) {
      if (!source) continue;
      const chunks = Array.from(splitIntoChunks(source));
      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        let update = await matchPatterns(chunk, isHtmlContent, url);
        if (update) sendUpdateDebounced();
        // 每个 chunk 之间让出主线程，使用 requestIdleCallback 避免阻塞渲染
        if (ci < chunks.length - 1) await yieldToMain();
      }
    }
  } catch (e) {
    if (e.message !== 'Extension context invalidated.') {
      window.logger.error('扫描出错:', e);
    }
  }
}
async function doScan() {
  if (scanInProgress) return; // 防止并发扫描
  scanInProgress = true;
  lastScanTime = Date.now();
  try {
    window.logger.info('DOM变化触发重新扫描...');
    const htmlContent = document.documentElement.innerHTML;
    if (htmlContent) {
      await scanSources([htmlContent], true, document.location.href);
      sendUpdateDebounced();
    }
  } finally {
    scanInProgress = false;
  }
}
const debounceScan = () => {
  if (!dynamicScanEnabled) return;
  if (scanTimeout) clearTimeout(scanTimeout);
  const now = Date.now();
  // 距上次扫描不足最小间隔 → 推迟到间隔满后执行
  if (now - lastScanTime < MIN_SCAN_INTERVAL && lastScanTime > 0) {
    scanTimeout = setTimeout(doScan, MIN_SCAN_INTERVAL - (now - lastScanTime) + 500);
    return;
  }
  scanTimeout = setTimeout(doScan, SCAN_THROTTLE);
};
const observer = new MutationObserver((mutations) => {
  if (!dynamicScanEnabled) return;

  const significantChanges = mutations.filter(mutation => {
    if (mutation.type === 'attributes' && (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
      return false;
    }

    return true;
  });

  if (significantChanges.length > 0) {
    debounceScan();
  }
});
function getTabResults(currentTabId){
  if (!tabResults.has(currentTabId)) {
    tabResults.set(currentTabId, {
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
      secrets: new Map(),
      progress: new Map()
    });
  }
}
async function initScan() {
  try {
    await waitForDependencies();
    if (!currentTabId) await getTabId();
    getTabResults(currentTabId);
    window.logger.info('开始扫描...');
    Object.keys(tabResults.get(currentTabId)).forEach(key => {
      tabResults.get(currentTabId)[key].clear();
    });
    if (isWhitelisted) return;
    const htmlContent = document.documentElement.innerHTML;
    if (htmlContent) {
      await scanSources([htmlContent], true, document.location.href);
    }

    const initialJs = collectJsUrls(htmlContent, true);
    initialJs.forEach(url => enqueueJsUrl(url, 'page'));
    if (!observerInitialized) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributeFilter: ['src', 'href', 'data-*']
        // characterData 已移除 — SPA 页面文本频繁变化会导致不必要重扫
      });
      observerInitialized = true;
    }
  } catch (e) {
    if (e.message !== 'Extension context invalidated.') {
      window.logger.error('初始化扫描出错:', e);
    }
  }
}

// 发送更新（内存数据 → popup / badge）
const sendUpdate = () => {
  try {
    const results = {};
    const total = queueSet.size;
    const remaining = jsQueue.length;
    const dealing = inFlightSet.size;
    const percent = total === 0 ? 100 : Math.floor(((total - remaining - dealing) / total) * 100);
    let hasData = false;
    tabResults.get(currentTabId).progress.set('percent', percent);
    for (const key in tabResults.get(currentTabId)) {
      results[key] = Array.from(tabResults.get(currentTabId)[key]);
      if (results[key].length > 0) hasData = true;
    }
    // 无数据时跳过（减少无效通信）
    if (!hasData) return;
    chrome.runtime.sendMessage({
      type: 'SCAN_UPDATE',
      from: 'content',
      results: results,
      tabId: currentTabId,
    }).catch(() => {
    });

    chrome.runtime.sendMessage({
      type: 'UPDATE_BADGE',
      from: 'content',
      to: 'background',
      results: results,
      tabId: currentTabId,
    }).catch(() => {
    });

    // 持久化到 storage.local 作为备份
    var storageObj = {};
    storageObj['bl_scan_' + currentTabId] = results;
    if (hostname) {
      storageObj['bl_scan_host_' + hostname] = results;
    }
    chrome.storage.local.set(storageObj).catch(function () {});
  } catch (e) {
    if (e.message !== 'Extension context invalidated.') {
      window.logger.error('发送更新出错:', e);
    }
  }
};

// 节流版 sendUpdate — 500ms 内只触发一次
const sendUpdateDebounced = () => {
  if (!sendUpdateTimeout) {
    sendUpdateTimeout = setTimeout(() => {
      sendUpdateTimeout = null;
      sendUpdate();
    }, SEND_UPDATE_THROTTLE);
  }
};
async function processJsQueue() {
  while (jsQueue.length > 0 && inFlightSet.size < MAX_CONCURRENT) {
    const url = jsQueue.shift();
    inFlightSet.add(url);

    handleJsTask(url).finally(() => {
      inFlightSet.delete(url);
      if (inFlightSet.size === 0){
        sendUpdateDebounced();
      }
      if (jsQueue.length > 0) {
        processJsQueue();
      }
    });
    await new Promise(r => setTimeout(r, 0));
  }
}

async function handleJsTask(url) {
  jsTotalProcessed++;
  try {
    const response = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'FETCH_JS', url: url, from: 'content', to: 'background'}, resolve);
    });
    if (response?.content) {
      await scanSources([response.content], false, url);
      const newJsUrls = collectJsUrls(response.content, false);
      if(newJsUrls){
        newJsUrls.forEach(jsUrl => enqueueJsUrl(jsUrl, 'page', getBasePath(url)));
      }
    }
  } catch (e) {
    console.error('处理 JS 出错:', url, e);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    console.log('request from:', request.from);
    switch (request.type) {
      case 'GET_RESULTS': {
        const results = tabResults.get(request.tabId);
        if (!results) {
          sendResponse(null);
          break;
        }
        const normalizedResults = Object.fromEntries(
          Object.entries(results).map(([key, value]) => [key, Array.from(value)])
        );
        sendResponse(normalizedResults);
        break;
      }
      case 'UPDATE_DYNAMIC_SCAN': {
        dynamicScanEnabled = Boolean(request.enabled);
        sendResponse({ success: true });
        break;
      }
      case 'UPDATE_DEEP_SCAN': {
        deepScanEnabled = Boolean(request.enabled);
        sendResponse({ success: true });
        break;
      }
      case 'REFRESH_SCAN':
      case 'TRIGGER_SCAN': {
        // popup 手动触发重扫
        initScan().then(function() {
          sendResponse({ success: true });
        }).catch(function(e) {
          sendResponse({ success: false, error: e.message });
        });
        return true; // 异步响应
      }
      default: {
        // Don't respond to unknown message types — let other listeners handle them
        return false;
      }
    }
  } catch (e) {
    if (e.message !== 'Extension context invalidated.') {
      window.logger.error('处理消息出错:', e);
    }
    sendResponse(null);
  }
  return true;
});

(async () => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await initSettings();
      await initScan();
    });
  } else {
    await initSettings();
    await initScan();
  }
})();

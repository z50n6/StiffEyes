// StiffEyes sniff signals — builds separate signal inputs for two-pass detection
// Pass 1 (Header): matching SnowEyesPlus background.js buildHeaderSignalInput
// Pass 2 (DOM): matching SnowEyesPlus content.js runExternalFingerprintScan
(function () {
  'use strict';

  function arr(value) { return Array.isArray(value) ? value : (value === undefined || value === null ? [] : [value]); }

  // Build header-only signal input (matches SnowEyesPlus background.js buildHeaderSignalInput)
  // Only has: url, headersMap, cookiesMap, cookieText
  // body/title/meta/scripts/env/iconHashes/jsProbe are all empty
  function buildHeaderInput(page, runtime, background) {
    page = page || {};
    background = background || {};

    var main = background.main || {};
    var rawHeaders = main.headers || {};
    var url = page.url || main.url || '';

    // headersMap from response headers
    var headersMap = new Map();
    Object.keys(rawHeaders).forEach(function (key) {
      var vals = arr(rawHeaders[key]);
      if (vals.length > 0) headersMap.set(key.toLowerCase(), String(vals[0] || ''));
    });

    // Parse Set-Cookie and Cookie from response headers for cookieText
    var setCookieHeader = String(headersMap.get('set-cookie') || '');
    var cookieHeader = String(headersMap.get('cookie') || '');
    var cookieText = setCookieHeader || cookieHeader || '';

    // cookiesMap from Set-Cookie header
    var cookiesMap = new Map();
    if (setCookieHeader) {
      setCookieHeader.split('\n').forEach(function (line) {
        var parts = line.split(';');
        parts.forEach(function (token) {
          var trimmed = token.trim();
          if (!trimmed) return;
          var idx = trimmed.indexOf('=');
          if (idx >= 0) {
            cookiesMap.set(trimmed.slice(0, idx).trim().toLowerCase(), trimmed.slice(idx + 1).trim());
          }
        });
      });
    }

    return {
      url: url,
      title: '',
      body: '',
      headersMap: headersMap,
      metaMap: new Map(),
      cookieText: cookieText,
      cookiesMap: cookiesMap,
      scripts: [],
      env: [],
      iconHashes: [],
      jsProbe: {}
    };
  }

  // Build DOM-only signal input (matches SnowEyesPlus content.js runExternalFingerprintScan)
  // headersMap is EMPTY — content script can't access HTTP response headers
  function buildDomInput(page, runtime, background) {
    page = page || {};
    runtime = runtime || {};

    var url = page.url || '';

    // metaMap from DOM <meta> elements
    var metaMap = new Map();
    var pageMeta = page.meta || {};
    Object.keys(pageMeta).forEach(function (key) {
      var vals = arr(pageMeta[key]);
      if (vals.length > 0) metaMap.set(key.toLowerCase(), String(vals[0] || ''));
    });

    // cookiesMap from document.cookie
    var cookiesMap = new Map();
    var pageCookies = page.cookies || {};
    Object.keys(pageCookies).forEach(function (key) {
      cookiesMap.set(key.toLowerCase(), String(pageCookies[key] || ''));
    });

    var cookieText = page.cookieText || '';

    // Body: sampled HTML
    var bodyText = page.html || '';

    // Title
    var titleText = page.title || '';

    // Scripts: script SRC URLs
    var scripts = page.scriptSrc || [];

    // env: ALL Object.keys(window) from MAIN world
    var env = runtime.env || [];

    // iconHashes from favicon
    var iconHashes = page.iconHashes || [];
    if (!iconHashes.length && page.faviconBase64 && window.StiffEyesFingerprint) {
      try {
        var candidates = window.StiffEyesFingerprint.utils.computeFaviconHashCandidates(page.faviconBase64);
        if (candidates && candidates.length) iconHashes = candidates;
      } catch (e) {}
    }

    // jsProbe from MAIN world global values
    var jsProbe = runtime.globals || {};

    return {
      url: url,
      title: titleText,
      body: bodyText,
      headersMap: new Map(),  // EMPTY — matches content script behavior
      metaMap: metaMap,
      cookieText: cookieText,
      cookiesMap: cookiesMap,
      scripts: scripts,
      env: env,
      iconHashes: iconHashes,
      jsProbe: jsProbe
    };
  }

  // Legacy combined input (for backward compatibility)
  function buildSignalInput(page, runtime, background) {
    page = page || {};
    runtime = runtime || {};
    background = background || {};

    var main = background.main || {};
    var rawHeaders = main.headers || {};
    var url = page.url || main.url || '';

    var headersMap = new Map();
    Object.keys(rawHeaders).forEach(function (key) {
      var vals = arr(rawHeaders[key]);
      if (vals.length > 0) headersMap.set(key.toLowerCase(), String(vals[0] || ''));
    });

    var metaMap = new Map();
    var pageMeta = page.meta || {};
    Object.keys(pageMeta).forEach(function (key) {
      var vals = arr(pageMeta[key]);
      if (vals.length > 0) metaMap.set(key.toLowerCase(), String(vals[0] || ''));
    });

    var cookiesMap = new Map();
    var pageCookies = page.cookies || {};
    Object.keys(pageCookies).forEach(function (key) {
      cookiesMap.set(key.toLowerCase(), String(pageCookies[key] || ''));
    });

    var cookieText = page.cookieText || '';
    if (!cookieText && cookiesMap.size > 0) {
      cookieText = Array.from(cookiesMap.entries()).map(function (e) {
        return e[1] ? e[0] + '=' + e[1] : e[0];
      }).join('; ');
    }

    var scripts = page.scriptSrc || [];
    var env = runtime.env || [];
    var iconHashes = page.iconHashes || [];
    var jsProbe = runtime.globals || {};

    return {
      url: url, title: page.title || '', body: page.html || '',
      headersMap: headersMap, metaMap: metaMap, cookiesMap: cookiesMap,
      cookieText: cookieText, scripts: scripts, env: env,
      iconHashes: iconHashes, jsProbe: jsProbe
    };
  }

  function cacheKey(tabId, url) {
    return 'sniff_' + tabId + '_' + (url || '');
  }

  window.StiffEyesSniffSignals = {
    buildHeaderInput: buildHeaderInput,
    buildDomInput: buildDomInput,
    buildSignalInput: buildSignalInput,
    cacheKey: cacheKey
  };
})();

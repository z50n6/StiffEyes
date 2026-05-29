// StiffEyes sniff collector — page signals (ISOLATED world)
// Collects DOM signals for SnowEyesPlus fingerprint engine
(function () {
  'use strict';

  function abs(value) {
    try { return new URL(value, location.href).href; } catch (e) { return ''; }
  }

  function collectFaviconBase64() {
    return new Promise(function (resolve) {
      try {
        // Find favicon URL
        var faviconUrl = '';
        var links = document.querySelectorAll('link[rel*="icon"]');
        for (var i = 0; i < links.length; i++) {
          var href = links[i].getAttribute('href');
          if (href) { faviconUrl = abs(href); break; }
        }
        if (!faviconUrl) faviconUrl = new URL('/favicon.ico', location.origin).href;

        // Try to load favicon via Image + canvas
        var img = new Image();
        img.crossOrigin = 'anonymous';
        var done = false;
        var timer = setTimeout(function () {
          if (done) return;
          done = true;
          resolve({ faviconBase64: '', faviconUrl: faviconUrl });
        }, 3000);

        img.onload = function () {
          if (done) return;
          done = true;
          clearTimeout(timer);
          try {
            var canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 16;
            canvas.height = img.naturalHeight || 16;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            var dataUrl = canvas.toDataURL('image/png');
            // Extract base64 part
            var base64 = dataUrl.split(',')[1] || '';
            resolve({ faviconBase64: base64, faviconUrl: faviconUrl });
          } catch (e) {
            resolve({ faviconBase64: '', faviconUrl: faviconUrl });
          }
        };
        img.onerror = function () {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve({ faviconBase64: '', faviconUrl: faviconUrl });
        };
        img.src = faviconUrl;
      } catch (e) {
        resolve({ faviconBase64: '', faviconUrl: '' });
      }
    });
  }

  function collect() {
    // Meta tags
    var meta = {};
    var metaNodes = document.querySelectorAll('meta');
    for (var mi = 0; mi < metaNodes.length; mi++) {
      var key = (metaNodes[mi].getAttribute('name') || metaNodes[mi].getAttribute('property') || metaNodes[mi].getAttribute('http-equiv') || '').toLowerCase();
      if (!key) continue;
      meta[key] = meta[key] || [];
      meta[key].push(metaNodes[mi].getAttribute('content') || '');
    }

    // Cookies
    var cookies = {};
    var parts = (document.cookie || '').split(';');
    for (var ci = 0; ci < parts.length; ci++) {
      var item = parts[ci].trim();
      if (!item) continue;
      var idx = item.indexOf('=');
      cookies[idx >= 0 ? item.slice(0, idx) : item] = idx >= 0 ? item.slice(idx + 1) : '';
    }

    // Headers from document (if available — usually not in ISOLATED world)
    var headers = {};

    // Script src URLs (matching SnowEyesPlus behavior — URLs, not inline content)
    var scriptSrc = [];
    document.querySelectorAll('script[src]').forEach(function (script) {
      var src = script.getAttribute('src');
      if (src) {
        try { scriptSrc.push(new URL(src, location.href).href); } catch (e) {}
      }
    });
    scriptSrc = scriptSrc.slice(0, 220);

    // CSS from styleSheets
    var css = [];
    var cssChars = 0;
    try {
      var sheets = Array.from(document.styleSheets);
      for (var ss = 0; ss < sheets.length; ss++) {
        try {
          var rules = Array.from(sheets[ss].cssRules || []);
          for (var ri = 0; ri < rules.length; ri++) {
            var ruleText = rules[ri].cssText || '';
            css.push(ruleText);
            cssChars += ruleText.length + 1;
            if (cssChars > 180000) break;
          }
        } catch (e) {}
        if (cssChars > 180000) break;
      }
    } catch (e) {}

    // Class names & IDs
    var classNames = [];
    var ids = [];
    var domNodes = document.querySelectorAll('[class], [id]');
    for (var di = 0; di < domNodes.length; di++) {
      if (domNodes[di].id) ids.push(domNodes[di].id);
      if (domNodes[di].classList && domNodes[di].classList.length) {
        for (var cl = 0; cl < domNodes[di].classList.length; cl++) {
          classNames.push(domNodes[di].classList[cl]);
        }
      }
      if (classNames.length > 1800 && ids.length > 500) break;
    }

    // Sample HTML like SnowEyesPlus (keep first 70% + last 30%, max 480KB)
    var rawHtml = document.documentElement.outerHTML;
    var htmlLimit = 480000;
    var html = rawHtml.length <= htmlLimit ? rawHtml :
      rawHtml.slice(0, Math.floor(htmlLimit * 0.7)) + '\n' + rawHtml.slice(-Math.floor(htmlLimit * 0.3));

    return {
      url: location.href,
      title: document.title,
      html: html,
      text: (document.body ? document.body.innerText : '').slice(0, 50000),
      css: css.join('\n').slice(0, 180000),
      meta: meta,
      cookies: cookies,
      headers: headers,
      classNames: Array.from(new Set(classNames)).slice(0, 1800),
      ids: Array.from(new Set(ids)).slice(0, 500),
      scriptSrc: scriptSrc,
      cookieText: document.cookie || ''
    };
  }

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.type === 'COLLECT_SNIFF_PAGE_SIGNALS') {
      try {
        var data = collect();
        // Collect favicon async, return data first
        collectFaviconBase64().then(function (favicon) {
          data.faviconBase64 = favicon.faviconBase64 || '';
          data.faviconUrl = favicon.faviconUrl || '';
          sendResponse(data);
        }).catch(function () {
          sendResponse(data);
        });
        return true; // async
      } catch (e) {
        sendResponse({ error: e.message });
      }
      return true;
    }
    return false;
  });
})();

(function () {
  function resolveUrl(base, ref) {
    try {
      return new URL(ref, base).href;
    } catch (e) {
      return ref;
    }
  }

  function parseMapFromJs(text, scriptUrl) {
    var maps = [];
    var re = /\/\/[#@]\s*sourceMappingURL=([^\s'"]+)/g;
    var m;
    while ((m = re.exec(text)) !== null) {
      maps.push(resolveUrl(scriptUrl, m[1].trim()));
    }
    return maps;
  }

  function collectWebpackInfo() {
    var html = document.documentElement.innerHTML;
    var isWebpack =
      /(?:webpackJsonp|webpackChunk|__webpack_require__)/i.test(html);

    var scripts = Array.prototype.slice
      .call(document.querySelectorAll('script[src]'))
      .map(function (el) {
        return el.src;
      })
      .filter(Boolean);

    var inlineHits = [];
    Array.prototype.slice.call(document.querySelectorAll('script:not([src])')).forEach(
      function (el) {
        var t = el.textContent || '';
        if (/sourceMappingURL=/.test(t)) {
          inlineHits.push({
            scriptUrl: 'inline-script',
            mapUrl: (t.match(/sourceMappingURL=([^\s'"]+)/) || [])[1] || ''
          });
        }
      }
    );

    var mapLinks = [];
    Array.prototype.slice
      .call(document.querySelectorAll('link[rel="preload"][as="script"], link[href$=".map"]'))
      .forEach(function (el) {
        var href = el.href;
        if (href && /\.map($|\?)/i.test(href)) mapLinks.push(href);
      });

    var bodyMaps = [];
    var bodyRe = /["']([^"']+\.js\.map(?:\?[^"']*)?)["']/g;
    var bm;
    while ((bm = bodyRe.exec(html)) !== null) {
      bodyMaps.push(resolveUrl(location.href, bm[1]));
    }

    var suggestedEntry = '';
    scripts.forEach(function (src) {
      if (/app\.[a-f0-9]+\.js|main\.[a-f0-9]+\.js|index\.[a-f0-9]+\.js/i.test(src)) {
        suggestedEntry = src;
      }
    });
    if (!suggestedEntry && scripts.length) {
      suggestedEntry = scripts[scripts.length - 1];
    }
    var suggestedBase = '';
    if (suggestedEntry) {
      suggestedBase = suggestedEntry.replace(/[^/]+$/, '');
    } else {
      suggestedBase = location.origin + location.pathname.replace(/[^/]+$/, '');
    }

    return {
      pageUrl: location.href,
      isWebpack: isWebpack,
      scripts: scripts,
      inlineHits: inlineHits,
      mapLinks: mapLinks,
      bodyMaps: bodyMaps,
      suggestedEntry: suggestedEntry,
      suggestedBase: suggestedBase
    };
  }

  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (msg.type === 'WEBPACK_EXTRACT') {
      sendResponse(collectWebpackInfo());
      return true;
    }
    if (msg.type === 'WEBPACK_PARSE_CHUNKS') {
      try {
        var entry = msg.entryUrl;
        var base = msg.basePath;
        var text = msg.jsText || '';
        var chunks = [];
        var patterns = [
          /["']([^"']+\.js)["']\s*:\s*["']([a-f0-9]{8,})["']/g,
          /\{\s*["']?([\w.-]+)["']?\s*:\s*["']([a-f0-9]{8,})["']/g,
          /["']([^"']+\.js)["']\s*:\s*["']([^"']+)["']/g
        ];
        patterns.forEach(function (re) {
          var m;
          while ((m = re.exec(text)) !== null) {
            var name = m[1];
            if (!/\.js$/i.test(name)) name = name + '.js';
            var url = resolveUrl(base, name);
            if (chunks.indexOf(url) === -1) chunks.push(url);
          }
        });
        var webpackJsonRe =
          /\{[^{}]*\}\s*\[[^\]]*\]\s*\+\s*"([^"]+\.js)"/g;
        var wjm;
        while ((wjm = webpackJsonRe.exec(text)) !== null) {
          var wu = resolveUrl(base, wjm[1]);
          if (chunks.indexOf(wu) === -1) chunks.push(wu);
        }
        var publicPathRe = /__webpack_require__\.p\s*=\s*["']([^"']+)["']/;
        var ppm = text.match(publicPathRe);
        if (ppm && ppm[1]) {
          base = resolveUrl(entry || base, ppm[1]);
        }
        var chunkRe = /(?:import\s*\(\s*|["'])([^"']*chunk[^"']*\.js)/gi;
        var cm;
        while ((cm = chunkRe.exec(text)) !== null) {
          var u = resolveUrl(base, cm[1]);
          if (chunks.indexOf(u) === -1) chunks.push(u);
        }
        sendResponse({ chunks: chunks, entry: entry, base: base });
      } catch (e) {
        sendResponse({ error: e.message, chunks: [] });
      }
      return true;
    }
    return false;
  });
})();

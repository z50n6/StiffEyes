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

        function addChunk(name) {
          if (!/\.js$/i.test(name)) name = name + '.js';
          var url = resolveUrl(base, name);
          if (chunks.indexOf(url) === -1) chunks.push(url);
        }

        // 1. "chunk.js": "hash" — webpack 4 chunk map
        var re1 = /["']([^"']+\.js)["']\s*:\s*["']([a-f0-9]{8,})["']/g;
        var m1;
        while ((m1 = re1.exec(text)) !== null) addChunk(m1[1]);

        // 2. "chunk": "hash" (no .js suffix) — webpack asset map
        var re2 = /\{\s*["']?([\w.-]+)["']?\s*:\s*["']([a-f0-9]{8,})["']/g;
        var m2;
        while ((m2 = re2.exec(text)) !== null) addChunk(m2[1]);

        // 3. Generic "key": "value" chunk definitions
        var re3 = /["']([^"']+\.js)["']\s*:\s*["']([^"']+)["']/g;
        var m3;
        while ((m3 = re3.exec(text)) !== null) addChunk(m3[1]);

        // 4. Numeric ID mapping: 0: "chunk.js" — webpack 5 module map
        var re4 = /(\d+)\s*:\s*"([^"]+\.js)"/g;
        var m4;
        while ((m4 = re4.exec(text)) !== null) addChunk(m4[2]);

        // 5. Numeric ID without .js: 0: "chunk-name"
        var re5 = /(\d+)\s*:\s*"([^"]+)"/g;
        var m5;
        while ((m5 = re5.exec(text)) !== null) {
          if (!/\.(js|css|json|map)$/i.test(m5[2]) && !/^[A-Z]/.test(m5[2])) addChunk(m5[2]);
        }

        // 6. {…}[…] + ".js" — webpack JSONP chunk map (single-line)
        var re6 = /\{[^{}]*\}\s*\[[^\]]*\]\s*\+\s*"([^"]+\.js)"/g;
        var m6;
        while ((m6 = re6.exec(text)) !== null) addChunk(m6[1]);

        // 7. {…}[…] + ".js" — webpack JSONP chunk map (multi-line tolerant)
        var re7 = /\{[\s\S]{0,5000}?\}\s*\[[^\]]*\]\s*\+\s*"([^"]+\.js)"/g;
        var m7;
        while ((m7 = re7.exec(text)) !== null) addChunk(m7[1]);

        // 8. ] + ".chunk.js" — suffix concat patterns
        var re8 = /\]\s*\+\s*"([^"]+\.js)"/g;
        var m8;
        while ((m8 = re8.exec(text)) !== null) addChunk(m8[1]);

        // 9. "js/" + … — path prefix concatenation
        var re9 = /"js\/"\s*\+\s*"([^"]+\.js)"/g;
        var m9;
        while ((m9 = re9.exec(text)) !== null) addChunk(m9[1]);

        // 10. __webpack_require__.u = … => — webpack 5 runtime chunk getter
        var re10 = /\.u\s*=\s*(?:function\s*\([^)]*\)\s*=>\s*|[^=]+=>\s*)(?:["'][^"']*["']\s*\+)?/g;
        // Skip — used only for detection; actual chunks resolved by other patterns

        // 11. __webpack_require__.p = "…" — public path
        var ppm = text.match(/__webpack_require__\.p\s*=\s*["']([^"']+)["']/);
        if (ppm && ppm[1]) {
          base = resolveUrl(entry || base, ppm[1]);
        }

        // 12. import("…chunk…") — dynamic import
        var re12 = /import\s*\(\s*["']([^"']+\.js)["']\s*\)/g;
        var m12;
        while ((m12 = re12.exec(text)) !== null) addChunk(m12[1]);

        // 13. import "…" — static import paths
        var re13 = /import\s*["']\.\/([^"']+?\.m?js)["']/g;
        var m13;
        while ((m13 = re13.exec(text)) !== null) addChunk(m13[1]);

        // 14. e("…") or n("…") — minified webpack require calls
        var re14 = /(?:\w\s*\(\s*["'])([^"']+\.js)(?:["']\s*\))/g;
        var m14;
        while ((m14 = re14.exec(text)) !== null) {
          if (m14[1].indexOf('/') !== -1 || /[a-f0-9]{6,}/.test(m14[1])) addChunk(m14[1]);
        }

        // 15. Hash-based filenames: name.abc123.js found in concatenation context
        var re15 = /"([a-z0-9_-]+\.[0-9a-f]{6,}\.m?js)"/gi;
        var m15;
        while ((m15 = re15.exec(text)) !== null) addChunk(m15[1]);

        // Deduplicate by filename stem
        var seenStems = {};
        var deduped = [];
        chunks.forEach(function (url) {
          try {
            var stem = new URL(url).pathname.split('/').pop().replace(/\.js$/i, '');
            if (!seenStems[stem]) {
              seenStems[stem] = true;
              deduped.push(url);
            }
          } catch (e) { deduped.push(url); }
        });

        sendResponse({ chunks: deduped, entry: entry, base: base });
      } catch (e) {
        sendResponse({ error: e.message, chunks: [] });
      }
      return true;
    }
    return false;
  });
})();

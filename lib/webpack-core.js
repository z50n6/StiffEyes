var StiffEyesWebpackCore = (function () {
  function getMergedRules() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(['webpackCustomRules', 'webpackReplaceMode'], function (data) {
        var base =
          typeof StiffEyesWebpackRules !== 'undefined'
            ? JSON.parse(JSON.stringify(StiffEyesWebpackRules))
            : { rules: [] };
        var custom = data.webpackCustomRules;
        if (!custom || !custom.rules) {
          resolve(base);
          return;
        }
        if (data.webpackReplaceMode) {
          resolve(custom);
          return;
        }
        var map = {};
        base.rules.forEach(function (g) {
          map[g.group] = g;
        });
        custom.rules.forEach(function (g) {
          if (!map[g.group]) map[g.group] = { group: g.group, rule: [] };
          map[g.group].rule = map[g.group].rule.concat(g.rule || []);
        });
        resolve({ rules: Object.keys(map).map(function (k) { return map[k]; }) });
      });
    });
  }

  function analyzeText(text, rulesConfig) {
    var hits = [];
    if (!text || !rulesConfig || !rulesConfig.rules) return hits;
    rulesConfig.rules.forEach(function (group) {
      (group.rule || []).forEach(function (rule) {
        if (rule.loaded === false) return;
        var scope = rule.scope || 'any';
        if (scope.indexOf('request') >= 0) return;
        try {
          var re = new RegExp(rule.f_regex, rule.engine === 'dfa' ? '' : 'i');
          var m;
          var count = 0;
          while ((m = re.exec(text)) !== null && count < 50) {
            count++;
            var val = m[0];
            if (rule.s_regex) {
              try {
                var sre = new RegExp(rule.s_regex, 'i');
                if (!sre.test(val)) continue;
              } catch (e) { /* skip */ }
            }
            hits.push({
              group: group.group,
              name: rule.name,
              color: rule.color || 'gray',
              match: val.length > 200 ? val.slice(0, 200) + '…' : val
            });
            if (!re.global) break;
          }
        } catch (e) { /* invalid regex */ }
      });
    });
    return hits;
  }

  function proxyFetch(url) {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage({ type: 'PROXY_FETCH', url: url, timeout: 20000 }, resolve);
    });
  }

  function fetchText(url) {
    return proxyFetch(url).then(function (r) {
      if (r && r.ok && r.text) return r.text;
      return fetch(url, { credentials: 'omit' })
        .then(function (res) { return res.text(); })
        .catch(function () { return ''; });
    });
  }

  function buildEntries(raw, fetchedMaps) {
    var seen = {};
    var list = [];
    function add(scriptUrl, mapUrl) {
      var key = (scriptUrl || '') + '|' + (mapUrl || '');
      if (seen[key]) return;
      seen[key] = true;
      list.push({
        scriptUrl: scriptUrl || '',
        mapUrl: mapUrl || '',
        jsContent: fetchedMaps && fetchedMaps[scriptUrl] ? fetchedMaps[scriptUrl].js : '',
        mapContent: fetchedMaps && mapUrl && fetchedMaps[mapUrl] ? fetchedMaps[mapUrl].text : ''
      });
    }
    (raw.scripts || []).forEach(function (src) {
      add(src, '');
    });
    (raw.inlineHits || []).forEach(function (x) {
      add(x.scriptUrl, x.mapUrl);
    });
    (raw.mapLinks || []).forEach(function (m) {
      add('', m);
    });
    (raw.bodyMaps || []).forEach(function (m) {
      add(m.replace(/\.map(\?.*)?$/i, '.js$1'), m);
    });
    return list;
  }

  async function enrichEntries(entries) {
    var out = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var js = e.jsContent;
      var mapText = e.mapContent;
      if (e.scriptUrl && e.scriptUrl.indexOf('inline') !== 0 && !js) {
        js = await fetchText(e.scriptUrl);
      }
      if (!e.mapUrl && js) {
        var m = js.match(/\/\/[#@]\s*sourceMappingURL=([^\s'"]+)/);
        if (m) e.mapUrl = new URL(m[1].trim(), e.scriptUrl).href;
      }
      if (e.mapUrl && !mapText) {
        var mr = await fetchText(e.mapUrl);
        mapText = mr || '';
      }
      out.push({
        scriptUrl: e.scriptUrl,
        mapUrl: e.mapUrl,
        jsContent: js || '',
        mapContent: mapText || ''
      });
    }
    return out;
  }

  function copyText(text) {
    return navigator.clipboard.writeText(text);
  }

  function downloadDataUrl(filename, content, mime) {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage(
        {
          type: 'WEBPACK_DOWNLOAD',
          filename: filename,
          content: content,
          mime: mime || 'application/octet-stream'
        },
        resolve
      );
    });
  }

  return {
    getMergedRules: getMergedRules,
    analyzeText: analyzeText,
    fetchText: fetchText,
    buildEntries: buildEntries,
    enrichEntries: enrichEntries,
    copyText: copyText,
    downloadDataUrl: downloadDataUrl
  };
})();

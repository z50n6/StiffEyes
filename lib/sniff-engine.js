// StiffEyes sniff engine — replicates SnowEyesPlus two-pass detection
// Pass 1: Header-only signals (matching background.js processHeaders)
// Pass 2: DOM-only signals (matching content.js runExternalFingerprintScan)
// Results merged via mergeFingerprintHitResults (same as SnowEyesPlus)
(function () {
  'use strict';

  var CATEGORY_ORDER = [
    '内容管理系统（CMS）', '电子商务', '论坛', '网站构建器', '托管平台',
    'Web App', '数据库', 'JavaScript 框架', 'JavaScript 库',
    '用户界面（UI）框架', 'CSS 框架', '字体脚本', '编程语言',
    'Web 服务器', 'CDN', '支付', '分析工具', '标签管理器',
    '监控', '构建工具', '文档', 'API', '安全'
  ];

  var TYPE_CATEGORY_MAP = {
    'cms': '内容管理系统（CMS）',
    'ecommerce': '电子商务',
    'forum': '论坛',
    'builder': '构建工具',
    'hosting': '托管平台',
    'webapp': 'Web App',
    'database': '数据库',
    'framework': 'JavaScript 框架',
    'library': 'JavaScript 库',
    'ui': '用户界面（UI）框架',
    'css': 'CSS 框架',
    'font': '字体脚本',
    'technology': '编程语言',
    'server': 'Web 服务器',
    'cdn': 'CDN',
    'payment': '支付',
    'analytics': '分析工具',
    'tagmanager': '标签管理器',
    'monitoring': '监控',
    'docs': '文档',
    'api': 'API',
    'security': '安全',
    'os': '操作系统',
    'component': 'JavaScript 库',
    'panel': 'Web App',
    'app': 'Web App',
    'env': 'Web App',
    'port': 'Web App'
  };

  var FIELD_LABEL_MAP = {
    'body': 'Body', 'header': '响应头', 'cookie': 'Cookie', 'title': '标题',
    'url': 'URL', 'response': 'Response', 'script': '脚本', 'meta': 'Meta',
    'js': 'JS探测', 'env': 'Env', 'icon_hash': 'Favicon'
  };

  function scoreLabel(score) {
    if (score >= 90) return '强';
    if (score >= 75) return '稳';
    return '弱';
  }

  function escapeHTML(value) {
    return String(value || '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function groupByCategory(items) {
    var groups = new Map();
    for (var i = 0; i < items.length; i++) {
      var cat = items[i].category || '其他';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(items[i]);
    }
    return Array.from(groups.entries()).sort(function (a, b) {
      return categoryRank(a[0]) - categoryRank(b[0]);
    });
  }

  function categoryRank(cat) {
    var idx = CATEGORY_ORDER.indexOf(cat);
    return idx === -1 ? CATEGORY_ORDER.length : idx;
  }

  function evidenceTitle(item) {
    return (item.evidences || []).map(function (ev) {
      return (ev.source || '') + (ev.key ? ':' + ev.key : '') + ' = ' + (ev.value || '');
    }).join('\n');
  }

  function inferCategory(hit) {
    var name = String(hit.name || '').toLowerCase();
    if (/nginx|apache|iis|tomcat|jetty|caddy|litespeed|lighttpd/i.test(name)) return 'Web 服务器';
    if (/wordpress|drupal|joomla|cms|typo3|concrete/i.test(name)) return '内容管理系统（CMS）';
    if (/react|vue|angular|svelte|next|nuxt|gatsby/i.test(name)) return 'JavaScript 框架';
    if (/jquery|bootstrap|lodash|moment|axios|d3/i.test(name)) return 'JavaScript 库';
    if (/php|python|java|ruby|node|golang/i.test(name)) return '编程语言';
    if (/mysql|postgres|mongodb|redis|sqlite/i.test(name)) return '数据库';
    if (/cloudflare|cdn|akamai|fastly|cloudfront/i.test(name)) return 'CDN';
    if (/google.analytics|baidu|tongji|gtag|matomo/i.test(name)) return '分析工具';
    if (/waf|firewall|hsts|security/i.test(name)) return '安全';
    if (/windows|linux|ubuntu|debian|centos/i.test(name)) return '操作系统';
    if (/webpack|vite|gulp|grunt|rollup/i.test(name)) return '构建工具';
    return '其他';
  }

  function findVersionInText(text) {
    var s = String(text || '').trim();
    var patterns = [
      /(?:\/|@|[-_]v?)(\d+\.\d+(?:\.\d+)?(?:[-_.][A-Za-z0-9]+)?)/,
      /(?:version\s*[:=]?\s*)(\d+\.\d+(?:\.\d+)?)/i,
      /\b(\d+\.\d+\.\d+(?:[-_.][A-Za-z0-9]+)?)\b/,
      /\b(\d+\.\d+(?:[-_.][A-Za-z0-9]+)?)\b/
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = patterns[i].exec(s);
      if (m && m[1] && !/^\d{4}-\d{2}-\d{2}/.test(m[1]) && m[1].length <= 24) {
        return m[1];
      }
    }
    return '';
  }

  function extractVersion(hit) {
    var traces = hit.traces || [];
    for (var i = 0; i < traces.length; i++) {
      var t = traces[i];
      if (!t || !t.matched || !t.value) continue;
      var v = findVersionInText(t.value);
      if (v) return v;
    }
    return '';
  }

  function buildEvidences(hit) {
    var traces = hit.traces || [];
    var seen = new Set();
    var evidences = [];

    for (var i = 0; i < traces.length; i++) {
      var t = traces[i];
      if (!t || !t.matched) continue;
      var field = t.field || '';
      var source = FIELD_LABEL_MAP[field] || field || 'signal';
      var value = (t.value || '').slice(0, 180);
      var key = source + '|' + value;
      if (seen.has(key)) continue;
      seen.add(key);
      evidences.push({
        source: source,
        key: field,
        value: value,
        context: value,
        score: hit.score || 72,
        sourceType: field
      });
    }

    return evidences;
  }

  function convertHit(hit) {
    var category = TYPE_CATEGORY_MAP[hit.type] || inferCategory(hit);
    var version = hit.version || extractVersion(hit);
    var evidences = buildEvidences(hit);

    return {
      id: hit.id || hit.name,
      name: hit.name,
      category: category,
      version: version,
      score: hit.score || 72,
      evidences: evidences.slice(0, 10),
      infers: Array.isArray(hit.implies) ? hit.implies : [],
      excludes: Array.isArray(hit.excludes) ? hit.excludes : [],
      requires: []
    };
  }

  // Single-pass detection helper
  function detectPass(compiledStore, signalInput) {
    var FP = (window.StiffEyesFingerprint && window.StiffEyesFingerprint.utils) || {};
    if (typeof FP.detectFingerprintsWithUnifiedStore !== 'function') return [];
    return FP.detectFingerprintsWithUnifiedStore(compiledStore, signalInput, { threshold: 72, includeLowScore: false }) || [];
  }

  // Two-pass detection matching SnowEyesPlus architecture:
  // Pass 1: header+cookie-only (background.js processHeaders equivalent)
  // Pass 2: DOM-only (content.js runExternalFingerprintScan equivalent)
  function analyze(compiledStore, headerInput, domInput) {
    if (!compiledStore) return [];
    var FP = (window.StiffEyesFingerprint && window.StiffEyesFingerprint.utils) || {};

    // Pass 1: Header-only signals (like SnowEyesPlus background.js buildHeaderSignalInput)
    var headerHits = detectPass(compiledStore, headerInput || {});

    // Pass 2: DOM-only signals (like SnowEyesPlus content.js, headersMap empty)
    var domHits = detectPass(compiledStore, domInput || {});

    // Merge both pass results (like SnowEyesPlus mergeFingerprintHitResults)
    var merged = [];
    if (typeof FP.mergeFingerprintHitResults === 'function') {
      merged = FP.mergeFingerprintHitResults(headerHits, domHits);
    } else {
      // Fallback: simple dedup by name
      var byName = {};
      headerHits.concat(domHits).forEach(function (h) {
        var key = String(h.name || '').toLowerCase();
        if (!byName[key] || (h.score || 0) > (byName[key].score || 0)) {
          byName[key] = h;
        }
      });
      merged = Object.values(byName);
    }

    return merged.map(convertHit);
  }

  // Legacy single-input analyze (combines header + dom for backward compat)
  function analyzeCombined(compiledStore, signalInput) {
    if (!compiledStore || !signalInput) return [];
    var hits = detectPass(compiledStore, signalInput);
    return hits.map(convertHit);
  }

  // ========== Structured Rule Engine (sniff-rules-core.js format) ==========
  function _safeRegex(regexStr) {
    if (regexStr instanceof RegExp) return regexStr;
    try { return new RegExp(String(regexStr || ''), 'i'); } catch (e) { return null; }
  }

  function _matchSource(source, key, regex, signalData) {
    var rx = _safeRegex(regex);
    if (!rx) return null;

    var candidates = [];

    switch (source) {
      case 'html':
        candidates = [String(signalData.bodyText || '')];
        break;
      case 'headers':
        candidates = [String((signalData.headersMap && signalData.headersMap.get(String(key || '').toLowerCase())) || '')];
        break;
      case 'meta':
        candidates = [String((signalData.metaMap && signalData.metaMap.get(String(key || '').toLowerCase())) || '')];
        break;
      case 'cookies':
        var ck = String(key || '').toLowerCase();
        if (signalData.cookiesMap) {
          if (signalData.cookiesMap.has(ck)) {
            candidates = [String(signalData.cookiesMap.get(ck) || '')];
          } else if (ck.endsWith('_')) {
            // Prefix match: e.g., key "discuz_" matches "discuz_uid", "discuz_sid"
            var prefix = ck;
            signalData.cookiesMap.forEach(function (v, k) {
              if (String(k).startsWith(prefix)) candidates.push(String(v || ''));
            });
          }
        }
        if (!candidates.length) candidates = [''];
        break;
      case 'scriptSrc':
        candidates = Array.isArray(signalData.scriptSrcs) ? signalData.scriptSrcs : [];
        break;
      case 'globals':
        var gk = String(key || '').trim();
        var gv = signalData.jsProbe && gk ? signalData.jsProbe[gk] : undefined;
        candidates = [String(gv !== undefined && gv !== null ? gv : '')];
        break;
      case 'resourceUrl':
        candidates = Array.isArray(signalData.resourceUrls) ? signalData.resourceUrls : [];
        break;
      case 'resourceHost':
        candidates = Array.isArray(signalData.resourceHosts) ? signalData.resourceHosts : [];
        break;
      case 'className':
        candidates = Array.isArray(signalData.classNames) ? signalData.classNames : [];
        break;
      case 'css':
        candidates = [String(signalData.cssText || '')];
        break;
      case 'styleHref':
        candidates = Array.isArray(signalData.styleHrefs) ? signalData.styleHrefs : [];
        break;
      case 'linkHref':
        candidates = Array.isArray(signalData.linkHrefs) ? signalData.linkHrefs : [];
        break;
      case 'htmlAttr':
        candidates = [String(signalData.bodyText || '')];
        break;
      case 'vueRuntime':
        candidates = Array.isArray(signalData.vueRuntime) ? signalData.vueRuntime : [];
        break;
      case 'vueMarker':
        candidates = [String(signalData.bodyText || '')];
        break;
      case 'scripts':
        candidates = [String(signalData.inlineScripts || '')];
        break;
      default:
        return null;
    }

    for (var i = 0; i < candidates.length; i++) {
      var text = String(candidates[i] || '');
      if (!text && source !== 'cookies') continue;
      // For cookies with empty value, match on key existing (presence-only)
      if (source === 'cookies' && !text && signalData.cookiesMap) {
        var ck2 = String(key || '').toLowerCase();
        if (signalData.cookiesMap.has(ck2)) {
          return { matched: true, value: ck2, matchResult: [] };
        }
        continue;
      }
      var m = rx.exec(text);
      if (m) {
        return { matched: true, value: text.slice(0, 220), matchResult: Array.from(m).slice(0, 12) };
      }
    }
    return null;
  }

  function _buildStructuredSignals(page, runtime, bg) {
    page = page || {};
    runtime = runtime || {};
    bg = bg || {};

    // Build resource URL lists
    var resourceUrls = [];
    var resourceHosts = [];
    var styleHrefs = [];
    var linkHrefs = [];
    var seenHosts = {};

    function _addRes(url) {
      if (!url) return;
      resourceUrls.push(url);
      try {
        var h = new URL(url).hostname;
        if (h && !seenHosts[h]) { seenHosts[h] = true; resourceHosts.push(h); }
      } catch (e) {}
    }

    // From background resources
    if (Array.isArray(bg.resources)) {
      bg.resources.forEach(function (r) {
        _addRes(r.url);
        if (r.type === 'stylesheet' || /\.css(?:[?#]|$)/i.test(r.url)) {
          styleHrefs.push(r.url);
        }
      });
    }
    // From page script srcs
    if (Array.isArray(page.scriptSrc)) {
      page.scriptSrc.forEach(function (url) { _addRes(url); });
    }
    // Link hrefs from resources
    if (Array.isArray(bg.resources)) {
      bg.resources.forEach(function (r) {
        if (r.type === 'other' || r.type === 'xmlhttprequest') return;
        linkHrefs.push(r.url);
      });
    }

    // Build headers & meta maps
    var headersMap = new Map();
    if (bg.main && bg.main.headers) {
      Object.keys(bg.main.headers).forEach(function (k) {
        headersMap.set(k.toLowerCase(), String(bg.main.headers[k] || ''));
      });
    }

    var metaMap = new Map();
    if (page.meta) {
      Object.keys(page.meta).forEach(function (k) {
        var v = page.meta[k];
        metaMap.set(k.toLowerCase(), Array.isArray(v) ? String(v[0] || '') : String(v || ''));
      });
    }

    // Build cookiesMap from both DOM cookies and response Set-Cookie
    var cookiesMap = new Map();
    if (page.cookies) {
      Object.keys(page.cookies).forEach(function (k) {
        cookiesMap.set(k.toLowerCase(), String(page.cookies[k] || ''));
      });
    }

    // Script srcs
    var scriptSrcs = Array.isArray(page.scriptSrc) ? page.scriptSrc : [];

    // JS probe
    var jsProbe = (runtime.globals && typeof runtime.globals === 'object') ? runtime.globals : {};

    return {
      bodyText: String(page.html || ''),
      titleText: String(page.title || ''),
      urlText: String(page.url || ''),
      headersMap: headersMap,
      metaMap: metaMap,
      cookiesMap: cookiesMap,
      scriptSrcs: scriptSrcs,
      jsProbe: jsProbe,
      resourceUrls: resourceUrls,
      resourceHosts: resourceHosts,
      classNames: Array.isArray(page.classNames) ? page.classNames : [],
      cssText: String(page.css || ''),
      styleHrefs: styleHrefs,
      linkHrefs: linkHrefs,
      vueRuntime: Array.isArray(runtime.vueRuntime) ? runtime.vueRuntime : [],
      inlineScripts: '' // collected separately if needed
    };
  }

  function matchStructuredRules(rules, page, runtime, bg) {
    if (!Array.isArray(rules) || !rules.length) return [];

    var signals = _buildStructuredSignals(page, runtime, bg);
    var hits = [];
    var threshold = 72;

    for (var ri = 0; ri < rules.length; ri++) {
      var rule = rules[ri];
      if (!rule || !Array.isArray(rule.matchers) || !rule.matchers.length) continue;

      var bestMatch = null;
      var bestScore = 0;
      var extraMatches = 0;
      var allTraces = [];
      var allFields = [];
      var bestVersion = '';

      for (var mi = 0; mi < rule.matchers.length; mi++) {
        var m = rule.matchers[mi];
        if (!m || !m.source || !m.regex) continue;

        var result = _matchSource(m.source, m.key, m.regex, signals);
        if (!result || !result.matched) continue;

        var mScore = Number(m.score || 72);
        allFields.push(m.source);
        allTraces.push({
          field: m.source,
          key: m.key || '',
          op: '~=',
          value: result.value,
          matched: true
        });

        if (mScore > bestScore) {
          bestScore = mScore;
          bestMatch = m;
          // Extract version
          if (m.version || m.versionRegex) {
            var vrx = _safeRegex(m.versionRegex || m.regex);
            if (vrx && result.matchResult && result.matchResult.length) {
              var vIdx = (typeof m.version === 'number' && m.version > 0) ? m.version : 1;
              if (result.matchResult[vIdx]) {
                bestVersion = result.matchResult[vIdx];
              } else if (m.version && typeof m.version === 'string') {
                bestVersion = m.version;
              }
            } else if (m.version && typeof m.version === 'string' && !/^\d+$/.test(m.version)) {
              bestVersion = m.version;
            }
          }
        } else {
          extraMatches++;
        }
      }

      var totalMatches = (bestMatch ? 1 : 0) + extraMatches;
      var minEvidence = Number(rule.minEvidence || 1);
      if (!bestMatch || totalMatches < minEvidence || bestScore < (rule.minScore || threshold)) continue;

      // Score bonus for additional matchers
      var finalScore = Math.min(bestScore + Math.min(extraMatches * 2, 8), 99);

      hits.push({
        id: rule.id,
        name: rule.name,
        type: 'structured',
        source: 'structured',
        expression: rule.name,
        score: finalScore,
        confidence: finalScore >= 90 ? 'high' : finalScore >= 75 ? 'medium' : 'low',
        matchedFields: Array.from(new Set(allFields)),
        weakSignals: [],
        traces: allTraces.slice(0, 12),
        version: bestVersion,
        implies: Array.isArray(rule.infers) ? rule.infers : [],
        excludes: Array.isArray(rule.excludes) ? rule.excludes : []
      });
    }

    return hits;
  }

  window.StiffEyesSniff = {
    analyze: analyze,
    analyzeCombined: analyzeCombined,
    matchStructuredRules: matchStructuredRules,
    scoreLabel: scoreLabel,
    groupByCategory: groupByCategory,
    escapeHTML: escapeHTML,
    evidenceTitle: evidenceTitle,
    categoryRank: categoryRank,
    CATEGORY_ORDER: CATEGORY_ORDER,
    convertHit: convertHit,
    TYPE_CATEGORY_MAP: TYPE_CATEGORY_MAP
  };
})();

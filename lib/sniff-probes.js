// StiffEyes sniff probes — runtime global detection (injected into MAIN world)
// This function is called via chrome.scripting.executeScript from popup context.
// It must be standalone (no closure references from this file).
window.StiffEyesCollectRuntime = function StiffEyesCollectRuntime(extraChains) {
  extraChains = extraChains || [];
  var chains = ['Vue', 'Vue.version', 'VueRouter', 'Vuex', 'Pinia', '__VUE_OPTIONS_API__', '__VUE_PROD_DEVTOOLS__', 'React', 'React.version', 'ReactDOM', 'ReactDOM.version', 'angular', 'angular.version.full', 'jQuery', 'jQuery.fn.jquery', '$.fn.jquery', 'bootstrap.Tooltip.VERSION', '_', '_.VERSION', 'moment', 'moment.version', 'dayjs', 'dayjs.version', 'axios', 'axios.VERSION', 'Swiper', 'layui', 'layui.v', 'Vant', 'ElementPlus', 'ELEMENT', 'antd', 'ArcoVue', 'Highcharts', 'Highcharts.version', 'echarts', 'echarts.version', 'Chart', 'Chart.version', 'd3', 'd3.version', 'THREE', 'THREE.REVISION', 'Backbone', 'Backbone.VERSION', 'ko', 'ko.version', 'Ember', 'Ember.VERSION', 'MooTools', 'MooTools.version', 'Prototype', 'Prototype.Version', 'Zepto', 'require', 'require.version', 'define.amd', 'seajs', 'System', 'Alpine', 'htmx', 'NProgress', 'webpackJsonp', 'webpackChunk', '__webpack_require__', '__webpack_require__.p', '__vite_is_modern_browser', '__VP_HASH_MAP__', '__VUE_DEVTOOLS_GLOBAL_HOOK__', '__NUXT__', '__NEXT_DATA__', '___gatsby', '__remixContext', 'Shopify', 'Shopify.theme', 'Magento', 'Mage', 'Webflow', 'Wix', 'Squarespace', 'Stripe', 'paypal', 'grecaptcha', 'hcaptcha', 'turnstile', 'Sentry', 'Raven', 'dataLayer', 'gtag', '_hmt', 'sensors', 'gio', 'clarity', 'hj', 'posthog', 'AMap', 'BMap', 'qq.maps', 'wx', 'WeixinJSBridge'];
  chains.push('AFRAME', 'AFRAME.version', 'gsap', 'gsap.version', 'TweenLite.version', 'TweenMax.version', 'Lenis', 'lenisVersion', 'FullCalendar.version', 'MonacoEnvironment', 'monaco.editor', 'Prism', 'hljs', 'hljs.listLanguages', 'MathJax', 'MathJax.version', 'katex', 'katex.version', 'mermaid', 'Splide', 'Choices', 'jQuery.fn.select2', '$.fn.select2', 'tinyMCE', 'tinymce', 'tinyMCE.majorVersion', 'CKEDITOR', 'CKEDITOR.version', 'CKEDITOR_VERSION', 'Quill', 'videojs', 'videojs.VERSION', 'lottie.version', 'analytics.VERSION', 'analytics.SNIPPET_VERSION', 'mixpanel', 'plausible', 'PAYPAL', '__paypal_global__');
  if (Array.isArray(extraChains)) {
    for (var i = 0; i < extraChains.length; i++) {
      if (typeof extraChains[i] === 'string' && extraChains[i].length < 120) chains.push(extraChains[i]);
    }
  }
  var uniqueChains = [];
  var seen = {};
  for (var ci = 0; ci < chains.length; ci++) {
    if (!seen[chains[ci]] && uniqueChains.length < 6000) {
      seen[chains[ci]] = true;
      uniqueChains.push(chains[ci]);
    }
  }

  var globals = {};
  for (var gi = 0; gi < uniqueChains.length; gi++) {
    var chain = uniqueChains[gi];
    var keys = chain.split('.');
    var obj = window;
    var found = true;
    for (var ki = 0; ki < keys.length; ki++) {
      if (obj && Object.prototype.hasOwnProperty.call(Object(obj), keys[ki])) {
        obj = obj[keys[ki]];
      } else {
        found = false;
        break;
      }
    }
    if (!found || typeof obj === 'undefined') continue;
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      globals[chain] = String(obj).slice(0, 160);
    } else if (typeof obj === 'function') {
      globals[chain] = 'function';
    } else {
      globals[chain] = Array.isArray(obj) ? 'array(' + obj.length + ')' : 'object';
    }
  }

  var vueRuntime = [];
  function pushVR(value) { if (value && vueRuntime.indexOf(value) === -1) vueRuntime.push(value); }
  try {
    var hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
    if (hook && hook.Vue && hook.Vue.version) pushVR('version:' + hook.Vue.version);
    if (hook && Array.isArray(hook.apps) && hook.apps.length) pushVR('devtools-apps:' + hook.apps.length);
  } catch (e) {}
  var vueDomChecks = 0;
  try {
    var allEls = document.querySelectorAll('*');
    for (var di = 0; di < allEls.length; di++) {
      if (allEls[di].__vue_app__) pushVR('__vue_app__');
      if (allEls[di].__vue__) pushVR('__vue__');
      if (allEls[di].__vueParentComponent) pushVR('__vueParentComponent');
      if (allEls[di].__vnode || allEls[di]._vnode) pushVR('__vnode');
      if (++vueDomChecks >= 5000 || vueRuntime.length >= 20) break;
    }
  } catch (e) {}

  return { globals: globals, vueRuntime: vueRuntime, env: Object.keys(window).slice(0, 420) };
};

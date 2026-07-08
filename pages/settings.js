var $ = function (id) {
  return document.getElementById(id);
};

function showToast(message) {
  var toast = document.createElement('div');
  toast.className = 'spring-toast';
  toast.textContent = message || '设置已保存';
  document.body.appendChild(toast);
  setTimeout(function () {
    toast.classList.add('spring-toast-hide');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 2000);
}

function load() {
  chrome.storage.local.get(
    ['directories', 'blacklist_domains', 'base_path', 'deepScan', 'skip_third_party_js', 'dynamicScan'],
    function (data) {
      $('directories').value = data.directories
        ? data.directories.join('\n')
        : StiffEyesPaths.getDefaultDirectoriesText();
      $('blacklist').value = (data.blacklist_domains || []).join('\n');
      $('basePath').value = data.base_path || '';
      $('deepScan').checked = data.deepScan !== false;
      $('skipThirdPartyJs').checked = data.skip_third_party_js !== false;
      $('dynamicScan').checked = data.dynamicScan === true;
    }
  );
}

function notifyOpenTabsRescan(scanOpts) {
  chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, function (tabs) {
    (tabs || []).forEach(function (tab) {
      if (!tab.id) return;
      chrome.tabs
        .sendMessage(tab.id, {
          type: 'UPDATE_DYNAMIC_SCAN',
          enabled: scanOpts.dynamicScan
        })
        .catch(function () {});
      chrome.tabs
        .sendMessage(tab.id, {
          type: 'UPDATE_DEEP_SCAN',
          enabled: scanOpts.deepScan
        })
        .catch(function () {});
      chrome.tabs
        .sendMessage(tab.id, {
          type: 'UPDATE_SKIP_THIRD_PARTY_JS',
          enabled: scanOpts.skipThirdPartyJs
        })
        .catch(function () {});
      chrome.tabs.sendMessage(tab.id, { type: 'REFRESH_SCAN' }).catch(function () {});
    });
  });
}

function saveAll() {
  var directories = $('directories').value
    .split('\n')
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
  var blacklist_domains = $('blacklist').value
    .split('\n')
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
  var scanOpts = {
    deepScan: $('deepScan').checked,
    skipThirdPartyJs: $('skipThirdPartyJs').checked,
    dynamicScan: $('dynamicScan').checked
  };

  chrome.storage.local.set(
    {
      directories: directories,
      blacklist_domains: blacklist_domains,
      base_path: $('basePath').value.trim(),
      deepScan: scanOpts.deepScan,
      skip_third_party_js: scanOpts.skipThirdPartyJs,
      dynamicScan: scanOpts.dynamicScan
    },
    function () {
      notifyOpenTabsRescan(scanOpts);
      showToast('设置已保存，已触发已打开页面重新扫描');
    }
  );
}

function bindSettingsUi() {
  var saveBtn = $('saveBtn');
  var resetBtn = $('resetSpringBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveAll);
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      if (!confirm('确定要恢复默认 Spring 路径吗？这将覆盖当前路径列表。')) return;
      $('directories').value = StiffEyesPaths.getDefaultDirectoriesText();
      chrome.storage.local.set(
        { directories: StiffEyesPaths.DEFAULT_SPRING_PATHS.slice() },
        function () {
          showToast('已恢复默认设置');
        }
      );
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    bindSettingsUi();
    load();
  });
} else {
  bindSettingsUi();
  load();
}

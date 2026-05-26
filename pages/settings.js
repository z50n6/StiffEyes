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
    ['directories', 'blacklist_domains', 'base_path', 'deepScan', 'skip_third_party_js'],
    function (data) {
      $('directories').value = data.directories
        ? data.directories.join('\n')
        : StiffEyesPaths.getDefaultDirectoriesText();
      $('blacklist').value = (data.blacklist_domains || []).join('\n');
      $('basePath').value = data.base_path || '';
      $('deepScan').checked = data.deepScan !== false;
      $('skipThirdPartyJs').checked = data.skip_third_party_js !== false;
    }
  );
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

  chrome.storage.local.set(
    {
      directories: directories,
      blacklist_domains: blacklist_domains,
      base_path: $('basePath').value.trim(),
      deepScan: $('deepScan').checked,
      skip_third_party_js: $('skipThirdPartyJs').checked
    },
    function () {
      showToast('设置已保存');
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

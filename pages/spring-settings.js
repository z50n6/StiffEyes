(function () {
  var directoriesEl = document.getElementById('directories');

  function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'spring-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('spring-toast-hide');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2000);
  }

  document.getElementById('saveBtn').addEventListener('click', function () {
    var directories = directoriesEl.value
      .split('\n')
      .map(function (s) {
        return s.trim();
      })
      .filter(function (s) {
        return s.length > 0;
      });
    chrome.storage.local.set({ directories: directories }, function () {
      showToast('设置已保存');
    });
  });

  document.getElementById('resetBtn').addEventListener('click', function () {
    if (!confirm('确定要恢复默认设置吗？这将覆盖当前的设置。')) return;
    directoriesEl.value = StiffEyesPaths.getDefaultDirectoriesText();
    chrome.storage.local.remove('directories', function () {
      showToast('已恢复默认设置');
    });
  });

  chrome.storage.local.get(['directories'], function (data) {
    if (data.directories && data.directories.length) {
      directoriesEl.value = data.directories.join('\n');
    } else {
      directoriesEl.value = StiffEyesPaths.getDefaultDirectoriesText();
      chrome.storage.local.set({
        directories: StiffEyesPaths.DEFAULT_SPRING_PATHS.slice()
      });
    }
  });
})();

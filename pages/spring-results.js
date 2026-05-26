(function () {
  var resultsEl = document.getElementById('results');

  function renderResults(text) {
    if (!text || !text.trim()) {
      resultsEl.textContent = '暂无扫描结果（仅记录 HTTP 2xx/3xx 响应）';
      return;
    }

    var resultItems = text.split('\n').filter(function (item) {
      return item.trim() !== '';
    });

    resultItems = resultItems.map(function (item) {
      var urlMatch = item.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        var url = urlMatch[0];
        return item.replace(
          url,
          '<a href="' + url + '" target="_blank" rel="noopener">' + url + '</a>'
        );
      }
      return item;
    });

    resultItems.sort(function (a, b) {
      var aStatus = a.match(/\[(\d+)\]/) ? a.match(/\[(\d+)\]/)[1] : null;
      var bStatus = b.match(/\[(\d+)\]/) ? b.match(/\[(\d+)\]/)[1] : null;
      if (aStatus === '200') return -1;
      if (bStatus === '200') return 1;
      return 0;
    });

    resultsEl.innerHTML = '';
    resultItems.forEach(function (item) {
      var div = document.createElement('div');
      div.className = 'spring-result-item';

      var statusMatch = item.match(/\[(\d+)\]/);
      var statusBadge = '';

      if (statusMatch) {
        var statusCode = parseInt(statusMatch[1], 10);
        var statusClass =
          statusCode >= 200 && statusCode < 300
            ? 'status-2xx'
            : statusCode >= 300 && statusCode < 400
              ? 'status-3xx'
              : 'status-other';
        statusBadge =
          '<span class="status-badge ' + statusClass + '">' + statusCode + '</span>';
      }

      div.innerHTML = statusBadge + item;
      resultsEl.appendChild(div);
    });
  }

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var tab = tabs[0];
    if (!tab || !tab.id) {
      resultsEl.textContent = '无法获取当前标签页';
      return;
    }
    chrome.runtime.sendMessage(
      { type: 'GET_SCAN_RESULTS', tabId: tab.id },
      function (res) {
        if (chrome.runtime.lastError) {
          resultsEl.textContent = '读取结果失败';
          return;
        }
        renderResults(res && res.springResults);
      }
    );
  });
})();

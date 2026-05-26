(function () {
  var resultsEl = document.getElementById('results');

  chrome.storage.local.get(['scanResults'], function (data) {
    if (!data.scanResults) {
      resultsEl.textContent = '暂无扫描结果';
      return;
    }

    var resultItems = data.scanResults.split('\n').filter(function (item) {
      return item.trim() !== '';
    });

    resultItems = resultItems.map(function (item) {
      var urlMatch = item.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        var url = urlMatch[0];
        return item.replace(url, '<a href="' + url + '" target="_blank" rel="noopener">' + url + '</a>');
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

    resultItems.forEach(function (item) {
      var div = document.createElement('div');
      div.className = 'spring-result-item';

      var statusMatch = item.match(/\[(\d+)\]/);
      var errorMatch = item.match(/\[Error\]/);
      var statusBadge = '';

      if (statusMatch) {
        var statusCode = parseInt(statusMatch[1], 10);
        var badgeClass = 'status-other';
        if (statusCode >= 200 && statusCode < 300) badgeClass = 'status-2xx';
        else if (statusCode >= 300 && statusCode < 400) badgeClass = 'status-3xx';
        else if (statusCode >= 400 && statusCode < 500) badgeClass = 'status-4xx';
        else if (statusCode >= 500) badgeClass = 'status-5xx';
        statusBadge =
          '<span class="status-badge ' + badgeClass + '">' + statusCode + '</span>';
      } else if (errorMatch) {
        statusBadge = '<span class="status-badge status-error">Error</span>';
      }

      div.innerHTML = statusBadge + item;
      resultsEl.appendChild(div);
    });
  });
})();

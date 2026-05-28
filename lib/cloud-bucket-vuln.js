// 云存储桶主动漏洞扫描引擎 (移植自 BucketTool)
var StiffEyesCloudBucketVuln = (function () {
  var TEST_BODY = 'StiffEyes security test - safe to delete';
  var TIMEOUT_MS = 8000;

  function makeTestFile() {
    return 'stiffeyes-test-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.txt';
  }

  function removeAllParameters(url) {
    try {
      var u = new URL(url);
      u.search = '';
      return u.toString();
    } catch (e) {
      return url;
    }
  }

  function timedFetch(fetchFn, url, options, signal, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        settled = true;
        reject(new Error('timeout'));
      }, timeoutMs || TIMEOUT_MS);

      fetchFn(url, options, signal).then(function (r) {
        if (settled) return;
        clearTimeout(timer);
        resolve(r);
      }).catch(function (e) {
        if (settled) return;
        clearTimeout(timer);
        reject(e);
      });
    });
  }

  function parseXmlText(text) {
    if (!text) return null;
    try {
      var parser = new DOMParser();
      var doc = parser.parseFromString(text, 'text/xml');
      if (doc.querySelector('parsererror')) return null;
      return doc;
    } catch (e) {
      return null;
    }
  }

  function getXmlElement(doc, tag) {
    var el = doc.querySelector(tag);
    return el ? el.textContent.trim() : null;
  }

  function classifyResult(check, vulnerable, status) {
    if (!vulnerable) return 'info';
    if (check === 'Bucket Takeover') return 'critical';
    if (check === 'ACL Write' || check === 'Policy Write') return 'critical';
    if (check === 'ListBucket' || check === 'ACL Read' || check === 'PUT Upload') return 'high';
    if (check === 'DELETE File') return 'medium';
    return 'info';
  }

  // ---- AWS S3 ----
  async function scanAws(baseUrl, fetchFn, signal) {
    var results = [];
    var listUrl = removeAllParameters(baseUrl);
    var testFile = makeTestFile();
    var testUrl = listUrl + '/' + testFile;
    var aclUrl = listUrl + '?acl';

    // 1. ListBucket
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, listUrl + '?list-type=2', { method: 'GET' }, signal);
      var text = await r.text();
      if (r.ok && text.includes('<ListBucketResult') && text.includes('<Name>')) {
        results.push({
          check: 'ListBucket', severity: 'high', vulnerable: true,
          method: 'GET', url: listUrl + '?list-type=2', status: r.status,
          description: '存储桶允许公开列出对象 (list-type=2)'
        });
      } else {
        results.push({ check: 'ListBucket', severity: 'info', vulnerable: false, method: 'GET', url: listUrl + '?list-type=2', status: r.status, description: '不允许列出对象' });
      }
    } catch (e) {
      results.push({ check: 'ListBucket', severity: 'info', vulnerable: false, method: 'GET', url: listUrl + '?list-type=2', status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    // 2. PUT Upload
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, testUrl, { method: 'PUT', body: TEST_BODY }, signal);
      if (r.ok) {
        results.push({
          check: 'PUT Upload', severity: 'high', vulnerable: true,
          method: 'PUT', url: testUrl, status: r.status,
          description: '允许匿名上传文件'
        });
      } else {
        results.push({ check: 'PUT Upload', severity: 'info', vulnerable: false, method: 'PUT', url: testUrl, status: r.status, description: '不允许上传文件' });
      }
    } catch (e) {
      results.push({ check: 'PUT Upload', severity: 'info', vulnerable: false, method: 'PUT', url: testUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    // 3. DELETE File
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, testUrl, { method: 'DELETE' }, signal);
      if (r.ok) {
        results.push({
          check: 'DELETE File', severity: 'medium', vulnerable: true,
          method: 'DELETE', url: testUrl, status: r.status,
          description: '允许匿名删除文件'
        });
      } else {
        results.push({ check: 'DELETE File', severity: 'info', vulnerable: false, method: 'DELETE', url: testUrl, status: r.status, description: '不允许删除文件' });
      }
    } catch (e) {
      results.push({ check: 'DELETE File', severity: 'info', vulnerable: false, method: 'DELETE', url: testUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    // 4. ACL Read
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, aclUrl, { method: 'GET' }, signal);
      var text = await r.text();
      if (r.ok && text.includes('<AccessControlPolicy>')) {
        results.push({
          check: 'ACL Read', severity: 'high', vulnerable: true,
          method: 'GET', url: aclUrl, status: r.status,
          description: 'ACL 策略可公开读取'
        });
      } else {
        results.push({ check: 'ACL Read', severity: 'info', vulnerable: false, method: 'GET', url: aclUrl, status: r.status, description: 'ACL 不可读取' });
      }
    } catch (e) {
      results.push({ check: 'ACL Read', severity: 'info', vulnerable: false, method: 'GET', url: aclUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    // 5. ACL Write
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, aclUrl, { method: 'PUT', headers: { 'x-amz-acl': 'public-read-write' } }, signal);
      if (r.ok) {
        results.push({
          check: 'ACL Write', severity: 'critical', vulnerable: true,
          method: 'PUT', url: aclUrl, status: r.status,
          description: 'ACL 策略可被覆写为 public-read-write'
        });
      } else {
        results.push({ check: 'ACL Write', severity: 'info', vulnerable: false, method: 'PUT', url: aclUrl, status: r.status, description: 'ACL 不可写入' });
      }
    } catch (e) {
      results.push({ check: 'ACL Write', severity: 'info', vulnerable: false, method: 'PUT', url: aclUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    // 6. Bucket Takeover
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, listUrl, { method: 'GET' }, signal);
      var text = await r.text();
      if (text && text.includes('<Code>NoSuchBucket</Code>')) {
        results.push({
          check: 'Bucket Takeover', severity: 'critical', vulnerable: true,
          method: 'GET', url: listUrl, status: r.status,
          description: '桶不存在 (NoSuchBucket)，存在桶接管风险'
        });
      } else {
        results.push({ check: 'Bucket Takeover', severity: 'info', vulnerable: false, method: 'GET', url: listUrl, status: r.status, description: '桶存在或状态未知' });
      }
    } catch (e) {
      results.push({ check: 'Bucket Takeover', severity: 'info', vulnerable: false, method: 'GET', url: listUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    return results;
  }

  // ---- Alibaba Cloud OSS ----
  async function scanAliyun(baseUrl, fetchFn, signal) {
    var results = [];
    var listUrl = removeAllParameters(baseUrl);
    var testFile = makeTestFile();
    var testUrl = listUrl + '/' + testFile;
    var aclUrl = listUrl + '?acl';
    var policyUrl = listUrl + '/?policy';

    // 1. ListBucket
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, listUrl, { method: 'GET' }, signal);
      var text = await r.text();
      if (r.ok && text.includes('<ListBucketResult>') && text.includes('<Name>')) {
        results.push({
          check: 'ListBucket', severity: 'high', vulnerable: true,
          method: 'GET', url: listUrl, status: r.status,
          description: '存储桶允许公开列出对象'
        });
      } else {
        results.push({ check: 'ListBucket', severity: 'info', vulnerable: false, method: 'GET', url: listUrl, status: r.status, description: '不允许列出对象' });
      }
    } catch (e) {
      results.push({ check: 'ListBucket', severity: 'info', vulnerable: false, method: 'GET', url: listUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    // 2. PUT Upload
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, testUrl, { method: 'PUT', body: TEST_BODY }, signal);
      if (r.ok) {
        results.push({
          check: 'PUT Upload', severity: 'high', vulnerable: true,
          method: 'PUT', url: testUrl, status: r.status,
          description: '允许匿名上传文件'
        });
      } else {
        results.push({ check: 'PUT Upload', severity: 'info', vulnerable: false, method: 'PUT', url: testUrl, status: r.status, description: '不允许上传文件' });
      }
    } catch (e) {
      results.push({ check: 'PUT Upload', severity: 'info', vulnerable: false, method: 'PUT', url: testUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    // 3. ACL Read
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, aclUrl, { method: 'GET' }, signal);
      if (r.ok) {
        results.push({
          check: 'ACL Read', severity: 'high', vulnerable: true,
          method: 'GET', url: aclUrl, status: r.status,
          description: 'ACL 策略可公开读取'
        });
      } else {
        results.push({ check: 'ACL Read', severity: 'info', vulnerable: false, method: 'GET', url: aclUrl, status: r.status, description: 'ACL 不可读取' });
      }
    } catch (e) {
      results.push({ check: 'ACL Read', severity: 'info', vulnerable: false, method: 'GET', url: aclUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    // 4. ACL Write
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, aclUrl, { method: 'PUT', headers: { 'x-oss-object-acl': 'default' } }, signal);
      if (r.ok) {
        results.push({
          check: 'ACL Write', severity: 'critical', vulnerable: true,
          method: 'PUT', url: aclUrl, status: r.status,
          description: 'ACL 策略可被覆写'
        });
      } else {
        results.push({ check: 'ACL Write', severity: 'info', vulnerable: false, method: 'PUT', url: aclUrl, status: r.status, description: 'ACL 不可写入' });
      }
    } catch (e) {
      results.push({ check: 'ACL Write', severity: 'info', vulnerable: false, method: 'PUT', url: aclUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    // 5. Policy Write
    try {
      if (signal.aborted) return results;
      var policyBody = JSON.stringify({
        Version: '1',
        Statement: [{
          Action: ['oss:PutObject', 'oss:GetObject'],
          Effect: 'Allow',
          Principal: ['1234567890'],
          Resource: ['acs:oss:*:*/*']
        }]
      });
      var r = await timedFetch(fetchFn, policyUrl, { method: 'PUT', body: policyBody }, signal);
      if (r.ok) {
        results.push({
          check: 'Policy Write', severity: 'critical', vulnerable: true,
          method: 'PUT', url: policyUrl, status: r.status,
          description: 'Bucket Policy 可被覆写，攻击者可获取完全访问权限'
        });
      } else {
        results.push({ check: 'Policy Write', severity: 'info', vulnerable: false, method: 'PUT', url: policyUrl, status: r.status, description: 'Policy 不可写入' });
      }
    } catch (e) {
      results.push({ check: 'Policy Write', severity: 'info', vulnerable: false, method: 'PUT', url: policyUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    // 6. Bucket Takeover
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, listUrl, { method: 'GET' }, signal);
      var text = await r.text();
      if (text && text.includes('<Code>NoSuchBucket</Code>')) {
        results.push({
          check: 'Bucket Takeover', severity: 'critical', vulnerable: true,
          method: 'GET', url: listUrl, status: r.status,
          description: '桶不存在 (NoSuchBucket)，存在桶接管风险'
        });
      } else {
        results.push({ check: 'Bucket Takeover', severity: 'info', vulnerable: false, method: 'GET', url: listUrl, status: r.status, description: '桶存在或状态未知' });
      }
    } catch (e) {
      results.push({ check: 'Bucket Takeover', severity: 'info', vulnerable: false, method: 'GET', url: listUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    return results;
  }

  // ---- Tencent Cloud COS ----
  async function scanTencent(baseUrl, fetchFn, signal) {
    var results = [];
    var listUrl = removeAllParameters(baseUrl);
    var testFile = makeTestFile();
    var testUrl = listUrl + '/' + testFile;
    var aclUrl = listUrl + '/?acl';

    var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    // 1. ACL Write
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, aclUrl, {
        method: 'PUT',
        headers: { 'x-cos-acl': 'public-read-write', 'User-Agent': UA }
      }, signal);
      if (r.ok) {
        results.push({
          check: 'ACL Write', severity: 'critical', vulnerable: true,
          method: 'PUT', url: aclUrl, status: r.status,
          description: 'ACL 策略可被覆写为 public-read-write'
        });
      } else {
        results.push({ check: 'ACL Write', severity: 'info', vulnerable: false, method: 'PUT', url: aclUrl, status: r.status, description: 'ACL 不可写入' });
      }
    } catch (e) {
      results.push({ check: 'ACL Write', severity: 'info', vulnerable: false, method: 'PUT', url: aclUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    // 2. ACL Read
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, aclUrl, {
        method: 'GET',
        headers: { 'User-Agent': UA }
      }, signal);
      var text = await r.text();
      if (text.includes('<Permission>')) {
        results.push({
          check: 'ACL Read', severity: 'high', vulnerable: true,
          method: 'GET', url: aclUrl, status: r.status,
          description: 'ACL 策略可公开读取'
        });
      } else {
        results.push({ check: 'ACL Read', severity: 'info', vulnerable: false, method: 'GET', url: aclUrl, status: r.status, description: 'ACL 不可读取' });
      }
    } catch (e) {
      results.push({ check: 'ACL Read', severity: 'info', vulnerable: false, method: 'GET', url: aclUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    // 3. ListBucket
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, listUrl, {
        method: 'GET',
        headers: { 'User-Agent': UA }
      }, signal);
      var text = await r.text();
      if (r.ok && text.includes('<ListBucketResult>') && text.includes('<Name>')) {
        results.push({
          check: 'ListBucket', severity: 'high', vulnerable: true,
          method: 'GET', url: listUrl, status: r.status,
          description: '存储桶允许公开列出对象'
        });
      } else {
        results.push({ check: 'ListBucket', severity: 'info', vulnerable: false, method: 'GET', url: listUrl, status: r.status, description: '不允许列出对象' });
      }
    } catch (e) {
      results.push({ check: 'ListBucket', severity: 'info', vulnerable: false, method: 'GET', url: listUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    // 4. PUT Upload
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, testUrl, {
        method: 'PUT',
        headers: { 'User-Agent': UA },
        body: TEST_BODY
      }, signal);
      if (r.ok) {
        results.push({
          check: 'PUT Upload', severity: 'high', vulnerable: true,
          method: 'PUT', url: testUrl, status: r.status,
          description: '允许匿名上传文件'
        });
      } else {
        results.push({ check: 'PUT Upload', severity: 'info', vulnerable: false, method: 'PUT', url: testUrl, status: r.status, description: '不允许上传文件' });
      }
    } catch (e) {
      results.push({ check: 'PUT Upload', severity: 'info', vulnerable: false, method: 'PUT', url: testUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    return results;
  }

  // ---- Huawei Cloud OBS ----
  async function scanHuawei(baseUrl, fetchFn, signal) {
    var results = [];
    var listUrl = removeAllParameters(baseUrl);
    var testFile = makeTestFile();
    var testUrl = listUrl + '/' + testFile;
    var aclUrl = listUrl + '/?acl';

    // 1. PUT Upload
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, testUrl, { method: 'PUT', body: TEST_BODY }, signal);
      if (r.ok) {
        results.push({
          check: 'PUT Upload', severity: 'high', vulnerable: true,
          method: 'PUT', url: testUrl, status: r.status,
          description: '允许匿名上传文件'
        });
      } else {
        results.push({ check: 'PUT Upload', severity: 'info', vulnerable: false, method: 'PUT', url: testUrl, status: r.status, description: '不允许上传文件' });
      }
    } catch (e) {
      results.push({ check: 'PUT Upload', severity: 'info', vulnerable: false, method: 'PUT', url: testUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    // 2. ListBucket
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, listUrl, { method: 'GET' }, signal);
      var text = await r.text();
      if (r.ok && text.includes('<Name>') && text.includes('<Contents>')) {
        results.push({
          check: 'ListBucket', severity: 'high', vulnerable: true,
          method: 'GET', url: listUrl, status: r.status,
          description: '存储桶允许公开列出对象'
        });
      } else {
        results.push({ check: 'ListBucket', severity: 'info', vulnerable: false, method: 'GET', url: listUrl, status: r.status, description: '不允许列出对象' });
      }
    } catch (e) {
      results.push({ check: 'ListBucket', severity: 'info', vulnerable: false, method: 'GET', url: listUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    // 3. ACL Read
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, aclUrl, { method: 'GET' }, signal);
      var text = await r.text();
      if (r.ok && text.includes('<Owner>') && text.includes('<AccessControlList>')) {
        results.push({
          check: 'ACL Read', severity: 'high', vulnerable: true,
          method: 'GET', url: aclUrl, status: r.status,
          description: 'ACL 策略可公开读取'
        });
      } else {
        results.push({ check: 'ACL Read', severity: 'info', vulnerable: false, method: 'GET', url: aclUrl, status: r.status, description: 'ACL 不可读取' });
      }
    } catch (e) {
      results.push({ check: 'ACL Read', severity: 'info', vulnerable: false, method: 'GET', url: aclUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    // 4. ACL Write
    try {
      if (signal.aborted) return results;
      var r = await timedFetch(fetchFn, aclUrl, { method: 'PUT', headers: { 'x-obs-acl': 'public-read-write-delivered' } }, signal);
      if (r.ok) {
        results.push({
          check: 'ACL Write', severity: 'critical', vulnerable: true,
          method: 'PUT', url: aclUrl, status: r.status,
          description: 'ACL 策略可被覆写为 public-read-write-delivered'
        });
      } else {
        results.push({ check: 'ACL Write', severity: 'info', vulnerable: false, method: 'PUT', url: aclUrl, status: r.status, description: 'ACL 不可写入' });
      }
    } catch (e) {
      results.push({ check: 'ACL Write', severity: 'info', vulnerable: false, method: 'PUT', url: aclUrl, status: 0, description: '请求失败: ' + (e.message || 'unknown') });
    }

    return results;
  }

  // ---- Dispatcher ----
  function scanBucket(baseUrl, vendor, fetchFn, signal) {
    switch (vendor) {
      case 'AWS':     return scanAws(baseUrl, fetchFn, signal);
      case 'Alibaba': return scanAliyun(baseUrl, fetchFn, signal);
      case 'Tencent': return scanTencent(baseUrl, fetchFn, signal);
      case 'Huawei':  return scanHuawei(baseUrl, fetchFn, signal);
      default:
        return Promise.resolve([{ check: 'Unknown Vendor', severity: 'info', vulnerable: false, method: '', url: baseUrl, status: 0, description: '不支持的厂商: ' + vendor }]);
    }
  }

  function summarizeScanResults(results) {
    var summary = { total: results.length, critical: 0, high: 0, medium: 0, info: 0 };
    results.forEach(function (r) {
      if (r.severity === 'critical') summary.critical++;
      else if (r.severity === 'high') summary.high++;
      else if (r.severity === 'medium') summary.medium++;
      else summary.info++;
    });
    return summary;
  }

  return {
    scanBucket: scanBucket,
    summarizeScanResults: summarizeScanResults,
    vendors: ['AWS', 'Alibaba', 'Tencent', 'Huawei']
  };
})();

if (typeof self !== 'undefined') {
  self.StiffEyesCloudBucketVuln = StiffEyesCloudBucketVuln;
}

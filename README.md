# 绷着脸 · StiffEyes

<p align="center">
  <img src="icons/icon128.png" width="80" height="80" alt="绷着脸 StiffEyes" />
</p>

<p align="center">
  <strong>不苟言笑，认真看站</strong>
</p>

<p align="center">
  Chrome 扩展 — 页面资产梳理 · 技术指纹识别 · Spring 端点探测 · Webpack 映射分析 · 云存储 Bucket 发现与漏洞检测<br/>
  <strong>仅限授权安全测试与开发自检</strong>
</p>

---

## 功能

### 信息收集
打开页面自动采集，覆盖 20+ 类别：

`域名` `API 绝对路径` `API 相对路径` `模块路径` `文档` `账密` `Cookie` `密钥` `手机号` `邮箱` `身份证` `IP` `公司名` `JWT` `图片` `GitHub` `Vue/JS` `URL` `AJAX 路由` `输入框`

深度模式自动拉取外链 JS，递归提取接口与路径。支持**域名黑名单**、**三方 JS 过滤**、**动态重扫**、**全局搜索**，扫描结果一键复制 / 复制 URL。

### 指纹
响应头与页面 DOM 双重检测，识别技术栈组件：服务器、Web 框架、CDN、分析统计、前端 UI 库、安全产品等。命中项按类型着色。

### Spring 探测
按路径字典并发探测 Actuator、Swagger、Druid 等端点。内置默认字典，可在设置中自定义路径。支持中止扫描，结果按状态码着色排序，200 优先置顶。

### Webpack
- **Source Map 提取** — 从页面 JS 中自动识别并拉取 `.map` 文件
- **一键分析 / 复制 / 下载** — 解析模块列表后批量导出
- **JS 分包下载** — 填写入口 JS 与 chunk 基础路径，自动解析并逐个下载
- **规则管理** — 导入/导出/重置自定义匹配规则

### 云存储
**被动发现** — 浏览时自动从网络流量中检出云存储 Bucket：
- 响应头特征：`x-amz-request-id` `x-oss-request-id` `x-cos-request-id` `x-obs-request-id`
- 域名匹配：`s3.amazonaws.com` `oss.aliyuncs.com` `cos.myqcloud.com` `obs.myhuaweicloud.com`

**主动扫描** — 对发现的桶执行漏洞检测，覆盖 4 家云厂商：

| 厂商 | 检测项 |
|------|--------|
| AWS S3 | ListBucket · PUT 上传 · DELETE 删除 · ACL 读写 · 桶接管 |
| 阿里云 OSS | ListBucket · PUT 上传 · ACL 读写 · Policy 写入 · 桶接管 |
| 腾讯云 COS | ListBucket · PUT 上传 · ACL 读写 |
| 华为云 OBS | ListBucket · PUT 上传 · ACL 读写 |

结果按严重程度着色：`严重`（桶接管/公开写）`高危`（遍历/ACL 读/PUT）`中危`（DELETE 允许）。

---

## 安装

**环境要求**：Chrome 88+（Manifest V3）

```
git clone https://github.com/z50n6/stiffeyes.git
```

1. 打开 `chrome://extensions/`
2. 开启 **开发者模式**
3. 点击 **加载已解压的扩展程序** → 选择项目目录

无需编译，开箱即用。

---

## 项目结构

```
StiffEyes/
├── manifest.json               # 扩展清单（MV3）
├── background.js               # Service Worker
├── lib/
│   ├── scan-config.js          # 扫描规则配置
│   ├── scan-filter.js          # 匹配过滤器
│   ├── scan-engine.js          # 内容脚本扫描引擎
│   ├── patterns.js             # 侧栏分类与统计
│   ├── logger.js               # 调试日志
│   ├── fingerprint-rules.js    # 技术指纹规则
│   ├── spring-paths.js         # Spring 端点字典
│   ├── cloud-bucket-rules.js   # 云存储被动发现规则
│   ├── cloud-bucket-vuln.js    # 云存储主动漏洞扫描
│   ├── webpack-scan-rules.js   # Webpack 匹配规则
│   └── webpack-core.js         # Webpack 核心逻辑
├── content/
│   └── webpack-collector.js    # Webpack 内容脚本
├── popup/                      # 弹窗 UI（popup.html/css/js）
├── pages/
│   ├── settings.html           # 总设置
│   └── spring-results.html     # Spring 结果页
└── icons/                      # 图标资源
```

---

## 免责声明

本工具仅供**已获授权**的安全测试、渗透测试与开发调试使用。禁止用于未授权系统或任何违法用途。

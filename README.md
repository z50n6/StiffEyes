<p align="center">
  <img src="icons/icon128.png" width="80" height="80" alt="StiffEyes" />
</p>
<h1 align="center">绷着脸 · StiffEyes</h1>
<p align="center"><strong>不苟言笑，认真看站</strong></p>
<p align="center">
  Chrome 扩展 — 页面资产梳理 · 技术指纹识别 · Spring 端点探测 · Webpack 映射 · 云存储检测 · Payload 字典 · 工具箱<br/>
  <strong>⚠️ 使用声明：本工具仅供已获合法授权的安全测试、渗透测试与开发自检使用。<br/>使用者须确保在拥有明确书面授权的系统上操作，任何未经授权的测试行为均与本项目无关，后果由使用者自行承担。</strong>
</p>

---

## 功能

### 信息收集

打开页面自动采集，覆盖 20+ 类别，紧凑 chip 侧栏一屏尽览：

`域名` `API绝对路径` `API相对路径` `模块路径` `文档` `账密` `Cookie` `ID密钥` `云Key` `手机号` `邮箱` `身份证` `IP` `公司` `JWT` `音图` `GitHub` `Vue` `JS` `URL` `JS泄露`

深度模式自动拉取外链 JS，递归提取接口与路径。支持**域名黑名单**、**三方 JS 过滤**、**动态重扫**，扫描结果一键复制 / 复制 URL。

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

| 厂商      | 检测项                                            |
| ------- | ---------------------------------------------- |
| AWS S3  | ListBucket · PUT 上传 · DELETE 删除 · ACL 读写 · 桶接管 |
| 阿里云 OSS | ListBucket · PUT 上传 · ACL 读写 · Policy 写入 · 桶接管 |
| 腾讯云 COS | ListBucket · PUT 上传 · ACL 读写                   |
| 华为云 OBS | ListBucket · PUT 上传 · ACL 读写                   |

结果按严重程度着色：`严重`（桶接管/公开写）`高危`（遍历/ACL 读/PUT）`中危`（DELETE 允许）。

### Payload

内置实战攻击链场景，覆盖 13 个类别 50+ 场景，每个场景拆分为可复制的分步命令：

| 类别       | 覆盖范围                                                             |
| -------- | ---------------------------------------------------------------- |
| SQL 注入   | MySQL / PostgreSQL / MSSQL / Oracle — UNION、盲注、堆叠、认证绕过、文件读写      |
| XSS      | 反射、DOM、绕过、Cookie 窃取、BeEF 钩子、键盘记录、Polyglot/mXSS                   |
| SSTI     | Jinja2、FreeMarker、Twig、Smarty、ERB、Spring/Thymeleaf、Pug/Jade、Mako |
| SSRF     | AWS/GCP/Azure 云元数据、Redis 内网利用、DNS 重绑定、IP 绕过                      |
| XXE      | 经典文件读取、OOB 外带、XInclude、报错型泄露、CDATA 包装                            |
| FastJson | 检测/版本探测、JNDI 注入、AutoType 绕过、BCEL 字节码、TemplatesImpl               |
| 其他       | 命令注入、LFI、路径遍历、JWT、文件上传、反序列化、Log4j、Clickjacking                   |

支持**按分类/子分类筛选**、**关键词搜索**、**编码变换**（URL/Base64/Hex/Unicode/大小写混淆等 12 种），一键复制 payload。

###  工具箱

| 工具 | 功能 |
|------|------|
| 🎭 **UA 头伪装** | 内置 68+ 浏览器 UA 预设，浏览器+平台双维度筛选，支持自定义 UA。DNR 规则全局生效，右键菜单快捷切换 |
| 🍪 **Cookie 管理器** | 查看、搜索、编辑、新建、删除当前站点 Cookie。完整属性编辑，JSON 导入导出 |
| 🧹 **清除数据** | 一键清除 10 种浏览数据，支持当前站点/全局范围，5 档时间范围，清除后可选自动重载 |
| 🔤 **编码切换** | 自动检测页面编码，24 种编码实时切换。DNR 规则覆盖主文档/子框架/脚本/样式表，右键菜单切换 |
| 📋 **批量网址** | 批量打开 URL（自动去重后台分组）；提取标签页列表，复制或导出 TXT |

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
│   ├── patterns.js             # 分类定义与统计
│   ├── logger.js               # 调试日志
│   ├── fingerprint-core.js     # 技术指纹检测
│   ├── fingerprint-rules.js    # 指纹规则库
│   ├── sniff-rules-core.js     # 嗅探规则核心
│   ├── sniff-rules-webtech.js  # Web 技术指纹数据库
│   ├── sniff-engine.js         # HTTP 响应头嗅探引擎
│   ├── sniff-signals.js        # 指纹信号处理
│   ├── sniff-probes.js         # 主动探测规则
│   ├── spring-paths.js         # Spring 端点字典
│   ├── cloud-bucket-rules.js   # 云存储被动发现
│   ├── cloud-bucket-vuln.js    # 云存储漏洞扫描
│   ├── webpack-core.js         # Webpack 核心逻辑
│   ├── webpack-scan-rules.js   # Webpack 匹配规则
│   ├── payloads.js             # Payload 字典
│   └── hackbar-payloads.js     # HackBar UA 预设
├── content/
│   ├── webpack-collector.js    # Webpack 源映射提取
│   └── sniff-collector.js      # 技术栈嗅探采集
├── popup/
│   ├── popup.html              # 主弹窗界面
│   ├── popup.css               # 样式表
│   ├── popup.js                # 主控制器
│   ├── tools-panel.js          # 工具箱
│   ├── webpack-panel.js        # Webpack 面板
│   └── jsleak-panel.js         # JS 泄露扫描
├── pages/
│   ├── settings.html           # 设置页面
│   └── spring-results.html     # Spring 结果页
└── icons/                      # 图标资源
```

---

## 免责声明

本工具仅供**已获授权**的安全测试、渗透测试与开发调试使用。禁止用于未授权系统或任何违法用途。

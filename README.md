# 绷着脸 · StiffEyes

<p align="center">
  <img src="icons/icon128.png" width="64" height="64" alt="绷着脸 StiffEyes" />
</p>

<p align="center">
  <strong>不苟言笑，认真看站</strong>
</p>

<p align="center">
  Chrome 扩展：页面资产发现、技术指纹、Spring 端点探测、Webpack Source Map 分析<br />
  <strong>仅限授权安全测试与开发自检</strong>
</p>


---

## 功能模块

| 标签页 | 说明 |
|--------|------|
| **信息收集** | 域名、API（绝对/相对路径）、模块路径、文档、账密、Cookie、密钥、手机、邮箱、身份证、IP、公司、JWT、图片、GitHub、Vue/JS、URL 等 |
| **指纹** | 响应头与页面技术特征识别 |
| **Spring 探测** | 按配置路径并发探测 Actuator / Swagger 等端点 |
| **Webpack** | 打包识别、Source Map 提取 / 分析 / 下载、分包下载 |

打开普通网页后**自动扫描**（深度模式会拉取外链 JS）。可在设置中配置域名黑名单、深度扫描、三方 JS 过滤等。

---

## 安装

### 从 GitHub 克隆

```bash
git clone https://github.com/YOUR_USERNAME/stiffeyes.git
cd stiffeyes
```

### 加载扩展

1. 打开 `chrome://extensions/`
2. 开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择本项目目录（`StiffEyes` 文件夹）

无需编译，解压/克隆后即可使用。

---

## 目录结构

```
StiffEyes/
├── manifest.json          # 扩展清单（MV3）
├── background.js          # 后台：会话、Spring 扫描、JS 代理拉取
├── lib/
│   ├── scan-config.js     # 扫描规则配置
│   ├── scan-filter.js     # 匹配过滤器
│   ├── scan-engine.js     # 内容脚本扫描引擎
│   └── patterns.js        # Popup 分类与工具函数
├── content/               # 内容脚本
├── popup/                 # 弹窗界面
├── pages/                 # 设置页等
└── icons/                 # 图标资源
```

---

## 免责声明

本工具仅供**已获得授权**的安全测试、渗透测试与开发调试使用。请勿用于未授权的系统或任何违法用途。公开发布前请自行添加 LICENSE。

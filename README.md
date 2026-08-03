# sub

基于 [subconverter](https://github.com/tindy2013/subconverter) 的个人代理订阅配置仓库，以单一来源（`sparkle/policy.yml` + `sparkle/rename.js`）维护规则与策略组，自动生成 Clash / Surge / subconverter 三种客户端配置，并通过 GitHub Actions 发布 Docker 镜像与配置产物。

项目来源：https://github.com/tindy2013/subconverter

## 目录结构

```
├── sparkle/                  # 配置源文件（唯一编辑入口）
│   ├── policy.yml            #   策略组、规则、DNS 等 Clash 策略配置
│   ├── rename.js             #   节点重命名规则（renameNode）
│   └── sparkle-override.js   # [生成] Clash (Sparkle) 覆盖配置
├── surge/
│   └── policy.conf           # [生成] Surge 托管配置
├── rule/                     # 规则集（RULE-SET 文本格式）
│   ├── agi.txt               #   AI 服务走代理
│   ├── proxy.txt             #   国外常用服务走代理
│   ├── direct.txt            #   国内 / 学术 / 直连
│   └── onedrive.txt          #   OneDrive 分流
├── script/
│   ├── build-configs.mjs     # 配置生成脚本（node 22 + yaml）
│   └── package.json
├── pref.yml                  # [生成] subconverter 偏好配置
├── emoji.toml                # subconverter 节点 emoji 映射
├── Dockerfile                # subconverter 镜像（内置本仓库配置）
└── .github/workflows/        # CI：生成配置 + 发布 Docker 镜像
```

> `[生成]` 标记的文件由脚本自动生成，请勿手动修改。

## 工作原理

1. 在 `sparkle/policy.yml` 中维护策略组（Global / AGI / Auto / PROXY / OneDrive）、规则集引用与 DNS 配置；
2. 在 `sparkle/rename.js` 中维护节点重命名规则（统一倍率写法、清理名称中的多余字符）；
3. 运行 `script/build-configs.mjs` 生成三个产物：
   - `sparkle/sparkle-override.js` —— Clash 客户端（如 Sparkle）的覆盖配置；
   - `surge/policy.conf` —— Surge 托管配置；
   - `pref.yml` —— subconverter 的偏好设置（含重命名规则与策略组转换）。
4. `rule/*.txt` 为各客户端共享的规则集文件，通过 `raw.zhai.dev` 镜像分发。

### 策略组说明

| 策略组 | 类型 | 说明 |
| --- | --- | --- |
| Global | select | 总开关，可在 DIRECT / Auto 间切换 |
| Auto | fallback | 常用地区节点自动测速切换（日/港/新/美/韩/土） |
| AGI | fallback | AI 服务节点（美/韩/日/新），与 Auto 相互独立 |
| PROXY | select | 手动选择代理节点 |
| OneDrive | select | OneDrive 分流，可选 DIRECT 或 Auto |

## 生成配置

```bash
cd script
npm ci          # 安装依赖
npm run build   # 重新生成 sparkle-override.js / surge/policy.conf / pref.yml
npm run check   # 校验产物是否与源文件一致（CI 中也可使用）
```

## 部署

### Docker（subconverter）

```bash
docker build -t bottomash/subconverter .
docker run -d -p 25500:25500 bottomash/subconverter
```

启动后即可通过 subconverter 接口订阅转换，例如：

```
http://localhost:25500/sub?target=clash&url=<机场订阅地址>&new_name=true
```

GitHub Actions 会在 push 到 `latest` 分支或打 tag 时自动构建并推送镜像到 Docker Hub（`bottomash/subconverter`）。

### Clash

在客户端中导入 `sparkle/sparkle-override.js`（Sparkle）或将 `pref.yml` 交给 subconverter 处理：

```
https://raw.zhai.dev/bottomash/sub/latest/sparkle/sparkle-override.js
```

### Surge

使用托管配置：

```
https://raw.zhai.dev/bottomash/sub/latest/surge/policy.conf
```

## 自动化

- `generate-configs.yml`：push 到 `latest` 分支且源文件变更时，自动重新生成产物并提交；
- `docker.yml`：push 到 `latest` 分支或打 tag 时，构建并推送 Docker 镜像。

## 常用规则集说明

- `rule/agi.txt`：ChatGPT、Gemini、Claude、Perplexity、OpenAI 等 AI 服务；
- `rule/proxy.txt`：Google、GitHub、Telegram、YouTube、Steam 社区等；
- `rule/direct.txt`：国内站点、学术资源（IEEE、CNKI、ScienceDirect）、Steam 商店等直连；
- `rule/onedrive.txt`：OneDrive / SharePoint / Microsoft 个人内容。

## 许可证与致谢

本项目基于 [subconverter](https://github.com/tindy2013/subconverter) 的配置模板衍生，中文文档见 [README-cn](https://github.com/tindy2013/subconverter/blob/master/README-cn.md)。

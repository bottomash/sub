# sub

基于 [subconverter](https://github.com/tindy2013/subconverter) 的个人代理订阅配置与规则仓库。`sparkle/policy.yml` 和 `sparkle/rename.js` 是客户端配置生成源，`rule/*.txt` 是独立维护的规则集；GitHub Actions 根据这些文件生成 Clash/Sparkle 覆盖脚本、Surge 托管配置和 subconverter 偏好配置，并提供 Docker 镜像发布工作流。

项目来源：[tindy2013/subconverter](https://github.com/tindy2013/subconverter)

## 目录结构

```text
├── .github/workflows/
│   ├── generate-configs.yml  # 生成并提交客户端配置
│   └── docker.yml            # 构建并发布 Docker 镜像
├── sparkle/
│   ├── policy.yml            # 配置源：基础配置、策略组、规则提供者和规则顺序
│   ├── rename.js             # 配置源：节点重命名函数
│   └── sparkle-override.js   # [生成] Clash/Sparkle 覆盖脚本
├── surge/
│   └── policy.conf           # [生成] Surge 托管配置
├── rule/                     # 独立维护的 classical 规则集
│   ├── agi.txt               # AI 服务规则
│   ├── proxy.txt             # 代理规则
│   ├── direct.txt            # 直连规则
│   └── onedrive.txt          # OneDrive / SharePoint 规则
├── script/
│   ├── build-configs.mjs     # 配置生成与校验脚本
│   ├── package.json          # Node.js 依赖声明
│   └── package-lock.json
├── pref.yml                  # [生成] subconverter 偏好配置
├── emoji.toml                # subconverter 节点 emoji 映射
└── Dockerfile                # 基于上游 subconverter 的配置镜像
```

`[生成]` 文件由 `script/build-configs.mjs` 生成，请修改源文件后重新生成，不要手动编辑生成产物。

## 工作原理

1. 在 `sparkle/policy.yml` 中维护 Clash/Mihomo 基础配置、DNS、策略组、规则提供者和规则顺序。规则提供者指向本仓库的 `rule/*.txt` 文件。
2. 在 `sparkle/rename.js` 的 `renameNode` 函数中维护节点名称替换规则。生成脚本会解析其中的 `replace` 规则，将它们写入各客户端产物；不会直接执行该文件。
3. 运行 `script/build-configs.mjs`，生成：
   - `sparkle/sparkle-override.js`：包含节点重命名和策略配置的 Clash/Sparkle 覆盖脚本。它会清理输入配置中的旧策略组、规则提供者和规则，再合并本仓库策略。
   - `surge/policy.conf`：将策略组、规则提供者和规则转换为 Surge 格式的托管配置。名称为 `Global`（不区分大小写）的策略组不会写入 Surge 产物，并额外加入 `DOMAIN-SUFFIX,ad.12306.cn,REJECT`。
   - `pref.yml`：subconverter 的偏好配置，包含重命名规则、规则集映射、自定义策略组、`/clash` 别名以及关闭缓存的设置。
4. `rule/*.txt` 独立维护，每行是一条 classical 规则；Sparkle、Surge 和 subconverter 通过 `sparkle/policy.yml` 中的规则提供者或生成后的 URL 共同使用这些规则。

### 策略组

| 策略组 | 类型 | 实际行为 |
| --- | --- | --- |
| `AGI` | fallback | 从美国、韩国、日本、新加坡节点中自动选择，排除倍率节点、家宽、星链、住宅和游戏节点 |
| `Auto` | fallback | 优先使用 `PROXY`，再从日本、香港、新加坡、韩国、土耳其节点中自动选择 |
| `PROXY` | select | 手动选择日本、香港、新加坡、韩国、土耳其节点，排除台湾及特定节点 |
| `OneDrive` | select | 在 `DIRECT` 和 `Auto` 之间选择，用于 OneDrive 分流 |
| `GLOBAL` | select | 在 `DIRECT` 和 `Auto` 之间选择；保留在 Clash/Sparkle 和 subconverter 配置中，Surge 产物按生成规则跳过 |

当前规则顺序为：AI → OneDrive → 直连规则 → 代理规则 → 局域网/中国大陆直连 → 其余流量使用 `Auto`。

## 本地生成与校验

```bash
cd script
npm ci
node build-configs.mjs          # 生成三个客户端产物
node build-configs.mjs --check  # 校验产物是否与源文件一致
```

CI 使用 Node.js 22；本地也建议使用 Node.js 22。项目没有 `npm run build` 或 `npm run check`，生成和校验均通过 Node.js 直接调用脚本完成。`--check` 以退出码 0 表示三个生成文件均与当前源文件一致。

## 使用方式

### Docker（subconverter）

`Dockerfile` 基于 `metacubex/subconverter:latest`，将整个仓库复制到上游镜像约定的 `/base/` 目录，不包含独立的转换服务实现。

```bash
docker build -t bottomash/subconverter .
docker run -d --name subconverter -p 25500:25500 bottomash/subconverter
```

启动后可通过 subconverter 接口转换订阅：

```text
http://localhost:25500/sub?target=clash&url=<机场订阅地址>&new_name=true
```

镜像发布地址为 Docker Hub 的 `bottomash/subconverter`。GitHub Actions 需要仓库 Secrets 中的 `DOCKER_USERNAME` 和 `DOCKER_PASSWORD` 才能登录并推送镜像；当前 Docker 工作流已暂停自动触发，仅支持手动运行。

### Clash / Sparkle

Sparkle 等支持 JavaScript 覆盖配置的客户端可直接使用生成文件：

```text
https://raw.zhai.dev/bottomash/sub/latest/sparkle/sparkle-override.js
```

`pref.yml` 是 subconverter 的配置文件，不是 Clash 客户端直接导入的配置；使用本仓库构建的 Docker 镜像时，它会随仓库文件一起放入 `/base/`。

### Surge

将以下地址作为 Surge 托管配置：

```text
https://raw.zhai.dev/bottomash/sub/latest/surge/policy.conf
```

## 自动化

- `generate-configs.yml`：在 `latest` 分支上，当 `sparkle/policy.yml`、`sparkle/rename.js`、生成脚本、Node.js 依赖文件或该工作流变化时运行，也支持手动触发；生成后只提交 `sparkle/sparkle-override.js`、`surge/policy.conf` 和 `pref.yml`。
- `docker.yml`：当前仅支持 `workflow_dispatch` 手动触发，运行后构建并推送 `bottomash/subconverter` Docker Hub 镜像。

## 规则集说明

- `rule/agi.txt`：AI 服务及相关进程、域名规则，例如 ChatGPT、Gemini、Claude、Perplexity、OpenAI 等。
- `rule/proxy.txt`：常用境外服务和平台规则，例如 Google、GitHub、Telegram、YouTube、Steam 社区等。
- `rule/direct.txt`：国内站点、学术资源和部分本地服务规则，例如 IEEE、CNKI、ScienceDirect、Steam 商店等。
- `rule/onedrive.txt`：OneDrive、SharePoint 及 Microsoft 个人内容规则。

## 许可证与致谢

本项目基于 [subconverter](https://github.com/tindy2013/subconverter) 的配置模板衍生，中文文档见 [README-cn](https://github.com/tindy2013/subconverter/blob/master/README-cn.md)。

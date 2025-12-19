# Voice Live Trader Agent

一个基于 Azure Speech Voice Live 的 Web App：
- 连接配置（Voice Live WebSocket）
- 用量统计（tokens/音频/网络字节）
- Chat 窗口（文本 + 可选麦克风语音）
- 交易表单（纯前端模拟撮合引擎，纯客户端）

## GitHub Pages 部署

本项目已配置为静态导出并通过 GitHub Actions 发布到 GitHub Pages（见 `.github/workflows/deploy.yml`）。

本项目为纯前端演示（无 `/api/*` 路由），可直接静态导出并部署到 Pages。

如果你在 Actions 里看到类似报错：
`Branch "master" is not allowed to deploy to github-pages due to environment protection rules.`
说明仓库里设置了 `github-pages` 环境保护规则（只允许某些分支部署）。
解决方式二选一：
- 在 GitHub 仓库 `Settings -> Environments -> github-pages` 里把 `master` 加入允许部署的分支；或
- 把默认分支切换为 `main` 并相应调整 workflow 触发分支。

## 运行

```powershell
npm run dev
```

浏览器打开 `http://localhost:3000`。

## 使用 Voice Live

在页面左侧填写：
- `Resource Host`：例如 `<your-resource-name>.services.ai.azure.com`（或旧资源的 `...cognitiveservices.azure.com`）
- `API Version`：默认 `2025-10-01`
- `Model`：默认 `gpt-realtime`
- `API Key`

然后点击“连接”。连接成功后：
- Chat 输入交易需求，Agent 会在需要时通过工具调用前端模拟撮合引擎下单，并用中性语气向你确认。
- 点击“开启麦克风”可把语音流发送到 Voice Live（PCM16 24kHz）。

注意：浏览器环境无法设置 WebSocket Header，所以此项目使用 `api-key` 作为 URL query 参数连接（通过 `wss://...&api-key=...`）。

## 交易引擎

本项目内置前端模拟撮合引擎（`src/lib/trade/engine.ts`），账户与订单状态仅存在于客户端内存中；刷新页面会重置。

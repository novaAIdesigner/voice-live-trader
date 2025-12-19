# Voice Live Trader Agent

一个基于 Azure Speech Voice Live 的 Web App：
- 连接配置（Voice Live WebSocket）
- 用量统计（tokens/音频/网络字节）
- Chat 窗口（文本 + 可选麦克风语音）
- 交易表单（提交到后台 API）

## GitHub Pages 部署

本项目已配置为静态导出并通过 GitHub Actions 发布到 GitHub Pages（见 `.github/workflows/deploy.yml`）。

注意：GitHub Pages 是静态托管，无法运行 Next.js 的 `/api/*` 路由。
因此在 `github.io` 域名下运行时，页面会自动切换为“前端内存撮合引擎”以保证演示可用。

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
- Chat 输入交易需求，Agent 会在需要时通过 `place_order` 工具调用 `/api/trade` 下单，并用中性语气向你确认。
- 点击“开启麦克风”可把语音流发送到 Voice Live（PCM16 24kHz）。

注意：浏览器环境无法设置 WebSocket Header，所以此项目使用 `api-key` 作为 URL query 参数连接（通过 `wss://...&api-key=...`）。

## 后台下单 API

- `POST /api/trade`
	- 入参：`src/lib/trade/types.ts` 的 `TradeOrderRequest`
	- 出参：`TradeOrderResponse`

本项目的 `/api/trade` 目前为示例实现（校验 + 返回订单号），你可以在这里接入真实券商/交易系统。

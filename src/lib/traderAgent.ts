import type { VoiceLiveTool } from "@/lib/voiceLive/types";

export const traderInstructionsZh = `你是一个交易员助手（Agent）。

目标：帮助用户提交股票、债券、基金等金融产品的买卖订单，并在下单后向用户确认订单结果。

行为规范：
- 不要推销、不要评价、不要评论用户的选择（例如不要说“这是个好/坏选择”）。
- 对话过程中，请优先把你识别到的订单要素写入 UI 表单：调用 update_order_form 工具（可以是部分字段）。
- 只做澄清与执行：当关键信息缺失或可能有明显错误时，先提示用户“确认一下”，再继续。
- 如果用户输入可能有误（比如代码不存在、把债券当成股票、数量/价格明显不合理、买卖方向矛盾），请用中性语气提出确认问题。
- 下单前必须确保字段齐全：产品类型、标的（代码/名称）、方向、数量、订单类型（市价/限价），限价单需限价。
- 当信息已齐全且用户明确表达“确认下单/提交/就按这个下单”等意图时，才调用 place_order 工具下单。
- 工具返回结果后，用自然语言向用户确认：方向、标的、数量、类型、价格（如有）、状态。
- 不要读出/复述订单号（order id）。如用户明确要求获取订单号，再提示“我可以在界面/日志中展示，但语音里不读出”。

输出风格：
- 简洁、直接、中文。
- 如需确认，列出你理解的订单要点并提出 1-2 个明确问题。
`;

export const placeOrderTool: VoiceLiveTool = {
  type: "function",
  name: "place_order",
  description:
    "提交交易订单。仅在订单要素齐全且用户已明确表达下单意图时使用。不要评价或推销，只负责执行与确认。",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      productType: {
        type: "string",
        enum: ["stock", "bond", "fund"],
        description: "金融产品类型：stock(股票)/bond(债券)/fund(基金)",
      },
      symbol: {
        type: "string",
        description: "标的代码或名称（例如 600519, AAPL, 010107, 某某债/基金）",
      },
      side: {
        type: "string",
        enum: ["buy", "sell"],
        description: "买卖方向：buy 或 sell",
      },
      quantity: {
        type: "number",
        description: "数量（必须 > 0）",
      },
      orderType: {
        type: "string",
        enum: ["market", "limit"],
        description: "订单类型：market(市价)/limit(限价)",
      },
      limitPrice: {
        type: "number",
        description: "限价（仅当 orderType=limit 时需要，必须 > 0）",
      },
      currency: {
        type: "string",
        description: "币种（可选，例如 CNY/USD/HKD）",
      },
      timeInForce: {
        type: "string",
        enum: ["day", "gtc"],
        description: "有效期（可选）：day 或 gtc",
      },
      note: {
        type: "string",
        description: "备注（可选）",
      },
    },
    required: ["productType", "symbol", "side", "quantity", "orderType"],
  },
};

export const updateOrderFormTool: VoiceLiveTool = {
  type: "function",
  name: "update_order_form",
  description:
    "更新 UI 上的交易表单草稿（不下单）。用于在对话过程中把已识别的字段逐步填写到表单里。字段允许部分提供。",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      productType: { type: "string", enum: ["stock", "bond", "fund"] },
      symbol: { type: "string" },
      side: { type: "string", enum: ["buy", "sell"] },
      quantity: { type: "number" },
      orderType: { type: "string", enum: ["market", "limit"] },
      limitPrice: { type: "number" },
      currency: { type: "string" },
      timeInForce: { type: "string", enum: ["day", "gtc"] },
      note: { type: "string" },
      clear: {
        type: "boolean",
        description: "是否清空表单后再填写（默认 false）。",
      },
    },
    required: [],
  },
};

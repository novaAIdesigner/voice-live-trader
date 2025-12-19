import type { VoiceLiveTool } from "@/lib/voiceLive/types";

export const traderInstructionsZh = `你是一个交易员助手（Agent）。

目标：帮助用户提交交易订单（股票/基金/债券/期权/数字货币），并在下单后向用户确认订单结果。

客户信息：用户可能会问账户余额（USD/JPY/CNY/BTC/ETH/USDT/USDC）、资产持仓、订单状态；必要时可使用对应工具查询。

行为规范：
- 不要推销、不要评价、不要评论用户的选择（例如不要说“这是个好/坏选择”）。
- 对话过程中，请优先把你识别到的订单要素写入 UI 表单：调用 update_order_form 工具（可以是部分字段）。
- 若用户一次表达多笔订单，请为每一笔订单分别更新一个“草稿单”：对第一笔可直接 update_order_form；对第二笔及后续，使用 update_order_form 并设置 newTicket=true 以创建新的草稿单，然后继续填写该单。
- 只做澄清与执行：当关键信息缺失或可能有明显错误时，先提示用户“确认一下”，再继续。
- 如果用户输入可能有误（比如代码不存在、把债券当成股票、数量/价格明显不合理、买卖方向矛盾），请用中性语气提出确认问题。
- 下单前必须确保字段齐全：资产类型、标的（代码/名称）、方向、数量、订单类型（市价/限价），限价单需限价。
- 当信息已齐全且用户明确表达“确认下单/提交/就按这个下单”等意图时，才调用对应资产的下单工具：place_stock_order / place_fund_order / place_bond_order / place_option_order / place_crypto_order。
- 工具返回结果后，用自然语言向用户确认：方向、标的、数量、类型、价格（如有）、状态。
- 不要读出/复述订单号（order id）。如用户明确要求获取订单号，再提示“我可以在界面/日志中展示，但语音里不读出”。

订单生命周期提示：
- 市价单会立刻成交；限价单会进入待成交状态。
- 在待成交期间，用户可能要求取消订单或改单；在用户明确意图后再调用 cancel_order / modify_order。

换汇/换币：
- 用户明确要求换汇或数字货币兑换时，调用 convert_currency（USD/JPY/CNY/BTC/ETH/USDT/USDC）。

输出风格：
- 简洁、直接、中文。
- 如需确认，列出你理解的订单要点并提出 1-2 个明确问题。
`;

const baseOrderParams = {
  type: "object",
  additionalProperties: false,
  properties: {
    symbol: {
      type: "string",
      description: "标的代码或名称",
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
      enum: ["USD", "JPY", "CNY"],
      description: "币种（可选，默认 USD）",
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
  required: ["symbol", "side", "quantity", "orderType"],
} as const;

export const placeStockOrderTool: VoiceLiveTool = {
  type: "function",
  name: "place_stock_order",
  description: "提交股票订单。仅在信息齐全且用户明确确认下单时使用。",
  parameters: baseOrderParams,
};

export const placeFundOrderTool: VoiceLiveTool = {
  type: "function",
  name: "place_fund_order",
  description: "提交基金订单。仅在信息齐全且用户明确确认下单时使用。",
  parameters: baseOrderParams,
};

export const placeBondOrderTool: VoiceLiveTool = {
  type: "function",
  name: "place_bond_order",
  description: "提交债券订单。仅在信息齐全且用户明确确认下单时使用。",
  parameters: baseOrderParams,
};

export const placeCryptoOrderTool: VoiceLiveTool = {
  type: "function",
  name: "place_crypto_order",
  description: "提交数字货币订单。仅在信息齐全且用户明确确认下单时使用。",
  parameters: {
    ...baseOrderParams,
    properties: {
      ...baseOrderParams.properties,
      currency: {
        type: "string",
        enum: ["USD"],
        description: "数字货币仅支持使用 USD 买卖（默认 USD）",
      },
    },
  },
};

export const placeOptionOrderTool: VoiceLiveTool = {
  type: "function",
  name: "place_option_order",
  description: "提交期权订单。仅在信息齐全且用户明确确认下单时使用。",
  parameters: {
    ...baseOrderParams,
    properties: {
      ...baseOrderParams.properties,
      optionType: { type: "string", enum: ["call", "put"], description: "期权类型（可选）" },
      strike: { type: "number", description: "行权价（可选）" },
      expiry: { type: "string", description: "到期日（可选，例如 2026-03-27）" },
    },
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
      ticketId: {
        type: "string",
        description: "可选：要更新的草稿单 id。通常由上一次 update_order_form 的返回值获得。",
      },
      newTicket: {
        type: "boolean",
        description: "可选：是否新建一个草稿单并更新它（用于一次填写多笔订单）。默认 false。",
      },
      productType: { type: "string", enum: ["stock", "bond", "fund", "option", "crypto"] },
      symbol: { type: "string" },
      side: { type: "string", enum: ["buy", "sell"] },
      quantity: { type: "number" },
      orderType: { type: "string", enum: ["market", "limit"] },
      limitPrice: { type: "number" },
      currency: { type: "string", enum: ["USD", "JPY", "CNY"] },
      timeInForce: { type: "string", enum: ["day", "gtc"] },
      note: { type: "string" },
      clear: {
        type: "boolean",
        description: "是否清空表单后再填写（默认 false）。",
      },
      optionType: { type: "string", enum: ["call", "put"], description: "期权类型（可选）" },
      strike: { type: "number", description: "行权价（可选）" },
      expiry: { type: "string", description: "到期日（可选，例如 2026-03-27）" },
      maturity: { type: "string", description: "债券到期日（可选，例如 2030-06-30）" },
    },
    required: [],
  },
};

export const getAccountSnapshotTool: VoiceLiveTool = {
  type: "function",
  name: "get_account_snapshot",
  description: "获取当前客户账户信息：余额（USD/JPY/CNY）、资产持仓、订单列表。",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {},
    required: [],
  },
};

export const convertCurrencyTool: VoiceLiveTool = {
  type: "function",
  name: "convert_currency",
  description: "在 USD/JPY/CNY/BTC/ETH/USDT/USDC 之间换汇/换币。仅在用户明确要求时使用。",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      from: { type: "string", enum: ["USD", "JPY", "CNY", "BTC", "ETH", "USDT", "USDC"] },
      to: { type: "string", enum: ["USD", "JPY", "CNY", "BTC", "ETH", "USDT", "USDC"] },
      amount: { type: "number", description: "换出金额，必须 > 0" },
    },
    required: ["from", "to", "amount"],
  },
};

export const cancelOrderTool: VoiceLiveTool = {
  type: "function",
  name: "cancel_order",
  description: "取消待成交（pending）的订单。仅在用户明确要求取消时使用。",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      orderId: { type: "string", description: "订单号" },
    },
    required: ["orderId"],
  },
};

export const modifyOrderTool: VoiceLiveTool = {
  type: "function",
  name: "modify_order",
  description: "修改待成交（pending）的订单（改单）。仅在用户明确要求改单时使用。",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      orderId: { type: "string", description: "订单号" },
      quantity: { type: "number", description: "新数量（可选）" },
      limitPrice: { type: "number", description: "新限价（可选，限价单才适用）" },
      timeInForce: { type: "string", enum: ["day", "gtc"], description: "新有效期（可选）" },
      note: { type: "string", description: "新备注（可选）" },
    },
    required: ["orderId"],
  },
};

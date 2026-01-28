import { useState, useEffect, createContext, useContext, createElement, type ReactNode } from "react";

export type Language = "zh" | "en" | "ja" | "ko";

type LanguageContextValue = {
  lang: Language;
  setLang: (next: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function detectNavigatorLanguage(): Language {
  if (typeof navigator !== "undefined") {
    const l = navigator.language.toLowerCase();
    if (l.startsWith("zh")) return "zh";
    if (l.startsWith("ja")) return "ja";
    if (l.startsWith("ko")) return "ko";
  }
  return "en";
}

const translations = {
  zh: {
    // AccountPanel
    accountBalance: "账户余额",
    reserved: "预留：",
    exchange: "换汇",
    depositWithdraw: "出入金",
    amount: "金额",
    confirm: "确认",
    processing: "处理中…",
    deposit: "入金",
    withdraw: "出金",
    amountPositive: "金额必须 > 0",
    sameCurrency: "from/to 不能相同",
    exchangeFailed: "换汇失败",
    noCashConfig: "未配置出入金接口",
    opFailed: "操作失败",

    // AssetsPanel
    assets: "资产",
    items: "项",
    noAssets: "暂无持仓",
    quantity: "数量",
    avgCost: "均价",

    // ConnectionPanel
    connectionConfig: "连接配置",
    endpointPlaceholder: "<resource>.services.ai.azure.com (host only)",
    connect: "连接",
    disconnect: "断开",
    startMic: "开启麦克风",
    stopMic: "停止麦克风",
    advancedSettings: "高级设置",
    enableBargeIn: "启用打断 (Barge-in)",
    enableAudioLogging: "启用音频日志",
    voiceType: "Voice Type",
    voiceName: "Voice Name",
    azureCustomVoiceEndpointId: "Azure 自定义语音 Endpoint ID",
    languageHint: "Language Hint（可选）",
    
    // ChatPanel
    chatHistory: "对话历史",
    user: "用户",
    assistant: "助理",
    system: "系统",
    
    // OrdersPanel
    activeOrders: "当前委托",
    noActiveOrders: "暂无委托",
    cancel: "撤单",
    
    // TradeHistoryPanel
    tradeHistory: "成交记录",
    noTrades: "暂无成交",
    
    // UsagePanel
    usageStats: "用量统计",
    turns: "对话轮数",
    tokens: "Tokens",
    latency: "延迟 (ms)",
    wire: "网络传输",
    totalTokens: "总Tokens",
    inputTokens: "输入",
    outputTokens: "输出",
    text: "文本",
    audio: "音频",
    cached: "缓存",
    
    // TicketCard
    ticket: {
      side: "方向",
      symbol: "标的（代码/名称）",
      optionType: "期权类型",
      strike: "行权价",
      expiry: "到期日（可选）",
      maturity: "到期日（可选）",
      quantity: "数量",
      orderType: "订单类型",
      market: "市价",
      limit: "限价",
      limitPrice: "限价（限价单必填）",
      currency: "币种",
      timeInForce: "有效期（可选）",
      day: "当日有效",
      placeholders: {
        symbol: "例如 600519 / AAPL / BTC",
        strike: "例如 200",
        expiry: "例如 2026-03-27",
        maturity: "例如 2030-06-30",
        limitPrice: "例如 123.45",
      },
    },
    productType: {
      stock: "股票",
      bond: "债券",
      fund: "基金",
      option: "期权",
      crypto: "数字货币",
    },
    status: {
      filled: "已成交",
      pending: "待成交",
      canceled: "已取消",
      rejected: "已拒绝",
    },
    buy: "买入",
    sell: "卖出",
    market: "市价",
    limit: "限价",
    day: "当日有效",
    gtc: "一直有效",
    submit: "提交",
    delete: "删除",
    filling: "填写中",
    details: "详情",
    collapse: "收起",
    orderId: "订单号",
    submittedAt: "提交时间",
    filledAt: "成交时间",
    fillPrice: "成交价",
    fillValue: "成交额",
    orderSubmitted: "已提交订单",
    modify: "改单",
    submitModify: "提交改单",
    cancelEdit: "取消编辑",
    marketNoEditPrice: "市价单不可改价",
    order: "订单",
    submitting: "提交中…",
    orderSent: "订单已发送",
    orderFailed: "下单失败",

    // Trade Window
    tradeWindowTitle: "交易窗口",
    createOrder: "新建订单",

    // Logs
    logs: {
      connecting: "连接中：",
      connected: "✅ 已连接",
      disconnected: "⛔ 已断开",
      errorPrefix: "❌ 错误：",
      tradeFailedPrefix: "❌ 下单失败：",
      toolInvokePrefix: "🔧 工具调用：",
      argsPrefix: "↳ 参数：",
      outputPrefix: "↳ 输出：",
      modelRequestedToolPrefix: "🧩 模型请求工具：",
      toolArgsReadyPrefix: "🧩 工具参数就绪：",
      speechStarted: "🎤 speech_started（barge-in）",
      speechStopped: "🎤 speech_stopped",
      audioBytes: "🎧 audio bytes",
    },

    // Tools
    tools: {
      names: {
        update_order_form: "更新订单表单",
        place_stock_order: "提交股票订单",
        place_fund_order: "提交基金订单",
        place_bond_order: "提交债券订单",
        place_option_order: "提交期权订单",
        place_crypto_order: "提交数字货币订单",
        get_account_snapshot: "获取账户快照",
        get_market_price: "获取市价估算",
        convert_currency: "换汇",
        cancel_order: "撤单",
        modify_order: "改单",
      },
      errors: {
        invalidJsonArguments: "参数不是有效的 JSON",
        invalidArgumentsShape: "参数格式不正确（应为对象）",
        unknownToolPrefix: "未知工具：",
        productTypeInvalid: "productType 必须是 stock|fund|bond|option|crypto",
        symbolRequired: "symbol 为必填",
        currencyInvalid: "currency 必须是 USD|JPY|CNY",
        fromToInvalid: "from/to 必须是 USD|JPY|CNY",
        amountInvalid: "amount 必须是 > 0 的数字",
        orderIdRequired: "orderId 为必填",
      },
    },
    
    // Common
    error: "错误",
  },
  en: {
    // AccountPanel
    accountBalance: "Account Balance",
    reserved: "Reserved: ",
    exchange: "Exchange",
    depositWithdraw: "Deposit/Withdraw",
    amount: "Amount",
    confirm: "Confirm",
    processing: "Processing...",
    deposit: "Deposit",
    withdraw: "Withdraw",
    amountPositive: "Amount must be > 0",
    sameCurrency: "From/To cannot be same",
    exchangeFailed: "Exchange failed",
    noCashConfig: "Deposit/Withdraw not configured",
    opFailed: "Operation failed",

    // AssetsPanel
    assets: "Assets",
    items: " items",
    noAssets: "No positions",
    quantity: "Qty",
    avgCost: "Avg",

    // ConnectionPanel
    connectionConfig: "Connection Config",
    endpointPlaceholder: "<resource>.services.ai.azure.com (host only)",
    connect: "Connect",
    disconnect: "Disconnect",
    startMic: "Start Mic",
    stopMic: "Stop Mic",
    advancedSettings: "Advanced Settings",
    enableBargeIn: "Enable Barge-in",
    enableAudioLogging: "Enable Audio Logging",
    voiceType: "Voice Type",
    voiceName: "Voice Name",
    azureCustomVoiceEndpointId: "Azure Custom Voice Endpoint ID",
    languageHint: "Language Hint (Optional)",
    
    // ChatPanel
    chatHistory: "Chat History",
    user: "User",
    assistant: "Assistant",
    system: "System",
    
    // OrdersPanel
    activeOrders: "Active Orders",
    noActiveOrders: "No active orders",
    cancel: "Cancel",
    
    // TradeHistoryPanel
    tradeHistory: "Trade History",
    noTrades: "No trades",
    
    // UsagePanel
    usageStats: "Usage Stats",
    turns: "Turns",
    tokens: "Tokens",
    latency: "Latency (ms)",
    wire: "Network",
    totalTokens: "Total Tokens",
    inputTokens: "Input",
    outputTokens: "Output",
    text: "Text",
    audio: "Audio",
    cached: "Cached",
    
    // TicketCard
    ticket: {
      side: "Side",
      symbol: "Symbol (Code/Name)",
      optionType: "Option Type",
      strike: "Strike",
      expiry: "Expiry (Optional)",
      maturity: "Maturity (Optional)",
      quantity: "Quantity",
      orderType: "Order Type",
      market: "Market",
      limit: "Limit",
      limitPrice: "Limit Price (Required for limit)",
      currency: "Currency",
      timeInForce: "Time In Force (Optional)",
      day: "Day",
      placeholders: {
        symbol: "e.g. 600519 / AAPL / BTC",
        strike: "e.g. 200",
        expiry: "e.g. 2026-03-27",
        maturity: "e.g. 2030-06-30",
        limitPrice: "e.g. 123.45",
      },
    },
    productType: {
      stock: "Stock",
      bond: "Bond",
      fund: "Fund",
      option: "Option",
      crypto: "Crypto",
    },
    status: {
      filled: "Filled",
      pending: "Pending",
      canceled: "Canceled",
      rejected: "Rejected",
    },
    buy: "Buy",
    sell: "Sell",
    market: "Market",
    limit: "Limit",
    day: "Day",
    gtc: "GTC",
    submit: "Submit",
    delete: "Delete",
    filling: "Editing",
    details: "Details",
    collapse: "Collapse",
    orderId: "Order ID",
    submittedAt: "Submitted",
    filledAt: "Filled",
    fillPrice: "Fill Price",
    fillValue: "Fill Value",
    orderSubmitted: "Order submitted",
    modify: "Modify",
    submitModify: "Submit Changes",
    cancelEdit: "Cancel Edit",
    marketNoEditPrice: "Market order: price can't be modified",
    order: "Order",
    submitting: "Submitting...",
    orderSent: "Order Sent",
    orderFailed: "Order Failed",

    // Trade Window
    tradeWindowTitle: "Trading",
    createOrder: "New Order",

    // Logs
    logs: {
      connecting: "Connecting:",
      connected: "✅ Connected",
      disconnected: "⛔ Disconnected",
      errorPrefix: "❌ Error:",
      tradeFailedPrefix: "❌ Trade failed:",
      toolInvokePrefix: "🔧 Tool call:",
      argsPrefix: "↳ 参数：",
      outputPrefix: "↳ 输出：",
      modelRequestedToolPrefix: "🧩 模型请求工具：",
      toolArgsReadyPrefix: "🧩 工具参数就绪：",
      speechStarted: "🎤 speech_started (barge-in)",
      speechStopped: "🎤 speech_stopped",
      audioBytes: "🎧 audio bytes",
    },

    // Tools
    tools: {
      names: {
        update_order_form: "Update order form",
        place_stock_order: "Place stock order",
        place_fund_order: "Place fund order",
        place_bond_order: "Place bond order",
        place_option_order: "Place option order",
        place_crypto_order: "Place crypto order",
        get_account_snapshot: "Get account snapshot",
        get_market_price: "Get market price (estimate)",
        convert_currency: "Convert currency",
        cancel_order: "Cancel order",
        modify_order: "Modify order",
      },
      errors: {
        invalidJsonArguments: "Invalid JSON arguments",
        invalidArgumentsShape: "Invalid arguments shape (expected an object)",
        unknownToolPrefix: "Unknown tool:",
        productTypeInvalid: "productType must be stock|fund|bond|option|crypto",
        symbolRequired: "symbol is required",
        currencyInvalid: "currency must be USD|JPY|CNY",
        fromToInvalid: "from/to must be USD|JPY|CNY",
        amountInvalid: "amount must be a number > 0",
        orderIdRequired: "orderId is required",
      },
    },
    
    // Common
    error: "Error",
  },
  ja: {
    // AccountPanel
    accountBalance: "口座残高",
    reserved: "拘束中: ",
    exchange: "両替",
    depositWithdraw: "入出金",
    amount: "金額",
    confirm: "確認",
    processing: "処理中...",
    deposit: "入金",
    withdraw: "出金",
    amountPositive: "金額は0より大きい必要があります",
    sameCurrency: "変換元と変換先は同じにできません",
    exchangeFailed: "両替失敗",
    noCashConfig: "入出金設定がありません",
    opFailed: "操作失敗",

    // AssetsPanel
    assets: "資産",
    items: "件",
    noAssets: "保有ポジションなし",
    quantity: "数量",
    avgCost: "平均取得価額",

    // ConnectionPanel
    connectionConfig: "接続設定",
    endpointPlaceholder: "<resource>.services.ai.azure.com (host only)",
    connect: "接続",
    disconnect: "切断",
    startMic: "マイク開始",
    stopMic: "マイク停止",
    advancedSettings: "詳細設定",
    enableBargeIn: "バージイン (Barge-in) を有効化",
    enableAudioLogging: "音声ログを有効化",
    voiceType: "音声タイプ",
    voiceName: "音声名",
    azureCustomVoiceEndpointId: "Azure Custom Voice Endpoint ID",
    languageHint: "言語ヒント (任意)",
    
    // ChatPanel
    chatHistory: "チャット履歴",
    user: "ユーザー",
    assistant: "アシスタント",
    system: "システム",
    
    // OrdersPanel
    activeOrders: "有効な注文",
    noActiveOrders: "注文なし",
    cancel: "取消",
    
    // TradeHistoryPanel
    tradeHistory: "取引履歴",
    noTrades: "取引なし",
    
    // UsagePanel
    usageStats: "使用統計",
    turns: "ターン数",
    tokens: "トークン",
    latency: "レイテンシ (ms)",
    wire: "ネットワーク",
    totalTokens: "総トークン",
    inputTokens: "入力",
    outputTokens: "出力",
    text: "テキスト",
    audio: "音声",
    cached: "キャッシュ",
    
    // TicketCard
    ticket: {
      side: "売買",
      symbol: "シンボル (コード/名称)",
      optionType: "オプションタイプ",
      strike: "権利行使価格",
      expiry: "満期日 (任意)",
      maturity: "償還日 (任意)",
      quantity: "数量",
      orderType: "注文タイプ",
      market: "成行",
      limit: "指値",
      limitPrice: "指値価格 (必須)",
      currency: "通貨",
      timeInForce: "有効期限 (任意)",
      day: "当日中 (Day)",
      placeholders: {
        symbol: "例: 600519 / AAPL / BTC",
        strike: "例: 200",
        expiry: "例: 2026-03-27",
        maturity: "例: 2030-06-30",
        limitPrice: "例: 123.45",
      },
    },
    productType: {
      stock: "株式",
      bond: "債券",
      fund: "投資信託",
      option: "オプション",
      crypto: "暗号資産",
    },
    status: {
      filled: "約定済",
      pending: "待機中",
      canceled: "取消済",
      rejected: "拒否",
    },
    buy: "買付",
    sell: "売付",
    market: "成行",
    limit: "指値",
    day: "当日中",
    gtc: "無期限",
    submit: "送信",
    delete: "削除",
    filling: "入力中",
    details: "詳細",
    collapse: "折りたたむ",
    orderId: "注文ID",
    submittedAt: "送信日時",
    filledAt: "約定日時",
    fillPrice: "約定価格",
    fillValue: "約定金額",
    orderSubmitted: "注文送信済",
    modify: "訂正",
    submitModify: "訂正送信",
    cancelEdit: "編集キャンセル",
    marketNoEditPrice: "成行注文の価格は変更できません",
    order: "注文",
    submitting: "送信中...",
    orderSent: "注文送信完了",
    orderFailed: "注文失敗",

    // Trade Window
    tradeWindowTitle: "取引画面",
    createOrder: "新規注文",

    // Logs
    logs: {
      connecting: "接続中...",
      connected: "✅ 接続完了",
      disconnected: "⛔ 切断",
      errorPrefix: "❌ エラー: ",
      tradeFailedPrefix: "❌ 取引失敗: ",
      toolInvokePrefix: "🔧 ツール呼び出し: ",
      argsPrefix: "↳ 引数: ",
      outputPrefix: "↳ 出力: ",
      modelRequestedToolPrefix: "🧩 モデル要求ツール: ",
      toolArgsReadyPrefix: "🧩 ツール引数準備完了: ",
      speechStarted: "🎤 音声開始 (barge-in)",
      speechStopped: "🎤 音声停止",
      audioBytes: "🎧 音声データ",
    },

    // Tools
    tools: {
      names: {
        update_order_form: "注文フォーム更新",
        place_stock_order: "株式注文発注",
        place_fund_order: "投資信託注文発注",
        place_bond_order: "債券注文発注",
        place_option_order: "オプション注文発注",
        place_crypto_order: "暗号資産注文発注",
        get_account_snapshot: "口座情報取得",
        get_market_price: "市場価格取得 (推定)",
        convert_currency: "通貨両替",
        cancel_order: "注文取消",
        modify_order: "注文訂正",
      },
      errors: {
        invalidJsonArguments: "無効なJSON引数",
        invalidArgumentsShape: "無効な引数形式 (オブジェクトである必要があります)",
        unknownToolPrefix: "未知のツール: ",
        productTypeInvalid: "productTypeは stock|fund|bond|option|crypto のいずれかである必要があります",
        symbolRequired: "symbol は必須です",
        currencyInvalid: "currency は USD|JPY|CNY のいずれかである必要があります",
        fromToInvalid: "from/to は USD|JPY|CNY のいずれかである必要があります",
        amountInvalid: "amount は0より大きい数値である必要があります",
        orderIdRequired: "orderId は必須です",
      },
    },
    
    // Common
    error: "エラー",
  },
  ko: {
    // AccountPanel
    accountBalance: "계좌 잔고",
    reserved: "예약됨: ",
    exchange: "환전",
    depositWithdraw: "입출금",
    amount: "금액",
    confirm: "확인",
    processing: "처리 중...",
    deposit: "입금",
    withdraw: "출금",
    amountPositive: "금액은 0보다 커야 합니다",
    sameCurrency: "보내는 통화와 받는 통화는 같을 수 없습니다",
    exchangeFailed: "환전 실패",
    noCashConfig: "입출금 설정이 없습니다",
    opFailed: "작업 실패",

    // AssetsPanel
    assets: "자산",
    items: " 항목",
    noAssets: "보유 자산 없음",
    quantity: "수량",
    avgCost: "평단가",

    // ConnectionPanel
    connectionConfig: "연결 설정",
    endpointPlaceholder: "<resource>.services.ai.azure.com (host only)",
    connect: "연결",
    disconnect: "연결 끊기",
    startMic: "마이크 켜기",
    stopMic: "마이크 끄기",
    advancedSettings: "고급 설정",
    enableBargeIn: "Barge-in 활성화",
    enableAudioLogging: "오디오 로깅 활성화",
    voiceType: "음성 유형",
    voiceName: "음성 이름",
    azureCustomVoiceEndpointId: "Azure Custom Voice Endpoint ID",
    languageHint: "언어 힌트 (선택 사항)",
    
    // ChatPanel
    chatHistory: "대화 기록",
    user: "사용자",
    assistant: "어시스턴트",
    system: "시스템",
    
    // OrdersPanel
    activeOrders: "진행 중인 주문",
    noActiveOrders: "주문 없음",
    cancel: "취소",
    
    // TradeHistoryPanel
    tradeHistory: "거래 기록",
    noTrades: "거래 없음",
    
    // UsagePanel
    usageStats: "사용 통계",
    turns: "턴 수",
    tokens: "토큰",
    latency: "지연 시간 (ms)",
    wire: "네트워크",
    totalTokens: "총 토큰",
    inputTokens: "입력",
    outputTokens: "출력",
    text: "텍스트",
    audio: "오디오",
    cached: "캐시됨",
    
    // TicketCard
    ticket: {
      side: "매매",
      symbol: "심볼 (코드/이름)",
      optionType: "옵션 유형",
      strike: "행사가",
      expiry: "만기일 (선택)",
      maturity: "상환일 (선택)",
      quantity: "수량",
      orderType: "주문 유형",
      market: "시장가",
      limit: "지정가",
      limitPrice: "지정가 (필수)",
      currency: "통화",
      timeInForce: "유효 기간 (선택)",
      day: "당일 유효",
      placeholders: {
        symbol: "예: 600519 / AAPL / BTC",
        strike: "예: 200",
        expiry: "예: 2026-03-27",
        maturity: "예: 2030-06-30",
        limitPrice: "예: 123.45",
      },
    },
    productType: {
      stock: "주식",
      bond: "채권",
      fund: "펀드",
      option: "옵션",
      crypto: "가상화폐",
    },
    status: {
      filled: "체결됨",
      pending: "대기 중",
      canceled: "취소됨",
      rejected: "거절됨",
    },
    buy: "매수",
    sell: "매도",
    market: "시장가",
    limit: "지정가",
    day: "당일",
    gtc: "취소 전까지 유효 (GTC)",
    submit: "제출",
    delete: "삭제",
    filling: "입력 중",
    details: "상세",
    collapse: "접기",
    orderId: "주문 ID",
    submittedAt: "제출일",
    filledAt: "체결일",
    fillPrice: "체결가",
    fillValue: "체결 금액",
    orderSubmitted: "주문 제출됨",
    modify: "수정",
    submitModify: "수정 제출",
    cancelEdit: "편집 취소",
    marketNoEditPrice: "시장가 주문은 가격을 수정할 수 없습니다",
    order: "주문",
    submitting: "제출 중...",
    orderSent: "주문 전송됨",
    orderFailed: "주문 실패",

    // Trade Window
    tradeWindowTitle: "트레이딩",
    createOrder: "새 주문",

    // Logs
    logs: {
      connecting: "연결 중...",
      connected: "✅ 연결됨",
      disconnected: "⛔ 연결 끊김",
      errorPrefix: "❌ 오류: ",
      tradeFailedPrefix: "❌ 거래 실패: ",
      toolInvokePrefix: "🔧 도구 호출: ",
      argsPrefix: "↳ 인수: ",
      outputPrefix: "↳ 출력: ",
      modelRequestedToolPrefix: "🧩 모델 요청 도구: " ,
      toolArgsReadyPrefix: "🧩 도구 인수 준비됨: ",
      speechStarted: "🎤 음성 시작 (barge-in)",
      speechStopped: "🎤 음성 중지",
      audioBytes: "🎧 오디오 바이트",
    },

    // Tools
    tools: {
      names: {
        update_order_form: "주문 양식 업데이트",
        place_stock_order: "주식 주문 접수",
        place_fund_order: "펀드 주문 접수",
        place_bond_order: "채권 주문 접수",
        place_option_order: "옵션 주문 접수",
        place_crypto_order: "가상화폐 주문 접수",
        get_account_snapshot: "계좌 정보 가져오기",
        get_market_price: "시장가 가져오기 (예상)",
        convert_currency: "통화 환전",
        cancel_order: "주문 취소",
        modify_order: "주문 수정",
      },
      errors: {
        invalidJsonArguments: "유효하지 않은 JSON 인수",
        invalidArgumentsShape: "유효하지 않은 인수 형식 (객체여야 함)",
        unknownToolPrefix: "알 수 없는 도구: ",
        productTypeInvalid: "productType은 stock|fund|bond|option|crypto 중 하나여야 합니다",
        symbolRequired: "symbol은 필수입니다",
        currencyInvalid: "currency는 USD|JPY|CNY 중 하나여야 합니다",
        fromToInvalid: "from/to는 USD|JPY|CNY 중 하나여야 합니다",
        amountInvalid: "amount는 0보다 큰 숫자여야 합니다",
        orderIdRequired: "orderId는 필수입니다",
      },
    },
    
    // Common
    error: "오류",
  },
};

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (ctx) {
    return { lang: ctx.lang, setLang: ctx.setLang, t: translations[ctx.lang] };
  }

  // Backward-compatible fallback (in case a component is used outside the provider).
  const [lang, setLang] = useState<Language>("en");
  useEffect(() => {
    setLang(detectNavigatorLanguage());
  }, []);
  return { lang, setLang, t: translations[lang] };
}

export function LanguageProvider({ children, initialLang }: { children: ReactNode; initialLang?: Language }) {
  const [lang, setLang] = useState<Language>(initialLang ?? "en");

  useEffect(() => {
    if (initialLang) return;
    setLang(detectNavigatorLanguage());
  }, [initialLang]);

  return createElement(LanguageContext.Provider, { value: { lang, setLang } }, children);
}

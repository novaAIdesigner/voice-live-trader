export type TradeProductType = "stock" | "bond" | "fund";
export type TradeSide = "buy" | "sell";
export type TradeOrderType = "market" | "limit";
export type TradeTimeInForce = "day" | "gtc";

export type TradeOrderRequest = {
  productType: TradeProductType;
  symbol: string;
  side: TradeSide;
  quantity: number;
  orderType: TradeOrderType;
  limitPrice?: number;
  currency?: string;
  timeInForce?: TradeTimeInForce;
  note?: string;
};

export type TradeOrderResponse = {
  orderId: string;
  status: "submitted" | "rejected";
  receivedAt: string;
  summary: string;
  order: TradeOrderRequest;
  warnings?: string[];
};

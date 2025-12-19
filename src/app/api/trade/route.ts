import { NextResponse } from "next/server";
import type { TradeOrderRequest, TradeOrderResponse } from "@/lib/trade/types";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validate(body: unknown):
  | { ok: true; order: TradeOrderRequest; warnings: string[] }
  | { ok: false; error: string } {
  const warnings: string[] = [];

  if (!body || typeof body !== "object") return { ok: false, error: "Invalid JSON body" };

  const obj = body as Record<string, unknown>;

  const productType = obj.productType;
  const side = obj.side;
  const orderType = obj.orderType;

  if (!isNonEmptyString(productType) || !["stock", "bond", "fund"].includes(productType)) {
    return { ok: false, error: "productType must be one of stock|bond|fund" };
  }

  if (!isNonEmptyString(side) || !["buy", "sell"].includes(side)) {
    return { ok: false, error: "side must be buy|sell" };
  }

  if (!isNonEmptyString(orderType) || !["market", "limit"].includes(orderType)) {
    return { ok: false, error: "orderType must be market|limit" };
  }

  if (!isNonEmptyString(obj.symbol)) return { ok: false, error: "symbol is required" };

  if (!isFiniteNumber(obj.quantity) || obj.quantity <= 0) {
    return { ok: false, error: "quantity must be a number > 0" };
  }

  if (orderType === "limit") {
    if (!isFiniteNumber(obj.limitPrice) || obj.limitPrice <= 0) {
      return { ok: false, error: "limitPrice is required for limit orders and must be > 0" };
    }
  }

  if (isNonEmptyString(obj.currency) && obj.currency.length > 8) warnings.push("currency looks unusually long; please confirm");

  const order: TradeOrderRequest = {
    productType: productType as TradeOrderRequest["productType"],
    symbol: (obj.symbol as string).trim(),
    side: side as TradeOrderRequest["side"],
    quantity: obj.quantity as number,
    orderType: orderType as TradeOrderRequest["orderType"],
    limitPrice: orderType === "limit" ? (obj.limitPrice as number) : undefined,
    currency: isNonEmptyString(obj.currency) ? obj.currency.trim() : undefined,
    timeInForce:
      isNonEmptyString(obj.timeInForce) && ["day", "gtc"].includes(obj.timeInForce)
        ? (obj.timeInForce as "day" | "gtc")
        : undefined,
    note: isNonEmptyString(obj.note) ? obj.note.trim() : undefined,
  };

  // A small heuristic warning; keep it neutral.
  if (order.quantity > 1_000_000) warnings.push("quantity is very large; please confirm");

  return { ok: true, order, warnings };
}

function summarize(order: TradeOrderRequest) {
  const sideZh = order.side === "buy" ? "买入" : "卖出";
  const productZh = order.productType === "stock" ? "股票" : order.productType === "bond" ? "债券" : "基金";
  const pricePart = order.orderType === "limit" ? `限价 ${order.limitPrice}` : "市价";
  const cur = order.currency ? ` ${order.currency}` : "";
  return `${sideZh} ${order.quantity} ${productZh} ${order.symbol}（${pricePart}${cur}）`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const v = validate(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const orderId = `ord_${crypto.randomUUID()}`;
  const receivedAt = new Date().toISOString();

  const response: TradeOrderResponse = {
    orderId,
    receivedAt,
    status: "submitted",
    summary: `已提交订单：${summarize(v.order)}；订单号 ${orderId}`,
    order: v.order,
    warnings: v.warnings.length ? v.warnings : undefined,
  };

  return NextResponse.json(response);
}

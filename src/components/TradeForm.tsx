"use client";

import type { TradeOrderRequest, TradeOrderResponse } from "@/lib/trade/types";
import { useMemo, useState } from "react";

type Props = {
  order: TradeOrderRequest;
  onOrderChange: (next: TradeOrderRequest) => void;
  onSubmit: (order: TradeOrderRequest) => Promise<TradeOrderResponse>;
  onSubmittedToChat?: (text: string) => void;
  onSubmitted?: (trade: TradeOrderResponse) => void;
};

export const defaultOrder: TradeOrderRequest = {
  productType: "stock",
  symbol: "",
  side: "buy",
  quantity: 0,
  orderType: "market",
  currency: "",
  timeInForce: "day",
  note: "",
};

export function TradeForm({ order, onOrderChange, onSubmit, onSubmittedToChat, onSubmitted }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TradeOrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const limitNeeded = order.orderType === "limit";

  const canSubmit = useMemo(() => {
    if (!order.symbol.trim()) return false;
    if (!Number.isFinite(order.quantity) || order.quantity <= 0) return false;
    if (limitNeeded && (!Number.isFinite(order.limitPrice) || (order.limitPrice ?? 0) <= 0)) return false;
    return true;
  }, [order, limitNeeded]);

  async function submit() {
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const payload: TradeOrderRequest = {
        ...order,
        symbol: order.symbol.trim(),
        currency: order.currency?.trim() || undefined,
        note: order.note?.trim() || undefined,
      };
      const res = await onSubmit(payload);
      setResult(res);
      if (onSubmittedToChat) onSubmittedToChat(res.summary);
      onSubmitted?.(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">交易表单</h2>
        {error ? <div className="text-xs text-red-600">{error}</div> : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">产品</span>
          <select
            className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
            value={order.productType}
            onChange={(e) => onOrderChange({ ...order, productType: e.target.value as TradeOrderRequest["productType"] })}
          >
            <option value="stock">股票</option>
            <option value="bond">债券</option>
            <option value="fund">基金</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">方向</span>
          <select
            className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
            value={order.side}
            onChange={(e) => onOrderChange({ ...order, side: e.target.value as TradeOrderRequest["side"] })}
          >
            <option value="buy">买入</option>
            <option value="sell">卖出</option>
          </select>
        </label>

        <label className="col-span-2 grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">标的（代码/名称）</span>
          <input
            className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
            value={order.symbol}
            onChange={(e) => onOrderChange({ ...order, symbol: e.target.value })}
            placeholder="例如 600519 / AAPL / 010107 / 某某基金"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">数量</span>
          <input
            className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
            value={Number.isFinite(order.quantity) ? String(order.quantity) : ""}
            onChange={(e) => onOrderChange({ ...order, quantity: Number(e.target.value) })}
            inputMode="decimal"
            placeholder="100"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">订单类型</span>
          <select
            className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
            value={order.orderType}
            onChange={(e) => onOrderChange({ ...order, orderType: e.target.value as TradeOrderRequest["orderType"] })}
          >
            <option value="market">市价</option>
            <option value="limit">限价</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">限价（限价单必填）</span>
          <input
            className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none disabled:opacity-50 dark:border-white/15 dark:text-zinc-100"
            value={order.limitPrice ?? ""}
            onChange={(e) => onOrderChange({ ...order, limitPrice: e.target.value === "" ? undefined : Number(e.target.value) })}
            inputMode="decimal"
            disabled={!limitNeeded}
            placeholder={limitNeeded ? "例如 123.45" : "-"}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">币种（可选）</span>
          <input
            className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
            value={order.currency ?? ""}
            onChange={(e) => onOrderChange({ ...order, currency: e.target.value })}
            placeholder="CNY/USD/HKD"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">有效期（可选）</span>
          <select
            className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
            value={order.timeInForce ?? "day"}
            onChange={(e) => onOrderChange({ ...order, timeInForce: e.target.value as TradeOrderRequest["timeInForce"] })}
          >
            <option value="day">当日有效</option>
            <option value="gtc">GTC</option>
          </select>
        </label>

        <label className="col-span-2 grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">备注（可选）</span>
          <input
            className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
            value={order.note ?? ""}
            onChange={(e) => onOrderChange({ ...order, note: e.target.value })}
            placeholder="例如：分批成交也可以"
          />
        </label>

        <div className="col-span-2 flex gap-2">
          <button
            className="h-10 rounded-md bg-black px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            onClick={submit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? "提交中…" : "提交到后台"}
          </button>
          <button
            className="h-10 rounded-md border border-black/10 bg-transparent px-4 text-sm font-medium text-zinc-900 dark:border-white/15 dark:text-zinc-100"
            onClick={() => {
              onOrderChange(defaultOrder);
              setResult(null);
              setError(null);
            }}
            disabled={submitting}
          >
            重置
          </button>
        </div>
      </div>

      {result ? (
        <div className="mt-3 rounded-md border border-black/10 bg-zinc-50 p-3 text-sm text-zinc-900 dark:border-white/15 dark:bg-black dark:text-zinc-100">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">后台返回</div>
          <div className="mt-1 font-medium">{result.summary}</div>
        </div>
      ) : null}
    </section>
  );
}

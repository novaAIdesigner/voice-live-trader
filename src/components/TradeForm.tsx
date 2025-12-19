"use client";

import type { CurrencyCode, TradeOrderRequest, TradeOrderResponse, TradeProductType } from "@/lib/trade/types";
import { useMemo, useState } from "react";

type Props = {
  title?: string;
  order: TradeOrderRequest;
  onOrderChange: (next: TradeOrderRequest) => void;
  onSubmit: (order: TradeOrderRequest) => Promise<TradeOrderResponse>;
  onSubmittedToChat?: (text: string) => void;
  onSubmitted?: (trade: TradeOrderResponse) => void;
  disabled?: boolean;
};

export const defaultOrder: TradeOrderRequest = {
  productType: "stock",
  symbol: "",
  side: "buy",
  quantity: 0,
  orderType: "market",
  currency: "USD",
  timeInForce: "day",
  note: "",
};

const PRODUCT_LABEL: Record<TradeProductType, string> = {
  stock: "股票",
  bond: "债券",
  fund: "基金",
  option: "期权",
  crypto: "数字货币",
};

const CURRENCIES: CurrencyCode[] = ["USD", "JPY", "CNY"];

export function TradeForm({ title = "交易表单", order, onOrderChange, onSubmit, onSubmittedToChat, onSubmitted, disabled }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TradeOrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const limitNeeded = order.orderType === "limit";

  const canSubmit = useMemo(() => {
    if (disabled) return false;
    if (!order.symbol.trim()) return false;
    if (!Number.isFinite(order.quantity) || order.quantity <= 0) return false;
    if (limitNeeded && (!Number.isFinite(order.limitPrice) || (order.limitPrice ?? 0) <= 0)) return false;
    return true;
  }, [order, limitNeeded, disabled]);

  async function submit() {
    if (disabled) return;
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const payload: TradeOrderRequest = {
        ...order,
        symbol: order.symbol.trim(),
        currency: (order.currency ?? "USD") as CurrencyCode,
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
    <section className="rounded-lg border border-black/10 bg-white p-3 dark:border-white/15 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">{PRODUCT_LABEL[order.productType]}</div>
        </div>
        {error ? <div className="text-xs text-red-600">{error}</div> : null}
      </div>

      <div className="mt-2">
        <select
          className="h-9 w-full rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
          value={order.productType}
          disabled={!!disabled || submitting}
          onChange={(e) => onOrderChange({ ...order, productType: e.target.value as TradeProductType })}
        >
          {(Object.keys(PRODUCT_LABEL) as TradeProductType[]).map((pt) => (
            <option key={pt} value={pt}>
              {PRODUCT_LABEL[pt]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">方向</span>
          <select
            className="h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
            value={order.side}
            disabled={!!disabled || submitting}
            onChange={(e) => onOrderChange({ ...order, side: e.target.value as TradeOrderRequest["side"] })}
          >
            <option value="buy">买入</option>
            <option value="sell">卖出</option>
          </select>
        </label>

        <label className="md:col-span-2 grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">标的（代码/名称）</span>
          <input
            className="h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
            value={order.symbol}
            disabled={!!disabled || submitting}
            onChange={(e) => onOrderChange({ ...order, symbol: e.target.value })}
            placeholder="例如 600519 / AAPL / BTC"
          />
        </label>

        {order.productType === "option" ? (
          <>
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">期权类型</span>
              <select
                className="h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
                value={order.optionType ?? "call"}
                disabled={!!disabled || submitting}
                onChange={(e) => onOrderChange({ ...order, optionType: e.target.value as "call" | "put" })}
              >
                <option value="call">Call</option>
                <option value="put">Put</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">行权价</span>
              <input
                className="h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
                value={order.strike ?? ""}
                disabled={!!disabled || submitting}
                onChange={(e) =>
                  onOrderChange({ ...order, strike: e.target.value === "" ? undefined : Number(e.target.value) })
                }
                inputMode="decimal"
                placeholder="例如 200"
              />
            </label>

            <label className="md:col-span-3 grid gap-1">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">到期日（可选）</span>
              <input
                className="h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
                value={order.expiry ?? ""}
                disabled={!!disabled || submitting}
                onChange={(e) => onOrderChange({ ...order, expiry: e.target.value || undefined })}
                placeholder="例如 2026-03-27"
              />
            </label>
          </>
        ) : null}

        {order.productType === "bond" ? (
          <label className="md:col-span-3 grid gap-1">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">到期日（可选）</span>
            <input
              className="h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
              value={order.maturity ?? ""}
              disabled={!!disabled || submitting}
              onChange={(e) => onOrderChange({ ...order, maturity: e.target.value || undefined })}
              placeholder="例如 2030-06-30"
            />
          </label>
        ) : null}

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">数量</span>
          <input
            className="h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
            value={Number.isFinite(order.quantity) ? String(order.quantity) : ""}
            disabled={!!disabled || submitting}
            onChange={(e) => onOrderChange({ ...order, quantity: Number(e.target.value) })}
            inputMode="decimal"
            placeholder="100"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">订单类型</span>
          <select
            className="h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
            value={order.orderType}
            disabled={!!disabled || submitting}
            onChange={(e) => onOrderChange({ ...order, orderType: e.target.value as TradeOrderRequest["orderType"] })}
          >
            <option value="market">市价</option>
            <option value="limit">限价</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">限价（限价单必填）</span>
          <input
            className="h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none disabled:opacity-50 dark:border-white/15 dark:text-zinc-100"
            value={order.limitPrice ?? ""}
            onChange={(e) => onOrderChange({ ...order, limitPrice: e.target.value === "" ? undefined : Number(e.target.value) })}
            inputMode="decimal"
            disabled={!!disabled || submitting || !limitNeeded}
            placeholder={limitNeeded ? "例如 123.45" : "-"}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">币种</span>
          <select
            className="h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none disabled:opacity-50 dark:border-white/15 dark:text-zinc-100"
            value={(order.currency ?? "USD") as CurrencyCode}
            disabled={!!disabled || submitting}
            onChange={(e) => onOrderChange({ ...order, currency: e.target.value as CurrencyCode })}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">有效期（可选）</span>
          <select
            className="h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
            value={order.timeInForce ?? "day"}
            disabled={!!disabled || submitting}
            onChange={(e) => onOrderChange({ ...order, timeInForce: e.target.value as TradeOrderRequest["timeInForce"] })}
          >
            <option value="day">当日有效</option>
            <option value="gtc">GTC</option>
          </select>
        </label>

        <div className="md:col-span-3 flex gap-2">
          <button
            className="h-9 rounded-md bg-black px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            onClick={submit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? "提交中…" : "提交"}
          </button>
          <button
            className="h-9 rounded-md border border-black/10 bg-transparent px-4 text-sm font-medium text-zinc-900 dark:border-white/15 dark:text-zinc-100"
            onClick={() => {
              onOrderChange(defaultOrder);
              setResult(null);
              setError(null);
            }}
            disabled={!!disabled || submitting}
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

"use client";

import type { CurrencyCode, TradeOrderRequest, TradeProductType } from "@/lib/trade/types";
import { useEffect, useRef, useState } from "react";

type Props = {
  order: TradeOrderRequest;
  onOrderChange: (next: TradeOrderRequest) => void;
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
};

export const PRODUCT_LABEL: Record<TradeProductType, string> = {
  stock: "股票",
  bond: "债券",
  fund: "基金",
  option: "期权",
  crypto: "数字货币",
};

const CURRENCIES: CurrencyCode[] = ["USD", "JPY", "CNY"];

function useFlashOnChange<T>(value: T, ms = 3000) {
  const prev = useRef<T>(value);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (Object.is(prev.current, value)) return;
    prev.current = value;

    const t0 = window.setTimeout(() => setOn(false), 0);
    const t1 = window.setTimeout(() => setOn(true), 10);
    const t2 = window.setTimeout(() => setOn(false), ms);

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [value, ms]);

  return on;
}

export function TradeForm({ order, onOrderChange, disabled }: Props) {
  const limitNeeded = order.orderType === "limit";

  const flashSide = useFlashOnChange(order.side);
  const flashSymbol = useFlashOnChange(order.symbol);
  const flashQty = useFlashOnChange(order.quantity);
  const flashOrderType = useFlashOnChange(order.orderType);
  const flashLimit = useFlashOnChange(order.limitPrice ?? "");
  const flashCurrency = useFlashOnChange((order.currency ?? "USD") as CurrencyCode);
  const flashTif = useFlashOnChange(order.timeInForce ?? "day");

  const flashOptionType = useFlashOnChange(order.optionType ?? "call");
  const flashStrike = useFlashOnChange(order.strike ?? "");
  const flashExpiry = useFlashOnChange(order.expiry ?? "");
  const flashMaturity = useFlashOnChange(order.maturity ?? "");

  const h = "flash-3s";
  const flash = (v: boolean) => (v ? ` ${h}` : "");

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">方向</span>
          <select
            className={
              "h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100" +
              flash(flashSide)
            }
            value={order.side}
            disabled={!!disabled}
            onChange={(e) => onOrderChange({ ...order, side: e.target.value as TradeOrderRequest["side"] })}
          >
            <option value="buy">买入</option>
            <option value="sell">卖出</option>
          </select>
        </label>

        <label className="md:col-span-2 grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">标的（代码/名称）</span>
          <input
            className={
              "h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100" +
              flash(flashSymbol)
            }
            value={order.symbol}
            disabled={!!disabled}
            onChange={(e) => onOrderChange({ ...order, symbol: e.target.value })}
            placeholder="例如 600519 / AAPL / BTC"
          />
        </label>

        {order.productType === "option" ? (
          <>
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">期权类型</span>
              <select
                className={
                  "h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100" +
                  flash(flashOptionType)
                }
                value={order.optionType ?? "call"}
                disabled={!!disabled}
                onChange={(e) => onOrderChange({ ...order, optionType: e.target.value as "call" | "put" })}
              >
                <option value="call">Call</option>
                <option value="put">Put</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">行权价</span>
              <input
                className={
                  "h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100" +
                  flash(flashStrike)
                }
                value={order.strike ?? ""}
                disabled={!!disabled}
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
                className={
                  "h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100" +
                  flash(flashExpiry)
                }
                value={order.expiry ?? ""}
                disabled={!!disabled}
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
              className={
                "h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100" +
                flash(flashMaturity)
              }
              value={order.maturity ?? ""}
              disabled={!!disabled}
              onChange={(e) => onOrderChange({ ...order, maturity: e.target.value || undefined })}
              placeholder="例如 2030-06-30"
            />
          </label>
        ) : null}

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">数量</span>
          <input
            className={
              "h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100" +
              flash(flashQty)
            }
            value={Number.isFinite(order.quantity) ? String(order.quantity) : ""}
            disabled={!!disabled}
            onChange={(e) => onOrderChange({ ...order, quantity: Number(e.target.value) })}
            inputMode="decimal"
            placeholder="100"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">订单类型</span>
          <select
            className={
              "h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100" +
              flash(flashOrderType)
            }
            value={order.orderType}
            disabled={!!disabled}
            onChange={(e) => onOrderChange({ ...order, orderType: e.target.value as TradeOrderRequest["orderType"] })}
          >
            <option value="market">市价</option>
            <option value="limit">限价</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">限价（限价单必填）</span>
          <input
            className={
              "h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none disabled:opacity-50 dark:border-white/15 dark:text-zinc-100" +
              flash(flashLimit)
            }
            value={order.limitPrice ?? ""}
            onChange={(e) => onOrderChange({ ...order, limitPrice: e.target.value === "" ? undefined : Number(e.target.value) })}
            inputMode="decimal"
            disabled={!!disabled || !limitNeeded}
            placeholder={limitNeeded ? "例如 123.45" : "-"}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">币种</span>
          <select
            className={
              "h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none disabled:opacity-50 dark:border-white/15 dark:text-zinc-100" +
              flash(flashCurrency)
            }
            value={(order.currency ?? "USD") as CurrencyCode}
            disabled={!!disabled}
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
            className={
              "h-9 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100" +
              flash(flashTif)
            }
            value={order.timeInForce ?? "day"}
            disabled={!!disabled}
            onChange={(e) => onOrderChange({ ...order, timeInForce: e.target.value as TradeOrderRequest["timeInForce"] })}
          >
            <option value="day">当日有效</option>
            <option value="gtc">GTC</option>
          </select>
        </label>
    </div>
  );
}

"use client";

import type { ModifyOrderRequest, OrderRecord } from "@/lib/trade/types";
import { useMemo, useState } from "react";

type Props = {
  orders: OrderRecord[];
  onCancel: (orderId: string) => Promise<void>;
  onModify: (orderId: string, patch: ModifyOrderRequest) => Promise<void>;
};

export function OrdersPanel({ orders, onCancel, onModify }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState<string>("");
  const [limit, setLimit] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(orders.map((o) => [o.orderId, o])), [orders]);

  function startEdit(orderId: string) {
    const o = byId.get(orderId);
    if (!o) return;
    setError(null);
    setEditingId(orderId);
    setQ(String(o.quantity));
    setLimit(o.limitPrice !== undefined ? String(o.limitPrice) : "");
  }

  async function doCancel(orderId: string) {
    setError(null);
    setBusyId(orderId);
    try {
      await onCancel(orderId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function doModify(orderId: string) {
    setError(null);
    const qty = Number(q);
    const lp = limit === "" ? undefined : Number(limit);

    const patch: ModifyOrderRequest = {};
    if (Number.isFinite(qty)) patch.quantity = qty;
    if (lp !== undefined && Number.isFinite(lp)) patch.limitPrice = lp;

    setBusyId(orderId);
    try {
      await onModify(orderId, patch);
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">订单</h2>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">{orders.length} 笔</div>
      </div>
      {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}

      <div className="mt-3 space-y-2">
        {orders.length === 0 ? <div className="text-sm text-zinc-600 dark:text-zinc-400">暂无订单</div> : null}

        {orders.map((o) => {
          const pending = o.status === "pending";
          const busy = busyId === o.orderId;
          const editing = editingId === o.orderId;

          return (
            <div
              key={o.orderId}
              className="rounded-md border border-black/10 bg-zinc-50 p-3 text-sm text-zinc-900 dark:border-white/15 dark:bg-black dark:text-zinc-100"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {o.side} {o.quantity} {o.productType} {o.symbol}
                  </div>
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {o.orderType === "market" ? "market" : `limit ${o.limitPrice}`} · {o.currency} · 状态 {o.status}
                  </div>
                </div>

                {pending ? (
                  <div className="flex gap-2">
                    <button
                      className="h-8 rounded-md border border-black/10 bg-transparent px-3 text-xs font-medium text-zinc-900 disabled:opacity-50 dark:border-white/15 dark:text-zinc-100"
                      onClick={() => doCancel(o.orderId)}
                      disabled={busy}
                    >
                      取消
                    </button>
                    <button
                      className="h-8 rounded-md border border-black/10 bg-transparent px-3 text-xs font-medium text-zinc-900 disabled:opacity-50 dark:border-white/15 dark:text-zinc-100"
                      onClick={() => startEdit(o.orderId)}
                      disabled={busy}
                    >
                      改单
                    </button>
                  </div>
                ) : null}
              </div>

              {o.status === "filled" && o.fillPrice !== undefined ? (
                <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  成交价 {o.fillPrice} · 成交额 {o.fillValue}
                </div>
              ) : null}

              {editing ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <input
                    className="h-9 rounded-md border border-black/10 bg-transparent px-2 text-xs text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    inputMode="decimal"
                    placeholder="数量"
                    disabled={busy}
                  />
                  <input
                    className="h-9 rounded-md border border-black/10 bg-transparent px-2 text-xs text-zinc-900 outline-none disabled:opacity-50 dark:border-white/15 dark:text-zinc-100"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    inputMode="decimal"
                    placeholder={o.orderType === "limit" ? "限价" : "市价单不可改价"}
                    disabled={busy || o.orderType !== "limit"}
                  />

                  <button
                    className="col-span-2 h-9 rounded-md bg-black px-3 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
                    onClick={() => doModify(o.orderId)}
                    disabled={busy}
                  >
                    {busy ? "处理中…" : "提交改单"}
                  </button>

                  <button
                    className="col-span-2 h-9 rounded-md border border-black/10 bg-transparent px-3 text-xs font-medium text-zinc-900 disabled:opacity-50 dark:border-white/15 dark:text-zinc-100"
                    onClick={() => setEditingId(null)}
                    disabled={busy}
                  >
                    取消编辑
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

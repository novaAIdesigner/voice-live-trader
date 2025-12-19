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
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">订单</h2>
        <div className="text-xs text-muted-foreground">{orders.length} 笔</div>
      </div>
      {error ? <div className="mt-2 text-xs text-destructive">{error}</div> : null}

      <div className="mt-3 space-y-2">
        {orders.length === 0 ? <div className="text-sm text-muted-foreground">暂无订单</div> : null}

        {orders.map((o) => {
          const pending = o.status === "pending";
          const busy = busyId === o.orderId;
          const editing = editingId === o.orderId;

          return (
            <div
              key={o.orderId}
              className="rounded-md border border-border bg-transparent p-3 text-sm text-foreground"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {o.side} {o.quantity} {o.productType} {o.symbol}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {o.orderType === "market" ? "market" : `limit ${o.limitPrice}`} · {o.currency} · 状态 {o.status}
                  </div>
                </div>

                {pending ? (
                  <div className="flex gap-2">
                    <button
                      className="h-8 rounded-md border border-border bg-transparent px-3 text-xs font-medium text-foreground disabled:opacity-50 hover:bg-accent"
                      onClick={() => doCancel(o.orderId)}
                      disabled={busy}
                    >
                      取消
                    </button>
                    <button
                      className="h-8 rounded-md border border-border bg-transparent px-3 text-xs font-medium text-foreground disabled:opacity-50 hover:bg-accent"
                      onClick={() => startEdit(o.orderId)}
                      disabled={busy}
                    >
                      改单
                    </button>
                  </div>
                ) : null}
              </div>

              {o.status === "filled" && o.fillPrice !== undefined ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  成交价 {o.fillPrice} · 成交额 {o.fillValue}
                </div>
              ) : null}

              {editing ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <input
                    className="h-9 rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    inputMode="decimal"
                    placeholder="数量"
                    disabled={busy}
                  />
                  <input
                    className="h-9 rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none disabled:opacity-50"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    inputMode="decimal"
                    placeholder={o.orderType === "limit" ? "限价" : "市价单不可改价"}
                    disabled={busy || o.orderType !== "limit"}
                  />

                  <button
                    className="col-span-2 h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
                    onClick={() => doModify(o.orderId)}
                    disabled={busy}
                  >
                    {busy ? "处理中…" : "提交改单"}
                  </button>

                  <button
                    className="col-span-2 h-9 rounded-md border border-border bg-transparent px-3 text-xs font-medium text-foreground disabled:opacity-50 hover:bg-accent"
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

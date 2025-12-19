"use client";

import type { TradeOrderResponse } from "@/lib/trade/types";
import { memo } from "react";

export type TradeHistoryItem = {
  id: string;
  createdAt: number;
  summary: string;
  raw: TradeOrderResponse;
};

type Props = {
  items: TradeHistoryItem[];
};

export const TradeHistoryPanel = memo(function TradeHistoryPanel({ items }: Props) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">交易记录</h2>
        <div className="text-xs text-muted-foreground">{items.length} 条</div>
      </div>

      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">暂无记录（提交后会显示在这里）。</div>
        ) : null}

        {items.map((it) => (
          <div
            key={it.id}
            className="rounded-md border border-border bg-transparent p-3 text-sm text-foreground"
          >
            <div className="text-xs text-muted-foreground">
              {new Date(it.createdAt).toLocaleString()}
            </div>
            <div className="mt-1 font-medium">{it.summary}</div>
          </div>
        ))}
      </div>
    </section>
  );
});

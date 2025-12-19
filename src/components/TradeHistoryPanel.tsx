"use client";

import type { TradeOrderResponse } from "@/lib/trade/types";

export type TradeHistoryItem = {
  id: string;
  createdAt: number;
  summary: string;
  raw: TradeOrderResponse;
};

type Props = {
  items: TradeHistoryItem[];
};

export function TradeHistoryPanel({ items }: Props) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">交易记录</h2>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">{items.length} 条</div>
      </div>

      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">暂无记录（提交后会显示在这里）。</div>
        ) : null}

        {items.map((it) => (
          <div
            key={it.id}
            className="rounded-md border border-black/10 bg-zinc-50 p-3 text-sm text-zinc-900 dark:border-white/15 dark:bg-black dark:text-zinc-100"
          >
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              {new Date(it.createdAt).toLocaleString()}
            </div>
            <div className="mt-1 font-medium">{it.summary}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

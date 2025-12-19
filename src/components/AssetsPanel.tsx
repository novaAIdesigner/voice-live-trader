"use client";

import type { AssetPosition } from "@/lib/trade/types";

type Props = {
  assets: AssetPosition[];
};

export function AssetsPanel({ assets }: Props) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">资产</h2>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">{assets.length} 项</div>
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-auto">
        {assets.length === 0 ? <div className="text-sm text-zinc-600 dark:text-zinc-400">暂无持仓</div> : null}

        {assets.map((p) => (
          <div
            key={p.id}
            className="rounded-md border border-black/10 bg-zinc-50 p-3 text-sm text-zinc-900 dark:border-white/15 dark:bg-black dark:text-zinc-100"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">
                {p.productType} {p.symbol}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">{p.currency}</div>
            </div>
            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              数量 {p.quantity} · 均价 {p.avgCost}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

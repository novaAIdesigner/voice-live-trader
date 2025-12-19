"use client";

import type { UsageTotals, WireStats } from "@/lib/voiceLive/types";

type Props = {
  usage: UsageTotals;
  wire: WireStats;
};

export function UsagePanel({ usage, wire }: Props) {
  const interactions = usage.turns + wire.toolCalls;
  return (
    <section className="rounded-lg border border-black/10 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">统计</div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-baseline gap-2">
            <div className="text-xs text-zinc-600 dark:text-zinc-400">交互</div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{interactions}</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">(轮次 {usage.turns} + 工具 {wire.toolCalls})</div>
          </div>

          <div className="flex items-baseline gap-2">
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Latency</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              min <span className="font-semibold text-zinc-900 dark:text-zinc-100">{Math.round(usage.speechEndToFirstResponseMsMin)}ms</span>
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              avg <span className="font-semibold text-zinc-900 dark:text-zinc-100">{Math.round(usage.speechEndToFirstResponseMsAvg)}ms</span>
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              p90 <span className="font-semibold text-zinc-900 dark:text-zinc-100">{Math.round(usage.speechEndToFirstResponseMsP90)}ms</span>
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">n {usage.speechEndToFirstResponseCount}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

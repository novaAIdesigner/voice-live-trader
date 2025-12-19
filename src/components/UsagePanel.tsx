"use client";

import type { UsageTotals, WireStats } from "@/lib/voiceLive/types";
import { memo } from "react";

type Props = {
  usage: UsageTotals;
  wire: WireStats;
};

export const UsagePanel = memo(function UsagePanel({ usage, wire }: Props) {
  const interactions = usage.turns + wire.toolCalls;
  return (
    <section className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">统计</div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-baseline gap-2">
            <div className="text-xs text-zinc-500">交互</div>
            <div className="font-semibold text-foreground">{interactions}</div>
            <div className="text-xs text-zinc-500">(轮次 {usage.turns} + 工具 {wire.toolCalls})</div>
          </div>

          <div className="flex items-baseline gap-2">
            <div className="text-xs text-zinc-500">Latency</div>
            <div className="text-xs text-zinc-500">
              min <span className="font-semibold text-foreground">{Math.round(usage.speechEndToFirstResponseMsMin)}ms</span>
            </div>
            <div className="text-xs text-zinc-500">
              avg <span className="font-semibold text-foreground">{Math.round(usage.speechEndToFirstResponseMsAvg)}ms</span>
            </div>
            <div className="text-xs text-zinc-500">
              p90 <span className="font-semibold text-foreground">{Math.round(usage.speechEndToFirstResponseMsP90)}ms</span>
            </div>
            <div className="text-xs text-zinc-500">n {usage.speechEndToFirstResponseCount}</div>
          </div>
        </div>
      </div>
    </section>
  );
});

"use client";

import type { UsageTotals, WireStats } from "@/lib/voiceLive/types";

type Props = {
  usage: UsageTotals;
  wire: WireStats;
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function UsagePanel({ usage, wire }: Props) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">用量统计</h2>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md border border-black/10 p-3 dark:border-white/15">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">交互轮次</div>
          <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{usage.turns}</div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">以 `response.done` 计数</div>
        </div>

        <div className="rounded-md border border-black/10 p-3 dark:border-white/15">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Tokens</div>
          <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{usage.totalTokens}</div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            in {usage.inputTokens} / out {usage.outputTokens}
          </div>
        </div>

        <div className="rounded-md border border-black/10 p-3 dark:border-white/15">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Text Tokens</div>
          <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">
            in {usage.inputTextTokens} / out {usage.outputTextTokens}
          </div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            cache in {usage.inputTextCachedTokens} / out {usage.outputTextCachedTokens}
          </div>
        </div>

        <div className="rounded-md border border-black/10 p-3 dark:border-white/15">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Audio Tokens</div>
          <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">
            in {usage.inputAudioTokens} / out {usage.outputAudioTokens}
          </div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            cache in {usage.inputAudioCachedTokens} / out {usage.outputAudioCachedTokens}
          </div>
        </div>

        <div className="rounded-md border border-black/10 p-3 dark:border-white/15">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Tool Calls</div>
          <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{wire.toolCalls}</div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">place_order 等</div>
        </div>

        <div className="rounded-md border border-black/10 p-3 dark:border-white/15">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Latency (speech→1st response)</div>
          <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">
            min {Math.round(usage.speechEndToFirstResponseMsMin)}ms
          </div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            avg {Math.round(usage.speechEndToFirstResponseMsAvg)}ms / p90 {Math.round(usage.speechEndToFirstResponseMsP90)}ms
          </div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">n={usage.speechEndToFirstResponseCount}</div>
        </div>

        <div className="rounded-md border border-black/10 p-3 dark:border-white/15">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">WS Sent</div>
          <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{formatBytes(wire.wsSentBytes)}</div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">audio {formatBytes(wire.audioSentBytes)}</div>
        </div>

        <div className="rounded-md border border-black/10 p-3 dark:border-white/15">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">WS Received</div>
          <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{formatBytes(wire.wsReceivedBytes)}</div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">audio {formatBytes(wire.audioReceivedBytes)}</div>
        </div>
      </div>

      <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
        注：Tokens/usage 由服务端 `response.done` 返回；音频/WS 字节为本地估算。
      </div>
    </section>
  );
}

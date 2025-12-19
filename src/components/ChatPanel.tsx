"use client";

import { useEffect, useRef } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
};

type Props = {
  messages: ChatMessage[];
  disabled?: boolean;
  error?: string | null;
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
};

function roleLabel(role: ChatMessage["role"]) {
  if (role === "user") return "用户";
  if (role === "assistant") return "Agent";
  return "系统";
}

export function ChatPanel({ messages, disabled, error, draft, onDraftChange, onSend }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Chat</h2>
        {error ? <div className="text-xs text-red-600">{error}</div> : null}
      </div>

      <div className="mt-3 h-[420px] overflow-auto rounded-md border border-black/10 bg-zinc-50 p-3 dark:border-white/15 dark:bg-black">
        {messages.length === 0 ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">输入你的交易需求，例如：买入 100 股 AAPL 市价。</div>
        ) : null}

        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="grid gap-1">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">{roleLabel(m.role)}</div>
              <div className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">{m.text}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="h-10 w-full rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none disabled:opacity-50 dark:border-white/15 dark:text-zinc-100"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="输入消息…"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <button
          className="h-10 rounded-md bg-black px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          onClick={onSend}
          disabled={disabled || !draft.trim()}
        >
          发送
        </button>
      </div>

      <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
        提示：Voice Live 已连接时，会通过函数调用自动触发下单（place_order）。
      </div>
    </section>
  );
}

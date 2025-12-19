"use client";

import { useEffect, useRef } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  ts?: string; // e.g. 11:18:44 AM
};

type Props = {
  messages: ChatMessage[];
  error?: string | null;
  fill?: boolean;
};

function roleLabel(role: ChatMessage["role"]) {
  if (role === "user") return "用户";
  if (role === "assistant") return "Agent";
  return "系统";
}

function rolePillClass(role: ChatMessage["role"]) {
  if (role === "assistant") return "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300";
  if (role === "user") return "bg-sky-600/15 text-sky-700 dark:text-sky-300";
  return "bg-zinc-600/15 text-zinc-700 dark:text-zinc-300";
}

export function ChatPanel({ messages, error, fill }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <section
      className={`rounded-lg border border-black/10 bg-white p-3 dark:border-white/15 dark:bg-zinc-950${
        fill ? " flex h-full flex-col" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Chat</h2>
        {error ? <div className="text-xs text-red-600">{error}</div> : null}
      </div>

      <div
        className={`mt-2 overflow-auto rounded-md border border-black/10 bg-zinc-50 p-2 dark:border-white/15 dark:bg-black${
          fill ? " min-h-0 flex-1" : " h-[220px]"
        }`}
      >
        {messages.length === 0 ? <div className="text-sm text-zinc-600 dark:text-zinc-400">暂无消息</div> : null}

        <div className="space-y-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className="flex items-start gap-2 rounded-sm px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100"
            >
              <div className="shrink-0 text-[11px] text-zinc-600 dark:text-zinc-400">{m.ts ? `[${m.ts}]` : ""}</div>
              <div className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${rolePillClass(m.role)}`}
              >
                {roleLabel(m.role)}
              </div>
              <div className="min-w-0 whitespace-pre-wrap text-sm leading-snug">{m.text}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
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

export function ChatPanel({ messages, error, fill }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <section
      className={`rounded-lg border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950${
        fill ? " flex h-full flex-col" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Chat</h2>
        {error ? <div className="text-xs text-red-600">{error}</div> : null}
      </div>

      <div
        className={`mt-3 overflow-auto rounded-md border border-black/10 bg-zinc-50 p-3 dark:border-white/15 dark:bg-black${
          fill ? " min-h-0 flex-1" : " h-[220px]"
        }`}
      >
        {messages.length === 0 ? <div className="text-sm text-zinc-600 dark:text-zinc-400">暂无消息</div> : null}

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
    </section>
  );
}

"use client";

import { ChatPanel, type ChatMessage } from "@/components/ChatPanel";
import { ConnectionPanel } from "@/components/ConnectionPanel";
import { TradeForm } from "@/components/TradeForm";
import { TradeHistoryPanel, type TradeHistoryItem } from "@/components/TradeHistoryPanel";
import { UsagePanel } from "@/components/UsagePanel";
import { traderInstructionsZh, placeOrderTool, updateOrderFormTool } from "@/lib/traderAgent";
import type { TradeOrderRequest, TradeOrderResponse } from "@/lib/trade/types";
import { VoiceLiveClient } from "@/lib/voiceLive/VoiceLiveClient";
import type { UsageTotals, VoiceLiveConnectionConfig, WireStats } from "@/lib/voiceLive/types";
import { deleteCookie, getCookie, setCookie } from "@/lib/cookies";
import { useEffect, useMemo, useRef, useState } from "react";

import { defaultOrder } from "@/components/TradeForm";

const defaultConfig: VoiceLiveConnectionConfig = {
  resourceHost: "",
  apiVersion: "2025-10-01",
  model: "gpt-4o",
  apiKey: "",
  voice: { type: "azure-standard", name: "zh-CN-XiaochenMultilingualNeural" },
  instructions: traderInstructionsZh,
  languageHint: "zh,en",
  enableAudioLogging: true,
  enableBargeIn: true,
};

const ENDPOINT_COOKIE = "vl_endpoint_host";
const API_KEY_COOKIE = "vl_api_key";

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function postTrade(order: TradeOrderRequest): Promise<TradeOrderResponse> {
  const res = await fetch("/api/trade", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(order),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Trade API error");
  return json as TradeOrderResponse;
}

export default function Home() {
  const clientRef = useRef<VoiceLiveClient | null>(null);

  const [config, setConfig] = useState<VoiceLiveConnectionConfig>(defaultConfig);
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [micOn, setMicOn] = useState(false);

  const [usage, setUsage] = useState<UsageTotals>({
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    inputTextTokens: 0,
    inputAudioTokens: 0,
    outputTextTokens: 0,
    outputAudioTokens: 0,
  });
  const [wire, setWire] = useState<WireStats>({
    wsSentBytes: 0,
    wsReceivedBytes: 0,
    audioSentBytes: 0,
    audioReceivedBytes: 0,
    toolCalls: 0,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);

  const [assistantStreaming, setAssistantStreaming] = useState<string>("");

  const [orderDraft, setOrderDraft] = useState<TradeOrderRequest>(defaultOrder);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);

  const audioLogRef = useRef({ lastTs: 0, lastAudioIn: 0, lastAudioOut: 0 });

  useEffect(() => {
    const saved = getCookie(ENDPOINT_COOKIE);
    if (saved && !config.resourceHost) {
      setConfig((prev) => ({ ...prev, resourceHost: saved }));
    }

    const savedKey = getCookie(API_KEY_COOKIE);
    if (savedKey && !config.apiKey) {
      setConfig((prev) => ({ ...prev, apiKey: savedKey }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const host = config.resourceHost.trim();
    if (host) setCookie(ENDPOINT_COOKIE, host, { days: 365 });
    else deleteCookie(ENDPOINT_COOKIE);
  }, [config.resourceHost]);

  useEffect(() => {
    const key = config.apiKey;
    const secure = typeof window !== "undefined" && window.location.protocol === "https:";
    if (key) setCookie(API_KEY_COOKIE, key, { days: 30, secure });
    else deleteCookie(API_KEY_COOKIE);
  }, [config.apiKey]);

  const connected = status === "connected";

  const connectDisabled = useMemo(() => {
    return !config.resourceHost || !config.apiVersion || !config.model || !config.apiKey;
  }, [config]);

  function logSystem(text: string) {
    setMessages((prev) => [...prev, { id: newId("sys"), role: "system", text }]);
  }

  async function connect() {
    if (connectDisabled) return;
    setChatError(null);

    logSystem(`连接中：${config.resourceHost} / ${config.model}`);

    const client = new VoiceLiveClient({
      tools: [updateOrderFormTool, placeOrderTool],
      functionHandler: async ({ name, callId, argumentsJson }) => {
        logSystem(`🔧 tool 调用：${name} (call_id=${callId})`);
        logSystem(`↳ args: ${argumentsJson}`);

        if (name === "update_order_form") {
          let argsUnknown: unknown;
          try {
            argsUnknown = JSON.parse(argumentsJson);
          } catch {
            const output = JSON.stringify({ ok: false, error: "Invalid JSON arguments" });
            logSystem(`↳ output: ${output}`);
            return { output };
          }

          const r = argsUnknown && typeof argsUnknown === "object" ? (argsUnknown as Record<string, unknown>) : null;
          if (!r) {
            const output = JSON.stringify({ ok: false, error: "Invalid arguments shape" });
            logSystem(`↳ output: ${output}`);
            return { output };
          }

          setOrderDraft((prev) => {
            const clear = r.clear === true;
            const base = clear ? defaultOrder : prev;
            const next: TradeOrderRequest = { ...base };

            if (r.productType === "stock" || r.productType === "bond" || r.productType === "fund") {
              next.productType = r.productType;
            }
            if (typeof r.symbol === "string") next.symbol = r.symbol;
            if (r.side === "buy" || r.side === "sell") next.side = r.side;

            if (typeof r.quantity === "number" && Number.isFinite(r.quantity)) next.quantity = r.quantity;

            if (r.orderType === "market" || r.orderType === "limit") next.orderType = r.orderType;
            if (typeof r.limitPrice === "number" && Number.isFinite(r.limitPrice)) next.limitPrice = r.limitPrice;

            if (typeof r.currency === "string") next.currency = r.currency;
            if (r.timeInForce === "day" || r.timeInForce === "gtc") next.timeInForce = r.timeInForce;
            if (typeof r.note === "string") next.note = r.note;

            return next;
          });

          const output = JSON.stringify({ ok: true });
          logSystem(`↳ output: ${output}`);
          return { output };
        }

        if (name !== "place_order") {
          const output = JSON.stringify({ error: `Unknown tool: ${name}`, callId });
          logSystem(`↳ output: ${output}`);
          return { output };
        }

        let argsUnknown: unknown;
        try {
          argsUnknown = JSON.parse(argumentsJson);
        } catch {
          const output = JSON.stringify({ error: "Invalid JSON arguments" });
          logSystem(`↳ output: ${output}`);
          return { output };
        }

        if (!argsUnknown || typeof argsUnknown !== "object") {
          const output = JSON.stringify({ error: "Invalid arguments shape" });
          logSystem(`↳ output: ${output}`);
          return { output };
        }

        const args = argsUnknown as Record<string, unknown>;

        const order: TradeOrderRequest = {
          productType: args.productType as TradeOrderRequest["productType"],
          symbol: (typeof args.symbol === "string" ? args.symbol : "") as string,
          side: args.side as TradeOrderRequest["side"],
          quantity: (typeof args.quantity === "number" ? args.quantity : Number(args.quantity)) as number,
          orderType: args.orderType as TradeOrderRequest["orderType"],
          limitPrice: (typeof args.limitPrice === "number" ? args.limitPrice : Number(args.limitPrice)) as number,
          currency: typeof args.currency === "string" ? args.currency : undefined,
          timeInForce: args.timeInForce as TradeOrderRequest["timeInForce"],
          note: typeof args.note === "string" ? args.note : undefined,
        };

        try {
          const trade = await postTrade(order);
          const output = JSON.stringify(trade);
          logSystem(`↳ output: ${output}`);
          setTradeHistory((prev) => [
            {
              id: newId("t"),
              createdAt: Date.now(),
              summary: trade.summary,
              raw: trade,
            },
            ...prev,
          ]);
          // Return structured JSON so the model can summarize.
          return { output };
        } catch (e) {
          const output = JSON.stringify({ error: e instanceof Error ? e.message : String(e) });
          logSystem(`↳ output: ${output}`);
          return { output };
        }
      },
      callbacks: {
        onStatus: (s) => {
          setStatus(s);
          if (s === "connected") logSystem("✅ 已连接");
          if (s === "disconnected") logSystem("⛔ 已断开");
        },
        onError: (m) => {
          setChatError(m);
          logSystem(`❌ 错误：${m}`);
        },
        onServerEvent: (event) => {
          if (config.enableAudioLogging) {
            const t = event.type;
            if (t === "input_audio_buffer.speech_started" || t === "input_audio_buffer_speech_started") {
              logSystem("🎤 speech_started（barge-in）");
            }
            if (t === "input_audio_buffer.speech_stopped" || t === "input_audio_buffer_speech_stopped") {
              logSystem("🎤 speech_stopped");
            }

            // Throttled byte logging to avoid spamming.
            if (t === "response.audio.delta" || t === "input_audio_buffer.append") {
              const now = Date.now();
              if (now - audioLogRef.current.lastTs >= 1000) {
                const inBytes = wire.audioSentBytes;
                const outBytes = wire.audioReceivedBytes;
                const inDelta = inBytes - audioLogRef.current.lastAudioIn;
                const outDelta = outBytes - audioLogRef.current.lastAudioOut;
                audioLogRef.current.lastTs = now;
                audioLogRef.current.lastAudioIn = inBytes;
                audioLogRef.current.lastAudioOut = outBytes;
                if (inDelta > 0 || outDelta > 0) {
                  logSystem(`🎧 audio bytes (+in ${inDelta}, +out ${outDelta})`);
                }
              }
            }

            if (t === "response.audio.done") {
              logSystem("🔊 assistant audio done");
            }
          }

          if (event.type === "response.output_item.added") {
            const item = (event as unknown as Record<string, unknown>).item;
            if (item && typeof item === "object") {
              const ir = item as Record<string, unknown>;
              if (ir.type === "function_call") {
                const name = typeof ir.name === "string" ? ir.name : "function_call";
                const callId = typeof ir.call_id === "string" ? ir.call_id : "";
                logSystem(`🧩 模型请求工具：${name}${callId ? ` (call_id=${callId})` : ""}`);
              }
            }
          }
          if (event.type === "response.function_call_arguments.done") {
            const r = event as unknown as Record<string, unknown>;
            const name = typeof r.name === "string" ? r.name : undefined;
            const callId = typeof r.call_id === "string" ? r.call_id : undefined;
            const args = typeof r.arguments === "string" ? r.arguments : undefined;
            logSystem(`🧩 工具参数就绪：${name ?? ""}${callId ? ` (call_id=${callId})` : ""}`.trim());
            if (args) logSystem(`↳ args: ${args}`);
          }
        },
        onStats: ({ usage: u, wire: w }) => {
          setUsage(u);
          setWire(w);
        },
        onUserTranscript: (text) => {
          setMessages((prev) => [...prev, { id: newId("u"), role: "user", text }]);
        },
        onAssistantTextDelta: (delta) => {
          setAssistantStreaming((prev) => prev + delta);
        },
        onAssistantTextDone: (text) => {
          setAssistantStreaming("");
          setMessages((prev) => [...prev, { id: newId("a"), role: "assistant", text }]);
        },
      },
    });

    clientRef.current = client;
    await client.connect(config);
  }

  function disconnect() {
    try {
      clientRef.current?.disconnect();
    } finally {
      clientRef.current = null;
      setMicOn(false);
      setAssistantStreaming("");
      setStatus("disconnected");
      logSystem("⛔ 已断开");
    }
  }

  async function toggleMic() {
    const client = clientRef.current;
    if (!client) return;

    try {
      if (!micOn) {
        await client.startMicrophone();
        setMicOn(true);
      } else {
        client.stopMicrophone();
        setMicOn(false);
      }
    } catch (e) {
      setChatError(e instanceof Error ? e.message : String(e));
    }
  }

  function sendChat() {
    setChatError(null);
    const text = draft.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { id: newId("u"), role: "user", text }]);
    setDraft("");

    const client = clientRef.current;
    if (!client) {
      setChatError("未连接 Voice Live（先在左侧连接）");
      return;
    }

    try {
      client.sendTextMessage(text);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : String(e));
    }
  }

  const visibleMessages = useMemo(() => {
    if (!assistantStreaming) return messages;
    return [...messages, { id: "assistant_stream", role: "assistant" as const, text: assistantStreaming }];
  }, [messages, assistantStreaming]);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      <header className="border-b border-black/10 bg-white px-6 py-4 dark:border-white/15 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="text-base font-semibold">Voice Live Trader Agent</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            连接 Voice Live；用 chat 或表单下单
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-2">
        <div className="grid gap-4">
          <ConnectionPanel
            config={config}
            onChange={(next) => setConfig(next)}
            status={status}
            micOn={micOn}
            onConnect={connect}
            onDisconnect={disconnect}
            onToggleMic={toggleMic}
          />
          <UsagePanel usage={usage} wire={wire} />
        </div>

        <div className="grid gap-4">
          <ChatPanel
            messages={visibleMessages}
            disabled={!connected}
            error={chatError}
            draft={draft}
            onDraftChange={setDraft}
            onSend={sendChat}
          />

          <TradeForm
            order={orderDraft}
            onOrderChange={setOrderDraft}
            onSubmit={postTrade}
            onSubmittedToChat={(text) => {
              setMessages((prev) => [...prev, { id: newId("s"), role: "system", text }]);
            }}
            onSubmitted={(trade) => {
              setTradeHistory((prev) => [
                {
                  id: newId("t"),
                  createdAt: Date.now(),
                  summary: trade.summary,
                  raw: trade,
                },
                ...prev,
              ]);
            }}
          />

          <TradeHistoryPanel items={tradeHistory} />
        </div>
      </main>
    </div>
  );
}

"use client";

import { ChatPanel, type ChatMessage } from "@/components/ChatPanel";
import { ConnectionPanel } from "@/components/ConnectionPanel";
import { AccountPanel } from "@/components/AccountPanel";
import { AssetsPanel } from "@/components/AssetsPanel";
import { TradeForm } from "@/components/TradeForm";
import { UsagePanel } from "@/components/UsagePanel";
import {
  cancelOrderTool,
  convertCurrencyTool,
  getAccountSnapshotTool,
  modifyOrderTool,
  placeBondOrderTool,
  placeCryptoOrderTool,
  placeFundOrderTool,
  placeOptionOrderTool,
  placeStockOrderTool,
  traderInstructionsZh,
  updateOrderFormTool,
} from "@/lib/traderAgent";
import type {
  AccountSnapshot,
  AssetPosition,
  BalanceAdjustRequest,
  BalanceAdjustResponse,
  FxConvertRequest,
  FxConvertResponse,
  ModifyOrderRequest,
  TradeOrderRequest,
  TradeOrderResponse,
} from "@/lib/trade/types";
import { VoiceLiveClient } from "@/lib/voiceLive/VoiceLiveClient";
import type { UsageTotals, VoiceLiveConnectionConfig, WireStats } from "@/lib/voiceLive/types";
import { deleteCookie, getCookie, setCookie } from "@/lib/cookies";
import { useEffect, useMemo, useRef, useState } from "react";

import { defaultOrder } from "@/components/TradeForm";

type TradeTicket = {
  id: string;
  order: TradeOrderRequest;
  frozen: boolean;
  collapsed: boolean;
  lastResponse?: TradeOrderResponse;
};

function statusLabel(s: TradeOrderResponse["status"]) {
  if (s === "filled") return "已成交";
  if (s === "pending") return "待成交";
  if (s === "canceled") return "已取消";
  return "已拒绝";
}

function statusClass(s: TradeOrderResponse["status"]) {
  if (s === "filled") return "text-emerald-600 dark:text-emerald-400";
  if (s === "pending") return "text-amber-600 dark:text-amber-400";
  if (s === "canceled") return "text-zinc-600 dark:text-zinc-400";
  return "text-red-600";
}

function fmtIsoShort(s: string | undefined) {
  if (!s) return "";
  // ISO like 2025-12-19T12:34:56.789Z -> 2025-12-19 12:34:56
  return s.replace("T", " ").slice(0, 19);
}

function fmtNum(n: number | undefined, digits = 2) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  return n.toFixed(digits);
}

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

function statusDotClass(s: "disconnected" | "connecting" | "connected") {
  if (s === "connected") return "bg-emerald-500";
  if (s === "connecting") return "bg-amber-500";
  return "bg-zinc-400";
}

function statusText(s: "disconnected" | "connecting" | "connected") {
  if (s === "connected") return "已连接";
  if (s === "connecting") return "连接中";
  return "未连接";
}

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

async function fetchAccount(): Promise<AccountSnapshot> {
  const res = await fetch("/api/account", { method: "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Account API error");
  return json as AccountSnapshot;
}

async function postFxConvert(req: FxConvertRequest): Promise<FxConvertResponse> {
  const res = await fetch("/api/fx", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  const json = await res.json().catch(() => ({}));
  return json as FxConvertResponse;
}

async function postBalanceAdjust(req: BalanceAdjustRequest): Promise<BalanceAdjustResponse> {
  const res = await fetch("/api/balance", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  const json = await res.json().catch(() => ({}));
  return json as BalanceAdjustResponse;
}

async function postCancel(orderId: string) {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/cancel`, { method: "POST" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Cancel failed");
  return json as { snapshot?: AccountSnapshot };
}

async function postModify(orderId: string, patch: ModifyOrderRequest) {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/modify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Modify failed");
  return json as { snapshot?: AccountSnapshot };
}

export default function Home() {
  const clientRef = useRef<VoiceLiveClient | null>(null);

  const [config, setConfig] = useState<VoiceLiveConnectionConfig>(defaultConfig);
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [micOn, setMicOn] = useState(false);

  const [usage, setUsage] = useState<UsageTotals>({
    turns: 0,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    inputTextTokens: 0,
    inputAudioTokens: 0,
    inputTextCachedTokens: 0,
    inputAudioCachedTokens: 0,
    inputCachedTokens: 0,
    outputTextTokens: 0,
    outputAudioTokens: 0,
    outputTextCachedTokens: 0,
    outputAudioCachedTokens: 0,
    outputCachedTokens: 0,

    speechEndToFirstResponseMsMin: 0,
    speechEndToFirstResponseMsAvg: 0,
    speechEndToFirstResponseMsP90: 0,
    speechEndToFirstResponseCount: 0,
  });
  const [wire, setWire] = useState<WireStats>({
    wsSentBytes: 0,
    wsReceivedBytes: 0,
    audioSentBytes: 0,
    audioReceivedBytes: 0,
    toolCalls: 0,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);

  const [assistantStreaming, setAssistantStreaming] = useState<string>("");

  const [tickets, setTickets] = useState<TradeTicket[]>([
    {
      id: newId("ticket"),
      order: defaultOrder,
      frozen: false,
      collapsed: false,
    },
  ]);

  const [account, setAccount] = useState<AccountSnapshot | null>(null);

  const audioLogRef = useRef({ lastTs: 0, lastAudioIn: 0, lastAudioOut: 0 });

  useEffect(() => {
    let alive = true;

    const refresh = async () => {
      try {
        const snap = await fetchAccount();
        if (!alive) return;
        setAccount(snap);

        setTickets((prev) => {
          if (!snap.orders?.length) return prev;
          const byId = new Map(snap.orders.map((o) => [o.orderId, o] as const));
          let changed = false;
          const next = prev.map((t) => {
            const last = t.lastResponse;
            const orderId = last?.orderId;
            if (!t.frozen || !orderId || !last) return t;
            const rec = byId.get(orderId);
            if (!rec) return t;

            const prevStatus = last.status;
            if (rec.status === prevStatus) return t;

            changed = true;
            const summary =
              rec.status === "filled"
                ? `订单 ${rec.orderId} 已成交：${rec.side === "buy" ? "买入" : "卖出"} ${rec.quantity} ${rec.symbol}`
                : rec.status === "canceled"
                  ? `订单 ${rec.orderId} 已取消：${rec.side === "buy" ? "买入" : "卖出"} ${rec.quantity} ${rec.symbol}`
                  : rec.status === "rejected"
                    ? `订单 ${rec.orderId} 已拒绝：${rec.side === "buy" ? "买入" : "卖出"} ${rec.quantity} ${rec.symbol}`
                    : last.summary;

            return {
              ...t,
              lastResponse: {
                ...last,
                status: rec.status,
                summary,
                filledAt: rec.filledAt,
                fillPrice: rec.fillPrice,
                fillValue: rec.fillValue,
              },
            };
          });
          return changed ? next : prev;
        });
      } catch {
        // ignore
      }
    };

    void refresh();
    const id = setInterval(() => void refresh(), 3000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

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

  const assetsForPanel: AssetPosition[] = useMemo(() => {
    const base: AssetPosition[] = account?.assets ?? [];
    const balances = account?.balances ?? [];

    const crypto = balances
      .filter((b) => b.currency === "BTC" || b.currency === "ETH" || b.currency === "USDT" || b.currency === "USDC")
      .filter((b) => (b.available ?? 0) > 0 || (b.reserved ?? 0) > 0)
      .map((b) => {
        const qty = (b.available ?? 0) + (b.reserved ?? 0);
        return {
          id: `pos_crypto_${b.currency}`,
          productType: "crypto" as const,
          symbol: b.currency,
          currency: b.currency,
          quantity: qty,
          avgCost: 0,
          updatedAt: account?.asOf ?? new Date().toISOString(),
        } satisfies AssetPosition;
      });

    return [...crypto, ...base];
  }, [account]);

  const connectDisabled = useMemo(() => {
    return !config.resourceHost || !config.apiVersion || !config.model || !config.apiKey;
  }, [config]);

  function logSystem(text: string) {
    setMessages((prev) => [...prev, { id: newId("sys"), role: "system", text }]);
  }

  function getActiveTicketId(ts: TradeTicket[]) {
    return ts.find((t) => !t.frozen)?.id;
  }

  function upsertActiveTicket(mutator: (prev: TradeOrderRequest) => TradeOrderRequest) {
    setTickets((prev) => {
      let activeId = getActiveTicketId(prev);
      let nextTickets = prev;

      if (!activeId) {
        const created: TradeTicket = {
          id: newId("ticket"),
          order: defaultOrder,
          frozen: false,
          collapsed: false,
        };
        nextTickets = [created, ...prev];
        activeId = created.id;
      }

      return nextTickets.map((t) => {
        if (t.id !== activeId) return t;
        return { ...t, order: mutator(t.order) };
      });
    });
  }

  async function connect() {
    if (connectDisabled) return;
    setChatError(null);

    logSystem(`连接中：${config.resourceHost} / ${config.model}`);

    const client = new VoiceLiveClient({
      tools: [
        updateOrderFormTool,
        placeStockOrderTool,
        placeFundOrderTool,
        placeBondOrderTool,
        placeOptionOrderTool,
        placeCryptoOrderTool,
        getAccountSnapshotTool,
        convertCurrencyTool,
        cancelOrderTool,
        modifyOrderTool,
      ],
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

          upsertActiveTicket((prev) => {
            const clear = r.clear === true;
            const base = clear ? defaultOrder : prev;
            const next: TradeOrderRequest = { ...base };

            if (
              r.productType === "stock" ||
              r.productType === "bond" ||
              r.productType === "fund" ||
              r.productType === "option" ||
              r.productType === "crypto"
            ) {
              next.productType = r.productType;
            }
            if (typeof r.symbol === "string") next.symbol = r.symbol;
            if (r.side === "buy" || r.side === "sell") next.side = r.side;

            if (typeof r.quantity === "number" && Number.isFinite(r.quantity)) next.quantity = r.quantity;

            if (r.orderType === "market" || r.orderType === "limit") next.orderType = r.orderType;
            if (typeof r.limitPrice === "number" && Number.isFinite(r.limitPrice)) next.limitPrice = r.limitPrice;

            if (r.currency === "USD" || r.currency === "JPY" || r.currency === "CNY") next.currency = r.currency;
            if (r.timeInForce === "day" || r.timeInForce === "gtc") next.timeInForce = r.timeInForce;
            if (typeof r.note === "string") next.note = r.note;

            if (r.optionType === "call" || r.optionType === "put") next.optionType = r.optionType;
            if (typeof r.strike === "number" && Number.isFinite(r.strike)) next.strike = r.strike;
            if (typeof r.expiry === "string") next.expiry = r.expiry;
            if (typeof r.maturity === "string") next.maturity = r.maturity;

            return next;
          });

          const output = JSON.stringify({ ok: true });
          logSystem(`↳ output: ${output}`);
          return { output };
        }

        if (name === "get_account_snapshot") {
          try {
            const snap = await fetchAccount();
            setAccount(snap);
            const output = JSON.stringify(snap);
            logSystem(`↳ output: ${output}`);
            return { output };
          } catch (e) {
            const output = JSON.stringify({ error: e instanceof Error ? e.message : String(e) });
            logSystem(`↳ output: ${output}`);
            return { output };
          }
        }

        if (name === "convert_currency") {
          let argsUnknown: unknown;
          try {
            argsUnknown = JSON.parse(argumentsJson);
          } catch {
            const output = JSON.stringify({ error: "Invalid JSON arguments" });
            logSystem(`↳ output: ${output}`);
            return { output };
          }

          const r = argsUnknown && typeof argsUnknown === "object" ? (argsUnknown as Record<string, unknown>) : null;
          const from = r?.from;
          const to = r?.to;
          const amount = r?.amount;

          const isCcy = (v: unknown) =>
            v === "USD" || v === "JPY" || v === "CNY" || v === "BTC" || v === "ETH" || v === "USDT" || v === "USDC";

          if (!isCcy(from) || !isCcy(to)) {
            const output = JSON.stringify({ error: "from/to must be USD|JPY|CNY|BTC|ETH|USDT|USDC" });
            logSystem(`↳ output: ${output}`);
            return { output };
          }

          if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
            const output = JSON.stringify({ error: "amount must be a number > 0" });
            logSystem(`↳ output: ${output}`);
            return { output };
          }

          try {
            const res = await postFxConvert({ from, to, amount });
            if (res.snapshot) setAccount(res.snapshot);
            const output = JSON.stringify(res);
            logSystem(`↳ output: ${output}`);
            return { output };
          } catch (e) {
            const output = JSON.stringify({ error: e instanceof Error ? e.message : String(e) });
            logSystem(`↳ output: ${output}`);
            return { output };
          }
        }

        if (name === "cancel_order") {
          let argsUnknown: unknown;
          try {
            argsUnknown = JSON.parse(argumentsJson);
          } catch {
            const output = JSON.stringify({ error: "Invalid JSON arguments" });
            logSystem(`↳ output: ${output}`);
            return { output };
          }
          const r = argsUnknown && typeof argsUnknown === "object" ? (argsUnknown as Record<string, unknown>) : null;
          const orderId = typeof r?.orderId === "string" ? r.orderId : "";
          if (!orderId) {
            const output = JSON.stringify({ error: "orderId is required" });
            logSystem(`↳ output: ${output}`);
            return { output };
          }
          try {
            const res = await postCancel(orderId);
            if (res.snapshot) setAccount(res.snapshot);
            else setAccount(await fetchAccount());
            const output = JSON.stringify(res);
            logSystem(`↳ output: ${output}`);
            return { output };
          } catch (e) {
            const output = JSON.stringify({ error: e instanceof Error ? e.message : String(e) });
            logSystem(`↳ output: ${output}`);
            return { output };
          }
        }

        if (name === "modify_order") {
          let argsUnknown: unknown;
          try {
            argsUnknown = JSON.parse(argumentsJson);
          } catch {
            const output = JSON.stringify({ error: "Invalid JSON arguments" });
            logSystem(`↳ output: ${output}`);
            return { output };
          }

          const r = argsUnknown && typeof argsUnknown === "object" ? (argsUnknown as Record<string, unknown>) : null;
          const orderId = typeof r?.orderId === "string" ? r.orderId : "";
          if (!orderId) {
            const output = JSON.stringify({ error: "orderId is required" });
            logSystem(`↳ output: ${output}`);
            return { output };
          }

          const patch: ModifyOrderRequest = {};
          if (typeof r?.quantity === "number" && Number.isFinite(r.quantity)) patch.quantity = r.quantity;
          if (typeof r?.limitPrice === "number" && Number.isFinite(r.limitPrice)) patch.limitPrice = r.limitPrice;
          if (r?.timeInForce === "day" || r?.timeInForce === "gtc") patch.timeInForce = r.timeInForce;
          if (typeof r?.note === "string") patch.note = r.note;

          try {
            const res = await postModify(orderId, patch);
            if (res.snapshot) setAccount(res.snapshot);
            else setAccount(await fetchAccount());
            const output = JSON.stringify(res);
            logSystem(`↳ output: ${output}`);
            return { output };
          } catch (e) {
            const output = JSON.stringify({ error: e instanceof Error ? e.message : String(e) });
            logSystem(`↳ output: ${output}`);
            return { output };
          }
        }

        const productTypeByTool: Record<string, TradeOrderRequest["productType"]> = {
          place_stock_order: "stock",
          place_fund_order: "fund",
          place_bond_order: "bond",
          place_option_order: "option",
          place_crypto_order: "crypto",
        };

        const productType = productTypeByTool[name];
        if (!productType) {
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
          productType,
          symbol: (typeof args.symbol === "string" ? args.symbol : "") as string,
          side: args.side as TradeOrderRequest["side"],
          quantity: (typeof args.quantity === "number" ? args.quantity : Number(args.quantity)) as number,
          orderType: args.orderType as TradeOrderRequest["orderType"],
          limitPrice: (typeof args.limitPrice === "number" ? args.limitPrice : Number(args.limitPrice)) as number,
          currency: args.currency === "USD" || args.currency === "JPY" || args.currency === "CNY" ? args.currency : undefined,
          timeInForce: args.timeInForce as TradeOrderRequest["timeInForce"],
          note: typeof args.note === "string" ? args.note : undefined,
        };

        // Crypto orders are quoted in USD in this demo.
        if (productType === "crypto") order.currency = "USD";

        if (productType === "option") {
          if (args.optionType === "call" || args.optionType === "put") order.optionType = args.optionType;
          const strike = typeof args.strike === "number" ? args.strike : Number(args.strike);
          if (Number.isFinite(strike) && strike > 0) order.strike = strike;
          if (typeof args.expiry === "string") order.expiry = args.expiry;
        }
        if (productType === "bond") {
          if (typeof args.maturity === "string") order.maturity = args.maturity;
        }

        try {
          const trade = await postTrade(order);
          const output = JSON.stringify(trade);
          logSystem(`↳ output: ${output}`);
          setTickets((prev) => [
            {
              id: newId("ticket"),
              order,
              frozen: true,
              collapsed: true,
              lastResponse: trade,
            },
            ...prev,
          ]);
          try {
            const snap = await fetchAccount();
            setAccount(snap);
          } catch {
            // ignore
          }
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

            // response.audio.done is intentionally not logged to avoid noise.
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

  const visibleMessages = useMemo(() => {
    if (!assistantStreaming) return messages;
    return [...messages, { id: "assistant_stream", role: "assistant" as const, text: assistantStreaming }];
  }, [messages, assistantStreaming]);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      <header className="border-b border-black/10 bg-white px-6 py-4 dark:border-white/15 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="text-base font-semibold">Voice Live Trader Agent</div>
          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <span className={`h-2 w-2 rounded-full ${statusDotClass(status)}`} />
            <span>{statusText(status)}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-4 lg:h-[calc(100vh-140px)] lg:overflow-hidden lg:pr-1">
          <ConnectionPanel
            config={config}
            onChange={(next) => setConfig(next)}
            status={status}
            micOn={micOn}
            onConnect={connect}
            onDisconnect={disconnect}
            onToggleMic={toggleMic}
          />

          <AccountPanel
            balances={(account?.balances ?? []).filter((b) => b.currency === "USD" || b.currency === "JPY" || b.currency === "CNY")}
            onConvert={async (req) => {
              const res = await postFxConvert(req);
              if (res.snapshot) setAccount(res.snapshot);
              return res;
            }}
            onAdjust={async (req) => {
              const res = await postBalanceAdjust(req);
              if (res.snapshot) setAccount(res.snapshot);
              return { ok: res.ok, error: res.error };
            }}
          />

          <div className="min-h-0 flex-1">
            <AssetsPanel assets={assetsForPanel} />
          </div>
        </div>

        <div className="grid gap-4 lg:h-[calc(100vh-140px)] lg:grid-rows-[1fr_auto_auto]">
          <section className="min-h-0 overflow-auto rounded-lg border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">交易窗口</h2>
              <button
                className="h-9 rounded-md border border-black/10 bg-transparent px-3 text-xs font-medium text-zinc-900 dark:border-white/15 dark:text-zinc-100"
                onClick={() =>
                  setTickets((prev) => [{ id: newId("ticket"), order: defaultOrder, frozen: false, collapsed: false }, ...prev])
                }
              >
                新建订单
              </button>
            </div>

          <div className="mt-3 space-y-3">
            {tickets.map((t, idx) => {
              const label = `#${tickets.length - idx}`;
              const resp = t.lastResponse;

              if (t.frozen && resp) {
                const filledAt = fmtIsoShort(resp.filledAt);
                const receivedAt = fmtIsoShort(resp.receivedAt);
                const fillPrice = fmtNum(resp.fillPrice, 4) || fmtNum(resp.fillPrice, 2);
                const fillValue = fmtNum(resp.fillValue, 2);

                return (
                  <div
                    key={t.id}
                    className="rounded-md border border-black/10 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-white/15 dark:bg-black dark:text-zinc-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">{label}</div>
                          <div className={`text-xs font-semibold ${statusClass(resp.status)}`}>{statusLabel(resp.status)}</div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">订单号 {resp.orderId}</div>
                        </div>
                        <div className="mt-0.5 truncate font-medium">{resp.summary}</div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                          {resp.status === "filled" ? (
                            <>
                              {filledAt ? <span>成交时间 {filledAt}</span> : null}
                              {fillPrice ? <span>成交价 {fillPrice}</span> : null}
                              {fillValue ? <span>成交额 {fillValue} {resp.order.currency ?? ""}</span> : null}
                            </>
                          ) : (
                            <>{receivedAt ? <span>提交时间 {receivedAt}</span> : null}</>
                          )}
                        </div>
                      </div>

                      <button
                        className="h-8 shrink-0 rounded-md border border-black/10 bg-transparent px-3 text-xs font-medium text-zinc-900 dark:border-white/15 dark:text-zinc-100"
                        onClick={() =>
                          setTickets((prev) => prev.map((x) => (x.id === t.id ? { ...x, collapsed: !x.collapsed } : x)))
                        }
                      >
                        {t.collapsed ? "详情" : "收起"}
                      </button>
                    </div>

                    {!t.collapsed ? (
                      <div className="mt-3">
                        <TradeForm
                          title={`订单详情 ${label}`}
                          order={t.order}
                          disabled
                          onOrderChange={() => {
                            // frozen
                          }}
                          onSubmit={postTrade}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              }

              if (t.frozen && !resp) {
                return (
                  <div
                    key={t.id}
                    className="rounded-md border border-black/10 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-white/15 dark:bg-black dark:text-zinc-100"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">{label}</div>
                        <div className="mt-0.5 truncate font-medium">已提交订单</div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={t.id} className="rounded-md border border-black/10 bg-zinc-50 p-2 dark:border-white/15 dark:bg-black">
                  <TradeForm
                    title={`填写中 ${label}`}
                    order={t.order}
                    onOrderChange={(next) =>
                      setTickets((prev) => prev.map((x) => (x.id === t.id ? { ...x, order: next } : x)))
                    }
                    onSubmit={postTrade}
                    onSubmittedToChat={(text) => {
                      setMessages((prev) => [...prev, { id: newId("s"), role: "system", text }]);
                    }}
                    onSubmitted={(trade) => {
                      setTickets((prev) =>
                        prev.map((x) => (x.id === t.id ? { ...x, frozen: true, collapsed: true, lastResponse: trade } : x))
                      );
                      void fetchAccount()
                        .then((snap) => setAccount(snap))
                        .catch(() => {
                          // ignore
                        });
                    }}
                  />
                </div>
              );
            })}
          </div>
          </section>

          <ChatPanel
            messages={visibleMessages}
            error={chatError}
          />

          <UsagePanel usage={usage} wire={wire} />
        </div>
      </main>
    </div>
  );
}

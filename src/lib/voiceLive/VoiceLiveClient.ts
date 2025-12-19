import { bytesToBase64, base64ToBytes } from "@/lib/base64";
import { Pcm16Player, pcm16Base64ToChunk } from "@/lib/audio";
import type {
  UsageTotals,
  VoiceLiveClientEvent,
  VoiceLiveConnectionConfig,
  VoiceLiveServerEvent,
  VoiceLiveTool,
  WireStats,
} from "@/lib/voiceLive/types";
import { normalizeResourceHost } from "@/lib/voiceLive/normalize";

export type VoiceLiveStatus = "disconnected" | "connecting" | "connected";

export type VoiceLiveCallbacks = {
  onStatus?: (status: VoiceLiveStatus) => void;
  onServerEvent?: (event: VoiceLiveServerEvent) => void;
  onAssistantTextDelta?: (delta: string) => void;
  onAssistantTextDone?: (text: string) => void;
  onUserTranscript?: (text: string) => void;
  onError?: (message: string) => void;
  onStats?: (stats: { usage: UsageTotals; wire: WireStats }) => void;
};

export type FunctionCallHandler = (payload: {
  name: string;
  callId: string;
  argumentsJson: string;
}) => Promise<{ output: string }>; // output must be a string (often JSON)

function emptyUsage(): UsageTotals {
  return {
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
  };
}

function emptyWire(): WireStats {
  return {
    wsSentBytes: 0,
    wsReceivedBytes: 0,
    audioSentBytes: 0,
    audioReceivedBytes: 0,
    toolCalls: 0,
  };
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

function getString(r: Record<string, unknown>, key: string): string | undefined {
  const v = r[key];
  return typeof v === "string" ? v : undefined;
}

function getNumber(r: Record<string, unknown>, key: string): number | undefined {
  const v = r[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function getArray(r: Record<string, unknown>, key: string): unknown[] | undefined {
  const v = r[key];
  return Array.isArray(v) ? v : undefined;
}

function redactForConsole(value: unknown, depth = 0, keyHint?: string): unknown {
  const maxDepth = 5;
  const maxString = 400;
  const maxArray = 50;

  if (depth > maxDepth) return "[Truncated]";

  if (typeof value === "string") {
    const k = (keyHint ?? "").toLowerCase();
    if (k === "audio" || k === "delta") return `<${k}:base64:${value.length}>`;
    if (value.length > maxString) return `${value.slice(0, maxString)}…(len=${value.length})`;
    return value;
  }

  if (Array.isArray(value)) {
    const head = value.slice(0, maxArray).map((v) => redactForConsole(v, depth + 1));
    if (value.length > maxArray) return [...head, `…(+${value.length - maxArray} items)`];
    return head;
  }

  if (!value || typeof value !== "object") return value;

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    out[k] = redactForConsole(obj[k], depth + 1, k);
  }
  return out;
}

function shouldLogVoiceLiveEvent(type: string) {
  // Avoid console spam from high-frequency audio/transcript streaming.
  const noisy = new Set([
    // outgoing mic chunks
    "input_audio_buffer.append",
    // incoming audio chunks
    "response.audio.delta",
    // incoming transcript/text streaming (very high frequency)
    "response.text.delta",
    "response.output_text.delta",
    "response.audio_transcript.delta",
    "response.output_audio_transcript.delta",
  ]);
  if (noisy.has(type)) return false;

  // Keep these input-audio buffer events (useful for barge-in/debug).
  if (type === "input_audio_buffer.speech_started" || type === "input_audio_buffer.speech_stopped") return true;
  if (type === "input_audio_buffer_speech_started" || type === "input_audio_buffer_speech_stopped") return true;

  // Keep major lifecycle + tool + response events.
  if (type.startsWith("session.")) return true;
  if (type.startsWith("conversation.")) return true;
  if (type.startsWith("response.")) return true;
  if (type === "error") return true;

  // Default: log everything else (both directions).
  return true;
}

export class VoiceLiveClient {
  private ws: WebSocket | null = null;
  private status: VoiceLiveStatus = "disconnected";

  private enableBargeIn = true;
  private responseActive = false;
  private responseApiDone = true;
  private bargeInCancelSent = false;

  private responseCreateInFlight = false;
  private pendingResponseCreate = false;

  private callbacks: VoiceLiveCallbacks;
  private tools: VoiceLiveTool[];
  private functionHandler: FunctionCallHandler;

  private player = new Pcm16Player();
  private usage: UsageTotals = emptyUsage();
  private wire: WireStats = emptyWire();

  private pendingFunctionCallsById = new Map<string, { name: string; itemId?: string }>();

  private speechEndAtMs: number | null = null;
  private waitingFirstResponse = false;
  private speechToFirstResponseMs: number[] = [];

  private assistantTextBuffer = "";
  private assistantTextDoneEmitted = false;
  private lastAssistantTextDone = "";

  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;

  constructor(args: {
    tools: VoiceLiveTool[];
    functionHandler: FunctionCallHandler;
    callbacks?: VoiceLiveCallbacks;
  }) {
    this.tools = args.tools;
    this.functionHandler = args.functionHandler;
    this.callbacks = args.callbacks ?? {};
  }

  getStatus() {
    return this.status;
  }

  getStats() {
    return { usage: this.usage, wire: this.wire };
  }

  private setStatus(status: VoiceLiveStatus) {
    this.status = status;
    this.callbacks.onStatus?.(status);
  }

  private emitStats() {
    this.callbacks.onStats?.(this.getStats());
  }

  private send(event: VoiceLiveClientEvent) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error("WebSocket not connected");

    try {
      // Log every outgoing client event. Large payload fields (audio/delta) are redacted.
      if (shouldLogVoiceLiveEvent(event.type)) {
        console.debug("[VoiceLive] send", event.type, redactForConsole(event));
      }
    } catch {
      // ignore
    }

    const payload = JSON.stringify(event);
    this.ws.send(payload);
    this.wire.wsSentBytes += new TextEncoder().encode(payload).byteLength;
    this.emitStats();
  }

  private requestResponseCreate() {
    if (this.responseActive || this.responseCreateInFlight) {
      this.pendingResponseCreate = true;
      return;
    }

    this.responseCreateInFlight = true;
    try {
      this.send({ type: "response.create" });
    } catch (e) {
      this.responseCreateInFlight = false;
      throw e;
    }
  }

  async connect(config: VoiceLiveConnectionConfig) {
    if (this.ws) this.disconnect();

    // Best-effort: resume playback context from a user gesture (connect button).
    // This helps avoid autoplay restrictions when the first audio delta arrives.
    try {
      await this.player.ensureRunning();
    } catch {
      // ignore
    }

    this.usage = emptyUsage();
    this.wire = emptyWire();
    this.emitStats();

    this.setStatus("connecting");

    this.enableBargeIn = config.enableBargeIn !== false;
    this.responseActive = false;
    this.responseApiDone = true;
    this.bargeInCancelSent = false;
    this.responseCreateInFlight = false;
    this.pendingResponseCreate = false;

    this.speechEndAtMs = null;
    this.waitingFirstResponse = false;
    this.speechToFirstResponseMs = [];

    const resourceHost = normalizeResourceHost(config.resourceHost);
    if (!resourceHost) {
      this.setStatus("disconnected");
      this.callbacks.onError?.(
        "Invalid Resource Host. Please enter a host like <resource>.services.ai.azure.com (do not include https:// or path).",
      );
      return;
    }

    if (/\.cognitiveservices\.azure\.com$/i.test(resourceHost)) {
      this.callbacks.onError?.(
        "Resource Host looks like a Cognitive Services endpoint. Voice Live typically uses <resource>.services.ai.azure.com. If connection fails, try using that host.",
      );
    }

    const url = new URL(`wss://${resourceHost}/voice-live/realtime`);
    url.searchParams.set("api-version", config.apiVersion);
    url.searchParams.set("model", config.model);
    url.searchParams.set("api-key", config.apiKey);

    const ws = new WebSocket(url.toString());
    this.ws = ws;

    ws.onopen = () => {
      this.setStatus("connected");

      try {
        console.debug("[VoiceLive] ws open");
      } catch {
        // ignore
      }

      const sessionUpdate: VoiceLiveClientEvent = {
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions: config.instructions,
          voice: config.voice,
          input_audio_format: "pcm16",
          input_audio_sampling_rate: 24000,
          output_audio_format: "pcm16",
          turn_detection: {
            type: "azure_semantic_vad_multilingual",
            threshold: 0.3,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
            interrupt_response: true,
            auto_truncate: true,
            create_response: true,
          },
          input_audio_noise_reduction: { type: "azure_deep_noise_suppression" },
          input_audio_echo_cancellation: { type: "server_echo_cancellation" },
          input_audio_transcription: config.languageHint
            ? { model: "azure-speech", language: config.languageHint }
            : { model: "azure-speech" },
          tools: this.tools,
          tool_choice: "auto",
        },
      };

      try {
        this.send(sessionUpdate);
      } catch (e) {
        this.callbacks.onError?.(e instanceof Error ? e.message : String(e));
      }
    };

    ws.onmessage = async (msg) => {
      const data = typeof msg.data === "string" ? msg.data : "";
      this.wire.wsReceivedBytes += new TextEncoder().encode(data).byteLength;

      let event: VoiceLiveServerEvent;
      try {
        event = JSON.parse(data);
      } catch {
        return;
      }

      try {
        // Log every incoming server event. Large payload fields (audio/delta) are redacted.
        if (shouldLogVoiceLiveEvent(event.type)) {
          console.debug("[VoiceLive] recv", event.type, redactForConsole(event));
        }
      } catch {
        // ignore
      }

      this.callbacks.onServerEvent?.(event);

      const type = event.type;
      const r = asRecord(event) ?? {};

      const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();

      const markFirstResponse = () => {
        if (!this.waitingFirstResponse || this.speechEndAtMs === null) return;
        const dt = Math.max(0, nowMs - this.speechEndAtMs);
        this.waitingFirstResponse = false;
        this.speechEndAtMs = null;
        this.speechToFirstResponseMs.push(dt);

        const xs = this.speechToFirstResponseMs.slice().sort((a, b) => a - b);
        const n = xs.length;
        const min = xs[0] ?? 0;
        const avg = n ? xs.reduce((a, b) => a + b, 0) / n : 0;
        const p90Index = n ? Math.max(0, Math.ceil(0.9 * n) - 1) : 0;
        const p90 = xs[p90Index] ?? 0;

        this.usage.speechEndToFirstResponseCount = n;
        this.usage.speechEndToFirstResponseMsMin = min;
        this.usage.speechEndToFirstResponseMsAvg = avg;
        this.usage.speechEndToFirstResponseMsP90 = p90;
        this.emitStats();
      };

      if (type === "response.created") {
        this.responseActive = true;
        this.responseApiDone = false;
        this.bargeInCancelSent = false;
        this.responseCreateInFlight = false;
        this.assistantTextBuffer = "";
        this.assistantTextDoneEmitted = false;
        markFirstResponse();
      }

      if (type === "response.done") {
        this.responseActive = false;
        this.responseApiDone = true;
        this.bargeInCancelSent = false;

        if (this.pendingResponseCreate) {
          this.pendingResponseCreate = false;
          try {
            this.requestResponseCreate();
          } catch {
            // ignore
          }
        }
      }

      if (type === "input_audio_buffer.speech_stopped" || type === "input_audio_buffer_speech_stopped") {
        this.speechEndAtMs = nowMs;
        this.waitingFirstResponse = true;
      }

      if (this.enableBargeIn && (type === "input_audio_buffer.speech_started" || type === "input_audio_buffer_speech_started")) {
        // Stop current playback immediately (barge-in).
        this.player.stop();

        // Cancel the in-flight response if there is one.
        if (this.responseActive && !this.responseApiDone && !this.bargeInCancelSent) {
          try {
            this.send({ type: "response.cancel" });
            this.bargeInCancelSent = true;
          } catch {
            // ignore
          }
        }
      }

      if (type === "error") {
        const err = asRecord(r.error);
        const message = (err && getString(err, "message")) ?? "VoiceLive error";
        this.callbacks.onError?.(message);
        this.emitStats();
        return;
      }

      if (type === "response.text.delta") {
        const delta = getString(r, "delta");
        if (delta) {
          this.assistantTextBuffer += delta;
          this.callbacks.onAssistantTextDelta?.(delta);
        }
        markFirstResponse();
      }

      if (type === "response.output_text.delta") {
        const delta = getString(r, "delta");
        if (delta) {
          this.assistantTextBuffer += delta;
          this.callbacks.onAssistantTextDelta?.(delta);
        }
        markFirstResponse();
      }

      if (type === "response.audio_transcript.delta" || type === "response.output_audio_transcript.delta") {
        const delta = getString(r, "delta");
        if (delta) {
          this.assistantTextBuffer += delta;
          this.callbacks.onAssistantTextDelta?.(delta);
        }
        markFirstResponse();
      }

      if (type === "response.text.done") {
        const text = getString(r, "text");
        if (text) {
          this.assistantTextBuffer = text;
          if (!this.assistantTextDoneEmitted && text !== this.lastAssistantTextDone) {
            this.assistantTextDoneEmitted = true;
            this.lastAssistantTextDone = text;
            this.callbacks.onAssistantTextDone?.(text);
          }
        }
      }

      if (type === "response.output_text.done") {
        const text = getString(r, "text");
        if (text) {
          this.assistantTextBuffer = text;
          if (!this.assistantTextDoneEmitted && text !== this.lastAssistantTextDone) {
            this.assistantTextDoneEmitted = true;
            this.lastAssistantTextDone = text;
            this.callbacks.onAssistantTextDone?.(text);
          }
        }
      }

      if (type === "response.audio_transcript.done" || type === "response.output_audio_transcript.done") {
        const text = getString(r, "text");
        if (text) {
          this.assistantTextBuffer = text;
          if (!this.assistantTextDoneEmitted && text !== this.lastAssistantTextDone) {
            this.assistantTextDoneEmitted = true;
            this.lastAssistantTextDone = text;
            this.callbacks.onAssistantTextDone?.(text);
          }
        }
      }

      if (type === "response.audio.delta") {
        const delta = getString(r, "delta");
        if (delta && delta.length > 0) {
          const bytes = base64ToBytes(delta);
          this.wire.audioReceivedBytes += bytes.byteLength;
          await this.player.ensureRunning();
          this.player.enqueue(pcm16Base64ToChunk(delta, 24000));
          this.emitStats();
          markFirstResponse();
        }
      }

      if (type === "conversation.item.input_audio_transcription.completed") {
        const transcript = getString(r, "transcript");
        if (transcript) this.callbacks.onUserTranscript?.(transcript);
      }

      if (type === "response.output_item.added") {
        const item = asRecord(r.item);
        if (item && getString(item, "type") === "function_call") {
          const callId = getString(item, "call_id");
          const name = getString(item, "name");
          const itemId = getString(item, "id");
          if (callId && name) this.pendingFunctionCallsById.set(callId, { name, itemId });
        }
      }

      if (type === "response.output_item.done") {
        const item = asRecord(r.item);
        if (item && getString(item, "type") === "message" && getString(item, "role") === "assistant") {
          const content = getArray(item, "content");
          if (content) {
            let text = "";
            for (const partUnknown of content) {
              const part = asRecord(partUnknown);
              if (!part) continue;
              const partType = getString(part, "type");
              if (partType === "output_text" || partType === "text") {
                const t = getString(part, "text");
                if (t) text += t;
              }
            }
            if (text) {
              this.assistantTextBuffer = text;
              if (!this.assistantTextDoneEmitted && text !== this.lastAssistantTextDone) {
                this.assistantTextDoneEmitted = true;
                this.lastAssistantTextDone = text;
                this.callbacks.onAssistantTextDone?.(text);
              }
            }
          }
        }
      }

      if (type === "response.function_call_arguments.done") {
        const callId = getString(r, "call_id");
        const args = getString(r, "arguments");
        if (callId && typeof args === "string") {
          const pending = this.pendingFunctionCallsById.get(callId);
          if (!pending) return;

          this.wire.toolCalls += 1;
          this.emitStats();

          try {
            const result = await this.functionHandler({
              name: pending.name,
              callId,
              argumentsJson: args,
            });

            this.send({
              type: "conversation.item.create",
              previous_item_id: pending.itemId,
              item: {
                type: "function_call_output",
                call_id: callId,
                output: result.output,
              },
            });

            // Let the model finish the response using the tool output.
            this.requestResponseCreate();
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            this.send({
              type: "conversation.item.create",
              previous_item_id: pending.itemId,
              item: {
                type: "function_call_output",
                call_id: callId,
                output: JSON.stringify({ error: message }),
              },
            });
            this.requestResponseCreate();
          } finally {
            this.pendingFunctionCallsById.delete(callId);
          }
        }
      }

      if (type === "response.done") {
        this.usage.turns += 1;

        // If the response was audio-only, we may only have transcript deltas.
        if (!this.assistantTextDoneEmitted && this.assistantTextBuffer.trim()) {
          const text = this.assistantTextBuffer.trim();
          if (text !== this.lastAssistantTextDone) {
            this.lastAssistantTextDone = text;
            this.callbacks.onAssistantTextDone?.(text);
          }
          this.assistantTextDoneEmitted = true;
        }

        const response = asRecord(r.response);
        const usage = response ? asRecord(response.usage) : null;
        if (usage) {
          this.usage.totalTokens += getNumber(usage, "total_tokens") ?? 0;
          this.usage.inputTokens += getNumber(usage, "input_tokens") ?? 0;
          this.usage.outputTokens += getNumber(usage, "output_tokens") ?? 0;

          const inputDetails = asRecord(usage.input_token_details);
          const outputDetails = asRecord(usage.output_token_details);
          this.usage.inputTextTokens += (inputDetails && getNumber(inputDetails, "text_tokens")) ?? 0;
          this.usage.inputAudioTokens += (inputDetails && getNumber(inputDetails, "audio_tokens")) ?? 0;
          this.usage.outputTextTokens += (outputDetails && getNumber(outputDetails, "text_tokens")) ?? 0;
          this.usage.outputAudioTokens += (outputDetails && getNumber(outputDetails, "audio_tokens")) ?? 0;

          // Cached tokens (if present)
          this.usage.inputCachedTokens += (inputDetails && getNumber(inputDetails, "cached_tokens")) ?? 0;
          this.usage.outputCachedTokens += (outputDetails && getNumber(outputDetails, "cached_tokens")) ?? 0;

          this.usage.inputTextCachedTokens += (inputDetails && getNumber(inputDetails, "cached_text_tokens")) ?? 0;
          this.usage.inputAudioCachedTokens += (inputDetails && getNumber(inputDetails, "cached_audio_tokens")) ?? 0;
          this.usage.outputTextCachedTokens += (outputDetails && getNumber(outputDetails, "cached_text_tokens")) ?? 0;
          this.usage.outputAudioCachedTokens += (outputDetails && getNumber(outputDetails, "cached_audio_tokens")) ?? 0;
        }
        this.emitStats();
      }

      this.emitStats();
    };

    ws.onerror = () => {
      try {
        console.debug("[VoiceLive] ws error");
      } catch {
        // ignore
      }
      this.callbacks.onError?.("WebSocket error");
    };

    ws.onclose = () => {
      try {
        console.debug("[VoiceLive] ws close");
      } catch {
        // ignore
      }
      this.setStatus("disconnected");
      this.stopMicrophone();
      this.player.stop();
    };
  }

  disconnect() {
    try {
      this.stopMicrophone();
      this.ws?.close();
    } finally {
      this.ws = null;
      this.setStatus("disconnected");
      this.responseCreateInFlight = false;
      this.pendingResponseCreate = false;
    }
  }

  sendTextMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: trimmed }],
      },
    });

    // For text input, explicitly request a response.
    this.requestResponseCreate();
  }

  async startMicrophone() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error("Connect first");
    if (this.workletNode) return;

    await this.player.ensureRunning();

    const ac = new AudioContext();
    this.audioContext = ac;

    await ac.audioWorklet.addModule("/worklets/pcm16-downsampler.js");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaStream = stream;

    const source = ac.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(ac, "pcm16-downsampler");
    this.workletNode = worklet;

    worklet.port.onmessage = (e) => {
      const buffer = e.data as ArrayBuffer;
      const pcm16Bytes = new Uint8Array(buffer);
      this.wire.audioSentBytes += pcm16Bytes.byteLength;

      // NOTE: Do not cancel on any mic audio chunk. That can interrupt assistant playback
      // due to continuous low-level noise/echo. We rely on server-side VAD speech_started
      // (and explicit input_audio_buffer.speech_started) for barge-in.

      const b64 = bytesToBase64(pcm16Bytes);
      this.send({ type: "input_audio_buffer.append", audio: b64 });
    };

    // Keep the graph alive.
    const gain = ac.createGain();
    gain.gain.value = 0;

    source.connect(worklet);
    worklet.connect(gain);
    gain.connect(ac.destination);
  }

  stopMicrophone() {
    this.workletNode?.disconnect();
    this.workletNode = null;

    if (this.mediaStream) {
      for (const t of this.mediaStream.getTracks()) t.stop();
    }
    this.mediaStream = null;

    if (this.audioContext) {
      this.audioContext.close();
    }
    this.audioContext = null;
  }
}

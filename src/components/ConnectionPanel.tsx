"use client";

import type { VoiceLiveConnectionConfig, VoiceLiveVoice } from "@/lib/voiceLive/types";
import { normalizeResourceHost } from "@/lib/voiceLive/normalize";

type Props = {
  config: VoiceLiveConnectionConfig;
  onChange: (next: VoiceLiveConnectionConfig) => void;
  status: "disconnected" | "connecting" | "connected";
  micOn: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleMic: () => void;
};

function setVoice(config: VoiceLiveConnectionConfig, voice: VoiceLiveVoice): VoiceLiveConnectionConfig {
  return { ...config, voice };
}

export function ConnectionPanel({
  config,
  onChange,
  status,
  micOn,
  onConnect,
  onDisconnect,
  onToggleMic,
}: Props) {
  const voiceType = config.voice.type;

  return (
    <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">连接配置</h2>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">状态：{status}</div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3">
        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Resource Host</span>
          <input
            className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
            value={config.resourceHost}
            onChange={(e) =>
              onChange({ ...config, resourceHost: normalizeResourceHost(e.target.value) || e.target.value.trim() })
            }
            placeholder="<resource>.services.ai.azure.com (host only)"
            spellCheck={false}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">API Version</span>
            <input
              className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
              value={config.apiVersion}
              onChange={(e) => onChange({ ...config, apiVersion: e.target.value.trim() })}
              placeholder="2025-10-01"
              spellCheck={false}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Model</span>
            <select
              className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
              value={config.model}
              onChange={(e) => onChange({ ...config, model: e.target.value })}
            >
              <optgroup label="Voice live pro">
                <option value="gpt-realtime">gpt-realtime</option>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4.1">gpt-4.1</option>
                <option value="gpt-5">gpt-5</option>
                <option value="gpt-5-chat">gpt-5-chat</option>
              </optgroup>
              <optgroup label="Voice live basic">
                <option value="gpt-realtime-mini">gpt-realtime-mini</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                <option value="gpt-5-mini">gpt-5-mini</option>
              </optgroup>
              <optgroup label="Voice live lite">
                <option value="gpt-5-nano">gpt-5-nano</option>
                <option value="phi4-mm-realtime">phi4-mm-realtime</option>
                <option value="phi4-mini">phi4-mini</option>
              </optgroup>
            </select>
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">API Key（浏览器连接会写入 URL Query）</span>
          <input
            className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
            value={config.apiKey}
            onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
            placeholder="******"
            type="password"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Voice Type</span>
            <select
              className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
              value={voiceType}
              onChange={(e) => {
                const nextType = e.target.value as VoiceLiveVoice["type"];
                if (nextType === "openai") onChange(setVoice(config, { type: "openai", name: "alloy" }));
                if (nextType === "azure-standard")
                  onChange(setVoice(config, { type: "azure-standard", name: "zh-CN-XiaochenMultilingualNeural" }));
                if (nextType === "azure-custom")
                  onChange(setVoice(config, { type: "azure-custom", name: "my-custom-voice", endpoint_id: "" }));
              }}
            >
              <option value="openai">openai</option>
              <option value="azure-standard">azure-standard</option>
              <option value="azure-custom">azure-custom</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Voice Name</span>
            <input
              className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
              value={config.voice.name}
              onChange={(e) => onChange(setVoice(config, { ...config.voice, name: e.target.value }))}
              placeholder={voiceType === "openai" ? "alloy" : "en-US-Ava:DragonHDLatestNeural"}
              spellCheck={false}
            />
          </label>
        </div>

        {voiceType === "azure-custom" ? (
          <label className="grid gap-1">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Azure Custom Voice Endpoint ID</span>
            <input
              className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
              value={config.voice.type === "azure-custom" ? config.voice.endpoint_id : ""}
              onChange={(e) => {
                if (config.voice.type !== "azure-custom") return;
                onChange(setVoice(config, { ...config.voice, endpoint_id: e.target.value }));
              }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              spellCheck={false}
            />
          </label>
        ) : null}

        <label className="grid gap-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Language Hint（可选）</span>
          <input
            className="h-10 rounded-md border border-black/10 bg-transparent px-3 text-sm text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
            value={config.languageHint ?? ""}
            onChange={(e) => onChange({ ...config, languageHint: e.target.value.trim() || undefined })}
            placeholder="zh,en"
            spellCheck={false}
          />
        </label>

        <div className="mt-2 flex flex-wrap gap-2">
          {status !== "connected" ? (
            <button
              className="h-10 rounded-md bg-black px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
              onClick={onConnect}
              disabled={!config.resourceHost || !config.apiVersion || !config.model || !config.apiKey}
            >
              连接
            </button>
          ) : (
            <button
              className="h-10 rounded-md border border-black/10 bg-transparent px-4 text-sm font-medium text-zinc-900 dark:border-white/15 dark:text-zinc-100"
              onClick={onDisconnect}
            >
              断开
            </button>
          )}

          <button
            className="h-10 rounded-md border border-black/10 bg-transparent px-4 text-sm font-medium text-zinc-900 disabled:opacity-50 dark:border-white/15 dark:text-zinc-100"
            onClick={onToggleMic}
            disabled={status !== "connected"}
          >
            {micOn ? "停止麦克风" : "开启麦克风"}
          </button>
        </div>
      </div>
    </section>
  );
}

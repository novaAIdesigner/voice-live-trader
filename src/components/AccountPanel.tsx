"use client";

import type { AccountBalance, CurrencyCode, FxConvertRequest, FxConvertResponse } from "@/lib/trade/types";
import { useMemo, useState } from "react";
import { useFlashOnChange } from "@/lib/hooks";

type Props = {
  balances: AccountBalance[];
  onConvert: (req: FxConvertRequest) => Promise<FxConvertResponse>;
  onAdjust?: (req: { currency: "USD" | "JPY" | "CNY"; amount: number }) => Promise<{ ok: boolean; error?: string }>;
};

const DISPLAY_CCYS: Array<"USD" | "JPY" | "CNY"> = ["USD", "JPY", "CNY"];
const CONVERT_CCYS: CurrencyCode[] = ["USD", "JPY", "CNY"];

function BalanceCard({ ccy, balance }: { ccy: CurrencyCode; balance?: AccountBalance }) {
  const flash = useFlashOnChange(balance?.available);
  const h = "flash-3s";

  return (
    <div
      className={`rounded-md border border-black/10 bg-zinc-50 p-3 dark:border-white/15 dark:bg-black${
        flash ? " " + h : ""
      }`}
    >
      <div className="text-xs text-zinc-600 dark:text-zinc-400">{ccy}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {balance ? balance.available.toLocaleString() : "0"}
      </div>
      <div className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
        预留：{balance ? balance.reserved.toLocaleString() : "0"}
      </div>
    </div>
  );
}

export function AccountPanel({ balances, onConvert, onAdjust }: Props) {
  const [from, setFrom] = useState<CurrencyCode>("USD");
  const [to, setTo] = useState<CurrencyCode>("CNY");
  const [amount, setAmount] = useState<string>("100");
  const [busy, setBusy] = useState(false);

  const [cashCcy, setCashCcy] = useState<"USD" | "JPY" | "CNY">("USD");
  const [cashAmount, setCashAmount] = useState<string>("1000");
  const [cashMode, setCashMode] = useState<"deposit" | "withdraw">("deposit");

  const [error, setError] = useState<string | null>(null);

  const byCcy = useMemo(() => {
    const m = new Map<CurrencyCode, AccountBalance>();
    for (const b of balances) m.set(b.currency, b);
    return m;
  }, [balances]);

  async function submit() {
    setError(null);
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("金额必须 > 0");
      return;
    }
    if (from === to) {
      setError("from/to 不能相同");
      return;
    }

    setBusy(true);
    try {
      const res = await onConvert({ from, to, amount: n });
      if (!res.ok) setError(res.error ?? "换汇失败");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitCash() {
    if (!onAdjust) {
      setError("未配置出入金接口");
      return;
    }
    setError(null);
    const n = Number(cashAmount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("金额必须 > 0");
      return;
    }

    setBusy(true);
    try {
      const amountSigned = cashMode === "deposit" ? n : -n;
      const res = await onAdjust({ currency: cashCcy, amount: amountSigned });
      if (!res.ok) setError(res.error ?? "操作失败");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">账户余额</h2>
        {error ? <div className="text-xs text-red-600">{error}</div> : null}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {DISPLAY_CCYS.map((ccy) => (
          <BalanceCard key={ccy} ccy={ccy} balance={byCcy.get(ccy)} />
        ))}
      </div>

      <div className="mt-3 grid gap-2">
        <details className="rounded-md border border-black/10 dark:border-white/15">
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100">
            换汇
          </summary>
          <div className="grid gap-2 border-t border-black/10 p-3 dark:border-white/15">
            <select
              className="h-9 rounded-md border border-black/10 bg-transparent px-2 text-xs text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
              value={from}
              onChange={(e) => setFrom(e.target.value as CurrencyCode)}
              disabled={busy}
            >
              {CONVERT_CCYS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-black/10 bg-transparent px-2 text-xs text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
              value={to}
              onChange={(e) => setTo(e.target.value as CurrencyCode)}
              disabled={busy}
            >
              {CONVERT_CCYS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              className="h-9 rounded-md border border-black/10 bg-transparent px-2 text-xs text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="金额"
              disabled={busy}
            />
            <button
              className="h-9 w-full rounded-md bg-black px-3 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
              onClick={submit}
              disabled={busy}
            >
              {busy ? "处理中…" : "确认"}
            </button>
          </div>
        </details>

        <details className="rounded-md border border-black/10 dark:border-white/15">
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100">
            出入金（仅 USD/JPY/CNY）
          </summary>
          <div className="grid gap-2 border-t border-black/10 p-3 dark:border-white/15">
            <select
              className="h-9 rounded-md border border-black/10 bg-transparent px-2 text-xs text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
              value={cashMode}
              onChange={(e) => setCashMode(e.target.value as "deposit" | "withdraw")}
              disabled={busy}
            >
              <option value="deposit">入金</option>
              <option value="withdraw">出金</option>
            </select>
            <select
              className="h-9 rounded-md border border-black/10 bg-transparent px-2 text-xs text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
              value={cashCcy}
              onChange={(e) => setCashCcy(e.target.value as "USD" | "JPY" | "CNY")}
              disabled={busy}
            >
              {DISPLAY_CCYS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              className="h-9 rounded-md border border-black/10 bg-transparent px-2 text-xs text-zinc-900 outline-none dark:border-white/15 dark:text-zinc-100"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              inputMode="decimal"
              placeholder="金额"
              disabled={busy}
            />
            <button
              className="h-9 w-full rounded-md bg-black px-3 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
              onClick={submitCash}
              disabled={busy || !onAdjust}
            >
              {busy ? "处理中…" : "确认"}
            </button>
          </div>
        </details>
      </div>
    </section>
  );
}

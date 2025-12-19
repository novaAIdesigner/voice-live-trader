"use client";

import { memo } from "react";
import { TradeForm, PRODUCT_LABEL } from "./TradeForm";
import { TradeOrderRequest, TradeOrderResponse } from "@/lib/trade/types";
import { TradeTicket } from "@/lib/trade/ticket";
import { useFlashOnChange } from "@/lib/hooks";

type Props = {
  t: TradeTicket;
  idx: number;
  onToggleCollapse: (id: string) => void;
  onUpdateOrder: (id: string, order: TradeOrderRequest) => void;
  onSubmit: (id: string) => void;
  onDelete: (id: string) => void;
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
  return s.replace("T", " ").slice(0, 19);
}

function fmtNum(n: number | undefined, digits = 2) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  return n.toFixed(digits);
}

function canSubmitOrder(order: TradeOrderRequest) {
  if (!order.symbol.trim()) return false;
  if (!Number.isFinite(order.quantity) || order.quantity <= 0) return false;
  if (order.orderType === "limit") {
    if (!Number.isFinite(order.limitPrice) || (order.limitPrice ?? 0) <= 0) return false;
  }
  return true;
}

export const TicketCard = memo(function TicketCard({
  t,
  idx,
  onToggleCollapse,
  onUpdateOrder,
  onSubmit,
  onDelete,
}: Props) {
  const label = `#${idx + 1}`;
  const resp = t.lastResponse;

  const flashProduct = useFlashOnChange(t.order.productType);
  const flashStatus = useFlashOnChange(resp?.status ?? "");
  const canSubmit = canSubmitOrder(t.order);
  const flashSubmit = useFlashOnChange(canSubmit);

  if (t.frozen && resp) {
    const filledAt = fmtIsoShort(resp.filledAt);
    const receivedAt = fmtIsoShort(resp.receivedAt);
    const fillPrice = fmtNum(resp.fillPrice, 4) || fmtNum(resp.fillPrice, 2);
    const fillValue = fmtNum(resp.fillValue, 2);

    return (
      <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <div className="text-xs text-zinc-500">{label}</div>
              <div className={`text-xs font-semibold ${statusClass(resp.status)}${flashStatus ? " flash-3s" : ""}`}>
                {statusLabel(resp.status)}
              </div>
              <div className="text-xs text-zinc-500">订单号 {resp.orderId}</div>
            </div>
            <div className="mt-0.5 truncate font-medium">{resp.summary}</div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
              {resp.status === "filled" ? (
                <>
                  {filledAt ? <span>成交时间 {filledAt}</span> : null}
                  {fillPrice ? <span>成交价 {fillPrice}</span> : null}
                  {fillValue ? (
                    <span>
                      成交额 {fillValue} {resp.order.currency ?? ""}
                    </span>
                  ) : null}
                </>
              ) : (
                <>{receivedAt ? <span>提交时间 {receivedAt}</span> : null}</>
              )}
            </div>
          </div>

          <button
            className="h-8 shrink-0 rounded-md border border-border bg-transparent px-3 text-xs font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5"
            onClick={() => onToggleCollapse(t.id)}
          >
            {t.collapsed ? "详情" : "收起"}
          </button>
        </div>

        {!t.collapsed ? (
          <div className="mt-3">
            <TradeForm
              order={t.order}
              disabled
              onOrderChange={() => {
                // frozen
              }}
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (t.frozen && !resp) {
    return (
      <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">{label}</div>
            <div className="mt-0.5 truncate font-medium">已提交订单</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-zinc-500">{label}</div>
            <div className="text-xs font-semibold text-foreground">填写中</div>
            <select
              className={
                "h-8 rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none" +
                (flashProduct ? " flash-3s" : "")
              }
              value={t.order.productType}
              onChange={(e) =>
                onUpdateOrder(t.id, { ...t.order, productType: e.target.value as TradeOrderRequest["productType"] })
              }
            >
              {(Object.keys(PRODUCT_LABEL) as Array<keyof typeof PRODUCT_LABEL>).map((pt) => (
                <option key={pt} value={pt}>
                  {PRODUCT_LABEL[pt]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            className={
              "h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50" +
              (flashSubmit ? " flash-3s" : "")
            }
            disabled={!canSubmit}
            onClick={() => onSubmit(t.id)}
          >
            提交
          </button>
          <button
            className="h-8 rounded-md border border-border bg-transparent px-3 text-xs font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5"
            onClick={() => onDelete(t.id)}
          >
            删除
          </button>
        </div>
      </div>

      <div className="mt-3">
        <TradeForm order={t.order} onOrderChange={(next) => onUpdateOrder(t.id, next)} />
      </div>
    </div>
  );
});

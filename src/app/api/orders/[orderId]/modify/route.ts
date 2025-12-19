import { NextResponse } from "next/server";
import type { ModifyOrderRequest } from "@/lib/trade/types";
import { modifyOrder } from "@/lib/trade/engine";

export async function POST(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as ModifyOrderRequest | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const res = modifyOrder(orderId, body);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

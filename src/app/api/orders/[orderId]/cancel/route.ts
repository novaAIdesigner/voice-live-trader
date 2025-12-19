import { NextResponse } from "next/server";
import { cancelOrder } from "@/lib/trade/engine";

export async function POST(_: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params;
  const res = cancelOrder(orderId);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

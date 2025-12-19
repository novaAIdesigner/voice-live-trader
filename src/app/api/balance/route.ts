import { NextResponse } from "next/server";
import type { BalanceAdjustRequest } from "@/lib/trade/types";
import { adjustBalance } from "@/lib/trade/engine";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as BalanceAdjustRequest | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const res = adjustBalance(body);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

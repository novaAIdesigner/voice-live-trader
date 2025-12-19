import { NextResponse } from "next/server";
import type { FxConvertRequest } from "@/lib/trade/types";
import { convertCurrency } from "@/lib/trade/engine";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as FxConvertRequest | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const res = convertCurrency(body);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

import { NextResponse } from "next/server";
import { getAccountSnapshot } from "@/lib/trade/engine";

export async function GET() {
  return NextResponse.json(getAccountSnapshot());
}

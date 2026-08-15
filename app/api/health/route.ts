import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { ok: true, unit: "TARS" },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST() {
  return GET();
}

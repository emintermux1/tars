import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = process.uptime();
  const hasKey = Boolean(process.env.XAI_API_KEY);
  return NextResponse.json({
    unit: "TARS",
    uplink: hasKey ? "READY" : "DARK",
    model: process.env.XAI_MODEL || "grok-3",
    uptimeSec: Math.floor(started),
    host: "local",
    time: new Date().toISOString(),
  });
}

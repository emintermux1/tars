import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ca = (process.env.TARS_CA || "").trim();
  return NextResponse.json({
    ca: ca || "CA pending",
    hasCa: Boolean(ca),
    chartUrl: (process.env.TARS_CHART_URL || "").trim(),
    buyUrl: (process.env.TARS_BUY_URL || "").trim(),
    xUrl: (process.env.TARS_X_URL || "").trim(),
  });
}

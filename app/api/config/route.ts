import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_CA = "FsPg4XFfwwLUM67FbYdhBF2jjDZt5sPkYrcMfC1gpump";
const DEFAULT_CHART = "https://dexscreener.com/solana/FsPg4XFfwwLUM67FbYdhBF2jjDZt5sPkYrcMfC1gpump";
const DEFAULT_BUY = "https://pump.fun/coin/FsPg4XFfwwLUM67FbYdhBF2jjDZt5sPkYrcMfC1gpump";

export async function GET() {
  const ca = (process.env.TARS_CA || DEFAULT_CA).trim();
  const hasCa = Boolean(ca);
  return NextResponse.json({
    ca: hasCa ? ca : "CA pending",
    hasCa,
    chartUrl: (process.env.TARS_CHART_URL || DEFAULT_CHART).trim(),
    buyUrl: (process.env.TARS_BUY_URL || DEFAULT_BUY).trim(),
    xUrl: (process.env.TARS_X_URL || "").trim(),
  });
}

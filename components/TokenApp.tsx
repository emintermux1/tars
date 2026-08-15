"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TokenConfig } from "@/lib/types";

export default function TokenApp() {
  const [cfg, setCfg] = useState<TokenConfig>({
    ca: "CA pending",
    hasCa: false,
    chartUrl: "",
    buyUrl: "",
    xUrl: "",
  });
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setCfg(d))
      .catch(() => {});
  }, []);

  function copy() {
    const text = cfg.hasCa ? cfg.ca : "CA pending";
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(cfg.hasCa ? "Copied." : "Copied placeholder: CA pending");
      window.setTimeout(() => setCopied(""), 1800);
    });
  }

  const buyReady = cfg.hasCa && Boolean(cfg.buyUrl);
  const chartReady = cfg.hasCa && Boolean(cfg.chartUrl);

  return (
    <div className="flex h-[100svh] flex-col bg-void px-4 py-4">
      <header className="mb-8 flex items-center justify-between">
        <p className="wordmark m-0 text-[0.72rem]">TARS</p>
        <nav className="flex gap-2">
          <Link href="/" className="icon-btn inline-flex items-center">
            Companion
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-lg space-y-6" id="main">
        <p className="wordmark text-[1.1rem] text-paper">$TARS</p>
        <p className="text-[0.9rem] leading-relaxed text-paper/90">
          Ticker for the companion unit. Contract address will be published here when it exists.
          No market cap. No holders. No volume. No invented supply. No exchange list.
        </p>
        <p className="text-[0.72rem] tracking-[0.18em] text-mute">CONTRACT</p>
        <p className="break-all border border-white/10 px-3 py-3 text-[0.85rem]">{cfg.ca}</p>
        <div className="flex flex-col gap-2">
          <button type="button" className="metal-btn" onClick={copy} disabled={false}>
            {cfg.hasCa ? "Copy CA" : "Copy CA — pending"}
          </button>
          {chartReady ? (
            <a className="metal-btn text-center" href={cfg.chartUrl} target="_blank" rel="noreferrer">
              View chart
            </a>
          ) : (
            <button type="button" className="metal-btn" disabled>
              View chart — CA pending
            </button>
          )}
          {buyReady ? (
            <a className="metal-btn text-center" href={cfg.buyUrl} target="_blank" rel="noreferrer">
              Buy $TARS
            </a>
          ) : (
            <button type="button" className="metal-btn" disabled>
              Buy $TARS — CA pending
            </button>
          )}
          {cfg.xUrl ? (
            <a className="metal-btn ghost text-center" href={cfg.xUrl} target="_blank" rel="noreferrer">
              X
            </a>
          ) : null}
        </div>
        {copied && <p className="text-[0.72rem] text-amber">{copied}</p>}
        <p className="text-[0.72rem] text-mute">
          Inspired by the rectangular machine idea. Not affiliated with any studio or film. Rs61 Ahmet.
        </p>
      </main>
    </div>
  );
}

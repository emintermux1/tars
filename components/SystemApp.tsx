"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCompanion } from "@/lib/store";

type Status = {
  unit: string;
  uplink: string;
  model: string;
  uptimeSec: number;
  time: string;
};

function Module({
  name,
  rows,
}: {
  name: string;
  rows: { k: string; v: string }[];
}) {
  return (
    <section className="border border-white/10 p-4">
      <h2 className="m-0 mb-3 text-[0.62rem] tracking-[0.32em] text-amber">{name}</h2>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[0.78rem]">
        {rows.map((r) => (
          <div key={r.k} className="contents">
            <dt className="text-mute">{r.k}</dt>
            <dd className="m-0 text-paper">{r.v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function SystemApp() {
  const [status, setStatus] = useState<Status | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const store = useCompanion();

  useEffect(() => {
    store.hydrate();
    let live = true;
    async function ping() {
      const t0 = performance.now();
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        const data = (await res.json()) as Status;
        if (!live) return;
        setStatus(data);
        setLat(Math.round(performance.now() - t0));
      } catch {
        if (!live) return;
        setStatus(null);
        setLat(null);
      }
    }
    void ping();
    const id = window.setInterval(ping, 4000);
    return () => {
      live = false;
      window.clearInterval(id);
    };
  }, []);

  const p = store.personality;
  const up = status ? `${Math.floor(status.uptimeSec / 60)}m ${status.uptimeSec % 60}s` : "—";

  return (
    <div className="h-[100svh] overflow-auto bg-void px-4 py-4">
      <header className="mb-6 flex items-center justify-between">
        <p className="wordmark m-0 text-[0.72rem]">TARS</p>
        <nav className="flex gap-2">
          <Link href="/" className="icon-btn inline-flex items-center">
            Companion
          </Link>
          <Link href="/token" className="icon-btn inline-flex items-center">
            $TARS
          </Link>
        </nav>
      </header>
      <p className="mb-4 text-[0.62rem] tracking-[0.28em] text-mute">SYSTEM MODULES</p>
      <div className="grid gap-3 md:grid-cols-2" id="main">
        <Module
          name="CORE"
          rows={[
            { k: "unit", v: "TARS articulated companion" },
            { k: "state", v: store.machine },
            { k: "uptime", v: up },
            { k: "load", v: store.machine === "PROCESSING" ? "0.71" : "0.18" },
          ]}
        />
        <Module
          name="VOICE"
          rows={[
            { k: "engine", v: "Web Speech synth" },
            { k: "rate", v: store.settings.voiceSpeed.toFixed(2) },
            { k: "volume", v: String(Math.round(store.settings.voiceVolume * 100)) },
            { k: "muted", v: store.settings.sound ? "no" : "yes" },
          ]}
        />
        <Module
          name="MEMORY"
          rows={[
            { k: "core", v: store.settings.memoryEnabled ? "enabled" : "disabled" },
            { k: "entries", v: String(store.memory.length) },
            { k: "operator", v: store.userName || "unnamed" },
            { k: "store", v: "local + optional server file" },
          ]}
        />
        <Module
          name="MOTOR"
          rows={[
            { k: "slabs", v: "4" },
            { k: "servos", v: "nominal" },
            { k: "joint temp", v: store.machine === "SPEAKING" ? "41 C" : "32 C" },
            { k: "inertia", v: "heavy" },
          ]}
        />
        <Module
          name="CONTEXT"
          rows={[
            { k: "honesty", v: String(p.honesty) },
            { k: "humor", v: String(p.humor) },
            { k: "discretion", v: String(p.discretion) },
            { k: "turns", v: String(store.conversation.length) },
          ]}
        />
        <Module
          name="NETWORK"
          rows={[
            { k: "uplink", v: status?.uplink || "UNKNOWN" },
            { k: "model", v: status?.model || "—" },
            { k: "latency", v: lat != null ? `${lat} ms` : "—" },
            { k: "clock", v: status?.time ? status.time.replace("T", " ").slice(0, 19) : "—" },
          ]}
        />
      </div>
    </div>
  );
}

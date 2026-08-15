"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCompanion } from "@/lib/store";
import { DEFAULT_PERSONALITY } from "@/lib/types";

type Line = { kind: "in" | "out" | "sys"; text: string };

const HELP = [
  "HELP          this list",
  "STATUS        unit state",
  "MEMORY        memory core",
  "PERSONALITY   matrix values",
  "MISSION       standing orders",
  "VOICE         synth notes",
  "ABOUT         short lore",
  "TOKEN         $TARS / CA",
  "CLEAR         wipe this buffer",
  "Any other line is sent to TARS.",
];

export default function TerminalApp() {
  const [buf, setBuf] = useState<Line[]>([
    { kind: "sys", text: "TARS COMMAND  //  AEROSPACE LINK" },
    { kind: "sys", text: "Type HELP. Free text reaches the unit." },
  ]);
  const [cmd, setCmd] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    useCompanion.getState().hydrate();
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [buf]);

  function push(kind: Line["kind"], text: string) {
    setBuf((b) => [...b, { kind, text }]);
  }

  async function run(raw: string) {
    const line = raw.trim();
    if (!line) return;
    push("in", `> ${line}`);
    const key = line.toUpperCase();
    const s = useCompanion.getState();

    if (key === "HELP") {
      HELP.forEach((h) => push("out", h));
      return;
    }
    if (key === "STATUS") {
      push("out", `UNIT TARS   STATE ${s.machine || "OFFLINE"}`);
      push("out", `OPERATOR    ${s.userName || "UNNAMED"}`);
      push("out", `MEMORY      ${s.settings.memoryEnabled ? "ONLINE" : "DISABLED"}  ${s.memory.length} entries`);
      push("out", `SOUND       ${s.settings.sound ? "ON" : "OFF"}`);
      return;
    }
    if (key === "MEMORY") {
      if (!s.settings.memoryEnabled) {
        push("out", "Memory core disabled.");
        return;
      }
      if (!s.memory.length) {
        push("out", "Empty core.");
        return;
      }
      s.memory.forEach((m) => push("out", `${m.kind}  ${m.label}  ${m.value}`));
      return;
    }
    if (key === "PERSONALITY") {
      const p = s.personality || DEFAULT_PERSONALITY;
      Object.entries(p).forEach(([k, v]) => push("out", `${k.toUpperCase().padEnd(12)} ${v}`));
      return;
    }
    if (key === "MISSION") {
      push("out", "Stay useful. Keep the operator informed. Remember only what is stored. Do not sell anything.");
      return;
    }
    if (key === "VOICE") {
      push("out", "Web Speech synth. Calm low English. Original. Interrupt cancels immediately.");
      return;
    }
    if (key === "ABOUT") {
      push("out", "TARS is an articulated companion unit — four load-bearing slabs, a voice you can set, a memory core that only keeps what you allow.");
      push("out", "Inspired by the rectangular machine idea. Not affiliated with any studio or film. Built by Rs61 Ahmet.");
      return;
    }
    if (key === "TOKEN") {
      push("out", "Ticker $TARS. Contract address pending. No invented market figures. Open /token.");
      return;
    }
    if (key === "CLEAR") {
      setBuf([{ kind: "sys", text: "Buffer cleared." }]);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: line,
          personality: s.personality,
          history: s.conversation.slice(-6).map((t) => ({
            role: t.role === "tars" ? "assistant" : "user",
            content: t.text,
          })),
          memory: s.settings.memoryEnabled ? s.memory : [],
          memoryEnabled: s.settings.memoryEnabled,
          userName: s.userName,
        }),
      });
      const data = (await res.json()) as { reply?: string };
      const reply = data.reply || "Say again.";
      push("out", reply);
      s.addTurn("user", line);
      s.addTurn("tars", reply);
    } catch {
      push("out", "VOICE LINK INTERRUPTED");
      push("out", "Connection problem. Not mine, surprisingly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[100svh] flex-col bg-void px-4 py-4 scan">
      <header className="mb-3 flex items-center justify-between">
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
      <main className="min-h-0 flex-1 overflow-auto text-[0.8rem] leading-7" id="main">
        {buf.map((l, i) => (
          <p
            key={i}
            className={
              l.kind === "in" ? "m-0 text-amber" : l.kind === "sys" ? "m-0 text-mute" : "m-0 text-paper"
            }
          >
            {l.text}
          </p>
        ))}
        <div ref={end} />
      </main>
      <form
        className="mt-3 flex border border-white/10"
        onSubmit={(e) => {
          e.preventDefault();
          const v = cmd;
          setCmd("");
          void run(v);
        }}
      >
        <span className="px-2 py-3 text-amber">›</span>
        <input
          ref={input}
          className="min-h-12 flex-1 bg-transparent outline-none"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          autoFocus
          disabled={busy}
          placeholder="HELP"
          aria-label="Command"
        />
      </form>
    </div>
  );
}

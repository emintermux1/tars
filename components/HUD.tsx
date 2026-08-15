"use client";

import Link from "next/link";
import type { MachineState } from "@/lib/types";

export default function HUD({
  state,
  sound,
  onSound,
  onSettings,
}: {
  state: MachineState;
  sound: boolean;
  onSound: () => void;
  onSettings: () => void;
}) {
  return (
    <header className="hud pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between gap-2 px-3 pt-[max(0.7rem,var(--safe-t))]">
      <div className="pointer-events-auto flex min-w-0 items-center gap-2">
        <div className="flex min-w-0 flex-col leading-none">
          <span className="wordmark text-[0.72rem] text-paper">TARS</span>
          <Link href="/token" className="tars-wordmark" aria-label="$TARS token">
            $TARS
          </Link>
        </div>
        <span className="chip shrink-0">{state}</span>
      </div>
      <nav className="pointer-events-auto flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          className={`icon-btn ${sound ? "live" : ""}`}
          aria-pressed={sound}
          onClick={onSound}
          aria-label={sound ? "Sound on. Mute." : "Sound off. Unmute."}
        >
          {sound ? "Sound" : "Muted"}
        </button>
        <button type="button" className="icon-btn" onClick={onSettings}>
          Personality
        </button>
      </nav>
    </header>
  );
}

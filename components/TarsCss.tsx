"use client";

import type { MachineState } from "@/lib/types";

function DotGrid({ variant, cols, rows }: { variant: string; cols: number; rows: number }) {
  return (
    <i className={`tars-dots tars-dots--${variant}`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols * rows }, (_, i) => (
        <i key={i} className="tars-dot" />
      ))}
    </i>
  );
}

export default function TarsCss({
  state,
  compact,
}: {
  state?: MachineState;
  compact?: boolean;
}) {
  const live = state === "SPEAKING" || state === "LISTENING" || state === "PROCESSING";
  return (
    <div
      className={`tars-css ${compact ? "tars-css--gate" : "tars-css--stage"} ${live ? "is-live" : ""} ${state === "STANDBY" || state === "OFFLINE" ? "is-dim" : ""}`}
      aria-hidden
    >
      <i className="tars-halo" />
      <span className="tars-slab tars-slab--leg tars-slab--leg-l" />
      <span className="tars-slab tars-slab--inner tars-slab--name" data-mark="TARS">
        <i className="tars-screen" />
        <DotGrid variant="name" cols={2} rows={3} />
      </span>
      <span className="tars-slab tars-slab--inner tars-slab--sensors">
        <DotGrid variant="wide" cols={2} rows={8} />
      </span>
      <span className="tars-slab tars-slab--leg tars-slab--leg-r" />
    </div>
  );
}

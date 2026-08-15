"use client";

import TarsCss from "./TarsCss";

export default function Gate({ onInit }: { onInit: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-8 bg-[#070706]">
      <TarsCss compact />
      <div className="text-center space-y-2">
        <p className="wordmark text-[1.35rem] text-paper">TARS</p>
        <p className="text-[0.78rem] font-medium tracking-[0.32em] text-amber">AI COMPANION</p>
      </div>
      <button type="button" className="metal-btn min-w-[260px]" onClick={onInit}>
        ENTER TARS
      </button>
    </div>
  );
}

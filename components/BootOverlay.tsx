"use client";

export default function BootOverlay({ lines, returning }: { lines: string[]; returning: boolean }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/40 px-[8vw] py-[10vh]">
      <pre className="m-0 text-[0.72rem] leading-7 tracking-[0.12em] text-paper/90" aria-live="polite">
        {returning ? "RETURNING OPERATOR\n" : ""}
        {lines.join("\n")}
      </pre>
    </div>
  );
}

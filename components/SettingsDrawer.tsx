"use client";

import { useCompanion } from "@/lib/store";
import MemoryCore from "./MemoryCore";
import type { Personality } from "@/lib/types";

const SLIDERS: { key: keyof Personality; label: string }[] = [
  { key: "honesty", label: "Honesty" },
  { key: "humor", label: "Humor" },
  { key: "discretion", label: "Discretion" },
  { key: "initiative", label: "Initiative" },
  { key: "sarcasm", label: "Sarcasm" },
  { key: "empathy", label: "Empathy" },
];

export default function SettingsDrawer({
  open,
  onClose,
  onCommit,
}: {
  open: boolean;
  onClose: () => void;
  onCommit: (key: keyof Personality, value: number) => void;
}) {
  const personality = useCompanion((s) => s.personality);
  const settings = useCompanion((s) => s.settings);
  const setPersonality = useCompanion((s) => s.setPersonality);
  const setSettings = useCompanion((s) => s.setSettings);
  const clearConversation = useCompanion((s) => s.clearConversation);

  if (!open) return null;

  return (
    <aside
      className="panel pointer-events-auto absolute right-0 top-0 z-30 flex h-full w-full max-w-md flex-col overflow-auto px-5 py-6"
      role="dialog"
      aria-label="Personality matrix"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="m-0 text-[0.72rem] tracking-[0.32em] text-amber">PERSONALITY MATRIX</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close personality">
          Close
        </button>
      </div>
      <div className="space-y-5">
        {SLIDERS.map((s) => (
          <label key={s.key} className="block">
            <span className="flex justify-between text-[0.62rem] tracking-[0.2em] text-mute">
              {s.label.toUpperCase()}
              <em className="not-italic text-paper">{personality[s.key]}</em>
            </span>
            <input
              className="range mt-2"
              type="range"
              min={0}
              max={100}
              value={personality[s.key]}
              onInput={(e) => setPersonality({ [s.key]: Number((e.target as HTMLInputElement).value) })}
              onChange={(e) => onCommit(s.key, Number(e.target.value))}
            />
          </label>
        ))}
      </div>
      <hr className="my-6 border-white/10" />
      <h3 className="m-0 mb-4 text-[0.68rem] tracking-[0.28em] text-mute">VOICE / SCENE</h3>
      <label className="mb-3 block">
        <span className="flex justify-between text-[0.62rem] tracking-[0.2em] text-mute">
          VOICE SPEED <em className="not-italic text-paper">{settings.voiceSpeed.toFixed(2)}</em>
        </span>
        <input
          className="range mt-2"
          type="range"
          min={0.7}
          max={1.15}
          step={0.01}
          value={settings.voiceSpeed}
          onChange={(e) => setSettings({ voiceSpeed: Number(e.target.value) })}
        />
      </label>
      <label className="mb-3 block">
        <span className="flex justify-between text-[0.62rem] tracking-[0.2em] text-mute">
          VOICE VOLUME <em className="not-italic text-paper">{Math.round(settings.voiceVolume * 100)}</em>
        </span>
        <input
          className="range mt-2"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={settings.voiceVolume}
          onChange={(e) => setSettings({ voiceVolume: Number(e.target.value) })}
        />
      </label>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          className="icon-btn"
          aria-pressed={settings.ambient}
          onClick={() => setSettings({ ambient: !settings.ambient })}
        >
          Ambient {settings.ambient ? "on" : "off"}
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={settings.subtitles}
          onClick={() => setSettings({ subtitles: !settings.subtitles })}
        >
          Subtitles {settings.subtitles ? "on" : "off"}
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={settings.reducedMotion}
          onClick={() => setSettings({ reducedMotion: !settings.reducedMotion })}
        >
          Motion {settings.reducedMotion ? "reduced" : "full"}
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            clearConversation();
            onClose();
          }}
        >
          Clear conversation
        </button>
      </div>
      <MemoryCore />
    </aside>
  );
}

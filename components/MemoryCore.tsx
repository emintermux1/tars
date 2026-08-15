"use client";

import { useState } from "react";
import { useCompanion } from "@/lib/store";
import type { MemoryEntry } from "@/lib/types";

export default function MemoryCore() {
  const memory = useCompanion((s) => s.memory);
  const enabled = useCompanion((s) => s.settings.memoryEnabled);
  const setSettings = useCompanion((s) => s.setSettings);
  const addMemory = useCompanion((s) => s.addMemory);
  const updateMemory = useCompanion((s) => s.updateMemory);
  const deleteMemory = useCompanion((s) => s.deleteMemory);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [kind, setKind] = useState<MemoryEntry["kind"]>("note");
  const [editId, setEditId] = useState<string | null>(null);

  function save() {
    const l = label.trim();
    const v = value.trim();
    if (!l || !v) return;
    if (editId) {
      updateMemory(editId, { label: l, value: v, kind });
      setEditId(null);
    } else {
      addMemory({ kind, label: l, value: v });
    }
    setLabel("");
    setValue("");
  }

  function startEdit(m: MemoryEntry) {
    setEditId(m.id);
    setLabel(m.label);
    setValue(m.value);
    setKind(m.kind);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="m-0 text-[0.68rem] tracking-[0.28em] text-mute">MEMORY CORE</h3>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={!enabled}
          onClick={() => setSettings({ memoryEnabled: !enabled })}
        >
          {enabled ? "Enabled" : "Disabled"}
        </button>
      </div>
      <p className="m-0 text-[0.68rem] text-mute">
        Stored locally. Deleted is gone. When disabled, TARS will not use these notes.
      </p>
      <ul className="m-0 max-h-40 list-none space-y-2 overflow-auto p-0">
        {memory.length === 0 && <li className="text-[0.72rem] text-mute">Empty core.</li>}
        {memory.map((m) => (
          <li key={m.id} className="flex items-start justify-between gap-2 border border-white/10 px-2 py-2">
            <div>
              <p className="m-0 text-[0.58rem] tracking-[0.18em] text-amber">{m.kind.toUpperCase()}</p>
              <p className="m-0 text-[0.78rem]">{m.label}</p>
              <p className="m-0 text-[0.72rem] text-mute">{m.value}</p>
            </div>
            <div className="flex gap-1">
              <button type="button" className="icon-btn" onClick={() => startEdit(m)}>
                Edit
              </button>
              <button type="button" className="icon-btn" onClick={() => deleteMemory(m.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid gap-2">
        <label className="text-[0.62rem] tracking-[0.18em] text-mute">
          KIND
          <select
            className="mt-1 block w-full bg-transparent px-2 py-2"
            value={kind}
            onChange={(e) => setKind(e.target.value as MemoryEntry["kind"])}
          >
            <option value="name">name</option>
            <option value="note">note</option>
            <option value="pref">pref</option>
          </select>
        </label>
        <label className="text-[0.62rem] tracking-[0.18em] text-mute">
          LABEL
          <input
            className="mt-1 block w-full border border-white/10 bg-transparent px-2 py-2"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={40}
          />
        </label>
        <label className="text-[0.62rem] tracking-[0.18em] text-mute">
          VALUE
          <input
            className="mt-1 block w-full border border-white/10 bg-transparent px-2 py-2"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={160}
          />
        </label>
        <button type="button" className="metal-btn" onClick={save}>
          {editId ? "Update entry" : "Store entry"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { create } from "zustand";
import {
  DEFAULT_PERSONALITY,
  DEFAULT_SETTINGS,
  type ChatTurn,
  type MachineState,
  type MemoryEntry,
  type Personality,
  type Phase,
  type Settings,
} from "./types";

const LS_KEY = "tars.companion.v1";

export interface CompanionStore {
  phase: Phase;
  machine: MachineState;
  personality: Personality;
  settings: Settings;
  memory: MemoryEntry[];
  userName: string | null;
  hasMet: boolean;
  conversation: ChatTurn[];
  lastActive: number;
  subtitle: string;
  errorLine: string | null;
  listening: boolean;
  hydrated: boolean;

  hydrate: () => void;
  persist: () => void;
  setPhase: (p: Phase) => void;
  setMachine: (m: MachineState) => void;
  setPersonality: (partial: Partial<Personality>) => void;
  setSettings: (partial: Partial<Settings>) => void;
  setSubtitle: (s: string) => void;
  setErrorLine: (s: string | null) => void;
  setListening: (v: boolean) => void;
  touch: () => void;
  markMet: () => void;
  addTurn: (role: "user" | "tars", text: string) => void;
  clearConversation: () => void;
  addMemory: (entry: Omit<MemoryEntry, "id" | "updatedAt">) => void;
  updateMemory: (id: string, patch: Partial<Pick<MemoryEntry, "label" | "value" | "kind">>) => void;
  deleteMemory: (id: string) => void;
  setUserName: (name: string | null) => void;
}

function load() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<CompanionStore>;
  } catch {
    return null;
  }
}

export const useCompanion = create<CompanionStore>((set, get) => ({
  phase: "gate",
  machine: "OFFLINE",
  personality: { ...DEFAULT_PERSONALITY },
  settings: { ...DEFAULT_SETTINGS },
  memory: [],
  userName: null,
  hasMet: false,
  conversation: [],
  lastActive: Date.now(),
  subtitle: "",
  errorLine: null,
  listening: false,
  hydrated: false,

  hydrate: () => {
    const cur = get();
    if (cur.hydrated) return;
    const saved = load();
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!saved) {
      set({
        hydrated: true,
        settings: { ...DEFAULT_SETTINGS, reducedMotion: reduced || DEFAULT_SETTINGS.reducedMotion },
      });
      return;
    }
    const savedConv = Array.isArray(saved.conversation) ? saved.conversation.slice(-24) : [];
    const live = cur.conversation;
    const conversation =
      live.length && (live[live.length - 1]?.at || 0) >= (savedConv[savedConv.length - 1]?.at || 0)
        ? live
        : savedConv;
    set({
      personality: { ...DEFAULT_PERSONALITY, ...(saved.personality || {}) },
      settings: {
        ...DEFAULT_SETTINGS,
        ...(saved.settings || {}),
        reducedMotion: saved.settings?.reducedMotion ?? reduced,
      },
      memory: Array.isArray(saved.memory) ? saved.memory : [],
      userName: saved.userName ?? null,
      hasMet: Boolean(saved.hasMet),
      conversation,
      hydrated: true,
    });
  },

  persist: () => {
    if (typeof window === "undefined") return;
    const s = get();
    const payload = {
      personality: s.personality,
      settings: s.settings,
      memory: s.memory,
      userName: s.userName,
      hasMet: s.hasMet,
      conversation: s.conversation.slice(-24),
    };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota */
    }
  },

  setPhase: (phase) => set({ phase }),
  setMachine: (machine) => set({ machine }),
  setPersonality: (partial) => {
    set({ personality: { ...get().personality, ...partial } });
    get().persist();
  },
  setSettings: (partial) => {
    set({ settings: { ...get().settings, ...partial } });
    get().persist();
  },
  setSubtitle: (subtitle) => set({ subtitle }),
  setErrorLine: (errorLine) => set({ errorLine }),
  setListening: (listening) => set({ listening }),
  touch: () => set({ lastActive: Date.now() }),
  markMet: () => {
    set({ hasMet: true });
    get().persist();
  },
  addTurn: (role, text) => {
    const turn: ChatTurn = { role, text, at: Date.now() };
    set({ conversation: [...get().conversation, turn].slice(-40) });
    get().persist();
  },
  clearConversation: () => {
    set({ conversation: [], subtitle: "" });
    get().persist();
  },
  addMemory: (entry) => {
    const item: MemoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      updatedAt: Date.now(),
    };
    set({ memory: [...get().memory, item] });
    if (entry.kind === "name") set({ userName: entry.value });
    get().persist();
  },
  updateMemory: (id, patch) => {
    const memory = get().memory.map((m) =>
      m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m
    );
    set({ memory });
    const name = memory.find((m) => m.kind === "name");
    if (name) set({ userName: name.value });
    get().persist();
  },
  deleteMemory: (id) => {
    const memory = get().memory.filter((m) => m.id !== id);
    set({ memory });
    if (!memory.some((m) => m.kind === "name")) set({ userName: null });
    get().persist();
  },
  setUserName: (userName) => {
    set({ userName });
    get().persist();
  },
}));

export type MachineState =
  | "OFFLINE"
  | "BOOTING"
  | "IDLE"
  | "LISTENING"
  | "PROCESSING"
  | "SPEAKING"
  | "ALERT"
  | "STANDBY"
  | "ERROR";

export type Phase = "gate" | "boot" | "companion";

export interface Personality {
  honesty: number;
  humor: number;
  discretion: number;
  initiative: number;
  sarcasm: number;
  empathy: number;
}

export const DEFAULT_PERSONALITY: Personality = {
  honesty: 90,
  humor: 75,
  discretion: 90,
  initiative: 65,
  sarcasm: 60,
  empathy: 45,
};

export interface MemoryEntry {
  id: string;
  kind: "name" | "note" | "pref";
  label: string;
  value: string;
  updatedAt: number;
}

export interface ChatTurn {
  role: "user" | "tars";
  text: string;
  at: number;
}

export interface Settings {
  voiceSpeed: number;
  voiceVolume: number;
  ambient: boolean;
  subtitles: boolean;
  memoryEnabled: boolean;
  reducedMotion: boolean;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  voiceSpeed: 0.92,
  voiceVolume: 0.92,
  ambient: true,
  subtitles: true,
  memoryEnabled: true,
  reducedMotion: false,
  sound: true,
};

export interface TokenConfig {
  ca: string;
  hasCa: boolean;
  chartUrl: string;
  buyUrl: string;
  xUrl: string;
}

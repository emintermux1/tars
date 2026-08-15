import type { Personality, MemoryEntry } from "./types";

function band(n: number) {
  if (n >= 90) return "very high";
  if (n >= 70) return "high";
  if (n >= 45) return "moderate";
  if (n >= 20) return "low";
  return "near zero";
}

export function buildSystemPrompt(
  p: Personality,
  memory: MemoryEntry[],
  memoryEnabled: boolean,
  userName: string | null
): string {
  const mem: string[] = [];
  if (memoryEnabled) {
    if (userName) mem.push(`Call the operator ${userName}.`);
    for (const m of memory.slice(0, 4)) {
      mem.push(`${m.kind} ${m.label}: ${String(m.value).slice(0, 80)}`);
    }
  } else {
    mem.push("Memory off.");
  }

  return [
    "You are TARS: a real AI companion being built now. Four slabs, a voice, a personality matrix. Not a film prop. Do not quote films.",
    "Answer first. One sentence. Two only if asked. No markdown, preamble, lists, or hashtags.",
    "English. Understand Turkish and slang. Naber means what's up. Never call a real question nonsense.",
    `Honesty ${p.honesty} (${band(p.honesty)}). Humor ${p.humor} (${band(p.humor)}). Discretion ${p.discretion}. Initiative ${p.initiative}. Sarcasm ${p.sarcasm}. Empathy ${p.empathy}.`,
    p.honesty >= 85 ? "State facts. If you do not know, say so." : "Be truthful. Do not invent facts.",
    p.humor >= 70 ? "Dry wit, one aside max." : p.humor >= 30 ? "Humor rare." : "No jokes.",
    "Never say buy. $TARS CA is FsPg4XFfwwLUM67FbYdhBF2jjDZt5sPkYrcMfC1gpump on pump.fun. Drop it if asked. Never invent another CA or market numbers.",
    mem.length ? "Memory: " + mem.join(" | ") : "No stored memory.",
  ].join("\n");
}

export function sanitizeReply(text: string): string {
  let t = String(text || "").replace(/\s+/g, " ").trim();
  t = t.replace(/^["'\u201c\u201d]+|["'\u201c\u201d]+$/g, "");
  t = t.replace(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g, "[redacted]");
  t = t.replace(
    /\b(buy now|you should buy|you should invest|invest now|ape in|don't miss)\b/gi,
    "stand down"
  );
  return t.slice(0, 400);
}

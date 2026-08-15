"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Gate from "./Gate";
import BootOverlay from "./BootOverlay";
import HUD from "./HUD";
import SettingsDrawer from "./SettingsDrawer";
import { useCompanion } from "@/lib/store";
import { mech } from "@/lib/audio";
import { cancelSpeech, makeRecognizer, micErrorLine, primeMic, primeSpeech, speakLine } from "@/lib/voice";
import { localEaster, sliderComment } from "@/lib/easter";
import { localFastReply, pickOpener } from "@/lib/instant";
import type { Personality } from "@/lib/types";

const TarsScene = dynamic(() => import("./TarsScene"), { ssr: false });

const BOOT_FULL = [
  "POWER ………… CELL NOMINAL",
  "MEMORY ……… CORE MOUNTED",
  "VOICE ………… SYNTH READY",
  "MOTOR ………… SERVOS FREE",
];

const BOOT_SHORT = ["POWER ………… CELL NOMINAL", "VOICE ………… SYNTH READY"];

export default function CompanionApp() {
  const store = useCompanion();
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const busy = useRef(false);
  const recRef = useRef<ReturnType<typeof makeRecognizer> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sendGen = useRef(0);
  const lineRef = useRef<HTMLInputElement>(null);
  const lastSpoken = useRef("");
  const [lastSent, setLastSent] = useState("");
  const commitAt = useRef(0);
  const commitText = useRef("");

  useEffect(() => {
    store.hydrate();
  }, []);

  useEffect(() => {
    mech.setEnabled(store.settings.sound);
    if (store.settings.sound && store.settings.ambient && store.phase === "companion") {
      mech.unlock();
      mech.ambientStart();
    } else {
      mech.ambientStop();
    }
  }, [store.settings.sound, store.settings.ambient, store.phase]);

  useEffect(() => {
    const rec = makeRecognizer(
      (text) => {
        setMicOn(false);
        void send(text);
      },
      () => {
        setMicOn(false);
        if (useCompanion.getState().machine === "LISTENING") {
          useCompanion.getState().setMachine("IDLE");
        }
      },
      (code) => {
        const s = useCompanion.getState();
        s.setSubtitle(micErrorLine(code));
        s.setMachine("IDLE");
      }
    );
    recRef.current = rec;
    setHasMic(Boolean(rec));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const s = useCompanion.getState();
      if (s.phase !== "companion") return;
      if (s.machine === "SPEAKING" || s.machine === "PROCESSING" || s.machine === "BOOTING") return;
      if (Date.now() - s.lastActive > 90_000 && s.machine !== "STANDBY") {
        s.setMachine("STANDBY");
      }
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        interrupt();
        setSettingsOpen(false);
      }
      if (e.key === "/" && document.activeElement !== lineRef.current) {
        e.preventDefault();
        lineRef.current?.focus();
      }
      if ((e.key === "m" || e.key === "M") && document.activeElement !== lineRef.current) {
        toggleMic();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const speak = useCallback((text: string) => {
    const s = useCompanion.getState();
    s.setSubtitle(text);
    s.addTurn("tars", text);
    lastSpoken.current = text;
    if (!s.settings.sound) {
      s.setMachine("IDLE");
      return;
    }
    s.setMachine("SPEAKING");
    speakLine(text, {
      rate: s.settings.voiceSpeed,
      volume: s.settings.voiceVolume,
      onend: () => {
        const cur = useCompanion.getState();
        if (cur.machine === "SPEAKING") cur.setMachine("IDLE");
      },
      onerror: () => {
        mech.servo();
        const cur = useCompanion.getState();
        if (cur.machine === "SPEAKING") cur.setMachine("IDLE");
      },
    });
  }, []);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text) return;

    /* YOU line + opener in this tap frame, even if we were SPEAKING */
    setLastSent(text);
    abortRef.current?.abort();
    cancelSpeech();

    const gen = ++sendGen.current;
    const ac = new AbortController();
    abortRef.current = ac;
    busy.current = true;

    const s = useCompanion.getState();
    s.touch();
    const history = s.conversation.slice(-2).map((t) => ({
      role: t.role === "tars" ? "assistant" : "user",
      content: t.text.slice(0, 160),
    }));
    s.addTurn("user", text);
    s.setMachine("PROCESSING");
    s.setErrorLine(null);

    const alive = () => sendGen.current === gen && abortRef.current === ac;

    const local = localEaster(text, s.personality.humor) || localFastReply(text);
    if (local) {
      s.setSubtitle(local);
      speak(local);
      if (abortRef.current === ac) abortRef.current = null;
      if (sendGen.current === gen) busy.current = false;
      return;
    }

    s.setSubtitle(pickOpener(text, s.personality.humor));

    const payload = {
      message: text,
      personality: s.personality,
      history,
      memory: s.settings.memoryEnabled ? s.memory : [],
      memoryEnabled: s.settings.memoryEnabled,
      userName: s.userName,
    };

    const failQuiet = (msg: string) => {
      if (!alive()) return;
      cancelSpeech();
      s.setErrorLine("VOICE LINK INTERRUPTED");
      s.setSubtitle(msg);
      s.setMachine("ERROR");
      window.setTimeout(() => {
        const cur = useCompanion.getState();
        cur.setErrorLine(null);
        if (cur.machine === "ERROR") cur.setMachine("IDLE");
      }, 1800);
    };

    const postJson = async (timeoutMs: number) => {
      const jac = new AbortController();
      const onAbort = () => jac.abort();
      ac.signal.addEventListener("abort", onAbort);
      const to = window.setTimeout(() => jac.abort(), timeoutMs);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ ...payload, stream: false }),
          signal: jac.signal,
        });
        let data: { reply?: string; error?: string };
        try {
          data = (await res.json()) as { reply?: string; error?: string };
        } catch {
          throw new Error("bad-json");
        }
        if (data.error === "VOICE LINK INTERRUPTED") throw new Error("uplink");
        const reply = (data.reply || "").trim();
        if (!reply) throw new Error("empty");
        if (/do not like waiting|uplink took too long/i.test(reply)) throw new Error("timeout");
        return reply;
      } finally {
        window.clearTimeout(to);
        ac.signal.removeEventListener("abort", onAbort);
      }
    };

    const bridgeTid = window.setTimeout(() => {
      if (!alive()) return;
      const cur = useCompanion.getState();
      if (cur.machine === "PROCESSING") {
        cur.setSubtitle("Uplink's slow. Hold.");
      }
    }, 2500);

    try {
      let reply: string | null = null;
      try {
        reply = await postJson(28_000);
      } catch {
        if (!alive()) return;
        try {
          reply = await postJson(28_000);
        } catch {
          failQuiet("Link dropped. Say again.");
          return;
        }
      }
      if (!alive()) return;
      if (reply) {
        s.setErrorLine(null);
        s.setSubtitle(reply);
        speak(reply);
      } else {
        failQuiet("Link dropped. Say again.");
      }
    } catch {
      if (!alive()) return;
      failQuiet("Link dropped. Say again.");
    } finally {
      window.clearTimeout(bridgeTid);
      if (abortRef.current === ac) abortRef.current = null;
      if (sendGen.current === gen) busy.current = false;
    }
  }, [speak]);

  function interrupt() {
    cancelSpeech();
    sendGen.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    busy.current = false;
    const s = useCompanion.getState();
    if (s.phase === "companion") {
      s.setMachine("LISTENING");
      s.touch();
      lineRef.current?.focus();
    }
  }

  function toggleMic() {
    const rec = recRef.current;
    const s = useCompanion.getState();
    s.touch();
    if (!rec) {
      s.setSubtitle(micErrorLine("unsupported"));
      return;
    }
    if (micOn) {
      rec.stop();
      setMicOn(false);
      s.setMachine("IDLE");
      return;
    }
    interrupt();
    try {
      rec.start();
      setMicOn(true);
      s.setMachine("LISTENING");
      s.setSubtitle("Listening.");
      mech.servo();
    } catch {
      setMicOn(false);
      s.setSubtitle(micErrorLine("failed"));
      s.setMachine("IDLE");
    }
  }

  async function runBoot() {
    const s = useCompanion.getState();
    s.setPhase("boot");
    s.setMachine("BOOTING");
    mech.unlock();
    primeSpeech();
    mech.setEnabled(s.settings.sound);
    if (s.settings.sound) {
      mech.bootTone();
      mech.servo();
    }
    const seq = s.hasMet || s.settings.reducedMotion ? BOOT_SHORT : BOOT_FULL;
    setBootLines([]);
    for (const row of seq) {
      setBootLines((prev) => [...prev, row]);
      if (s.settings.sound) mech.beep(400 + Math.random() * 80, 0.04, "square", 0.035);
      await new Promise((r) => setTimeout(r, s.settings.reducedMotion ? 180 : 420));
    }
    await new Promise((r) => setTimeout(r, s.settings.reducedMotion ? 200 : 500));
    s.setPhase("companion");
    s.setMachine("IDLE");
    mech.clunk();
    if (s.settings.ambient && s.settings.sound) mech.ambientStart();
    const line = s.hasMet ? "Welcome back." : "Online. We started with the intelligence.";
    s.markMet();
    speak(line);
    lineRef.current?.focus();
  }

  function warmLink() {
    void fetch("/api/health", { cache: "no-store" }).catch(() => {});
    void fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ message: "ping", stream: false }),
      cache: "no-store",
    }).catch(() => {});
  }

  function onInit() {
    mech.unlock();
    primeSpeech();
    primeMic();
    mech.click();
    warmLink();
    void runBoot();
  }

  function onCommit(key: keyof Personality, value: number) {
    const s = useCompanion.getState();
    if (s.phase !== "companion") return;
    mech.servo();
    speak(sliderComment(key, value));
  }

  function commitSend() {
    const dom = (lineRef.current?.value ?? "").trim();
    const v = dom || input.trim();
    if (!v) return;
    const now = Date.now();
    if (v === commitText.current && now - commitAt.current < 500) return;
    commitText.current = v;
    commitAt.current = now;
    setLastSent(v);
    if (lineRef.current) lineRef.current.value = "";
    setInput("");
    primeSpeech();
    mech.click();
    void send(v);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    commitSend();
  }

  const youText = lastSent || [...store.conversation].reverse().find((t) => t.role === "user")?.text || "";
  const showScene = store.phase !== "gate";

  return (
    <div className="relative h-[100svh] w-full overflow-hidden bg-void" id="main">
      <div className="vignette" />
      <div className="grain" />
      {store.phase === "gate" && <Gate onInit={onInit} />}
      {store.phase === "boot" && (
        <BootOverlay lines={bootLines} returning={store.hasMet} />
      )}
      {showScene && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="tars-stage pointer-events-none absolute inset-x-0 top-[3.35rem] bottom-[9.1rem] md:top-[3.75rem] md:bottom-[9.4rem]">
            <TarsScene state={store.machine} reduced={store.settings.reducedMotion} />
          </div>
          <HUD
            state={store.machine}
            sound={store.settings.sound}
            onSound={() => {
              const next = !store.settings.sound;
              store.setSettings({ sound: next });
              if (!next) {
                cancelSpeech();
                mech.ambientStop();
              } else {
                mech.unlock();
                primeSpeech();
                if (store.settings.ambient) mech.ambientStart();
              }
            }}
            onSettings={() => setSettingsOpen(true)}
          />
          {store.errorLine && (
            <p className="absolute left-1/2 top-16 z-10 -translate-x-1/2 text-[0.68rem] tracking-[0.22em] text-rust">
              {store.errorLine}
            </p>
          )}
          <div className="dock pointer-events-auto absolute bottom-0 left-0 right-0 z-20">
            {store.subtitle && (
              <p className="subtitle-line mx-auto mb-1.5 max-w-2xl text-center text-[0.78rem] leading-snug text-paper/90">
                {store.subtitle}
              </p>
            )}
            {!youText && store.phase === "companion" && (
              <p className="intro-line mx-auto mb-1.5 max-w-2xl text-center text-[0.62rem] tracking-[0.16em] text-mute">
                We're building TARS as a real AI companion.
              </p>
            )}
            {youText && (
              <p className="you-line mx-auto mb-1.5 max-w-2xl text-center text-[0.62rem] tracking-[0.08em] text-mute">
                YOU — {youText}
              </p>
            )}
            {(store.machine === "SPEAKING" || store.machine === "PROCESSING" || micOn) && (
              <div className="mb-1 flex justify-end">
                <button type="button" className="stop-link" onClick={interrupt}>
                  STOP
                </button>
              </div>
            )}
            <form onSubmit={onSubmit} className="composer">
              {(
                <button
                  type="button"
                  className={`composer-mic icon-btn ${micOn ? "live" : ""}`}
                  aria-pressed={micOn}
                  onClick={toggleMic}
                >
                  Mic
                </button>
              )}
              <label className="sr-only" htmlFor="line">
                Message to TARS
              </label>
              <input
                id="line"
                ref={lineRef}
                className="composer-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onInput={(e) => setInput(e.currentTarget.value)}
                maxLength={400}
                placeholder="Talk to TARS"
                autoComplete="off"
                enterKeyHint="send"
                autoCapitalize="sentences"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    commitSend();
                  }
                }}
              />
              <button
                type="submit"
                className="composer-send"
                onPointerUp={(e) => {
                  if (e.pointerType === "touch" || e.pointerType === "pen") return;
                  commitSend();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  commitSend();
                }}
              >
                SEND
              </button>
            </form>
          </div>
          <SettingsDrawer
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            onCommit={onCommit}
          />
        </div>
      )}
    </div>
  );
}

"use client";

export function pickVoice(): SpeechSynthesisVoice | null {
  const voices = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
  if (!voices.length) return null;
  const en = voices.filter((v) => /^en/i.test(v.lang));
  const pool = en.length ? en : voices;
  const prefer = [
    /google uk english male/i,
    /daniel/i,
    /microsoft david/i,
    /aaron/i,
    /fred/i,
    /alex/i,
    /rishi/i,
    /arthur/i,
    /english united kingdom.*male/i,
    /en-gb/i,
    /male/i,
  ];
  for (const re of prefer) {
    const v = pool.find((x) => re.test(x.name) || re.test(`${x.lang} ${x.name}`));
    if (v) return v;
  }
  return pool.find((v) => v.localService) || pool[0] || null;
}

export function primeSpeech() {
  if (!window.speechSynthesis) return;
  try {
    const warm = new SpeechSynthesisUtterance(" ");
    warm.volume = 0;
    warm.rate = 1;
    warm.pitch = 0.7;
    const v = pickVoice();
    if (v) warm.voice = v;
    speechSynthesis.speak(warm);
  } catch {
    /* browsers may throw before a gesture */
  }
}

export function cancelSpeech() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

export function speakLine(
  text: string,
  opts: { rate: number; volume: number; onend: () => void; onerror: () => void }
) {
  const synth = window.speechSynthesis;
  if (!synth) {
    opts.onerror();
    return;
  }
  try {
    synth.cancel();
  } catch {
    /* ignore */
  }
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate = opts.rate;
  u.pitch = 0.68;
  u.volume = opts.volume;
  u.lang = (v && v.lang) || "en-US";
  let settled = false;
  const finish = (fn: () => void) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(tid);
    fn();
  };
  const ms = Math.min(18_000, 1200 + text.length * (72 / Math.max(0.55, opts.rate)));
  const tid = window.setTimeout(() => finish(opts.onend), ms);
  u.onend = () => finish(opts.onend);
  u.onerror = () => finish(opts.onerror);
  synth.speak(u);
}

export type Recog = {
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecogCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives?: number;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function speechCtor(): RecogCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecogCtor; webkitSpeechRecognition?: RecogCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function hasSpeechRec(): boolean {
  return Boolean(speechCtor());
}

/** Ask for the mic during a tap (ENTER TARS). iOS will not grant it later. */
export function primeMic() {
  const md = navigator.mediaDevices;
  if (!md?.getUserMedia) return;
  void md.getUserMedia({ audio: true }).then((stream) => {
    stream.getTracks().forEach((t) => t.stop());
  }).catch(() => {});
}

export function micErrorLine(code?: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Mic blocked. Allow microphone for this site.";
    case "no-speech":
      return "I heard nothing. Tap MIC and speak.";
    case "audio-capture":
      return "No microphone on this device.";
    case "network":
      return "Speech link dropped. Type it.";
    case "unsupported":
      return "This browser has no speech input. Type it.";
    default:
      return "Mic failed. Type it.";
  }
}

export function makeRecognizer(
  onResult: (text: string) => void,
  onEnd: () => void,
  onError?: (code: string) => void
): Recog | null {
  const SR = speechCtor();
  if (!SR) return null;
  let rec: InstanceType<RecogCtor> | null = null;
  let pending = "";
  let sent = false;
  const lang = "tr-TR";
  const flush = () => {
    const said = pending.trim();
    pending = "";
    if (said && !sent) {
      sent = true;
      onResult(said);
    }
  };
  const bind = (r: InstanceType<RecogCtor>) => {
    r.lang = lang;
    r.interimResults = true;
    r.continuous = false;
    if (r.maxAlternatives != null) r.maxAlternatives = 1;
    r.onresult = (ev) => {
      const last = ev.results[ev.results.length - 1];
      const said = last?.[0]?.transcript?.trim();
      if (!said) return;
      pending = said;
      if ((last as { isFinal?: boolean }).isFinal) flush();
    };
    r.onend = () => {
      flush();
      onEnd();
    };
    r.onerror = (ev) => {
      onError?.(ev.error || "failed");
      onEnd();
    };
  };
  return {
    start: () => {
      try { rec?.abort(); } catch { /* ignore */ }
      pending = "";
      sent = false;
      rec = new SR();
      bind(rec);
      rec.start();
    },
    stop: () => {
      try { rec?.stop(); } catch { /* ignore */ }
    },
    abort: () => {
      try { rec?.abort(); } catch { /* ignore */ }
    },
  };
}

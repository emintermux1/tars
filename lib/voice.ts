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
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export function makeRecognizer(onResult: (text: string) => void, onEnd: () => void): Recog | null {
  const w = window as unknown as { SpeechRecognition?: RecogCtor; webkitSpeechRecognition?: RecogCtor };
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.continuous = false;
  rec.onresult = (ev) => {
    const said = ev.results[0]?.[0]?.transcript;
    if (said) onResult(said);
  };
  rec.onend = onEnd;
  rec.onerror = onEnd;
  return rec;
}

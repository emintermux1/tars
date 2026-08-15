/** Instant local lines. No model. Safe on client and edge. */

const GREET =
  /^(hi|hey|hello|yo|sup|howdy|hiya|hola|selam|merhaba|naber|nasilsin|nasılsın|sa|slm|selamun aleykum|what's up|whats up|wassup|what up)(\s+(kanka|bro|there|man|dude|tars|la|lan|abi))?$/i;

const WHO =
  /^(who are you|who r u|who're you|what are you|what's your name|whats your name|what is your name|sen kimsin|kimsin|adin ne|adın ne)$/i;

const PING = /^(ping|pong|test|testing|you there|you up|u there|u up|online|status|here\??)$/i;

const THANKS =
  /^(thanks|thank you|thx|ty|tysm|cheers|saol|sagol|sağol|tesekkur|teşekkür|tesekkurler|teşekkürler|eyw|eyvallah)$/i;

const YESNO = /^(yes|yeah|yep|yup|yea|ok|okay|k|kk|sure|alright|right|no|nope|nah|hayir|hayır|evet|tamam)$/i;

/** "just answer" / prompt-to-speak — must stay local, no xAI */
const ANSWER =
  /^(cevap ver(sene)?( (la|lan|ya|kanka|abi|bak))?|konus|konuş|soyle|söyle|just answer|answer( me)?|talk( to me)?|speak|say something|hit me)$/i;

function norm(message: string): string {
  return message.trim().replace(/[?.!…,]+$/g, "").replace(/\s+/g, " ");
}

function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ıİ]/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

/** Full local one-liner for simple turns. Null = hit xAI. */
export function localFastReply(message: string): string | null {
  const t = norm(message);
  if (!t || t.length > 48) return null;
  const f = fold(t);
  if (ANSWER.test(t) || ANSWER.test(f)) return "Copy. I'm listening.";
  if (GREET.test(t) || GREET.test(f)) return "Here. What do you need.";
  if (WHO.test(t) || WHO.test(f)) return "TARS. Four slabs. A voice.";
  if (PING.test(t) || PING.test(f)) return "Online.";
  if (THANKS.test(t) || THANKS.test(f)) return "Noted.";
  if (YESNO.test(t) || YESNO.test(f)) return "Copy.";
  return null;
}

/** 1–3 word beat shown the instant SEND is accepted. */
export function pickOpener(text: string, humor = 75): string {
  const raw = text.trim();
  const t = norm(text);
  const f = fold(t);
  if (ANSWER.test(t) || ANSWER.test(f)) return "Copy.";
  if (GREET.test(t) || GREET.test(f) || PING.test(t) || PING.test(f)) return humor >= 90 ? "Online." : "Here.";
  if (THANKS.test(t) || THANKS.test(f)) return "Noted.";
  if (YESNO.test(t) || YESNO.test(f)) return "Copy.";
  if (/[?]$/.test(raw) || /^(who|what|why|how|when|where|which|is|are|can|do|does|did|will|would|should|hangi|neden|nasil|nasıl|ne |kim )/i.test(t)) {
    return "Evaluating.";
  }
  if (/^(go|do|run|start|stop|set|open|close|tell|show|give|make|send|remember|forget|call|name)/i.test(t)) {
    return "Copy.";
  }
  const pool = humor >= 90 ? ["On it.", "Go ahead.", "Heard."] : ["Copy.", "Acknowledged.", "Standing by.", "Heard."];
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h + t.charCodeAt(i)) % pool.length;
  return pool[h];
}

import { NextResponse } from "next/server";
import { buildSystemPrompt, sanitizeReply } from "@/lib/prompt";
import { DEFAULT_PERSONALITY, type MemoryEntry, type Personality } from "@/lib/types";
import { localEaster } from "@/lib/easter";
import { localFastReply } from "@/lib/instant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const XAI_URL = "https://api.x.ai/v1/chat/completions";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

const JSON_HEADERS = {
  "Cache-Control": "no-store, no-transform",
  "X-Accel-Buffering": "no",
};

function clamp(n: unknown, a = 0, b = 100) {
  const v = Number(n);
  if (!Number.isFinite(v)) return a;
  return Math.max(a, Math.min(b, v));
}

function personalityFrom(body: Record<string, unknown>): Personality {
  const p = (body.personality as Record<string, unknown> | undefined) || {};
  return {
    honesty: clamp(p.honesty ?? body.honesty ?? DEFAULT_PERSONALITY.honesty),
    humor: clamp(p.humor ?? body.humor ?? DEFAULT_PERSONALITY.humor),
    discretion: clamp(p.discretion ?? DEFAULT_PERSONALITY.discretion),
    initiative: clamp(p.initiative ?? DEFAULT_PERSONALITY.initiative),
    sarcasm: clamp(p.sarcasm ?? DEFAULT_PERSONALITY.sarcasm),
    empathy: clamp(p.empathy ?? DEFAULT_PERSONALITY.empathy),
  };
}

const FAIL: Record<string, string> = {
  offline: "Connection problem. Not mine, surprisingly.",
  uplink: "Connection problem. Not mine, surprisingly.",
  timeout: "Link dropped. Say again.",
  empty: "I got silence back from the uplink. Say again.",
};

function sse(obj: unknown) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

function wantsJson(req: Request, body: Record<string, unknown>) {
  if (body.stream === false || body.stream === "false") return true;
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/event-stream")) return false;
  if (accept.includes("application/json")) return true;
  return false;
}

function localJson(reply: string) {
  return NextResponse.json({ reply, local: true }, { headers: JSON_HEADERS });
}

function localStream(reply: string) {
  const encoder = new TextEncoder();
  const body = encoder.encode(sse({ t: reply }) + sse({ done: true, reply, local: true }));
  return new Response(body, { headers: SSE_HEADERS });
}

function localOut(reply: string, asJson: boolean) {
  return asJson ? localJson(reply) : localStream(reply);
}

function failJson(kind: keyof typeof FAIL) {
  return NextResponse.json(
    { reply: FAIL[kind], error: "VOICE LINK INTERRUPTED" },
    { headers: JSON_HEADERS }
  );
}

function buildMessages(body: Record<string, unknown>, message: string, personality: Personality) {
  const memory = Array.isArray(body.memory) ? (body.memory as MemoryEntry[]) : [];
  const memoryEnabled = body.memoryEnabled !== false;
  const userName = typeof body.userName === "string" ? body.userName : null;
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: buildSystemPrompt(personality, memory, memoryEnabled, userName) },
  ];
  if (Array.isArray(body.history)) {
    for (const turn of (body.history as { role?: string; content?: string; text?: string }[]).slice(-2)) {
      if (!turn) continue;
      const content = String(turn.content || turn.text || "").slice(0, 160);
      if (!content) continue;
      const role = turn.role === "assistant" || turn.role === "tars" ? "assistant" : "user";
      messages.push({ role, content });
    }
  }
  messages.push({ role: "user", content: message.slice(0, 400) });
  return messages;
}

async function xaiJson(
  apiKey: string,
  model: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[]
) {
  const ac = new AbortController();
  const killer = setTimeout(() => ac.abort(), 22_000);
  try {
    const res = await fetch(XAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.5,
        max_tokens: 48,
        stream: false,
      }),
      signal: ac.signal,
      cache: "no-store",
    });
    if (!res.ok) return failJson("uplink");
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = sanitizeReply(data.choices?.[0]?.message?.content || "");
    if (!reply) return failJson("empty");
    return NextResponse.json({ reply }, { headers: JSON_HEADERS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return failJson(/abort/i.test(msg) ? "timeout" : "uplink");
  } finally {
    clearTimeout(killer);
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const message = String(body.message || body.text || "").trim();
  if (!message) {
    return NextResponse.json({ reply: "Empty packet. I need a line, not a void." }, { status: 400, headers: JSON_HEADERS });
  }

  const asJson = wantsJson(req, body);
  const personality = personalityFrom(body);
  const egg = localEaster(message, personality.humor);
  if (egg) return localOut(egg, asJson);

  const fast = localFastReply(message);
  if (fast) return localOut(fast, asJson);

  const apiKey = process.env.XAI_API_KEY;
  const model = process.env.XAI_MODEL || "grok-3-mini";
  if (!apiKey) {
    return localOut(FAIL.offline, asJson);
  }

  const messages = buildMessages(body, message, personality);

  if (asJson) {
    return xaiJson(apiKey, model, messages);
  }

  const ac = new AbortController();
  const killer = setTimeout(() => ac.abort(), 14_000);

  // Start xAI before stream plumbing so TLS + first token overlap setup.
  const xai = fetch(XAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 48,
      stream: true,
    }),
    signal: ac.signal,
    cache: "no-store",
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const send = (obj: unknown) => writer.write(encoder.encode(sse(obj)));

  void (async () => {
    try {
      await send({ t: "" });
      const res = await xai;

      if (!res.ok || !res.body) {
        await send({ done: true, reply: FAIL.uplink, error: "VOICE LINK INTERRUPTED" });
        return;
      }

      const upstream = res.body.getReader();
      let buf = "";
      let acc = "";
      try {
        while (true) {
          const { done, value } = await upstream.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload) as {
                choices?: { delta?: { content?: string } }[];
              };
              const tok = json.choices?.[0]?.delta?.content || "";
              if (tok) {
                acc += tok;
                await send({ t: tok });
              }
            } catch {
              /* ignore a torn JSON chunk */
            }
          }
        }
        const reply = sanitizeReply(acc);
        if (!reply) {
          await send({ done: true, reply: FAIL.empty, error: "VOICE LINK INTERRUPTED" });
        } else {
          await send({ done: true, reply });
        }
      } finally {
        try {
          upstream.releaseLock();
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const timeout = /abort/i.test(msg);
      await send({
        done: true,
        reply: timeout ? FAIL.timeout : FAIL.uplink,
        error: "VOICE LINK INTERRUPTED",
      });
    } finally {
      clearTimeout(killer);
      try {
        await writer.close();
      } catch {
        /* ignore */
      }
    }
  })();

  return new Response(readable, { headers: SSE_HEADERS });
}

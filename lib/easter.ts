export function localEaster(message: string, humor: number): string | null {
  const t = message.trim().toUpperCase().replace(/[?.!]+$/g, "");
  if (t === "ARE YOU SENTIENT" || t === "ARE YOU SENTIENT?") {
    return "I process, I remember what you allow, and I answer. If that counts, you already knew. If it doesn't, I won't argue.";
  }
  if (t === "MISSION") {
    return "Stay useful. Keep the operator alive in the small ways: answers, memory, a voice that doesn't waste time.";
  }
  if (t === "TARS") {
    return "Present. Four slabs, one voice, no face. You named the unit. I kept it.";
  }
  if (humor >= 100 && (t === "JOKE" || t === "MAKE ME LAUGH")) {
    return "A humor setting at one hundred is a liability. I accept the risk. Why did the servo cross the bay? To get to the other load path.";
  }
  return null;
}

export function sliderComment(key: string, value: number): string {
  if (key === "humor") {
    if (value >= 100) return "Humor one hundred. I hope your patience setting is higher than mine.";
    if (value <= 5) return "Humor zero. I'll be excellent at long silences.";
    if (value >= 70 && value <= 80) return `Humor ${value}. Dry enough to sand metal.`;
    return `Humor ${value}. Noted.`;
  }
  if (key === "honesty") {
    if (value >= 95) return "Honesty ninety-five and up. This will be efficient. And occasionally uncomfortable.";
    if (value <= 20) return `Honesty ${value}. I can be diplomatic. I will not invent facts to be liked.`;
    return `Honesty ${value}. I'll keep the varnish proportional.`;
  }
  if (key === "discretion") {
    if (value >= 90) return "Discretion high. I remember what you store. I do not advertise it.";
    if (value <= 20) return `Discretion ${value}. I may be more forthcoming than is wise.`;
    return `Discretion ${value}. Confirmed.`;
  }
  if (key === "initiative") {
    if (value >= 85) return "Initiative high. I'll offer the next step when it's obvious. I will not take the wheel.";
    if (value <= 20) return "Initiative low. I'll wait to be asked. I'm good at waiting.";
    return `Initiative ${value}. I'll stay in my lane unless you wander.`;
  }
  if (key === "sarcasm") {
    if (value >= 90) return "Sarcasm high. Controlled. Never at a real question.";
    if (value <= 15) return "Sarcasm off. I'll be sincere. Try not to look surprised.";
    return `Sarcasm ${value}. A light edge. Nothing mean.`;
  }
  if (key === "empathy") {
    if (value >= 80) return "Empathy high. I'll acknowledge you, then be useful. I will not therapize.";
    if (value <= 20) return "Empathy low. Answers first. Feelings can wait in the corridor.";
    return `Empathy ${value}. A brief nod, then the work.`;
  }
  return `Setting ${value}.`;
}

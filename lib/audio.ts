"use client";

type Drone = { o: OscillatorNode; g: GainNode } | null;

class MechAudio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  drone: Drone = null;
  enabled = true;

  unlock() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.28;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.ambientStop();
  }

  beep(freq: number, dur: number, type: OscillatorType = "square", gain = 0.07) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  servo() {
    if (!this.enabled || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(78, t);
    o.frequency.exponentialRampToValueAtTime(210, t + 0.1);
    o.frequency.exponentialRampToValueAtTime(64, t + 0.26);
    f.type = "bandpass";
    f.frequency.value = 740;
    f.Q.value = 2.2;
    g.gain.setValueAtTime(0.045, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(f);
    f.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.3);
  }

  clunk() {
    this.beep(90, 0.08, "triangle", 0.06);
    this.beep(160, 0.04, "square", 0.03);
  }

  click() {
    this.beep(190, 0.035, "square", 0.04);
  }

  bootTone() {
    [196, 247, 294, 392].forEach((f, i) => {
      window.setTimeout(() => this.beep(f, 0.11, "triangle", 0.055), i * 130);
    });
  }

  errorTone() {
    this.beep(140, 0.16, "square", 0.06);
    window.setTimeout(() => this.beep(110, 0.2, "square", 0.05), 160);
  }

  ambientStart() {
    if (!this.enabled || !this.ctx || !this.master || this.drone) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.value = 44;
    g.gain.value = 0.016;
    o.connect(g);
    g.connect(this.master);
    o.start();
    this.drone = { o, g };
  }

  ambientStop() {
    if (!this.drone) return;
    try {
      this.drone.o.stop();
    } catch {
      /* already stopped */
    }
    this.drone = null;
  }
}

export const mech = new MechAudio();

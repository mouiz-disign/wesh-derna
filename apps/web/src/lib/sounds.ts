// Notification sound — gentle chime (2 tones)
function createNotifSound(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  const ctx = new AudioContext();
  const duration = 0.4;
  const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    const env = Math.exp(-t * 6);
    if (t < 0.2) {
      data[i] = Math.sin(2 * Math.PI * 880 * t) * env * 0.3;
    } else {
      data[i] = Math.sin(2 * Math.PI * 1100 * (t - 0.2)) * Math.exp(-(t - 0.2) * 8) * 0.3;
    }
  }
  const source = ctx.createBufferSource();
  source.buffer = buf;
  source.connect(ctx.destination);
  return null; // We'll use the context directly
}

let notifCtx: AudioContext | null = null;
let msgCtx: AudioContext | null = null;

export function playNotifSound() {
  if (typeof window === "undefined") return;
  try {
    const ctx = notifCtx || new AudioContext();
    notifCtx = ctx;
    const duration = 0.35;
    const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate;
      // Two-tone chime: 880Hz then 1100Hz
      if (t < 0.15) {
        data[i] = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 8) * 0.25;
      } else {
        data[i] = Math.sin(2 * Math.PI * 1100 * (t - 0.15)) * Math.exp(-(t - 0.15) * 10) * 0.25;
      }
    }
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(ctx.destination);
    source.start();
  } catch {}
}

export function playMessageSound() {
  if (typeof window === "undefined") return;
  try {
    const ctx = msgCtx || new AudioContext();
    msgCtx = ctx;
    const duration = 0.15;
    const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate;
      // Quick pop: 600Hz short burst
      data[i] = Math.sin(2 * Math.PI * 600 * t) * Math.exp(-t * 20) * 0.2;
    }
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(ctx.destination);
    source.start();
  } catch {}
}

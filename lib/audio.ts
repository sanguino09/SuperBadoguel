// Todos los sonidos generados proceduralmente con Web Audio API.
// No requiere archivos externos — funciona offline y en Vercel.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function master(ac: AudioContext, vol = 0.7): GainNode {
  const g = ac.createGain();
  g.gain.value = vol;
  g.connect(ac.destination);
  return g;
}

// ───── Helpers ─────

function osc(
  ac: AudioContext,
  dest: AudioNode,
  type: OscillatorType,
  freq: number,
  start: number,
  end: number,
  gain = 0.4
) {
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  g.connect(dest);

  const o = ac.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  o.start(start);
  o.stop(end + 0.02);
}

function noise(
  ac: AudioContext,
  dest: AudioNode,
  durationSec: number,
  startTime: number,
  vol = 0.3,
  filterFreq = 2000
) {
  const bufSize = ac.sampleRate * durationSec;
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buf;

  const filt = ac.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = filterFreq;
  filt.Q.value = 2;

  const g = ac.createGain();
  g.gain.setValueAtTime(vol, startTime);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

  src.connect(filt);
  filt.connect(g);
  g.connect(dest);
  src.start(startTime);
  src.stop(startTime + durationSec);
}

// ───── Sonidos ─────

/** Woosh de lanzar la caña */
export function playCast() {
  const ac = getCtx();
  const out = master(ac, 0.5);
  const t = ac.currentTime;

  const filt = ac.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.setValueAtTime(800, t);
  filt.frequency.exponentialRampToValueAtTime(150, t + 0.45);
  filt.Q.value = 1.2;

  const buf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buf;

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.8, t + 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

  src.connect(filt);
  filt.connect(g);
  g.connect(out);
  src.start(t);
  src.stop(t + 0.55);
}

/** Splash al caer la boya */
export function playSplash() {
  const ac = getCtx();
  const out = master(ac, 0.5);
  const t = ac.currentTime;

  // Bajo gordo del impacto
  osc(ac, out, "sine", 90, t, t + 0.3, 0.6);
  osc(ac, out, "sine", 55, t, t + 0.4, 0.4);
  // Ruido de salpicadura
  noise(ac, out, 0.25, t, 0.55, 1200);
  noise(ac, out, 0.15, t + 0.05, 0.3, 400);
}

/** Alerta de picada — ascendente urgente */
export function playBite() {
  const ac = getCtx();
  const out = master(ac, 0.6);
  const t = ac.currentTime;

  const freqs = [440, 550, 660, 880];
  freqs.forEach((f, i) => {
    const st = t + i * 0.08;
    osc(ac, out, "sine", f, st, st + 0.18, 0.5);
    osc(ac, out, "square", f * 2, st, st + 0.1, 0.06);
  });
}

/** Clic del carrete — tick corto, se llama en bucle mientras se recoge */
export function playReelTick() {
  const ac = getCtx();
  const out = master(ac, 0.25);
  const t = ac.currentTime;

  osc(ac, out, "sawtooth", 220, t, t + 0.04, 0.4);
  noise(ac, out, 0.04, t, 0.5, 3000);
}

/** Tensión — grave pulsante cuando el pez tira */
export function playDangerPulse() {
  const ac = getCtx();
  const out = master(ac, 0.5);
  const t = ac.currentTime;

  osc(ac, out, "sawtooth", 80, t, t + 0.12, 0.6);
  osc(ac, out, "sawtooth", 80, t + 0.16, t + 0.28, 0.5);
  osc(ac, out, "square", 120, t + 0.01, t + 0.13, 0.15);
}

/** Captura — arpeggio alegre */
export function playCatch(rarity: "comun" | "raro" | "epico" | "legendario") {
  const ac = getCtx();
  const out = master(ac, 0.6);
  const t = ac.currentTime;

  const scales: Record<typeof rarity, number[]> = {
    comun: [330, 392, 494, 659],
    raro: [370, 440, 554, 740],
    epico: [415, 523, 659, 880],
    legendario: [440, 554, 660, 880, 1108],
  };

  const notes = scales[rarity];
  notes.forEach((f, i) => {
    const st = t + i * 0.1;
    osc(ac, out, "sine", f, st, st + 0.35, 0.55);
    osc(ac, out, "triangle", f * 2, st, st + 0.2, 0.12);
  });

  // Boom grave de fondo
  osc(ac, out, "sine", 110, t, t + 0.5, 0.4);
}

/** Pez escapado — descendente triste */
export function playLost() {
  const ac = getCtx();
  const out = master(ac, 0.45);
  const t = ac.currentTime;

  osc(ac, out, "sine", 440, t, t + 0.15, 0.4);
  osc(ac, out, "sine", 370, t + 0.1, t + 0.28, 0.35);
  osc(ac, out, "sine", 294, t + 0.22, t + 0.5, 0.3);
  noise(ac, out, 0.2, t + 0.3, 0.2, 300);
}

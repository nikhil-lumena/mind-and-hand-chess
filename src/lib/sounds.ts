/**
 * Tiny Web Audio synth for game feedback. Sounds are generated on the fly so
 * we don't ship audio assets, and everything degrades silently when the
 * browser has no AudioContext (SSR, very old browsers, blocked autoplay).
 */

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

/**
 * Browsers only let an AudioContext start after a user gesture. Call this from
 * pointer/key handlers so later, event-driven playback (Pusher updates) works.
 */
export function unlockAudio(): void {
  const c = getContext();
  if (c && c.state === 'suspended') {
    c.resume().catch(() => {});
  }
}

interface ToneOptions {
  freq: number;
  /** Seconds after `now` to start. */
  at: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  /** Optional pitch glide target reached at the end of the tone. */
  glideTo?: number;
  /** Low-pass cutoff in Hz; omitted = no filter. */
  lowpass?: number;
  attack?: number;
}

function tone(c: AudioContext, dest: AudioNode, o: ToneOptions): void {
  const start = c.currentTime + o.at;
  const end = start + o.duration;
  const attack = o.attack ?? 0.008;
  const peak = o.gain ?? 0.3;

  const osc = c.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, start);
  if (o.glideTo) {
    osc.frequency.exponentialRampToValueAtTime(o.glideTo, end);
  }

  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(peak, start + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, end);

  let chain: AudioNode = osc;
  if (o.lowpass) {
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(o.lowpass, start);
    filter.Q.value = 0.7;
    chain.connect(filter);
    chain = filter;
  }
  chain.connect(env);
  env.connect(dest);

  osc.start(start);
  osc.stop(end + 0.02);
}

function withMaster(volume: number, play: (c: AudioContext, dest: AudioNode) => void): void {
  const c = getContext();
  if (!c) return;
  if (c.state === 'suspended') {
    // Best effort: if the page already had a gesture this succeeds instantly.
    c.resume().catch(() => {});
  }
  const master = c.createGain();
  master.gain.value = volume;
  master.connect(c.destination);
  try {
    play(c, master);
  } catch {
    // Never let audio problems affect gameplay.
  }
}

/** Bright ascending chime: Mind and Hand picked the same square. */
export function playSyncSuccess(): void {
  withMaster(0.5, (c, dest) => {
    // E5 → G#5 → B5 arpeggio with a soft octave sparkle on top.
    const notes = [659.25, 830.61, 987.77];
    notes.forEach((freq, i) => {
      tone(c, dest, { freq, at: i * 0.085, duration: 0.42, type: 'sine', gain: 0.32 });
      tone(c, dest, { freq: freq * 2, at: i * 0.085, duration: 0.25, type: 'triangle', gain: 0.06 });
    });
    // Final sustained major chord tail.
    tone(c, dest, { freq: 1318.51, at: 0.26, duration: 0.55, type: 'sine', gain: 0.14, attack: 0.02 });
  });
}

/** Soft descending "womp": Mind wanted a different square than Hand played. */
export function playSyncFail(): void {
  withMaster(0.45, (c, dest) => {
    // Two detuned saws sliding down a minor third, filtered so it stays mellow.
    tone(c, dest, { freq: 246.94, glideTo: 207.65, at: 0, duration: 0.28, type: 'sawtooth', gain: 0.18, lowpass: 900 });
    tone(c, dest, { freq: 249.5, glideTo: 209.5, at: 0, duration: 0.28, type: 'sawtooth', gain: 0.12, lowpass: 900 });
    tone(c, dest, { freq: 196.0, glideTo: 155.56, at: 0.24, duration: 0.42, type: 'sawtooth', gain: 0.2, lowpass: 700 });
    tone(c, dest, { freq: 198.0, glideTo: 157.0, at: 0.24, duration: 0.42, type: 'sawtooth', gain: 0.12, lowpass: 700 });
    // Low thud underneath for weight.
    tone(c, dest, { freq: 110, glideTo: 60, at: 0.24, duration: 0.3, type: 'sine', gain: 0.25 });
  });
}

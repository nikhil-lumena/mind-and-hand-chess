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

/* ---------------------------------------------------------------------------
   Arcade feedback sounds
   --------------------------------------------------------------------------- */

/** Tiny UI "pop" for button presses. */
export function playClick(): void {
  withMaster(0.25, (c, dest) => {
    tone(c, dest, { freq: 1400, glideTo: 900, at: 0, duration: 0.05, type: 'square', gain: 0.12, lowpass: 2500 });
  });
}

/** Woody "tock" when any piece lands. */
export function playMove(): void {
  withMaster(0.4, (c, dest) => {
    tone(c, dest, { freq: 520, glideTo: 220, at: 0, duration: 0.09, type: 'triangle', gain: 0.35, lowpass: 1800 });
    tone(c, dest, { freq: 160, glideTo: 90, at: 0, duration: 0.08, type: 'sine', gain: 0.25 });
  });
}

/** Punchy "smash" when a piece is captured. */
export function playCapture(): void {
  withMaster(0.55, (c, dest) => {
    tone(c, dest, { freq: 880, glideTo: 220, at: 0, duration: 0.14, type: 'sawtooth', gain: 0.22, lowpass: 2200 });
    tone(c, dest, { freq: 120, glideTo: 45, at: 0.01, duration: 0.28, type: 'sine', gain: 0.4 });
    tone(c, dest, { freq: 1760, at: 0.05, duration: 0.12, type: 'triangle', gain: 0.1 });
  });
}

/** Two-note alarm for check. */
export function playCheck(): void {
  withMaster(0.45, (c, dest) => {
    tone(c, dest, { freq: 740, at: 0, duration: 0.12, type: 'square', gain: 0.14, lowpass: 2400 });
    tone(c, dest, { freq: 988, at: 0.13, duration: 0.22, type: 'square', gain: 0.14, lowpass: 2400 });
  });
}

/** Cheerful rising blip when a seat fills. */
export function playJoin(): void {
  withMaster(0.4, (c, dest) => {
    tone(c, dest, { freq: 523.25, at: 0, duration: 0.11, type: 'triangle', gain: 0.25 });
    tone(c, dest, { freq: 783.99, at: 0.1, duration: 0.2, type: 'triangle', gain: 0.25 });
  });
}

/** Big sparkle when all four seats are full. */
export function playFullHouse(): void {
  withMaster(0.5, (c, dest) => {
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, i) => {
      tone(c, dest, { freq, at: i * 0.07, duration: 0.35, type: 'triangle', gain: 0.22 });
    });
  });
}

/** Countdown tick; `go` plays the big final hit. */
export function playCountdown(go: boolean): void {
  withMaster(0.5, (c, dest) => {
    if (go) {
      tone(c, dest, { freq: 880, at: 0, duration: 0.5, type: 'square', gain: 0.16, lowpass: 3000 });
      tone(c, dest, { freq: 1108.73, at: 0, duration: 0.5, type: 'square', gain: 0.12, lowpass: 3000 });
      tone(c, dest, { freq: 1318.51, at: 0, duration: 0.6, type: 'triangle', gain: 0.2 });
      tone(c, dest, { freq: 110, glideTo: 55, at: 0, duration: 0.4, type: 'sine', gain: 0.35 });
    } else {
      tone(c, dest, { freq: 660, at: 0, duration: 0.14, type: 'square', gain: 0.14, lowpass: 2400 });
    }
  });
}

/** Soft double chime when it becomes your turn. */
export function playYourTurn(): void {
  withMaster(0.4, (c, dest) => {
    tone(c, dest, { freq: 987.77, at: 0, duration: 0.18, type: 'sine', gain: 0.3 });
    tone(c, dest, { freq: 1318.51, at: 0.12, duration: 0.35, type: 'sine', gain: 0.3 });
  });
}

/** Sync success that grows with the streak: more notes, higher sparkle. */
export function playStreak(level: number): void {
  withMaster(0.55, (c, dest) => {
    const base = [659.25, 830.61, 987.77, 1318.51];
    const extra = Math.min(level - 1, 4);
    const notes = [...base, ...Array.from({ length: extra }, (_, i) => 1318.51 * Math.pow(2, (i + 1) / 4))];
    notes.forEach((freq, i) => {
      tone(c, dest, { freq, at: i * 0.07, duration: 0.4, type: 'sine', gain: 0.28 });
      tone(c, dest, { freq: freq * 2, at: i * 0.07, duration: 0.2, type: 'triangle', gain: 0.05 });
    });
    tone(c, dest, { freq: 2637, at: notes.length * 0.07, duration: 0.6, type: 'sine', gain: 0.12, attack: 0.02 });
  });
}

/** Triumphant fanfare for a win. */
export function playFanfare(): void {
  withMaster(0.6, (c, dest) => {
    const seq: Array<[number, number, number]> = [
      [523.25, 0, 0.16],
      [523.25, 0.18, 0.16],
      [523.25, 0.36, 0.16],
      [659.25, 0.54, 0.4],
      [783.99, 0.86, 0.3],
      [1046.5, 1.1, 0.9],
    ];
    seq.forEach(([freq, at, dur]) => {
      tone(c, dest, { freq, at, duration: dur, type: 'square', gain: 0.12, lowpass: 2600 });
      tone(c, dest, { freq: freq / 2, at, duration: dur, type: 'triangle', gain: 0.16 });
      tone(c, dest, { freq: freq * 2, at, duration: dur * 0.6, type: 'sine', gain: 0.05 });
    });
    tone(c, dest, { freq: 130.81, at: 1.1, duration: 1.0, type: 'sine', gain: 0.3 });
  });
}

/** Sad trombone-ish slide for a loss. */
export function playDefeat(): void {
  withMaster(0.45, (c, dest) => {
    const seq: Array<[number, number, number]> = [
      [392, 0, 0.3],
      [369.99, 0.32, 0.3],
      [349.23, 0.64, 0.3],
      [329.63, 0.96, 0.9],
    ];
    seq.forEach(([freq, at, dur]) => {
      tone(c, dest, { freq, glideTo: freq * 0.97, at, duration: dur, type: 'sawtooth', gain: 0.16, lowpass: 900 });
    });
    tone(c, dest, { freq: 82.41, glideTo: 60, at: 0.96, duration: 0.9, type: 'sine', gain: 0.3 });
  });
}

/** Neutral resolve for a draw. */
export function playDraw(): void {
  withMaster(0.4, (c, dest) => {
    tone(c, dest, { freq: 440, at: 0, duration: 0.3, type: 'triangle', gain: 0.25 });
    tone(c, dest, { freq: 440, at: 0.35, duration: 0.6, type: 'triangle', gain: 0.25 });
  });
}

/** Bubbly "boop" when an emoji reaction floats up. Pitch varies per emoji. */
export function playReact(seed = 0): void {
  withMaster(0.35, (c, dest) => {
    const base = 520 + (seed % 5) * 60;
    tone(c, dest, { freq: base, glideTo: base * 1.6, at: 0, duration: 0.12, type: 'sine', gain: 0.3 });
    tone(c, dest, { freq: base * 2, at: 0.06, duration: 0.1, type: 'triangle', gain: 0.08 });
  });
}

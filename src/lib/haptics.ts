/** Best-effort vibration; silently ignored where unsupported (desktop, iOS Safari). */
export function vibrate(pattern: number | readonly number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern as number | number[]);
  } catch {
    /* ignore */
  }
}

export const HAPTIC = {
  tap: 8,
  move: 12,
  capture: [30, 20, 40],
  check: [50, 40, 50],
  syncIn: [20, 30, 20, 30, 60],
  syncOut: 90,
  yourTurn: [25, 50, 25],
  win: [60, 40, 60, 40, 200],
  lose: 250,
} as const;

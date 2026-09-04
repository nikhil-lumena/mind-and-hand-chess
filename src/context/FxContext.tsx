'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ConfettiEngine, type BurstOptions } from '@/lib/confetti';
import styles from './FxLayer.module.css';

export type PopupVariant = 'gold' | 'green' | 'red' | 'blue' | 'purple';

export interface PopupOptions {
  text: string;
  sub?: string;
  variant?: PopupVariant;
  size?: 'md' | 'lg' | 'xl';
  /** `pop` floats up from the center; `sweep` is a full-width banner that slides across. */
  kind?: 'pop' | 'sweep';
}

interface Popup extends Required<Omit<PopupOptions, 'sub'>> {
  id: number;
  sub?: string;
}

interface FxValue {
  popup: (o: PopupOptions) => void;
  burst: (o?: BurstOptions) => void;
  rain: (ms?: number, colors?: string[]) => void;
  shake: (level?: 'light' | 'heavy') => void;
}

const FxContext = createContext<FxValue>({
  popup: () => {},
  burst: () => {},
  rain: () => {},
  shake: () => {},
});

export function useFx() {
  return useContext(FxContext);
}

const POP_MS = 1500;
const SWEEP_MS = 1600;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function FxProvider({ children }: { children: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ConfettiEngine | null>(null);
  const idRef = useRef(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [shakeLevel, setShakeLevel] = useState<'light' | 'heavy' | null>(null);
  const shakeTimer = useRef(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    engineRef.current = new ConfettiEngine(canvasRef.current);
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const popup = useCallback((o: PopupOptions) => {
    const id = ++idRef.current;
    const kind = o.kind ?? 'pop';
    setPopups((prev) => [
      ...prev.slice(-3),
      { id, text: o.text, sub: o.sub, variant: o.variant ?? 'gold', size: o.size ?? 'lg', kind },
    ]);
    window.setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== id));
    }, kind === 'sweep' ? SWEEP_MS : POP_MS);
  }, []);

  const burst = useCallback((o?: BurstOptions) => {
    if (prefersReducedMotion()) return;
    engineRef.current?.burst(o);
  }, []);

  const rain = useCallback((ms = 3000, colors?: string[]) => {
    if (prefersReducedMotion()) return;
    engineRef.current?.rain(ms, colors);
  }, []);

  const shake = useCallback((level: 'light' | 'heavy' = 'light') => {
    if (prefersReducedMotion()) return;
    window.clearTimeout(shakeTimer.current);
    setShakeLevel(null);
    // Re-trigger the animation even if one is mid-flight.
    requestAnimationFrame(() => {
      setShakeLevel(level);
      shakeTimer.current = window.setTimeout(() => setShakeLevel(null), level === 'heavy' ? 520 : 320);
    });
  }, []);

  const value = useMemo(() => ({ popup, burst, rain, shake }), [popup, burst, rain, shake]);

  return (
    <FxContext.Provider value={value}>
      <div className={`${styles.shakeRoot} ${shakeLevel === 'heavy' ? styles.shakeHeavy : shakeLevel === 'light' ? styles.shakeLight : ''}`}>
        {children}
      </div>
      <div className={styles.layer} aria-hidden="true">
        <canvas ref={canvasRef} className={styles.canvas} />
        {popups.map((p) => (
          <div
            key={p.id}
            className={`${p.kind === 'sweep' ? styles.sweep : styles.pop} ${styles[`v_${p.variant}`]} ${styles[`s_${p.size}`]}`}
          >
            <span className={styles.popText}>{p.text}</span>
            {p.sub && <span className={styles.popSub}>{p.sub}</span>}
          </div>
        ))}
      </div>
    </FxContext.Provider>
  );
}

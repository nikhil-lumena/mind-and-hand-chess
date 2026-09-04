'use client';

import React, { useEffect, useState } from 'react';
import { useSound } from '@/context/SoundContext';
import { playCountdown } from '@/lib/sounds';
import styles from './Countdown.module.css';

const STEPS = ['3', '2', '1', 'GO!'];
const STEP_MS = 700;
/** Only show a countdown for games that started moments ago. */
const FRESH_MS = 2500;

export function Countdown() {
  const { startEvent, muted } = useSound();
  const [step, setStep] = useState<number | null>(null);
  const [runId, setRunId] = useState<number | null>(null);

  useEffect(() => {
    if (!startEvent || startEvent.id === runId) return;
    if (Date.now() - startEvent.at > FRESH_MS) return;
    setRunId(startEvent.id);
    setStep(0);
  }, [startEvent, runId]);

  useEffect(() => {
    if (step === null) return;
    if (!muted) playCountdown(step === STEPS.length - 1);
    const t = window.setTimeout(() => {
      setStep((s) => (s === null || s >= STEPS.length - 1 ? null : s + 1));
    }, step === STEPS.length - 1 ? STEP_MS + 300 : STEP_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (step === null) return null;
  const isGo = step === STEPS.length - 1;

  return (
    <div className={styles.overlay} aria-live="assertive">
      <div key={step} className={`${styles.number} ${isGo ? styles.go : ''}`}>
        {STEPS[step]}
      </div>
      {step === 0 && <div className={styles.caption}>Get ready</div>}
    </div>
  );
}

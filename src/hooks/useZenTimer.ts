import { useState, useEffect, useRef, useCallback } from 'react';
import { playZenChime } from '../utils/audio';
import { hapticCelebration } from '../utils/haptics';
import { stopAmbientSound } from '../utils/ambientAudio';

export interface ZenTimerState {
  timeLeft: number;
  initialTime: number;
  isTimerRunning: boolean;
  isZenMode: boolean;
  toggleZenMode: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  adjustTime: (deltaSeconds: number) => void;
  setTimerMinutes: (minutes: number) => void;
  finishEarlySession: () => void;
}

export function useZenTimer(
  defaultMinutes = 25,
  onTimerComplete?: (durationSeconds: number) => void
): ZenTimerState {
  const [initialTime, setInitialTime] = useState(defaultMinutes * 60);
  const [timeLeft, setTimeLeft] = useState(defaultMinutes * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);

  const endTimeRef = useRef<number | null>(null);
  const timeLeftMsRef = useRef<number | null>(null);

  const toggleZenMode = useCallback(() => {
    setIsZenMode(prev => !prev);
  }, []);

  const startTimer = useCallback(() => {
    const remainingMs = timeLeftMsRef.current ?? (timeLeft <= 0 ? initialTime * 1000 : timeLeft * 1000);
    endTimeRef.current = Date.now() + remainingMs;
    timeLeftMsRef.current = null;
    setIsTimerRunning(true);
  }, [initialTime, timeLeft]);

  const pauseTimer = useCallback(() => {
    if (endTimeRef.current !== null) {
      const remainingMs = Math.max(0, endTimeRef.current - Date.now());
      timeLeftMsRef.current = remainingMs;
      setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
    }
    endTimeRef.current = null;
    setIsTimerRunning(false);
  }, []);

  const toggleTimer = useCallback(() => {
    if (isTimerRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [isTimerRunning, pauseTimer, startTimer]);

  const resetTimer = useCallback(() => {
    endTimeRef.current = null;
    timeLeftMsRef.current = null;
    setIsTimerRunning(false);
    setTimeLeft(initialTime);
  }, [initialTime]);

  const adjustTime = useCallback((deltaSeconds: number) => {
    setInitialTime(prev => Math.max(0, prev + deltaSeconds));

    if (isTimerRunning) {
      const currentEnd = endTimeRef.current ?? (Date.now() + (timeLeftMsRef.current ?? timeLeft * 1000));
      const newEnd = Math.max(Date.now(), currentEnd + deltaSeconds * 1000);
      endTimeRef.current = newEnd;
      timeLeftMsRef.current = null;
      const remainingMs = Math.max(0, newEnd - Date.now());
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(prev => (prev === remainingSecs ? prev : remainingSecs));

      if (remainingMs <= 0) {
        playZenChime();
        setIsTimerRunning(false);
        endTimeRef.current = null;
      }
    } else {
      timeLeftMsRef.current = null;
      setTimeLeft(prev => Math.max(0, prev + deltaSeconds));
    }
  }, [isTimerRunning, timeLeft]);

  const setTimerMinutes = useCallback((minutes: number) => {
    const newTime = minutes * 60;
    endTimeRef.current = null;
    timeLeftMsRef.current = null;
    setIsTimerRunning(false);
    setTimeLeft(newTime);
    setInitialTime(newTime);
  }, []);

  // Interval ticker with high precision & state deduplication
  useEffect(() => {
    if (!isTimerRunning) return;

    if (endTimeRef.current === null) {
      const remainingMs = timeLeftMsRef.current ?? (timeLeft <= 0 ? initialTime * 1000 : timeLeft * 1000);
      endTimeRef.current = Date.now() + remainingMs;
      timeLeftMsRef.current = null;
    }

    const tick = () => {
      if (endTimeRef.current === null) return;
      const remainingMs = Math.max(0, endTimeRef.current - Date.now());
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

      setTimeLeft(prev => (prev === remainingSecs ? prev : remainingSecs));

      if (remainingMs <= 0) {
        hapticCelebration();
        stopAmbientSound(1000);
        playZenChime();
        if (onTimerComplete) {
          onTimerComplete(initialTime);
        }
        setIsTimerRunning(false);
        endTimeRef.current = null;
        timeLeftMsRef.current = null;
      }
    };

    tick();
    const interval = setInterval(tick, 500);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isTimerRunning, initialTime, timeLeft]);

  // Auto-start when entering Zen mode if fresh
  useEffect(() => {
    if (isZenMode && timeLeft === initialTime && !isTimerRunning) {
      startTimer();
    }
  }, [isZenMode, initialTime, timeLeft, isTimerRunning, startTimer]);

  // Screen Wake Lock API to prevent device sleep while focusing
  useEffect(() => {
    let wakeLockSentinel: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockSentinel) {
        try {
          await wakeLockSentinel.release();
        } catch (err) {
          console.warn('Wake Lock release failed:', err);
        } finally {
          wakeLockSentinel = null;
        }
      }
    };

    if (isTimerRunning) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isTimerRunning) {
        requestWakeLock();
      } else {
        releaseWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isTimerRunning]);

  const finishEarlySession = useCallback(() => {
    let elapsedSeconds = 0;
    if (endTimeRef.current !== null) {
      const remainingMs = Math.max(0, endTimeRef.current - Date.now());
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
      elapsedSeconds = Math.max(0, initialTime - remainingSecs);
    } else {
      elapsedSeconds = Math.max(0, initialTime - timeLeft);
    }

    if (elapsedSeconds >= 10 && onTimerComplete) {
      onTimerComplete(elapsedSeconds);
      hapticCelebration();
      playZenChime();
    }

    endTimeRef.current = null;
    timeLeftMsRef.current = null;
    setIsTimerRunning(false);
    setTimeLeft(initialTime);
  }, [initialTime, timeLeft, onTimerComplete]);

  return {
    timeLeft,
    initialTime,
    isTimerRunning,
    isZenMode,
    toggleZenMode,
    startTimer,
    pauseTimer,
    toggleTimer,
    resetTimer,
    adjustTime,
    setTimerMinutes,
    finishEarlySession,
  };
}

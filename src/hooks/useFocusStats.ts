import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import type { FocusSession } from '../types';
import { defaultFocusStorage } from '../services/storage/focusStorage';

function generateUniqueId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

export interface DayFocusStat {
  dayName: string;
  dateStr: string;
  seconds: number;
  isToday: boolean;
}

export function useFocusStats() {
  const [sessions, setSessions] = useState<FocusSession[]>(() => defaultFocusStorage.loadSessions());

  useEffect(() => {
    setSessions(defaultFocusStorage.loadSessions());
    const unsubscribe = defaultFocusStorage.subscribeSessions(updated => {
      setSessions(updated);
    });
    return unsubscribe;
  }, []);

  const saveSessions = useCallback((updated: FocusSession[]) => {
    setSessions(updated);
    defaultFocusStorage.saveSessions(updated);
  }, []);

  const recordSession = useCallback(
    (durationSeconds: number) => {
      if (durationSeconds <= 0) return;
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const newSession: FocusSession = {
        id: generateUniqueId(),
        date: todayStr,
        durationSeconds,
        timestamp: Date.now(),
      };
      saveSessions([newSession, ...sessions]);
    },
    [sessions, saveSessions]
  );

  const stats = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let totalSeconds = 0;
    let todaySeconds = 0;

    for (const s of sessions) {
      totalSeconds += s.durationSeconds;
      if (s.date === todayStr) {
        todaySeconds += s.durationSeconds;
      }
    }

    const days: DayFocusStat[] = [];
    const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dStr = format(d, 'yyyy-MM-dd');
      const dayIndex = d.getDay();
      const dayName = WEEK_DAYS[dayIndex];

      const daySecs = sessions
        .filter(s => s.date === dStr)
        .reduce((sum, s) => sum + s.durationSeconds, 0);

      days.push({
        dayName,
        dateStr: dStr,
        seconds: daySecs,
        isToday: i === 0,
      });
    }

    const maxDaySeconds = Math.max(1, ...days.map(d => d.seconds));

    return {
      totalFocusSeconds: totalSeconds,
      totalSessionsCount: sessions.length,
      todayFocusSeconds: todaySeconds,
      weeklyDays: days,
      maxDaySeconds,
    };
  }, [sessions]);

  return {
    sessions,
    stats,
    recordSession,
  };
}

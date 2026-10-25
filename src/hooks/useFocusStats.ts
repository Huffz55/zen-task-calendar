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

export interface HeatmapDay {
  dateStr: string;
  dayOfWeek: number; // 0-6 (Sun-Sat)
  seconds: number;
  level: number; // 0..4
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
    (durationSeconds: number, taskId?: string, taskTitle?: string) => {
      if (durationSeconds <= 0) return;
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const newSession: FocusSession = {
        id: generateUniqueId(),
        date: todayStr,
        durationSeconds,
        timestamp: Date.now(),
        taskId,
        taskTitle,
      };
      saveSessions([newSession, ...sessions]);
    },
    [sessions, saveSessions]
  );

  const stats = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let totalSeconds = 0;
    let todaySeconds = 0;

    const dateMap = new Map<string, number>();

    for (const s of sessions) {
      totalSeconds += s.durationSeconds;
      if (s.date === todayStr) {
        todaySeconds += s.durationSeconds;
      }
      dateMap.set(s.date, (dateMap.get(s.date) || 0) + s.durationSeconds);
    }

    const days: DayFocusStat[] = [];
    const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dStr = format(d, 'yyyy-MM-dd');
      const dayIndex = d.getDay();
      const dayName = WEEK_DAYS[dayIndex];
      const daySecs = dateMap.get(dStr) || 0;

      days.push({
        dayName,
        dateStr: dStr,
        seconds: daySecs,
        isToday: i === 0,
      });
    }

    const maxDaySeconds = Math.max(1, ...days.map(d => d.seconds));

    // 12 Weeks (84 days) Activity Matrix
    const heatmapDays: HeatmapDay[] = [];
    for (let i = 83; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dStr = format(d, 'yyyy-MM-dd');
      const daySecs = dateMap.get(dStr) || 0;
      let level = 0;
      if (daySecs >= 5400) level = 4; // 90m+
      else if (daySecs >= 3000) level = 3; // 50m+
      else if (daySecs >= 1500) level = 2; // 25m+
      else if (daySecs > 0) level = 1; // 1m+

      heatmapDays.push({
        dateStr: dStr,
        dayOfWeek: d.getDay(),
        seconds: daySecs,
        level,
        isToday: i === 0,
      });
    }

    return {
      totalFocusSeconds: totalSeconds,
      totalSessionsCount: sessions.length,
      todayFocusSeconds: todaySeconds,
      weeklyDays: days,
      maxDaySeconds,
      heatmapDays,
    };
  }, [sessions]);

  return {
    sessions,
    stats,
    recordSession,
  };
}

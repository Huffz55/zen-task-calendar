import React from 'react';
import { BarChart3, Sparkles } from 'lucide-react';
import type { DayFocusStat } from '../hooks/useFocusStats';

interface FocusAnalyticsCardProps {
  totalFocusSeconds: number;
  totalSessionsCount: number;
  todayFocusSeconds: number;
  weeklyDays: DayFocusStat[];
  maxDaySeconds: number;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function FocusAnalyticsCard({
  totalFocusSeconds,
  totalSessionsCount,
  todayFocusSeconds,
  weeklyDays,
  maxDaySeconds,
}: FocusAnalyticsCardProps) {
  return (
    <div className="bg-white/70 backdrop-blur-md border border-pink-100 rounded-3xl p-6 shadow-sm flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-pink-100/70 text-pink-500 flex items-center justify-center">
            <BarChart3 size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">Weekly Focus Analytics</h3>
            <p className="text-xs text-gray-400">Synced in real-time across your devices</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-xs font-semibold border border-pink-100">
          <Sparkles size={13} />
          <span>{totalSessionsCount} Sessions 🧘</span>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 gap-4 py-3 px-4 bg-pink-50/40 rounded-2xl border border-pink-50">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-gray-400 tracking-wider">TODAY</span>
          <span className="text-xl font-extrabold text-gray-800 mt-0.5">
            {formatDuration(todayFocusSeconds)}
          </span>
        </div>
        <div className="flex flex-col items-center border-l border-pink-100">
          <span className="text-[10px] font-bold text-gray-400 tracking-wider">TOTAL FOCUS</span>
          <span className="text-xl font-extrabold text-pink-500 mt-0.5">
            {formatDuration(totalFocusSeconds)}
          </span>
        </div>
      </div>

      {/* 7-Day Bar Chart */}
      <div className="flex items-end justify-between h-28 pt-4 px-2">
        {weeklyDays.map(day => {
          const heightPercent =
            maxDaySeconds > 0 && day.seconds > 0
              ? Math.max(12, Math.round((day.seconds / maxDaySeconds) * 100))
              : 8;

          return (
            <div key={day.dateStr} className="flex-1 flex flex-col items-center h-full justify-end group">
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-gray-800 text-white px-2 py-0.5 rounded mb-1.5 whitespace-nowrap pointer-events-none">
                {formatDuration(day.seconds)}
              </div>

              {/* Bar track and fill */}
              <div className="w-5 md:w-6 h-20 bg-gray-100 rounded-lg flex items-end overflow-hidden p-0.5">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-md transition-all duration-500 ${
                    day.isToday
                      ? 'bg-gradient-to-t from-pink-500 to-rose-400 shadow-sm'
                      : day.seconds > 0
                      ? 'bg-pink-300'
                      : 'bg-gray-200'
                  }`}
                />
              </div>

              {/* Day label */}
              <span
                className={`text-[11px] mt-2 font-medium ${
                  day.isToday ? 'text-pink-600 font-bold' : 'text-gray-400'
                }`}
              >
                {day.dayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

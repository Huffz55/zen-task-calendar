import React, { useState } from 'react';
import { Grid } from 'lucide-react';
import type { HeatmapDay } from '../hooks/useFocusStats';

interface ZenHeatmapProps {
  days: HeatmapDay[];
}

function formatMinutes(seconds: number): string {
  if (seconds <= 0) return 'No focus logged';
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m focus`;
  }
  return `${mins}m focus`;
}

export function ZenHeatmap({ days }: ZenHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

  // Group 84 days into 12 columns of 7 days
  const columns: HeatmapDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    columns.push(days.slice(i, i + 7));
  }

  const getTileClass = (level: number) => {
    switch (level) {
      case 4:
        return 'bg-pink-600 hover:bg-pink-700 shadow-xs';
      case 3:
        return 'bg-pink-400 hover:bg-pink-500';
      case 2:
        return 'bg-pink-200 hover:bg-pink-300';
      case 1:
        return 'bg-pink-100 hover:bg-pink-200';
      default:
        return 'bg-gray-100 hover:bg-gray-200/80';
    }
  };

  return (
    <div className="bg-white/70 backdrop-blur-md border border-pink-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-pink-100/70 text-pink-500 flex items-center justify-center">
            <Grid size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800">Zen Activity Matrix</h4>
            <p className="text-xs text-gray-400">Consistency across the last 12 weeks</p>
          </div>
        </div>

        {/* Hover Pill */}
        <div className="h-6">
          {hoveredDay ? (
            <span className="text-xs font-semibold text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-100 animate-slide-up-fade">
              {hoveredDay.dateStr}: {formatMinutes(hoveredDay.seconds)}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-gray-400">Hover tiles for details</span>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto pb-2 scrollbar-none">
        <div className="flex gap-1.5 min-w-max justify-center sm:justify-start">
          {columns.map((col, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-1.5">
              {col.map((day) => {
                const isHovered = hoveredDay?.dateStr === day.dateStr;
                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onClick={() => setHoveredDay(day)}
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm transition-all duration-150 ${getTileClass(
                      day.level
                    )} ${
                      day.isToday ? 'ring-2 ring-pink-500 ring-offset-1' : ''
                    } ${isHovered ? 'scale-125 z-10' : ''}`}
                    title={`${day.dateStr}: ${formatMinutes(day.seconds)}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 text-[10px] text-gray-400 font-medium">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((lvl) => (
            <div key={lvl} className={`w-2.5 h-2.5 rounded-xs ${getTileClass(lvl)}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

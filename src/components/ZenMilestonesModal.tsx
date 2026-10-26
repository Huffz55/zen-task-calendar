import React, { useMemo, useEffect } from 'react';
import { X, Award, CheckCircle2, Lock } from 'lucide-react';
import type { Task, ZenMilestone } from '../types';

interface ZenMilestonesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  currentStreak: number;
  totalFocusSeconds: number;
}

export function ZenMilestonesModal({
  isOpen,
  onClose,
  tasks,
  currentStreak,
  totalFocusSeconds,
}: ZenMilestonesModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  const milestones: ZenMilestone[] = useMemo(() => {
    const hasCompletedTask = tasks.some(
      t => Array.isArray(t.completedDates) && t.completedDates.length > 0
    );
    const hasPinnedTask = tasks.some(t => t.isPinned);
    const hasSubtasks = tasks.some(t => t.subtasks && t.subtasks.length > 0);

    return [
      {
        id: 'perfect_day',
        title: 'First Perfect Day',
        description: 'Complete all planned daily tasks for any day',
        icon: '🌸',
        unlocked: hasCompletedTask || currentStreak >= 1,
      },
      {
        id: 'streak_3',
        title: 'Mindful Momentum',
        description: 'Maintain a 3-day mindful streak',
        icon: '🔥',
        unlocked: currentStreak >= 3,
      },
      {
        id: 'streak_7',
        title: 'Zen Master',
        description: 'Reach a full 7-day consistency streak',
        icon: '⚡',
        unlocked: currentStreak >= 7,
      },
      {
        id: 'deep_focus',
        title: 'Deep Presence',
        description: 'Log 60+ minutes in the Zen Focus timer',
        icon: '🧘',
        unlocked: totalFocusSeconds >= 3600,
      },
      {
        id: 'focus_of_day',
        title: 'One Big Thing',
        description: 'Pin a high-priority daily focus goal',
        icon: '⭐',
        unlocked: hasPinnedTask,
      },
      {
        id: 'checklist_pro',
        title: 'Checklist Pro',
        description: 'Break goals into mindful subtask steps',
        icon: '📋',
        unlocked: hasSubtasks,
      },
    ];
  }, [tasks, currentStreak, totalFocusSeconds]);

  const unlockedCount = milestones.filter(m => m.unlocked).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white/95 backdrop-blur-xl border border-pink-100 rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-scale-up relative max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="milestones-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-pink-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-xs">
              <Award size={20} />
            </div>
            <div>
              <h3 id="milestones-modal-title" className="text-lg font-bold text-gray-800 tracking-tight">
                Zen Milestones & Streaks
              </h3>
              <p className="text-xs text-gray-400">
                Celebrate your mindful productivity journey
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-pink-50 rounded-full transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Unlocked Progress Pill */}
        <div className="my-4 p-3 bg-pink-50/60 border border-pink-100/80 rounded-2xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <span className="text-xs font-semibold text-gray-700">
              {unlockedCount} of {milestones.length} Badges Unlocked
            </span>
          </div>
          <div className="w-24 bg-white/80 h-2 rounded-full overflow-hidden border border-pink-100">
            <div
              className="bg-pink-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${(unlockedCount / milestones.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Milestones Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1 py-1">
          {milestones.map(m => (
            <div
              key={m.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                m.unlocked
                  ? 'bg-white border-pink-200/90 shadow-xs hover:border-pink-300'
                  : 'bg-gray-50/70 border-gray-100 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl select-none">{m.icon}</span>
                  {m.unlocked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <CheckCircle2 size={11} />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                      <Lock size={10} />
                      <span>Locked</span>
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-gray-800 mb-0.5">{m.title}</h4>
                <p className="text-[11px] text-gray-500 leading-relaxed">{m.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-pink-50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

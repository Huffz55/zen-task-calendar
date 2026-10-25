import React from 'react';
import { X, Moon, CheckCircle2, Hourglass, Flame, Sparkles } from 'lucide-react';
import { playSoftPop } from '../utils/audio';
import { hapticLight, hapticSuccess } from '../utils/haptics';

interface EveningReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedTasks: number;
  totalTasks: number;
  focusSeconds: number;
  currentStreak: number;
  overdueCount: number;
  onRollover: () => void;
}

function formatMinutes(seconds: number): string {
  if (seconds <= 0) return '0m';
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }
  return `${mins}m`;
}

export function EveningReviewModal({
  isOpen,
  onClose,
  completedTasks,
  totalTasks,
  focusSeconds,
  currentStreak,
  overdueCount,
  onRollover,
}: EveningReviewModalProps) {
  if (!isOpen) return null;

  const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isPerfect = totalTasks > 0 && completedTasks === totalTasks;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-pink-950/40 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl border border-pink-100 rounded-3xl shadow-2xl p-6 sm:p-8 animate-slide-up-fade text-center">
        {/* Close Button */}
        <button
          onClick={() => {
            hapticLight();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-colors cursor-pointer"
          title="Close"
        >
          <X size={18} />
        </button>

        {/* Icon Header */}
        <div className="w-14 h-14 rounded-2xl bg-pink-100/80 text-pink-500 mx-auto flex items-center justify-center shadow-inner mb-3">
          <Moon size={26} />
        </div>
        <h3 className="text-xl font-bold text-gray-800">Evening Wind-Down 🌙</h3>
        <p className="text-xs text-gray-400 mt-1">
          Review your accomplishments and clear your mind
        </p>

        {/* KPI Grid */}
        <div className="grid grid-cols-3 gap-3 my-6">
          <div className="p-3 bg-pink-50/50 rounded-2xl border border-pink-100 flex flex-col items-center gap-1">
            <CheckCircle2 size={16} className="text-pink-500" />
            <span className="text-base font-extrabold text-gray-800">{completedTasks}/{totalTasks}</span>
            <span className="text-[10px] text-gray-400 font-semibold uppercase">Tasks</span>
          </div>

          <div className="p-3 bg-pink-50/50 rounded-2xl border border-pink-100 flex flex-col items-center gap-1">
            <Hourglass size={16} className="text-pink-500" />
            <span className="text-base font-extrabold text-pink-600">{formatMinutes(focusSeconds)}</span>
            <span className="text-[10px] text-gray-400 font-semibold uppercase">Focus</span>
          </div>

          <div className="p-3 bg-pink-50/50 rounded-2xl border border-pink-100 flex flex-col items-center gap-1">
            <Flame size={16} className="text-amber-500" />
            <span className="text-base font-extrabold text-amber-600">{currentStreak} Days</span>
            <span className="text-[10px] text-gray-400 font-semibold uppercase">Streak</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 text-left">
          <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1.5">
            <span>Daily Completion</span>
            <span className="text-pink-600">{percent}%</span>
          </div>
          <div className="h-2 w-full bg-pink-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-400 to-rose-400 rounded-full transition-all duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Zen Quote */}
        <div className="p-3.5 bg-pink-50/30 border border-pink-100/60 rounded-xl mb-6">
          <p className="text-xs italic text-gray-600 leading-relaxed">
            "{isPerfect
              ? 'A day fully lived brings peaceful rest. Well done.'
              : 'Rest is not idleness, but the soul’s quiet harvest.'}"
          </p>
        </div>

        {/* Actions */}
        {overdueCount > 0 ? (
          <button
            onClick={() => {
              playSoftPop();
              hapticSuccess();
              onRollover();
              onClose();
            }}
            className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-pink-200 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles size={16} />
            <span>Roll over {overdueCount} remaining to tomorrow & rest 🌸</span>
          </button>
        ) : (
          <button
            onClick={() => {
              playSoftPop();
              hapticSuccess();
              onClose();
            }}
            className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-pink-200 transition-all active:scale-98 cursor-pointer"
          >
            Rest & Sleep Peacefully 🌸
          </button>
        )}
      </div>
    </div>
  );
}

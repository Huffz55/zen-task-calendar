import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Cloud, Moon, Award, HelpCircle, ChevronRight, Sparkles } from 'lucide-react';
import { hapticLight } from '../utils/haptics';

interface ZenMoreMenuProps {
  onOpenSync: () => void;
  onOpenReview: () => void;
  onOpenMilestones: () => void;
  onOpenShortcuts: () => void;
  isEvening: boolean;
}

export function ZenMoreMenu({
  onOpenSync,
  onOpenReview,
  onOpenMilestones,
  onOpenShortcuts,
  isEvening,
}: ZenMoreMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleAction = (callback: () => void) => {
    hapticLight();
    setIsOpen(false);
    callback();
  };

  return (
    <div className={`relative inline-block ${isOpen ? 'z-50' : 'z-30'}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          hapticLight();
          setIsOpen(prev => !prev);
        }}
        className={`h-11 px-3.5 rounded-full bg-white/70 backdrop-blur-md border shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none cursor-pointer relative group ${
          isOpen
            ? 'bg-white text-pink-600 border-pink-300 ring-2 ring-pink-100 shadow-md'
            : 'text-gray-500 hover:text-pink-600 hover:bg-white border-pink-100/80 hover:border-pink-200'
        }`}
        title="More Options"
        aria-label="More Actions"
        aria-expanded={isOpen}
      >
        <MoreHorizontal size={18} className="transition-transform group-hover:scale-110" />
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-2xl rounded-3xl border border-pink-100/90 shadow-[0_20px_50px_rgba(244,114,182,0.18)] p-2.5 z-[100] animate-slide-up-fade">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-pink-50/80 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
              <Sparkles size={12} />
              <span>Sanctuary Tools</span>
            </span>
            <span className="text-[10px] text-gray-400">Quiet Space</span>
          </div>

          <div className="space-y-1">
            {/* Evening Wind-Down */}
            <button
              type="button"
              onClick={() => handleAction(onOpenReview)}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl text-left hover:bg-pink-50/70 transition-all text-xs group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center transition-colors">
                  <Moon size={15} />
                </div>
                <div>
                  <span className="font-semibold text-gray-800">Evening Wind-Down</span>
                  <p className="text-[10px] text-gray-400">Reflect & close your day</p>
                </div>
              </div>
              <ChevronRight size={13} className="text-gray-300 group-hover:text-pink-500 transition-colors" />
            </button>

            {/* Cloud Sync */}
            <button
              type="button"
              onClick={() => handleAction(onOpenSync)}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl text-left hover:bg-pink-50/70 transition-all text-xs group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Cloud size={15} />
                </div>
                <div>
                  <span className="font-semibold text-gray-800">Cloud Sync</span>
                  <p className="text-[10px] text-gray-400">Backup & device pairing</p>
                </div>
              </div>
              <ChevronRight size={13} className="text-gray-300 group-hover:text-pink-500 transition-colors" />
            </button>

            {/* Badges & Streaks */}
            <button
              type="button"
              onClick={() => handleAction(onOpenMilestones)}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl text-left hover:bg-pink-50/70 transition-all text-xs group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Award size={15} />
                </div>
                <div>
                  <span className="font-semibold text-gray-800">Zen Badges</span>
                  <p className="text-[10px] text-gray-400">Streaks & mindful achievements</p>
                </div>
              </div>
              <ChevronRight size={13} className="text-gray-300 group-hover:text-pink-500 transition-colors" />
            </button>

            {/* Keyboard Shortcuts */}
            <button
              type="button"
              onClick={() => handleAction(onOpenShortcuts)}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl text-left hover:bg-pink-50/70 transition-all text-xs group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <HelpCircle size={15} />
                </div>
                <div>
                  <span className="font-semibold text-gray-800">Shortcuts Guide</span>
                  <p className="text-[10px] text-gray-400">Flow with N, F, Z, Space, ?</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-lg bg-gray-100 text-gray-500">
                ?
              </span>
            </button>
          </div>

          {/* Footer quote */}
          <div className="mt-2 pt-2 border-t border-pink-50 text-center">
            <p className="text-[10px] text-gray-400 italic">
              "Simplicity is the quiet path to focus."
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Wind } from 'lucide-react';
import { playSoftPop, playSingingBowl } from '../utils/audio';
import { hapticLight, hapticSuccess } from '../utils/haptics';

interface ZenBreathingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BreathPhase = 'Inhale' | 'Hold' | 'Exhale';

export function ZenBreathingModal({ isOpen, onClose }: ZenBreathingModalProps) {
  const [phase, setPhase] = useState<BreathPhase>('Inhale');
  const [scale, setScale] = useState(1);
  const [remainingSeconds, setRemainingSeconds] = useState(180); // 3-minute break

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    playSingingBowl();
    let isMounted = true;

    // 4-4-4 rhythm
    const cycle = () => {
      if (!isMounted) return;
      // Inhale
      setPhase('Inhale');
      setScale(1.4);

      setTimeout(() => {
        if (!isMounted) return;
        // Hold
        setPhase('Hold');

        setTimeout(() => {
          if (!isMounted) return;
          // Exhale
          setPhase('Exhale');
          setScale(1.0);

          setTimeout(() => {
            if (isMounted) cycle();
          }, 4000);
        }, 4000);
      }, 4000);
    };

    cycle();

    const ticker = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(ticker);
          hapticSuccess();
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(ticker);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-pink-950/40 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl border border-pink-100 rounded-3xl shadow-2xl p-8 flex flex-col items-center animate-slide-up-fade text-center">
        {/* Close Button */}
        <button
          onClick={() => {
            hapticLight();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-colors cursor-pointer"
          title="Close Break"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 text-pink-500 font-bold text-xs uppercase tracking-wider mb-1">
          <Wind size={15} />
          <span>Zen Box Breathing</span>
        </div>
        <h3 className="text-xl font-bold text-gray-800">Mindful Break 🌸</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Take a deep breath and sync with the expanding circle
        </p>

        {/* Pulsing Breathing Circle */}
        <div className="my-10 relative w-48 h-48 flex items-center justify-center">
          <div
            className="w-40 h-40 rounded-full border-2 border-pink-200 bg-pink-50/60 transition-transform duration-[4000ms] ease-in-out flex items-center justify-center"
            style={{ transform: `scale(${scale})` }}
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 text-white font-bold text-sm flex items-center justify-center shadow-lg shadow-pink-300/40">
              {phase}
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="text-sm font-mono font-semibold text-gray-600 mb-6 flex items-center gap-1.5">
          <Sparkles size={14} className="text-pink-400" />
          <span>{mins}:{secs < 10 ? `0${secs}` : secs} remaining</span>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            playSoftPop();
            hapticSuccess();
            onClose();
          }}
          className="px-6 py-2.5 bg-gradient-to-tr from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-semibold text-xs rounded-full shadow-md shadow-pink-200 transition-all active:scale-95 cursor-pointer"
        >
          Resume Session ✨
        </button>
      </div>
    </div>
  );
}

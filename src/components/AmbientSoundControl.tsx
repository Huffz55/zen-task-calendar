import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  CloudRain, 
  Waves, 
  Trees, 
  Wind, 
  Flame, 
  ChevronDown 
} from 'lucide-react';
import { 
  playAmbientSound, 
  stopAmbientSound, 
  setAmbientVolume, 
  getAmbientSound, 
  getAmbientVolume,
  type AmbientSoundType 
} from '../utils/ambientAudio';
import { hapticLight } from '../utils/haptics';

interface SoundOption {
  type: AmbientSoundType;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

const SOUNDS: SoundOption[] = [
  { type: 'none', label: 'Off', sublabel: 'Silence', icon: <VolumeX size={15} /> },
  { type: 'rain', label: 'Rain', sublabel: 'Gentle shower 🌧️', icon: <CloudRain size={15} /> },
  { type: 'waves', label: 'Ocean Waves', sublabel: 'Tidal surf 🌊', icon: <Waves size={15} /> },
  { type: 'forest', label: 'Forest & Birds', sublabel: 'Morning songs 🌲', icon: <Trees size={15} /> },
  { type: 'wind', label: 'Soft Wind', sublabel: 'Gentle breeze 🍃', icon: <Wind size={15} /> },
  { type: 'fire', label: 'Fireplace', sublabel: 'Cozy crackle 🔥', icon: <Flame size={15} /> },
];

export function AmbientSoundControl() {
  const [selectedSound, setSelectedSound] = useState<AmbientSoundType>(() => getAmbientSound());
  const [volume, setVolume] = useState<number>(() => getAmbientVolume());
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close popover when clicking outside
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

  const handleSelect = (soundType: AmbientSoundType) => {
    hapticLight();
    setSelectedSound(soundType);
    if (soundType === 'none') {
      stopAmbientSound();
    } else {
      playAmbientSound(soundType, volume);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setAmbientVolume(newVolume);
  };

  const currentOption = SOUNDS.find(s => s.type === selectedSound) || SOUNDS[0];
  const isPlaying = selectedSound !== 'none';

  return (
    <div className={`relative inline-block ${isOpen ? 'z-40' : 'z-20'}`} ref={containerRef}>
      {/* Trigger Pill Button */}
      <button
        onClick={() => {
          hapticLight();
          setIsOpen(!isOpen);
        }}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 flex items-center gap-1.5 shadow-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 cursor-pointer ${
          isPlaying
            ? 'bg-pink-100/90 text-pink-700 border-pink-200/80 shadow-pink-200/20'
            : 'bg-white/80 hover:bg-pink-50/70 text-gray-500 hover:text-pink-600 border-pink-100/60'
        }`}
        title="Ambient Focus Sounds"
      >
        <span className={`transition-transform duration-300 ${isPlaying ? 'animate-pulse text-pink-500' : 'text-gray-400'}`}>
          {currentOption.icon}
        </span>
        <span className="truncate max-w-[85px] sm:max-w-none">
          {isPlaying ? currentOption.label : 'Ambient'}
        </span>
        <ChevronDown 
          size={12} 
          className={`transition-transform duration-200 text-pink-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl rounded-2xl border border-pink-100 shadow-[0_16px_40px_rgba(244,114,182,0.18)] p-3 z-50 animate-slide-up-fade">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-pink-50">
            <span className="text-[11px] font-bold uppercase tracking-wider text-pink-400">
              Focus Ambience
            </span>
            {isPlaying && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Active
              </span>
            )}
          </div>

          {/* Sound Presets */}
          <div className="space-y-1 mb-3">
            {SOUNDS.map(sound => {
              const isSelected = selectedSound === sound.type;
              return (
                <button
                  key={sound.type}
                  onClick={() => handleSelect(sound.type)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all duration-200 text-xs cursor-pointer ${
                    isSelected
                      ? 'bg-pink-100 text-pink-800 font-semibold shadow-sm'
                      : 'hover:bg-pink-50/70 text-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`${isSelected ? 'text-pink-600' : 'text-gray-400'}`}>
                      {sound.icon}
                    </span>
                    <div>
                      <div className="leading-tight">{sound.label}</div>
                      <div className="text-[10px] opacity-70 font-normal leading-tight">{sound.sublabel}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Volume Slider (Shown when sound is active) */}
          {isPlaying && (
            <div className="pt-2 border-t border-pink-50 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  <Volume2 size={12} className="text-pink-400" />
                  Volume
                </span>
                <span className="font-medium text-pink-600">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.01"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-pink-100 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

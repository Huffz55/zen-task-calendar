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
  toggleAmbientSound,
  stopAllAmbientSounds,
  setAmbientVolume, 
  getAmbientVolume,
  getActiveAmbientSounds,
  type AmbientSoundType 
} from '../utils/ambientAudio';
import { hapticLight } from '../utils/haptics';

interface SoundOption {
  type: AmbientSoundType;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

export interface AmbientSoundControlProps {
  align?: 'left' | 'right' | 'center';
  dropDirection?: 'up' | 'down';
}

const SOUNDS: SoundOption[] = [
  { type: 'none', label: 'Off', sublabel: 'Silence', icon: <VolumeX size={15} /> },
  { type: 'rain', label: 'Rain', sublabel: 'Gentle shower 🌧️', icon: <CloudRain size={15} /> },
  { type: 'waves', label: 'Ocean Waves', sublabel: 'Tidal surf 🌊', icon: <Waves size={15} /> },
  { type: 'forest', label: 'Forest & Birds', sublabel: 'Morning songs 🌲', icon: <Trees size={15} /> },
  { type: 'wind', label: 'Soft Wind', sublabel: 'Gentle breeze 🍃', icon: <Wind size={15} /> },
  { type: 'fire', label: 'Fireplace', sublabel: 'Cozy crackle 🔥', icon: <Flame size={15} /> },
];

export function AmbientSoundControl({
  align = 'right',
  dropDirection = 'down',
}: AmbientSoundControlProps = {}) {
  const [activeSounds, setActiveSounds] = useState<AmbientSoundType[]>(() => getActiveAmbientSounds());
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

  const handleToggleSound = (soundType: AmbientSoundType) => {
    hapticLight();
    if (soundType === 'none') {
      stopAllAmbientSounds();
      setActiveSounds([]);
    } else {
      toggleAmbientSound(soundType, volume);
      setActiveSounds(getActiveAmbientSounds());
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setAmbientVolume(newVolume);
  };

  const isPlaying = activeSounds.length > 0;
  const pillLabel = isPlaying
    ? activeSounds.length === 1
      ? SOUNDS.find(s => s.type === activeSounds[0])?.label || 'Ambient'
      : `${activeSounds.length} Sounds Mixed 🎵`
    : 'Ambient';

  const primaryIcon = isPlaying
    ? SOUNDS.find(s => s.type === activeSounds[0])?.icon || <Volume2 size={15} />
    : <VolumeX size={15} />;

  return (
    <div className={`relative inline-block ${isOpen ? 'z-50' : 'z-20'}`} ref={containerRef}>
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
        title="Ambient Focus Sounds Mixer"
      >
        <span className={`transition-transform duration-300 ${isPlaying ? 'animate-pulse text-pink-500' : 'text-gray-400'}`}>
          {primaryIcon}
        </span>
        <span className="truncate max-w-[110px] sm:max-w-none">
          {pillLabel}
        </span>
        <ChevronDown 
          size={12} 
          className={`transition-transform duration-200 text-pink-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            dropDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${
            align === 'center'
              ? 'left-1/2 -translate-x-1/2'
              : align === 'left'
              ? 'left-0'
              : 'right-0'
          } w-64 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl rounded-2xl border border-pink-100 shadow-[0_20px_50px_rgba(244,114,182,0.22)] p-3 z-50 animate-slide-up-fade`}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-pink-50">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-pink-400">
                Ambient Sound Mixer
              </span>
              <p className="text-[9px] text-gray-400">Layer multiple sounds together</p>
            </div>
            {isPlaying && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                {activeSounds.length} Active
              </span>
            )}
          </div>

          {/* Sound Presets */}
          <div className="space-y-1 mb-3">
            {SOUNDS.map(sound => {
              const isSelected = sound.type === 'none'
                ? activeSounds.length === 0
                : activeSounds.includes(sound.type);

              return (
                <button
                  key={sound.type}
                  onClick={() => handleToggleSound(sound.type)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all duration-200 text-xs cursor-pointer ${
                    isSelected && sound.type !== 'none'
                      ? 'bg-pink-100 text-pink-800 font-semibold shadow-sm'
                      : sound.type === 'none' && activeSounds.length === 0
                      ? 'bg-gray-100 text-gray-700 font-medium'
                      : 'hover:bg-pink-50/70 text-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`${isSelected && sound.type !== 'none' ? 'text-pink-600' : 'text-gray-400'}`}>
                      {sound.icon}
                    </span>
                    <div>
                      <div className="leading-tight">{sound.label}</div>
                      <div className="text-[10px] opacity-70 font-normal leading-tight">{sound.sublabel}</div>
                    </div>
                  </div>
                  {isSelected && sound.type !== 'none' && (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-pink-500 text-white text-[10px] font-bold">
                      ✓
                    </span>
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

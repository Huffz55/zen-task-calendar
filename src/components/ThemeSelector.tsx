import React, { useState, useEffect, useRef } from 'react';
import { Palette, Check } from 'lucide-react';
import { hapticLight } from '../utils/haptics';

export type AppTheme = 'sakura' | 'matcha' | 'nordic' | 'midnight';

interface ThemeOption {
  id: AppTheme;
  name: string;
  subtitle: string;
  icon: string;
  previewColors: [string, string, string];
}

const THEMES: ThemeOption[] = [
  {
    id: 'sakura',
    name: 'Sakura Rose',
    subtitle: 'Signature soft pink & warm peach',
    icon: '🌸',
    previewColors: ['#fdf2f8', '#f9a8d4', '#ec4899'],
  },
  {
    id: 'matcha',
    name: 'Matcha Garden',
    subtitle: 'Calm sage green & ivory milk',
    icon: '🍵',
    previewColors: ['#f0f7f2', '#86be94', '#3b8050'],
  },
  {
    id: 'nordic',
    name: 'Nordic Breeze',
    subtitle: 'Minimalist foggy blue & cool slate',
    icon: '🌊',
    previewColors: ['#f0f5fa', '#7daed7', '#2f6ea2'],
  },
  {
    id: 'midnight',
    name: 'Midnight Silk',
    subtitle: 'Deep warm dark mode & lavender glow',
    icon: '🌙',
    previewColors: ['#191624', '#a78bfa', '#c084fc'],
  },
];

interface ThemeSelectorProps {
  currentTheme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
  autoNightShift?: boolean;
  onToggleAutoNightShift?: (enabled: boolean) => void;
}

function ThemeSelectorComponent({
  currentTheme,
  onSelectTheme,
  autoNightShift = false,
  onToggleAutoNightShift,
}: ThemeSelectorProps) {
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

  const handleSelect = (themeId: AppTheme) => {
    hapticLight();
    onSelectTheme(themeId);
    setIsOpen(false);
  };

  const activeTheme = THEMES.find(t => t.id === currentTheme) || THEMES[0];

  return (
    <div className={`relative inline-block ${isOpen ? 'z-50' : 'z-20'}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => {
          hapticLight();
          setIsOpen(!isOpen);
        }}
        className="h-11 px-3 bg-white/60 backdrop-blur-md text-pink-400 hover:bg-white/90 hover:text-pink-500 rounded-full border border-pink-50/80 shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none cursor-pointer"
        title={`Change Theme (Current: ${activeTheme.name})`}
        aria-label="Change Color Theme"
      >
        <span className="text-sm select-none leading-none">{activeTheme.icon}</span>
        <Palette size={15} className="text-pink-400" />
      </button>

      {/* Floating Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl rounded-2xl border border-pink-100 shadow-[0_20px_50px_rgba(0,0,0,0.18)] p-3 z-[100] animate-slide-up-fade">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-pink-50">
            <span className="text-[11px] font-bold uppercase tracking-wider text-pink-400">
              Color Palette
            </span>
            <span className="text-xs select-none">{activeTheme.icon}</span>
          </div>

          <div className="space-y-1.5">
            {THEMES.map(theme => {
              const isSelected = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleSelect(theme.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-200 text-xs border ${
                    isSelected
                      ? 'bg-pink-100/90 text-pink-900 border-pink-200/90 font-semibold shadow-xs'
                      : 'hover:bg-pink-50/70 text-gray-700 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base select-none">{theme.icon}</span>
                    <div>
                      <div className="font-medium text-xs leading-tight">{theme.name}</div>
                      <div className="text-[10px] text-gray-400 font-normal leading-tight mt-0.5">
                        {theme.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Color Swatch Dots */}
                    <div className="flex -space-x-1">
                      {theme.previewColors.map((col, idx) => (
                        <div
                          key={idx}
                          className="w-3.5 h-3.5 rounded-full border border-white shadow-2xs"
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>

                    {isSelected && (
                      <Check size={14} className="text-pink-600 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {onToggleAutoNightShift && (
            <div className="pt-2 mt-2 border-t border-pink-50 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-gray-700">
                <span className="text-xs">🌙</span>
                <span className="text-[11px] font-medium">Auto Night Shift</span>
              </div>
              <button
                type="button"
                onClick={() => onToggleAutoNightShift(!autoNightShift)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoNightShift ? 'bg-pink-500' : 'bg-gray-200'
                }`}
                title={autoNightShift ? "Turn off Auto Night Shift" : "Turn on Auto Night Shift"}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    autoNightShift ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ThemeSelector = React.memo(ThemeSelectorComponent);

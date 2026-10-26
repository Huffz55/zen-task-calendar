import React, { useEffect } from 'react';
import { X, Keyboard, Hash, Sparkles } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keyDisplay: string[];
  action: string;
  description: string;
}

const SHORTCUT_LIST: ShortcutItem[] = [
  {
    keyDisplay: ['N'],
    action: 'New Task',
    description: 'Jump instantly to the task creation input',
  },
  {
    keyDisplay: ['F'],
    action: 'Zen Focus View',
    description: 'Toggle distraction-free view (collapse calendar & expand tasks)',
  },
  {
    keyDisplay: ['T'],
    action: 'Go to Today',
    description: "Snap calendar back to today's date",
  },
  {
    keyDisplay: ['Space'],
    action: 'Timer Toggle',
    description: 'Pause or resume the active Zen focus countdown',
  },
  {
    keyDisplay: ['?'],
    action: 'Shortcuts Guide',
    description: 'Open or close this quick keyboard cheatsheet',
  },
  {
    keyDisplay: ['Esc'],
    action: 'Escape / Cancel',
    description: 'Dismiss open dialogs, cancel task creation, or exit Zen view',
  },
];

const TAG_LIST = [
  { tag: '#work', color: 'bg-blue-50 text-blue-600 border-blue-100', desc: 'Work projects & tasks' },
  { tag: '#personal', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', desc: 'Personal life & chores' },
  { tag: '#zen', color: 'bg-purple-50 text-purple-600 border-purple-100', desc: 'Mindfulness & meditation' },
  { tag: '#urgent', color: 'bg-amber-50 text-amber-600 border-amber-100', desc: 'Time-sensitive goals' },
  { tag: '#study', color: 'bg-indigo-50 text-indigo-600 border-indigo-100', desc: 'Reading & learning' },
  { tag: '#creative', color: 'bg-rose-50 text-rose-600 border-rose-100', desc: 'Art & creative writing' },
];

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white/95 backdrop-blur-xl border border-pink-100 rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-scale-up relative max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-pink-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-500 shadow-xs">
              <Keyboard size={20} />
            </div>
            <div>
              <h3 id="shortcuts-modal-title" className="text-lg font-bold text-gray-800 tracking-tight">
                Keyboard Shortcuts & Flow
              </h3>
              <p className="text-xs text-gray-400">
                Frictionless navigation designed for deep focus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-pink-50 rounded-full transition-colors"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto pr-1 flex-1 py-3 space-y-5">
          {/* Section: Shortcuts List */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-2 flex items-center gap-1.5">
              <span>Essential Keys</span>
            </h4>
            <div className="space-y-1.5">
              {SHORTCUT_LIST.map(item => (
                <div
                  key={item.action}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-pink-50/40 border border-pink-100/60 hover:bg-pink-50/70 transition-colors"
                >
                  <div>
                    <span className="text-xs font-semibold text-gray-800">{item.action}</span>
                    <p className="text-[11px] text-gray-400">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.keyDisplay.map(k => (
                      <kbd
                        key={k}
                        className="px-2.5 py-1 text-xs font-mono font-bold text-gray-700 bg-white border border-gray-200 rounded-lg shadow-2xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Natural Tagging */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-2 flex items-center gap-1.5">
              <Hash size={13} className="text-pink-400" />
              <span>Instant Tagging Syntax</span>
            </h4>
            <p className="text-xs text-gray-500 mb-2.5">
              Type any tag directly into the task title to auto-categorize it:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {TAG_LIST.map(t => (
                <div
                  key={t.tag}
                  className="flex items-center justify-between p-2 rounded-xl bg-white border border-pink-100/80 shadow-2xs"
                >
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${t.color}`}>
                    {t.tag}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate max-w-[110px]">{t.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Calming Philosophy Banner */}
          <div className="p-3 bg-pink-50/60 border border-pink-100/80 rounded-2xl flex items-center gap-2.5 text-xs text-gray-600">
            <Sparkles size={16} className="text-pink-400 shrink-0" />
            <span>
              Zero friction. No need to reach for the mouse when inspiration strikes.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

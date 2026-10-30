import React, { useEffect, useState } from 'react';
import { Task } from '../types';
import { Inbox, CheckCircle2, Trash2, Clock, Sparkles, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { playWaterDrop, playBambooTap, playSoftPop } from '../utils/audio';
import { hapticLight, hapticSuccess } from '../utils/haptics';

interface ZenTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  inboxTasks: Task[];
  onTriageDecision: (taskId: string, decision: 'today' | 'someday' | 'delete') => void;
  onQuickAddTask: (title: string) => void;
}

export function ZenTriageModal({
  isOpen,
  onClose,
  inboxTasks,
  onTriageDecision,
  onQuickAddTask,
}: ZenTriageModalProps) {
  const [newInboxTitle, setNewInboxTitle] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentTask = inboxTasks[currentIndex] || inboxTasks[0];

  useEffect(() => {
    if (currentIndex >= inboxTasks.length && inboxTasks.length > 0) {
      setCurrentIndex(Math.max(0, inboxTasks.length - 1));
    }
  }, [inboxTasks.length, currentIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in the input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (!currentTask) return;

      const key = e.key.toLowerCase();
      if (key === 'd') {
        e.preventDefault();
        handleDecision(currentTask.id, 'today');
      } else if (key === 'w') {
        e.preventDefault();
        handleDecision(currentTask.id, 'someday');
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleDecision(currentTask.id, 'delete');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentTask]);

  if (!isOpen) return null;

  const handleDecision = (taskId: string, decision: 'today' | 'someday' | 'delete') => {
    if (decision === 'today') {
      playWaterDrop();
      hapticSuccess();
    } else if (decision === 'delete') {
      playSoftPop();
      hapticLight();
    } else {
      playBambooTap();
      hapticLight();
    }
    onTriageDecision(taskId, decision);
  };

  const handleAddInbox = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newInboxTitle.trim();
    if (!title) return;
    playWaterDrop();
    onQuickAddTask(title);
    setNewInboxTitle('');
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl bg-white/95 backdrop-blur-2xl rounded-3xl border border-pink-100 shadow-2xl overflow-hidden p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Kapat (Esc)"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
            <Inbox size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>Görev Karantinası (Triage)</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100/70 text-amber-800">
                {inboxTasks.length} Bekleyen
              </span>
            </h2>
            <p className="text-xs text-gray-500">
              Sunsama tarzı zihinsel ayıklama: Gün ortasında aklına geleni havuza at, tek tek karar ver.
            </p>
          </div>
        </div>

        {/* Quick Add to Inbox */}
        <form onSubmit={handleAddInbox} className="mb-6">
          <div className="flex items-center gap-2 bg-gray-50/80 border border-gray-200/80 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-pink-300 focus-within:border-pink-300 transition-all shadow-inner">
            <input
              type="text"
              value={newInboxTitle}
              onChange={e => setNewInboxTitle(e.target.value)}
              placeholder="Aklına bir fikir veya görev mi geldi? Havuza ekle..."
              className="flex-1 px-3 py-1.5 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={!newInboxTitle.trim()}
              className="px-3.5 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-xs"
            >
              <span>Havuza At</span>
              <CornerDownLeft size={13} />
            </button>
          </div>
        </form>

        {/* Focused Task Review / Empty State */}
        {inboxTasks.length > 0 && currentTask ? (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-pink-50/50 via-white to-amber-50/30 border border-pink-100/80 shadow-sm">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>Havuz Görevi {currentIndex + 1} / {inboxTasks.length}</span>
                {currentTask.tag && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-gray-100 text-gray-600 font-medium">
                    #{currentTask.tag}
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-gray-800 mb-1 leading-snug">
                {currentTask.title}
              </h3>
            </div>

            {/* Triage Decision Buttons */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleDecision(currentTask.id, 'today')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-200 transition-all group shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <CheckCircle2 size={16} />
                  <span>Bugüne Al</span>
                </div>
                <span className="text-[10px] text-emerald-600/70 mt-1 font-mono group-hover:text-emerald-700">
                  Tuş: [ D ]
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDecision(currentTask.id, 'someday')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50 hover:bg-amber-100/80 text-amber-700 border border-amber-200 transition-all group shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Clock size={16} />
                  <span>Beklet / Sonra</span>
                </div>
                <span className="text-[10px] text-amber-600/70 mt-1 font-mono group-hover:text-amber-700">
                  Tuş: [ W ]
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDecision(currentTask.id, 'delete')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200 transition-all group shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Trash2 size={16} />
                  <span>Acımadan Sil</span>
                </div>
                <span className="text-[10px] text-rose-600/70 mt-1 font-mono group-hover:text-rose-700">
                  Tuş: [ ⌫ ]
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
              <Sparkles size={26} />
            </div>
            <h3 className="text-base font-bold text-gray-800">Gelen Kutusu Tertemiz (Zero Inbox)</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Karantinada bekleyen hiçbir dağınık görev yok. Zihnin ferah, tüm işler takvimde net.
            </p>
          </div>
        )}

        {/* Footer shortcuts helper */}
        <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <span>Klavye Kısayolları: <strong>D</strong> (Bugün), <strong>W</strong> (Beklet), <strong>Backspace</strong> (Sil)</span>
          <button
            onClick={onClose}
            className="text-pink-600 hover:text-pink-700 font-semibold cursor-pointer"
          >
            Tamamla
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';

interface ShortcutHandlers {
  onToggleFocusTab?: () => void;
  onToggleZen?: () => void;
  onGoToToday?: () => void;
  onNewTask?: () => void;
  onToggleShortcuts?: () => void;
  onToggleTimer?: () => void;
  onEscape?: () => void;
}

export function useShortcuts({
  onToggleFocusTab,
  onToggleZen,
  onGoToToday,
  onNewTask,
  onToggleShortcuts,
  onToggleTimer,
  onEscape,
}: ShortcutHandlers) {
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in inputs or content-editable areas
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if ((e.key === '?' || (e.key === '/' && e.shiftKey)) && onToggleShortcuts) {
        e.preventDefault();
        onToggleShortcuts();
        return;
      }

      if (e.code === 'Space' && onToggleTimer) {
        e.preventDefault();
        onToggleTimer();
        return;
      }

      const key = e.key.toLowerCase();

      if (key === 'f') {
        if (onToggleFocusTab) {
          e.preventDefault();
          onToggleFocusTab();
        } else if (onToggleZen) {
          e.preventDefault();
          onToggleZen();
        }
      } else if (key === 'z' && onToggleZen) {
        e.preventDefault();
        onToggleZen();
      } else if (key === 't' && onGoToToday) {
        e.preventDefault();
        onGoToToday();
      } else if (key === 'n' && onNewTask) {
        e.preventDefault();
        onNewTask();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onToggleFocusTab, onToggleZen, onGoToToday, onNewTask, onToggleShortcuts, onToggleTimer, onEscape]);
}

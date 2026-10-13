import { useEffect } from 'react';

interface ShortcutHandlers {
  onToggleZen?: () => void;
  onGoToToday?: () => void;
  onNewTask?: () => void;
}

export function useShortcuts({ onToggleZen, onGoToToday, onNewTask }: ShortcutHandlers) {
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

      const key = e.key.toLowerCase();

      if (key === 'f' && onToggleZen) {
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
  }, [onToggleZen, onGoToToday, onNewTask]);
}

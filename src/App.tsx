import React, { useState, useMemo, useCallback } from 'react';
import { Calendar } from './components/Calendar';
import { DailyTaskList } from './components/DailyTaskList';
import { CustomLists } from './components/CustomLists';
import { useTasks } from './hooks/useTasks';
import { useLists } from './hooks/useLists';
import { format, subDays } from 'date-fns';
import type { Task } from './types';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Download, Upload, CheckCircle2, AlertCircle, X, RotateCcw, Cloud, Play, Pause, Moon, Wind, Award, HelpCircle } from 'lucide-react';
import { initAudioContext, playSingingBowl, playWaterDrop } from './utils/audio';
import { hapticWarning, hapticSuccess } from './utils/haptics';
import { ThemeSelector, type AppTheme } from './components/ThemeSelector';
import { SyncModal } from './components/SyncModal';
import { validateBackupPayload } from './utils/validation';
import { useZenTimer } from './hooks/useZenTimer';
import { useShortcuts } from './hooks/useShortcuts';
import { useFocusStats } from './hooks/useFocusStats';
import { FocusAnalyticsCard } from './components/FocusAnalyticsCard';
import { AmbientSoundControl } from './components/AmbientSoundControl';
import { ZenHeatmap } from './components/ZenHeatmap';
import { ZenBreathingModal } from './components/ZenBreathingModal';
import { EveningReviewModal } from './components/EveningReviewModal';
import { ZenMilestonesModal } from './components/ZenMilestonesModal';
import { ShortcutsModal } from './components/ShortcutsModal';

interface AppToast {
  type?: 'success' | 'info' | 'error' | 'undo';
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  timeoutId?: NodeJS.Timeout;
}

function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [daytimeTheme, setDaytimeTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('zen_theme') as AppTheme) || 'sakura';
  });
  const [autoNightShift, setAutoNightShift] = useState<boolean>(() => {
    return localStorage.getItem('zen_auto_night_shift') === 'true';
  });
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [notification, setNotification] = useState<AppToast | null>(null);

  const showToast = useCallback((toastData: {
    type?: 'success' | 'info' | 'error' | 'undo';
    title?: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    duration?: number;
  }) => {
    setNotification(prev => {
      if (prev?.timeoutId) clearTimeout(prev.timeoutId);
      return null;
    });

    const duration = toastData.duration ?? 3500;
    const timeoutId = setTimeout(() => {
      setNotification(null);
    }, duration);

    setNotification({
      type: toastData.type || 'success',
      title: toastData.title,
      message: toastData.message,
      actionLabel: toastData.actionLabel,
      onAction: toastData.onAction,
      timeoutId,
    });
  }, []);

  const { 
    tasks, 
    addTask, 
    deleteTask, 
    deleteTaskInstance, 
    deleteTaskFuture, 
    restoreTask, 
    toggleTaskCompletion, 
    getTasksForDate, 
    importTasks, 
    editTask, 
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    addTaskFocusTime,
    reorderTasks, 
    rescheduleTask,
    rolloverOverdueTasks,
    getOverdueTasksCount,
    autoArchiveNeglectedTasks,
    unarchiveTask,
    getArchivedTasks,
    togglePinTask,
    deferTaskToTomorrow,
    duplicateTask,
  } = useTasks();

  const [activeFocusTask, setActiveFocusTask] = useState<{ id: string; title: string } | null>(null);
  const [isZenBreathingOpen, setIsZenBreathingOpen] = useState(false);
  const [isEveningReviewOpen, setIsEveningReviewOpen] = useState(false);
  const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSoftHorizonMode, setIsSoftHorizonMode] = useState(() => {
    return localStorage.getItem('zen_soft_horizon_mode') === 'true';
  });

  const toggleSoftHorizonMode = useCallback(() => {
    playWaterDrop();
    setIsSoftHorizonMode(prev => {
      const next = !prev;
      localStorage.setItem('zen_soft_horizon_mode', String(next));
      return next;
    });
  }, []);

  const setSoftHorizonModeExplicit = useCallback((val: boolean) => {
    playWaterDrop();
    setIsSoftHorizonMode(val);
    localStorage.setItem('zen_soft_horizon_mode', String(val));
  }, []);

  const { stats: focusStats, recordSession: recordFocusSession } = useFocusStats();

  const handleTimerComplete = useCallback((durationSeconds: number) => {
    if (activeFocusTask) {
      addTaskFocusTime(activeFocusTask.id, durationSeconds);
      recordFocusSession(durationSeconds, activeFocusTask.id, activeFocusTask.title);
    } else {
      recordFocusSession(durationSeconds);
    }
    setIsZenBreathingOpen(true);
  }, [activeFocusTask, addTaskFocusTime, recordFocusSession]);

  const {
    timeLeft,
    initialTime,
    isTimerRunning,
    isZenMode,
    toggleZenMode,
    startTimer,
    toggleTimer,
    resetTimer,
    adjustTime,
    setTimerMinutes,
    finishEarlySession,
  } = useZenTimer(25, handleTimerComplete);

  const startTaskFocus = useCallback((task: { id: string; title: string }) => {
    setActiveFocusTask(task);
    setActiveTab('focus');
    playSingingBowl();
    startTimer();
    showToast({
      type: 'success',
      title: 'Deep Focus 🧘',
      message: `Timer started for "${task.title}"`,
      duration: 3000,
    });
  }, [startTimer, showToast]);

  useShortcuts({
    onToggleFocusTab: () => {
      setIsZenMode(false);
      setActiveTab(prev => (prev === 'focus' ? 'tasks' : 'focus'));
    },
    onToggleZen: toggleZenMode,
    onGoToToday: () => {
      setSelectedDate(new Date());
      setActiveTab('tasks');
    },
    onToggleShortcuts: () => setIsShortcutsOpen(prev => !prev),
    onToggleTimer: toggleTimer,
  });

  const [slideAnim, setSlideAnim] = useState<'left' | 'right' | null>(null);
  const [showOfflineReady, setShowOfflineReady] = useState(false);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [activeTab, setActiveTab] = useState<'tasks' | 'lists' | 'focus'>('tasks');

  const { lists, addList, deleteList, restoreList, addListItem, deleteListItem, toggleListItem, importLists } = useLists();
  const [todayDateStr, setTodayDateStr] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Silently auto-archive neglected tasks older than 14 days
  React.useEffect(() => {
    autoArchiveNeglectedTasks(todayDateStr);
  }, [todayDateStr, autoArchiveNeglectedTasks]);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onOfflineReady() {
      setShowOfflineReady(true);
      setTimeout(() => setShowOfflineReady(false), 3000);
    },
  });

  React.useEffect(() => {
    // Ensure AudioContext is resumed on user interaction
    const handleInteraction = () => initAudioContext();
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  React.useEffect(() => {
    const checkDateAndHour = () => {
      const now = new Date();
      setCurrentHour(now.getHours());
      const nowStr = format(now, 'yyyy-MM-dd');
      setTodayDateStr(prev => (prev !== nowStr ? nowStr : prev));
    };

    const interval = setInterval(checkDateAndHour, 30000);
    window.addEventListener('focus', checkDateAndHour);
    const handleVis = () => {
      if (document.visibilityState === 'visible') checkDateAndHour();
    };
    document.addEventListener('visibilitychange', handleVis);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkDateAndHour);
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, []);

  const handleSelectDate = useCallback((date: Date) => {
    playWaterDrop();
    setSelectedDate(prev => {
      if (date > prev) setSlideAnim('left');
      else if (date < prev) setSlideAnim('right');
      return date;
    });
    setTimeout(() => setSlideAnim(null), 150);
  }, []);

  const handleDropTaskToCalendar = useCallback((taskId: string, targetDateStr: string) => {
    rescheduleTask(taskId, targetDateStr);
  }, [rescheduleTask]);

  const selectedDateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  const dailyTasks = useMemo(() => getTasksForDate(selectedDateStr), [getTasksForDate, selectedDateStr]);
  const overdueCount = useMemo(() => getOverdueTasksCount(todayDateStr), [getOverdueTasksCount, todayDateStr]);

  const handleRollover = useCallback(() => {
    const count = rolloverOverdueTasks(todayDateStr);
    if (count > 0) {
      hapticSuccess();
      showToast({
        type: 'success',
        title: 'Rolled over!',
        message: `${count} task${count > 1 ? 's' : ''} moved to today 🌸`,
        actionLabel: 'OK',
        duration: 4000,
      });
    }
  }, [rolloverOverdueTasks, todayDateStr, showToast]);

  const getTaskCountForDate = useCallback((dateStr: string) => {
    return getTasksForDate(dateStr).length;
  }, [getTasksForDate]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    let checkDate = today;

    const todayStr = format(today, 'yyyy-MM-dd');
    const todayTasks = getTasksForDate(todayStr);
    const todayIsPerfect = todayTasks.length > 0 && todayTasks.every(t => t.isCompleted);

    if (todayIsPerfect) {
      streak++;
      checkDate = subDays(checkDate, 1);
    } else {
      checkDate = subDays(checkDate, 1);
    }

    const MAX_STREAK_DAYS = 365;
    let daysChecked = 0;

    while (daysChecked < MAX_STREAK_DAYS) {
      daysChecked++;
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      const dayTasks = getTasksForDate(dateStr);
      const isPerfect = dayTasks.length > 0 && dayTasks.every(t => t.isCompleted);

      if (isPerfect) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
    return streak;
  }, [tasks, getTasksForDate, todayDateStr]);

  const handleDeleteTask = useCallback((taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (taskToDelete) {
      hapticWarning();
      deleteTask(taskId);
      showToast({
        type: 'undo',
        title: 'Task deleted',
        message: `"${taskToDelete.title}" removed`,
        actionLabel: 'Undo',
        onAction: () => restoreTask(taskToDelete),
        duration: 5000,
      });
    }
  }, [tasks, deleteTask, restoreTask, showToast]);

  const handleDeleteTaskInstance = useCallback((taskId: string, dateStr: string) => {
    const taskToModify = tasks.find(t => t.id === taskId);
    if (taskToModify) {
      hapticWarning();
      deleteTaskInstance(taskId, dateStr);
      showToast({
        type: 'undo',
        title: 'Day removed',
        message: `"${taskToModify.title}" skipped for this date`,
        actionLabel: 'Undo',
        onAction: () => restoreTask(taskToModify),
        duration: 5000,
      });
    }
  }, [tasks, deleteTaskInstance, restoreTask, showToast]);

  const handleDeleteTaskFuture = useCallback((taskId: string, dateStr: string) => {
    const taskToModify = tasks.find(t => t.id === taskId);
    if (taskToModify) {
      hapticWarning();
      deleteTaskFuture(taskId, dateStr);
      showToast({
        type: 'undo',
        title: 'Future tasks deleted',
        message: `"${taskToModify.title}" ended from this date`,
        actionLabel: 'Undo',
        onAction: () => restoreTask(taskToModify),
        duration: 5000,
      });
    }
  }, [tasks, deleteTaskFuture, restoreTask, showToast]);

  const handleDeleteList = useCallback((listId: string) => {
    const listToDelete = lists.find(l => l.id === listId);
    if (listToDelete) {
      hapticWarning();
      deleteList(listId);
      showToast({
        type: 'undo',
        title: 'List deleted',
        message: `"${listToDelete.title}" removed`,
        actionLabel: 'Undo',
        onAction: () => restoreList(listToDelete),
        duration: 5000,
      });
    }
  }, [lists, deleteList, restoreList, showToast]);

  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify({ tasks, lists }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'zen-tasks-backup.json';
    link.click();
    URL.revokeObjectURL(url);
    showToast({
      type: 'success',
      title: 'Exported!',
      message: 'Backup saved to zen-tasks-backup.json 🌸',
      actionLabel: 'OK',
      duration: 3500,
    });
  }, [tasks, lists, showToast]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Protection against giant files (5MB limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      showToast({
        type: 'error',
        title: 'Import Error',
        message: 'File size exceeds 5MB limit.',
        actionLabel: 'OK',
        duration: 4000,
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        const validation = validateBackupPayload(parsed);
        if (!validation.isValid) {
          showToast({
            type: 'error',
            title: 'Import Rejected',
            message: validation.error || 'Invalid or corrupted backup format.',
            actionLabel: 'OK',
            duration: 5000,
          });
          return;
        }

        const successTasks = validation.tasks.length > 0 ? importTasks(validation.tasks) : true;
        const successLists = validation.lists.length > 0 && importLists ? importLists(validation.lists) : true;
        
        if (successTasks && successLists) {
          const taskCount = validation.tasks.length;
          const listCount = validation.lists.length;
          showToast({
            type: 'success',
            title: 'Backup Restored! 🌸',
            message: `Successfully verified and imported ${taskCount} task${taskCount === 1 ? '' : 's'}${listCount > 0 ? ` and ${listCount} list${listCount === 1 ? '' : 's'}` : ''}.`,
            actionLabel: 'OK',
            duration: 4000,
          });
        } else {
          showToast({
            type: 'error',
            title: 'Storage Error',
            message: 'Failed to write validated backup to browser storage.',
            actionLabel: 'OK',
            duration: 4000,
          });
        }
      } catch {
        showToast({
          type: 'error',
          title: 'Import Error',
          message: 'Error reading backup file. Please ensure it is valid JSON.',
          actionLabel: 'OK',
          duration: 4000,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getGreeting = () => {
    if (currentHour >= 5 && currentHour < 12) return "A calm morning ahead. 🌸";
    if (currentHour >= 12 && currentHour < 18) return "A focused afternoon. 🌸";
    if (currentHour >= 18 && currentHour < 22) return "Wind down and reflect. 🌙";
    return "Time to rest. 🌙";
  };

  const isNight = currentHour >= 20 || currentHour < 7;
  const currentTheme: AppTheme = (autoNightShift && isNight) ? 'midnight' : daytimeTheme;

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  React.useEffect(() => {
    const handleQuotaExceeded = (e: Event) => {
      const custom = e as CustomEvent<{ message?: string }>;
      showToast({
        type: 'error',
        title: 'Storage Full ⚠️',
        message: custom.detail?.message || 'Browser storage quota is full. Please export your backup and clear old tasks.',
        actionLabel: 'Export',
        onAction: handleExport,
        duration: 8000,
      });
    };
    window.addEventListener('zen_storage_quota_exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('zen_storage_quota_exceeded', handleQuotaExceeded);
  }, [handleExport, showToast]);

  const handleThemeChange = useCallback((newTheme: AppTheme) => {
    setDaytimeTheme(newTheme);
    localStorage.setItem('zen_theme', newTheme);
    const themeNames: Record<AppTheme, string> = {
      sakura: 'Sakura Rose 🌸',
      matcha: 'Matcha Garden 🍵',
      nordic: 'Nordic Breeze 🌊',
      midnight: 'Midnight Silk 🌙',
    };
    showToast({
      type: 'info',
      title: 'Palette Changed',
      message: `Switched to ${themeNames[newTheme]}`,
      duration: 3000,
    });
  }, [showToast]);

  const toggleAutoNightShift = useCallback((enabled: boolean) => {
    setAutoNightShift(enabled);
    localStorage.setItem('zen_auto_night_shift', String(enabled));
    showToast({
      type: 'info',
      title: enabled ? 'Auto Night Shift On 🌙' : 'Auto Night Shift Off',
      message: enabled
        ? 'Theme will auto-switch to Midnight between 20:00 and 07:00'
        : 'App will stay on your selected palette',
      duration: 3000,
    });
  }, [showToast]);

  const getAmbientBackground = () => {
    if (currentTheme === 'midnight') return "bg-[#121019]";
    if (currentTheme === 'matcha') return "bg-[#f2f7f3]";
    if (currentTheme === 'nordic') return "bg-[#f1f6fa]";
    if (currentHour >= 6 && currentHour < 12) return "bg-[#fffbf6]"; // Peach
    if (currentHour >= 12 && currentHour < 17) return "bg-slate-50"; // Light Slate
    if (currentHour >= 17 && currentHour < 20) return "bg-[#fff5f8]"; // Sunset Pink
    return "bg-[#f9f7fb]"; // Lavender
  };

  React.useEffect(() => {
    const pendingCount = dailyTasks.filter(t => !t.isCompleted).length;
    const isPerfect = dailyTasks.length > 0 && pendingCount === 0;

    if (isPerfect) {
      document.title = "Perfect Day 🌸";
    } else if (pendingCount > 0) {
      document.title = `(${pendingCount}) Tasks 🌸`;
    } else {
      document.title = "Tasks 🌸";
    }

    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    link.type = 'image/svg+xml';
    const svg = isPerfect
      ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23fbcfe8" stroke="%23f9a8d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5"></path></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23d1d5db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5"></path></svg>';

    link.href = `data:image/svg+xml,${svg}`;
  }, [dailyTasks]);

  return (
    <div className={`h-[100dvh] overflow-hidden flex flex-col items-center justify-center p-4 md:p-6 font-sans relative transition-colors duration-500 ease-in-out ${getAmbientBackground()}`}>
      
      {/* Tab Navigation & Theme Selector */}
      {!isZenMode && (
        <div className="flex items-center gap-2.5 mb-4 md:mb-6 z-40 shrink-0 relative">
          <div className="flex bg-white/60 backdrop-blur-md p-1.5 rounded-full shadow-sm border border-pink-50/80">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`min-h-[44px] px-6 py-2 md:px-8 md:py-2.5 rounded-full text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 ${activeTab === 'tasks' ? 'bg-white text-pink-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('lists')}
              className={`min-h-[44px] px-6 py-2 md:px-8 md:py-2.5 rounded-full text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 ${activeTab === 'lists' ? 'bg-white text-pink-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Lists
            </button>
            <button
              onClick={() => setActiveTab('focus')}
              className={`min-h-[44px] px-6 py-2 md:px-8 md:py-2.5 rounded-full text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 ${activeTab === 'focus' ? 'bg-white text-pink-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Focus
            </button>
          </div>
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="min-h-[44px] px-3.5 py-2 md:py-2.5 rounded-full bg-white/60 backdrop-blur-md shadow-sm border border-pink-50/80 text-pink-500 hover:text-pink-600 hover:bg-white flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 active:scale-95"
            title="Cloud Sync"
          >
            <Cloud size={16} />
            <span className="hidden sm:inline">Sync</span>
          </button>
          <button
            onClick={() => setIsEveningReviewOpen(true)}
            className={`min-h-[44px] px-3.5 py-2 md:py-2.5 rounded-full bg-white/60 backdrop-blur-md shadow-sm border flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
              currentHour >= 20
                ? 'border-pink-300 text-pink-600 bg-white shadow-md ring-2 ring-pink-100'
                : 'border-pink-50/80 text-pink-500 hover:text-pink-600 hover:bg-white'
            }`}
            title="Evening Review & Wind Down (Ready to close your day? 🌙)"
          >
            <Moon size={15} className={currentHour >= 20 ? 'animate-pulse text-pink-500' : ''} />
            <span className="hidden sm:inline">Review</span>
            {currentHour >= 20 && (
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 ml-0.5" />
            )}
          </button>
          <button
            onClick={() => setIsMilestonesOpen(true)}
            className="min-h-[44px] px-3.5 py-2 md:py-2.5 rounded-full bg-white/60 backdrop-blur-md shadow-sm border border-pink-50/80 text-amber-500 hover:text-amber-600 hover:bg-white flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 active:scale-95"
            title="Zen Milestones & Streaks"
          >
            <Award size={15} />
            <span className="hidden sm:inline">Badges</span>
          </button>
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="min-h-[44px] px-3.5 py-2 md:py-2.5 rounded-full bg-white/60 backdrop-blur-md shadow-sm border border-pink-50/80 text-gray-500 hover:text-gray-700 hover:bg-white flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 active:scale-95"
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle size={15} />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>
          <ThemeSelector
            currentTheme={currentTheme}
            onSelectTheme={handleThemeChange}
            autoNightShift={autoNightShift}
            onToggleAutoNightShift={toggleAutoNightShift}
          />
        </div>
      )}

      {/* Zen Mode Banner if full tabs are hidden */}
      {isZenMode && (
        <div className="flex items-center gap-2.5 mb-4 md:mb-6 z-40 shrink-0 animate-slide-up-fade">
          <button
            onClick={() => setIsZenMode(false)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/80 hover:bg-white text-pink-600 rounded-full border border-pink-200/80 shadow-xs text-xs font-semibold transition-all active:scale-95"
            title="Exit Zen View (Z)"
          >
            <Minimize2 size={14} />
            <span>Exit Zen View (Z)</span>
          </button>
          <button
            onClick={() => {
              setIsZenMode(false);
              setActiveTab('focus');
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white rounded-full shadow-xs text-xs font-semibold transition-all active:scale-95"
            title="Go to Focus Screen (F)"
          >
            <span>Focus Screen (F) →</span>
          </button>
        </div>
      )}

      <div className="max-w-6xl w-full h-full min-h-0 overflow-hidden relative">
        
        {/* Tasks Layout (Absolute Positioned for Smooth Transitions) */}
        <div className={`absolute inset-0 flex flex-col lg:flex-row gap-4 md:gap-6 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-y-auto overflow-x-hidden lg:overflow-hidden pb-32 lg:pb-0
          ${activeTab === 'tasks' ? 'opacity-100 translate-x-0 pointer-events-auto z-10' : 'opacity-0 -translate-x-8 pointer-events-none invisible -z-10'}
        `}>
          {/* Left Column - Header & Calendar */}
          <div
            className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col gap-4 md:gap-6 shrink-0 lg:h-full lg:overflow-hidden
              ${isZenMode ? 'w-0 opacity-0 m-0 p-0 border-0 hidden lg:flex' : 'w-full lg:w-5/12'}
            `}
          >
            <header className="bg-white p-5 md:p-6 rounded-3xl border border-pink-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex justify-between items-start shrink-0 min-w-[280px]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-pink-300/70 text-sm font-medium tracking-wide italic">{getGreeting()}</p>
                  {currentStreak > 0 && (
                    <span className="bg-pink-50 text-pink-400 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                      🔥 {currentStreak} Day{currentStreak > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-800 tracking-tight whitespace-nowrap">Plan your day</h1>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={handleExport}
                  className="p-3 lg:p-2 text-pink-300 hover:bg-pink-50 hover:text-pink-400 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none"
                  title="Export Tasks"
                >
                  <Download size={20} />
                </button>
                <label
                  className="p-3 lg:p-2 text-pink-300 hover:bg-pink-50 hover:text-pink-400 rounded-full transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none"
                  title="Import Tasks"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.querySelector('input')?.click();
                  }}
                >
                  <Upload size={20} />
                  <input
                    type="file"
                    accept=".txt,.json"
                    className="hidden"
                    onChange={handleImport}
                    tabIndex={-1}
                  />
                </label>
              </div>
            </header>

            <div className="flex-none lg:flex-1 lg:overflow-visible flex flex-col lg:min-h-0 min-w-[280px]">
              <div className="h-auto lg:h-full lg:overflow-visible">
                <Calendar
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                  getTaskCountForDate={getTaskCountForDate}
                  onDropTask={handleDropTaskToCalendar}
                />
              </div>
              <div className="mt-3 text-xs text-gray-400 text-center whitespace-nowrap shrink-0 hidden lg:block">
                Shortcuts: N (New) • F (Focus) • Z (Zen) • T (Today) • Space (Timer)
              </div>
            </div>
          </div>

          {/* Right Column - Tasks */}
          <div
            className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] h-auto lg:h-full overflow-visible lg:overflow-hidden flex flex-col shrink-0 flex-1 min-h-0
              ${isZenMode ? 'w-full max-w-2xl mx-auto' : 'w-full lg:w-7/12'}
            `}
          >
            <div
              key={selectedDate.getTime()}
              className={`h-auto lg:h-full flex flex-col overflow-visible ${slideAnim === 'left' ? 'animate-slide-left' : slideAnim === 'right' ? 'animate-slide-right' : ''}`}
            >
              <DailyTaskList
                selectedDate={selectedDate}
                tasks={dailyTasks}
                onToggleTask={toggleTaskCompletion}
                onAddTask={addTask}
                onDeleteTask={handleDeleteTask}
                onDeleteTaskInstance={handleDeleteTaskInstance}
                onDeleteTaskFuture={handleDeleteTaskFuture}
                onEditTask={editTask}
                onTogglePin={togglePinTask}
                onDeferTask={(taskId, dStr) => {
                  deferTaskToTomorrow(taskId, dStr);
                  showToast({
                    type: 'success',
                    title: 'Deferred to Tomorrow 📅',
                    message: 'Task moved to tomorrow.',
                    duration: 3000,
                  });
                }}
                onDuplicateTask={(taskId, dStr) => {
                  const dup = duplicateTask(taskId, dStr);
                  if (dup) {
                    showToast({
                      type: 'success',
                      title: 'Task Duplicated 📋',
                      message: `Created copy of "${dup.title.replace(' (Copy)', '')}"`,
                      duration: 3000,
                    });
                  }
                }}
                onReorderTasks={reorderTasks}
                onToggleSubtask={toggleSubtask}
                onAddSubtask={addSubtask}
                onDeleteSubtask={deleteSubtask}
                onStartFocus={startTaskFocus}
                isZenMode={isZenMode}
                onToggleZenMode={toggleZenMode}
                timeLeft={timeLeft}
                initialTime={initialTime}
                isTimerRunning={isTimerRunning}
                handleTimerChange={setTimerMinutes}
                onToggleTimer={toggleTimer}
                onResetTimer={resetTimer}
                onAdjustTimer={adjustTime}
                onFinishEarly={finishEarlySession}
                overdueTasksCount={overdueCount}
                onRolloverTasks={handleRollover}
                isSoftHorizonMode={isSoftHorizonMode}
                onToggleSoftHorizonMode={toggleSoftHorizonMode}
              />
            </div>
          </div>
        </div>

        {/* Lists Layout (Absolute Positioned for Smooth Transitions) */}
        <div className={`absolute inset-0 flex justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-y-auto overflow-x-hidden lg:overflow-hidden pb-32 lg:pb-0
          ${activeTab === 'lists' ? 'opacity-100 translate-x-0 pointer-events-auto z-10' : 'opacity-0 translate-x-8 pointer-events-none invisible -z-10'}
        `}>
          <div className="w-full max-w-3xl h-auto lg:h-full">
            <CustomLists 
              lists={lists} 
              onAddList={addList} 
              onDeleteList={handleDeleteList}
              onAddListItem={addListItem}
              onDeleteListItem={deleteListItem}
              onToggleListItem={toggleListItem}
            />
          </div>
        </div>

        {/* Focus Layout (Absolute Positioned for Smooth Transitions) */}
        <div className={`absolute inset-0 flex justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-y-auto overflow-x-hidden pb-32 lg:pb-8
          ${activeTab === 'focus' ? 'opacity-100 translate-x-0 pointer-events-auto z-10' : 'opacity-0 translate-x-8 pointer-events-none invisible -z-10'}
        `}>
          <div className="w-full max-w-2xl h-auto flex flex-col gap-6 py-2 px-1">
            {/* Active Focus Target Banner */}
            {activeFocusTask && (
              <div className="w-full bg-pink-50/90 border border-pink-200/80 rounded-2xl p-3 px-4 flex items-center justify-between gap-3 animate-slide-up-fade shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base select-none">🎯</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-pink-600 uppercase tracking-wider">Active Focus Task</p>
                    <h4 className="text-sm font-semibold text-gray-800 truncate">{activeFocusTask.title}</h4>
                  </div>
                </div>
                <button
                  onClick={() => setActiveFocusTask(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white/80 transition-colors"
                  title="Unlink task"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Zen Timer Big View with Breathing Glow Aura */}
            <div className="relative z-30 bg-white/70 backdrop-blur-md border border-pink-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col items-center overflow-hidden">
              {isTimerRunning && (
                <div className="absolute w-80 h-80 rounded-full bg-pink-300/20 blur-3xl animate-pulse pointer-events-none" />
              )}
              <div className="flex items-center gap-2 px-3.5 py-1 bg-pink-50 rounded-full border border-pink-100 mb-4">
                <span className={`w-2 h-2 rounded-full ${isTimerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-pink-400'}`} />
                <span className="text-xs font-semibold text-pink-600">
                  {isTimerRunning ? 'Deep Focus Active 🧘' : 'Ready to Focus'}
                </span>
              </div>

              {/* Segmented Mode Selector: Exact vs Soft Horizon */}
              <div className="flex items-center bg-pink-100/60 dark:bg-pink-950/40 p-1 rounded-full border border-pink-200/70 mb-5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setSoftHorizonModeExplicit(false)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    !isSoftHorizonMode
                      ? 'bg-white text-pink-600 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span>⏱️</span>
                  <span>Exact Time</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSoftHorizonModeExplicit(true)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isSoftHorizonMode
                      ? 'bg-white text-pink-600 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span>🌸</span>
                  <span>Soft Horizon</span>
                </button>
              </div>

              {/* Digits */}
              <div
                onClick={toggleSoftHorizonMode}
                className="cursor-pointer group flex flex-col items-center"
                title="Click to toggle mode (Exact / Soft)"
              >
                <div className="text-6xl md:text-7xl font-mono font-bold tracking-widest text-gray-800 select-none group-hover:text-pink-500 transition-colors">
                  {isSoftHorizonMode
                    ? ((timeLeft || 0) < 60 && (timeLeft || 0) > 0 ? '<1m' : `~${Math.max(1, Math.ceil((timeLeft || 0) / 60))}m`)
                    : `${Math.floor((timeLeft || 0) / 60).toString().padStart(2, '0')}:${(timeLeft || 0) % 60 === 0 ? '00' : ((timeLeft || 0) % 60).toString().padStart(2, '0')}`}
                </div>
                <p className="text-xs text-gray-400 mt-2 font-medium">
                  {isSoftHorizonMode
                    ? 'Stress-free Soft Horizon Mode 🌸 (calm rounded minutes)'
                    : (isTimerRunning ? 'Exact Countdown Mode ⏱️ • Deep focus session' : 'Exact Countdown Mode ⏱️ • Select preset or press play')}
                </p>
              </div>

              {/* Adjust buttons */}
              <div className="flex items-center gap-3 mt-5">
                <button
                  onClick={() => adjustTime(-5 * 60)}
                  className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-pink-600 bg-white/80 hover:bg-pink-50 border border-pink-100 rounded-xl transition-all"
                >
                  -5 min
                </button>
                <button
                  onClick={() => adjustTime(5 * 60)}
                  className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-pink-600 bg-white/80 hover:bg-pink-50 border border-pink-100 rounded-xl transition-all"
                >
                  +5 min
                </button>
              </div>

              {/* Main controls */}
              <div className="flex items-center gap-4 mt-6">
                <button
                  onClick={resetTimer}
                  className="w-12 h-12 rounded-full border border-pink-100 bg-white/80 hover:bg-pink-50 flex items-center justify-center text-gray-400 hover:text-pink-500 transition-all active:scale-95 shadow-xs"
                  title="Reset Timer"
                >
                  <RotateCcw size={18} />
                </button>
                <button
                  onClick={() => {
                    if (!isTimerRunning) {
                      playSingingBowl();
                    }
                    toggleTimer();
                  }}
                  className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white flex items-center justify-center transition-all active:scale-95 shadow-md shadow-pink-200"
                  title={isTimerRunning ? 'Pause' : 'Start'}
                >
                  {isTimerRunning ? <Pause size={26} /> : <Play size={26} className="ml-1" />}
                </button>
              </div>

              {/* Finish early button */}
              {(isTimerRunning || timeLeft < initialTime) && (
                <button
                  onClick={finishEarlySession}
                  className="mt-5 px-5 py-2 text-xs font-bold text-pink-600 bg-pink-100/70 hover:bg-pink-200/80 rounded-full border border-pink-200 transition-all active:scale-95 flex items-center gap-1.5 shadow-xs"
                >
                  <span>Finish Session & Log Focus</span>
                  <span>✨</span>
                </button>
              )}

              {/* Preset chips */}
              <div className="flex items-center gap-2 mt-7 flex-wrap justify-center">
                {[15, 25, 45, 60].map(mins => (
                  <button
                    key={mins}
                    onClick={() => setTimerMinutes(mins)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      initialTime === mins * 60
                        ? 'bg-pink-500 text-white shadow-xs'
                        : 'bg-white/80 text-gray-500 hover:text-pink-600 border border-pink-100'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              {/* Ambient Sound Bar in Focus view */}
              <div className="mt-6 pt-5 border-t border-pink-100/80 w-full flex justify-center relative z-40">
                <AmbientSoundControl align="center" dropDirection="down" />
              </div>
            </div>

            {/* Mindful Breathing Break Trigger */}
            <div className="flex justify-center -my-2">
              <button
                onClick={() => setIsZenBreathingOpen(true)}
                className="px-4 py-2 bg-white/70 hover:bg-pink-50 border border-pink-100 rounded-2xl text-xs font-semibold text-pink-600 transition-all shadow-xs flex items-center gap-2 hover:scale-105 active:scale-95"
              >
                <Wind size={15} className="text-pink-400" />
                <span>Take a Zen Break (4-4-4 Breathing)</span>
                <span>🌸</span>
              </button>
            </div>

            {/* Weekly Focus Analytics Card */}
            <div className="relative z-10">
              <FocusAnalyticsCard
                totalFocusSeconds={focusStats.totalFocusSeconds}
                totalSessionsCount={focusStats.totalSessionsCount}
                todayFocusSeconds={focusStats.todayFocusSeconds}
                weeklyDays={focusStats.weeklyDays}
                maxDaySeconds={focusStats.maxDaySeconds}
              />
            </div>

            {/* Zen 12-Week Heatmap Matrix */}
            <div className="relative z-10">
              <ZenHeatmap days={focusStats.heatmapDays || []} />
            </div>
          </div>
        </div>
        
      </div>

      {/* Offline Ready Toast */}
      {showOfflineReady && (
        <div
          aria-live="polite"
          className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 bg-pink-50 border border-pink-100 px-6 py-3 rounded-full shadow-md flex items-center gap-4 animate-slide-up-fade z-50 text-pink-400 font-medium text-sm"
        >
          Ready for offline focus 🌸
        </div>
      )}



      {/* PWA Update Toast */}
      {needRefresh && (
        <div
          aria-live="polite"
          className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 bg-white border border-pink-100 p-4 rounded-2xl shadow-xl flex flex-col items-center gap-3 animate-slide-up-fade z-[100] min-w-[280px]"
        >
          <span className="font-semibold text-gray-800 text-sm">New version available 🌸</span>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => updateServiceWorker(true)}
              className="flex-1 bg-pink-100 hover:bg-pink-200 text-pink-600 font-medium py-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 text-sm"
            >
              Update
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-500 font-medium py-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Custom In-App Notification Toast */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 bg-pink-50/95 backdrop-blur-md rounded-2xl border border-pink-100 p-4 shadow-xl shadow-pink-500/5 flex items-center gap-3.5 z-[100] max-w-[92vw] sm:max-w-md animate-slide-up-fade"
        >
          <div className="w-10 h-10 rounded-xl bg-pink-100/80 flex items-center justify-center shrink-0 text-pink-500 shadow-sm">
            {notification.type === 'error' ? (
              <AlertCircle size={20} />
            ) : notification.type === 'undo' ? (
              <RotateCcw size={18} />
            ) : (
              <CheckCircle2 size={20} />
            )}
          </div>

          <div className="flex flex-col min-w-0 pr-1 flex-1">
            {notification.title && (
              <span className="text-[11px] font-semibold tracking-wider uppercase text-pink-400">
                {notification.title}
              </span>
            )}
            <span className="text-sm font-medium text-pink-800 break-words">
              {notification.message}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {notification.actionLabel && (
              <button
                onClick={() => {
                  if (notification.onAction) {
                    notification.onAction();
                  }
                  if (notification.timeoutId) {
                    clearTimeout(notification.timeoutId);
                  }
                  setNotification(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-pink-100/80 text-pink-600 rounded-xl shadow-sm border border-pink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
              >
                {notification.actionLabel}
              </button>
            )}

            <button
              onClick={() => {
                if (notification.timeoutId) {
                  clearTimeout(notification.timeoutId);
                }
                setNotification(null);
              }}
              className="p-1.5 text-pink-300 hover:text-pink-500 hover:bg-pink-100/60 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Evening Review Modal */}
      <EveningReviewModal
        isOpen={isEveningReviewOpen}
        onClose={() => setIsEveningReviewOpen(false)}
        completedTasks={dailyTasks.filter(t => t.isCompleted).length}
        totalTasks={dailyTasks.length}
        focusSeconds={focusStats.todayFocusSeconds}
        currentStreak={currentStreak}
        overdueCount={overdueCount}
        onRollover={handleRollover}
      />

      {/* Zen Breathing Modal */}
      <ZenBreathingModal
        isOpen={isZenBreathingOpen}
        onClose={() => setIsZenBreathingOpen(false)}
      />

      {/* Zen Milestones Modal */}
      <ZenMilestonesModal
        isOpen={isMilestonesOpen}
        onClose={() => setIsMilestonesOpen(false)}
        tasks={tasks}
        currentStreak={currentStreak}
        totalFocusSeconds={focusStats.totalFocusSeconds}
      />

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Floating Mini Focus Player (Visible on Tasks / Lists when Timer is active) */}
      {activeTab !== 'focus' && (isTimerRunning || (timeLeft < initialTime && timeLeft > 0)) && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 animate-slide-up-fade">
          <div
            onClick={() => {
              setIsZenMode(false);
              setActiveTab('focus');
            }}
            className="flex items-center gap-3 bg-white/95 backdrop-blur-xl border border-pink-200/90 shadow-[0_10px_30px_rgba(0,0,0,0.12)] px-4 py-2.5 rounded-full cursor-pointer hover:scale-102 hover:border-pink-300 transition-all group"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleTimer();
              }}
              className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 hover:bg-pink-200 transition-colors shrink-0"
              title={isTimerRunning ? "Pause" : "Play"}
            >
              {isTimerRunning ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
            </button>
            <div className="flex flex-col min-w-[120px]">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-xs text-pink-600">
                  {isSoftHorizonMode
                    ? (timeLeft < 60 && timeLeft > 0 ? '<1m' : `~${Math.max(1, Math.ceil(timeLeft / 60))}m`)
                    : `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`}
                </span>
                <span className="text-[10px] text-gray-300">•</span>
                <span className="text-xs font-medium text-gray-700 max-w-[130px] truncate">
                  {activeFocusTask ? `🎯 ${activeFocusTask.title}` : 'Zen Focus 🧘'}
                </span>
              </div>
              <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-pink-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${initialTime > 0 ? Math.min(100, Math.max(0, ((initialTime - timeLeft) / initialTime) * 100)) : 0}%` }}
                />
              </div>
            </div>
            <span className="text-[11px] font-semibold text-pink-500 group-hover:text-pink-600 pl-1 shrink-0">
              Open →
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

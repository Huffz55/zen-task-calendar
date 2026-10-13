import React, { useState, useMemo, useCallback } from 'react';
import { Calendar } from './components/Calendar';
import { DailyTaskList } from './components/DailyTaskList';
import { CustomLists } from './components/CustomLists';
import { useTasks } from './hooks/useTasks';
import { useLists } from './hooks/useLists';
import { format, subDays } from 'date-fns';
import type { Task } from './types';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Download, Upload, CheckCircle2, AlertCircle, X, RotateCcw, Cloud } from 'lucide-react';
import { initAudioContext } from './utils/audio';
import { hapticWarning, hapticSuccess } from './utils/haptics';
import { ThemeSelector, type AppTheme } from './components/ThemeSelector';
import { SyncModal } from './components/SyncModal';
import { validateBackupPayload } from './utils/validation';
import { useZenTimer } from './hooks/useZenTimer';
import { useShortcuts } from './hooks/useShortcuts';

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
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('zen_theme') as AppTheme) || 'sakura';
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
    timeLeft,
    initialTime,
    isTimerRunning,
    isZenMode,
    toggleZenMode,
    toggleTimer,
    resetTimer,
    adjustTime,
    setTimerMinutes,
  } = useZenTimer(25);

  useShortcuts({
    onToggleZen: toggleZenMode,
    onGoToToday: () => setSelectedDate(new Date()),
  });

  const [slideAnim, setSlideAnim] = useState<'left' | 'right' | null>(null);
  const [showOfflineReady, setShowOfflineReady] = useState(false);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [activeTab, setActiveTab] = useState<'tasks' | 'lists'>('tasks');

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
    reorderTasks, 
    rescheduleTask,
    rolloverOverdueTasks,
    getOverdueTasksCount,
  } = useTasks();
  const { lists, addList, deleteList, restoreList, addListItem, deleteListItem, toggleListItem, importLists } = useLists();
  const [todayDateStr, setTodayDateStr] = useState(() => format(new Date(), 'yyyy-MM-dd'));

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

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('zen_theme', currentTheme);
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
    setCurrentTheme(newTheme);
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
          </div>
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="min-h-[44px] px-3.5 py-2 md:py-2.5 rounded-full bg-white/60 backdrop-blur-md shadow-sm border border-pink-50/80 text-pink-500 hover:text-pink-600 hover:bg-white flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 active:scale-95"
            title="Cloud Sync"
          >
            <Cloud size={16} />
            <span className="hidden sm:inline">Sync</span>
          </button>
          <ThemeSelector currentTheme={currentTheme} onSelectTheme={handleThemeChange} />
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
                Shortcuts: N (New) • F (Focus) • T (Today)
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
                onReorderTasks={reorderTasks}
                isZenMode={isZenMode}
                onToggleZenMode={toggleZenMode}
                timeLeft={timeLeft}
                initialTime={initialTime}
                isTimerRunning={isTimerRunning}
                handleTimerChange={setTimerMinutes}
                onToggleTimer={toggleTimer}
                onResetTimer={resetTimer}
                onAdjustTimer={adjustTime}
                overdueTasksCount={overdueCount}
                onRolloverTasks={handleRollover}
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
    </div>
  );
}

export default App;

import React, { useState, useMemo, useCallback } from 'react';
import { Calendar } from './components/Calendar';
import { DailyTaskList } from './components/DailyTaskList';
import { CustomLists } from './components/CustomLists';
import { useTasks } from './hooks/useTasks';
import { useLists } from './hooks/useLists';
import { format, subDays } from 'date-fns';
import type { Task } from './types';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Download, Upload, Play, Pause, RotateCcw, Plus, Minus, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { playZenChime, initAudioContext } from './utils/audio';

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
  const [isZenMode, setIsZenMode] = useState(false);
  const [notification, setNotification] = useState<AppToast | null>(null);
  const [slideAnim, setSlideAnim] = useState<'left' | 'right' | null>(null);
  const [showOfflineReady, setShowOfflineReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [initialTime, setInitialTime] = useState(25 * 60);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [activeTab, setActiveTab] = useState<'tasks' | 'lists'>('tasks');

  const { tasks, addTask, deleteTask, deleteTaskInstance, deleteTaskFuture, restoreTask, toggleTaskCompletion, getTasksForDate, importTasks, editTask, reorderTasks, rescheduleTask } = useTasks();
  const { lists, addList, deleteList, addListItem, deleteListItem, toggleListItem, importLists } = useLists();

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
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const endTimeRef = React.useRef<number | null>(null);
  const timeLeftMsRef = React.useRef<number | null>(null);

  const handleStartTimer = () => {
    const remainingMs = timeLeftMsRef.current ?? (timeLeft <= 0 ? initialTime * 1000 : timeLeft * 1000);
    endTimeRef.current = Date.now() + remainingMs;
    timeLeftMsRef.current = null;
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    if (endTimeRef.current !== null) {
      const remainingMs = Math.max(0, endTimeRef.current - Date.now());
      timeLeftMsRef.current = remainingMs;
      setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
    }
    endTimeRef.current = null;
    setIsTimerRunning(false);
  };

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      handlePauseTimer();
    } else {
      handleStartTimer();
    }
  };

  const handleResetTimer = () => {
    endTimeRef.current = null;
    timeLeftMsRef.current = null;
    setIsTimerRunning(false);
    setTimeLeft(initialTime);
  };

  const handleAdjustTime = (deltaSeconds: number) => {
    const newInitial = Math.max(0, initialTime + deltaSeconds);
    setInitialTime(newInitial);

    if (isTimerRunning) {
      const currentEnd = endTimeRef.current ?? (Date.now() + (timeLeftMsRef.current ?? timeLeft * 1000));
      const newEnd = Math.max(Date.now(), currentEnd + deltaSeconds * 1000);
      endTimeRef.current = newEnd;
      timeLeftMsRef.current = null;
      const remainingMs = Math.max(0, newEnd - Date.now());
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(remainingSecs);

      if (remainingMs <= 0) {
        playZenChime();
        setIsTimerRunning(false);
        endTimeRef.current = null;
      }
    } else {
      timeLeftMsRef.current = null;
      setTimeLeft(prev => Math.max(0, prev + deltaSeconds));
    }
  };

  const handleTimerChange = (minutes: number) => {
    const newTime = minutes * 60;
    endTimeRef.current = null;
    timeLeftMsRef.current = null;
    setIsTimerRunning(false);
    setTimeLeft(newTime);
    setInitialTime(newTime);
  };

  React.useEffect(() => {
    if (!isTimerRunning) return;

    if (endTimeRef.current === null) {
      const remainingMs = timeLeftMsRef.current ?? (timeLeft <= 0 ? initialTime * 1000 : timeLeft * 1000);
      endTimeRef.current = Date.now() + remainingMs;
      timeLeftMsRef.current = null;
    }

    const tick = () => {
      if (endTimeRef.current === null) return;
      const remainingMs = Math.max(0, endTimeRef.current - Date.now());
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

      setTimeLeft(remainingSecs);

      if (remainingMs <= 0) {
        playZenChime();
        setIsTimerRunning(false);
        endTimeRef.current = null;
        timeLeftMsRef.current = null;
      }
    };

    tick();

    const interval = setInterval(tick, 500);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isTimerRunning]);

  React.useEffect(() => {
    if (isZenMode && timeLeft === initialTime && !isTimerRunning) {
      handleStartTimer();
    }
  }, [isZenMode]);

  // Screen Wake Lock API to prevent mobile sleep while timer is running
  React.useEffect(() => {
    let wakeLockSentinel: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockSentinel) {
        try {
          await wakeLockSentinel.release();
        } catch (err) {
          console.warn('Wake Lock release failed:', err);
        } finally {
          wakeLockSentinel = null;
        }
      }
    };

    if (isTimerRunning) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isTimerRunning) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isTimerRunning]);

  const handleSelectDate = (date: Date) => {
    if (date > selectedDate) setSlideAnim('left');
    else if (date < selectedDate) setSlideAnim('right');
    setSelectedDate(date);
    setTimeout(() => setSlideAnim(null), 150);
  };

  const handleDropTaskToCalendar = (taskId: string, targetDateStr: string) => {
    rescheduleTask(taskId, targetDateStr);
  };

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dailyTasks = getTasksForDate(selectedDateStr);

  const getTaskCountForDate = (dateStr: string) => {
    return getTasksForDate(dateStr).length;
  };

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

    while (true) {
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
  }, [tasks, getTasksForDate]);

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

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (taskToDelete) {
      deleteTask(taskId);
      showToast({
        type: 'undo',
        title: 'Task deleted',
        message: `"${taskToDelete.title}" removed`,
        actionLabel: 'Geri Al',
        onAction: () => restoreTask(taskToDelete),
        duration: 5000,
      });
    }
  };

  const handleDeleteTaskInstance = (taskId: string, dateStr: string) => {
    const taskToModify = tasks.find(t => t.id === taskId);
    if (taskToModify) {
      deleteTaskInstance(taskId, dateStr);
      showToast({
        type: 'undo',
        title: 'Day removed',
        message: `"${taskToModify.title}" skipped for this date`,
        actionLabel: 'Geri Al',
        onAction: () => restoreTask(taskToModify),
        duration: 5000,
      });
    }
  };

  const handleDeleteTaskFuture = (taskId: string, dateStr: string) => {
    const taskToModify = tasks.find(t => t.id === taskId);
    if (taskToModify) {
      deleteTaskFuture(taskId, dateStr);
      showToast({
        type: 'undo',
        title: 'Future tasks deleted',
        message: `"${taskToModify.title}" ended from this date`,
        actionLabel: 'Geri Al',
        onAction: () => restoreTask(taskToModify),
        duration: 5000,
      });
    }
  };

  const handleExport = () => {
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
      actionLabel: 'Tamam',
      duration: 3500,
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        let successTasks = false;
        let successLists = false;

        if (Array.isArray(parsed)) {
          // Legacy backup format (only tasks array)
          successTasks = importTasks(parsed);
        } else if (parsed && typeof parsed === 'object') {
          // Combined backup format
          if (Array.isArray(parsed.tasks)) {
            successTasks = importTasks(parsed.tasks);
          }
          if (Array.isArray(parsed.lists) && importLists) {
            successLists = importLists(parsed.lists);
          }
        }
        
        if (successTasks || successLists) {
          showToast({
            type: 'success',
            title: 'Success!',
            message: 'Backup restored successfully! 🌸',
            actionLabel: 'Tamam',
            duration: 4000,
          });
        } else {
          showToast({
            type: 'error',
            title: 'Import Error',
            message: 'Invalid backup file format.',
            actionLabel: 'Tamam',
            duration: 4000,
          });
        }
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Import Error',
          message: 'Error reading the backup file.',
          actionLabel: 'Tamam',
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

  const getAmbientBackground = () => {
    if (currentHour >= 6 && currentHour < 12) return "bg-[#fffbf6]"; // Peach
    if (currentHour >= 12 && currentHour < 17) return "bg-slate-50"; // Light Slate
    if (currentHour >= 17 && currentHour < 20) return "bg-[#fff5f8]"; // Sunset Pink
    return "bg-[#f9f7fb]"; // Lavender
  };

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsZenMode(prev => !prev);
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        setSelectedDate(new Date());
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

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
    <div className={`h-[100dvh] overflow-hidden flex flex-col items-center justify-center p-4 md:p-6 font-sans relative transition-colors duration-[3000ms] ease-in-out ${getAmbientBackground()}`}>
      
      {/* Tab Navigation */}
      {!isZenMode && (
        <div className="flex bg-white/60 backdrop-blur-md p-1.5 rounded-full shadow-sm mb-4 md:mb-6 border border-pink-50/80 z-10 shrink-0">
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
                onToggleZenMode={() => setIsZenMode(!isZenMode)}
                timeLeft={timeLeft}
                setTimeLeft={setTimeLeft}
                initialTime={initialTime}
                setInitialTime={setInitialTime}
                isTimerRunning={isTimerRunning}
                setIsTimerRunning={setIsTimerRunning}
                handleTimerChange={handleTimerChange}
                onToggleTimer={handleToggleTimer}
                onResetTimer={handleResetTimer}
                onAdjustTimer={handleAdjustTime}
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
              onDeleteList={deleteList}
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
    </div>
  );
}

export default App;

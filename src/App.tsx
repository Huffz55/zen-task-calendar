import React, { useState, useMemo } from 'react';
import { Calendar } from './components/Calendar';
import { DailyTaskList } from './components/DailyTaskList';
import { useTasks } from './hooks/useTasks';
import { format, subDays } from 'date-fns';
import type { Task } from './types';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Download, Upload } from 'lucide-react';

function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isZenMode, setIsZenMode] = useState(false);
  const [toast, setToast] = useState<{ task: Task, timeoutId: NodeJS.Timeout } | null>(null);
  const [slideAnim, setSlideAnim] = useState<'left' | 'right' | null>(null);
  const [showOfflineReady, setShowOfflineReady] = useState(false);

  const { tasks, addTask, deleteTask, restoreTask, toggleTaskCompletion, getTasksForDate, importTasks, editTask, reorderTasks } = useTasks();

  useRegisterSW({
    onOfflineReady() {
      setShowOfflineReady(true);
      setTimeout(() => setShowOfflineReady(false), 3000);
    },
  });

  const handleSelectDate = (date: Date) => {
    if (date > selectedDate) setSlideAnim('left');
    else if (date < selectedDate) setSlideAnim('right');
    setSelectedDate(date);
    setTimeout(() => setSlideAnim(null), 150);
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

  const handleDeleteTask = (taskId: string) => {
    // Find the original task object to allow restoring
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (taskToDelete) {
      deleteTask(taskId);
      if (toast?.timeoutId) clearTimeout(toast.timeoutId);
      const timeoutId = setTimeout(() => {
        setToast(null);
      }, 5000);
      setToast({ task: taskToDelete, timeoutId });
    }
  };

  const handleUndoDelete = () => {
    if (toast) {
      restoreTask(toast.task);
      clearTimeout(toast.timeoutId);
      setToast(null);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `noteapp-backup-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const success = importTasks(parsed);
        if (success) {
          alert('Tasks imported successfully!');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Error reading the backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "A calm morning ahead. 🌸";
    if (hour >= 12 && hour < 18) return "A focused afternoon. 🌸";
    if (hour >= 18 && hour < 22) return "Wind down and reflect. 🌙";
    return "Time to rest. 🌙";
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
    <div className="h-[100dvh] overflow-hidden bg-white flex items-center justify-center p-4 md:p-6 font-sans relative">
      <div className="max-w-6xl w-full flex gap-4 md:gap-6 h-full max-h-[850px] overflow-hidden">
        
        {/* Left Column - Header & Calendar */}
        <div 
          className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col gap-4 md:gap-6 h-full shrink-0 overflow-hidden
            ${isZenMode ? 'w-0 opacity-0 m-0 p-0 border-0' : 'w-full lg:w-5/12'}
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
              <p className="text-gray-400 mt-1 text-sm whitespace-nowrap">Serverless task & calendar management</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button 
                onClick={handleExport}
                className="p-2 text-pink-300 hover:bg-pink-50 hover:text-pink-400 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none"
                title="Export Tasks"
              >
                <Download size={20} />
              </button>
              <label 
                className="p-2 text-pink-300 hover:bg-pink-50 hover:text-pink-400 rounded-full transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none"
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

          <div className="flex-1 overflow-hidden flex flex-col min-h-0 min-w-[280px]">
            <div className="flex-1 min-h-0 overflow-hidden">
              <Calendar 
                selectedDate={selectedDate} 
                onSelectDate={handleSelectDate} 
                getTaskCountForDate={getTaskCountForDate}
              />
            </div>
            <div className="mt-3 text-xs text-gray-400 text-center whitespace-nowrap shrink-0">
              Shortcuts: N (New) • F (Focus) • T (Today)
            </div>
          </div>
        </div>

        {/* Right Column - Tasks */}
        <div 
          className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] h-full overflow-hidden flex flex-col shrink-0
            ${isZenMode ? 'w-full max-w-2xl mx-auto' : 'w-full lg:w-7/12'}
          `}
        >
          <div 
            key={selectedDate.getTime()}
            className={`h-full flex flex-col overflow-hidden ${slideAnim === 'left' ? 'animate-slide-left' : slideAnim === 'right' ? 'animate-slide-right' : ''}`}
          >
            <DailyTaskList 
              selectedDate={selectedDate}
              tasks={dailyTasks}
              onToggleTask={toggleTaskCompletion}
              onAddTask={addTask}
              onDeleteTask={handleDeleteTask}
              onEditTask={editTask}
              onReorderTasks={reorderTasks}
              isZenMode={isZenMode}
              onToggleZenMode={() => setIsZenMode(!isZenMode)}
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

      {/* Undo Toast */}
      {toast && (
        <div 
          aria-live="polite"
          className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 bg-pink-50 border border-pink-100 px-6 py-3 rounded-full shadow-md flex items-center gap-4 animate-slide-up-fade z-50"
        >
          <span className="font-medium text-pink-400 text-sm">Task deleted</span>
          <button 
            onClick={handleUndoDelete}
            className="font-bold text-pink-500 hover:text-pink-600 transition-colors text-sm underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none rounded"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export default App;

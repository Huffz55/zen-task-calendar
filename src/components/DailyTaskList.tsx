import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { DailyTask, RecurrenceType, TaskTag } from '../types';
import { CheckCircle2, Circle, Plus, Trash2, Maximize2, Minimize2, GripVertical, Play, Pause, RotateCcw, Minus, Pencil } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSoftPop } from '../utils/audio';
import { hapticLight, hapticSuccess, hapticCelebration } from '../utils/haptics';
import { AmbientSoundControl } from './AmbientSoundControl';

export const TAG_CONFIG: Record<TaskTag, { label: string; icon: string; bgClass: string; textClass: string; borderClass: string }> = {
  work: { label: 'Work', icon: '💼', bgClass: 'bg-blue-50/90', textClass: 'text-blue-600', borderClass: 'border-blue-100' },
  personal: { label: 'Personal', icon: '🌿', bgClass: 'bg-emerald-50/90', textClass: 'text-emerald-600', borderClass: 'border-emerald-100' },
  health: { label: 'Health', icon: '🧘', bgClass: 'bg-amber-50/90', textClass: 'text-amber-600', borderClass: 'border-amber-100' },
  ideas: { label: 'Idea', icon: '💡', bgClass: 'bg-purple-50/90', textClass: 'text-purple-600', borderClass: 'border-purple-100' },
  priority: { label: 'Priority', icon: '⭐', bgClass: 'bg-rose-50/90', textClass: 'text-rose-600', borderClass: 'border-rose-100' },
};

interface DailyTaskListProps {
  selectedDate: Date;
  tasks: DailyTask[];
  onToggleTask: (taskId: string, dateStr: string) => void;
  onAddTask: (title: string, dateStr: string, recurrence: RecurrenceType, tag?: TaskTag) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteTaskInstance?: (taskId: string, dateStr: string) => void;
  onDeleteTaskFuture?: (taskId: string, dateStr: string) => void;
  onEditTask: (taskId: string, newTitle: string) => void;
  onReorderTasks: (draggedId: string, targetId: string) => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  timeLeft?: number;
  setTimeLeft?: React.Dispatch<React.SetStateAction<number>>;
  initialTime?: number;
  setInitialTime?: React.Dispatch<React.SetStateAction<number>>;
  isTimerRunning?: boolean;
  setIsTimerRunning?: React.Dispatch<React.SetStateAction<boolean>>;
  handleTimerChange?: (minutes: number) => void;
  onToggleTimer?: () => void;
  onResetTimer?: () => void;
  onAdjustTimer?: (seconds: number) => void;
  overdueTasksCount?: number;
  onRolloverTasks?: () => void;
}

function DailyTaskListComponent({ 
  selectedDate, 
  tasks, 
  onToggleTask, 
  onAddTask,
  onDeleteTask,
  onDeleteTaskInstance,
  onDeleteTaskFuture,
  onEditTask,
  onReorderTasks,
  isZenMode,
  onToggleZenMode,
  timeLeft = 25 * 60,
  setTimeLeft,
  initialTime = 25 * 60,
  setInitialTime,
  isTimerRunning,
  setIsTimerRunning,
  handleTimerChange,
  onToggleTimer,
  onResetTimer,
  onAdjustTimer,
  overdueTasksCount = 0,
  onRolloverTasks
}: DailyTaskListProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [selectedTag, setSelectedTag] = useState<TaskTag | undefined>(undefined);
  const [activeTagFilter, setActiveTagFilter] = useState<TaskTag | 'all'>('all');
  const [isRolloverDismissed, setIsRolloverDismissed] = useState(false);
  const [showRecurrenceDropdown, setShowRecurrenceDropdown] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isViewingToday = dateStr === todayStr;

  // Inline editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Delete modal state
  const [taskToDelete, setTaskToDelete] = useState<{ taskId: string, recurrence: RecurrenceType } | null>(null);

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const progressPercent = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
  const isPerfectDay = tasks.length > 0 && completedTasks === tasks.length;

  const availableTags = Array.from(new Set(tasks.map(t => t.tag).filter(Boolean))) as TaskTag[];
  const displayedTasks = activeTagFilter === 'all' 
    ? tasks 
    : tasks.filter(t => t.tag === activeTagFilter);

  // Global 'N' Hotkey for Add Task
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsAdding(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const submitTask = () => {
    const raw = newTaskTitle.trim();
    if (!raw) return;

    // Smart natural language hashtag detection
    let finalTitle = raw;
    let finalTag = selectedTag;

    const tagMatch = raw.match(/#(work|personal|health|ideas?|priority)\b/i);
    if (tagMatch) {
      const matched = tagMatch[1].toLowerCase();
      if (matched === 'idea' || matched === 'ideas') finalTag = 'ideas';
      else finalTag = matched as TaskTag;
      finalTitle = raw.replace(tagMatch[0], '').trim();
    }

    onAddTask(finalTitle || raw, dateStr, recurrence, finalTag);
    setNewTaskTitle('');
    setSelectedTag(undefined);
    setRecurrence('none');
    setIsAdding(false);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    submitTask();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitTask();
    }
  };

  const handleToggle = (taskId: string, dateString: string, isCompleted: boolean) => {
    if (!isCompleted) {
      playSoftPop();

      const isLastPending = tasks.filter(t => !t.isCompleted).length === 1;
      if (isLastPending) {
        hapticCelebration();
        confetti({
          particleCount: 55,
          spread: 65,
          origin: { y: 0.6 },
          colors: ['#fdf2f8', '#fbcfe8', '#f472b6', '#ffffff'],
          disableForReducedMotion: false,
          zIndex: 100
        });
      } else {
        hapticSuccess();
      }
    } else {
      hapticLight();
    }
    onToggleTask(taskId, dateString);
  };

  // Inline editing logic
  const handleDoubleClick = (taskId: string, currentTitle: string) => {
    setEditingTaskId(taskId);
    setEditTitle(currentTitle);
  };

  const saveEdit = (taskId: string) => {
    if (editTitle.trim()) {
      onEditTask(taskId, editTitle.trim());
    }
    setEditingTaskId(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, taskId: string) => {
    if (e.key === 'Enter') {
      saveEdit(taskId);
    }
  };

  // Drag and drop logic
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (draggedTaskId && draggedTaskId !== targetTaskId) {
      onReorderTasks(draggedTaskId, targetTaskId);
      hapticLight();
    }
    setDraggedTaskId(null);
  };

  const renderTaskTitle = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        let safeHref = '';
        try {
          const rawUrl = part.startsWith('http://') || part.startsWith('https://') ? part : `https://${part}`;
          const parsed = new URL(rawUrl);
          // Strictly allow only http: and https: protocols
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            safeHref = parsed.toString();
          }
        } catch {
          safeHref = '';
        }

        if (safeHref) {
          return (
            <a
              key={i}
              href={safeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-400 hover:text-pink-500 hover:underline transition-colors"
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            >
              {part}
            </a>
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="bg-white p-5 md:p-6 rounded-3xl border border-pink-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-auto lg:h-full flex flex-col overflow-visible lg:overflow-hidden relative group/zen">
      <div className="mb-4 md:mb-6 flex flex-col shrink-0">
        <div className="flex justify-between items-start w-full">
          <div>
            <h3 className="text-xl md:text-2xl font-semibold text-gray-800">
              {format(selectedDate, 'EEEE')}
            </h3>
            <p className="text-pink-300 font-medium text-sm md:text-base">
              {format(selectedDate, 'MMMM d, yyyy')}
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className={`flex items-center gap-3 ${isZenMode ? 'md:hidden' : ''}`}>
              <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                  {/* Background Track */}
                  <circle
                    cx="22"
                    cy="22"
                    r="18"
                    className="stroke-pink-100/70"
                    strokeWidth="3.5"
                    fill="none"
                  />
                  {/* Progress Fill */}
                  <circle
                    cx="22"
                    cy="22"
                    r="18"
                    className="stroke-pink-400 transition-all duration-700 ease-out"
                    strokeWidth="3.5"
                    strokeDasharray="113.1"
                    strokeDashoffset={113.1 - (113.1 * progressPercent) / 100}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {isPerfectDay ? (
                    <span className="text-xs select-none animate-bounce" title="Perfect Day!">🌸</span>
                  ) : (
                    <span className="text-[10px] font-bold text-gray-600">
                      {tasks.length > 0 ? `${Math.round(progressPercent)}%` : '0%'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-center">
                {isPerfectDay ? (
                  <span className="text-xs font-semibold text-pink-500 bg-pink-50/90 px-2 py-0.5 rounded-full border border-pink-100 whitespace-nowrap">
                    All Done! 🌸
                  </span>
                ) : (
                  <>
                    <span className="text-xs font-semibold text-gray-700">
                      {tasks.length > 0 ? `${completedTasks} of ${tasks.length}` : 'No tasks'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {tasks.length > 0 ? 'completed' : 'planned'}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            <div className={`flex items-center gap-2 shrink-0 ${isZenMode ? 'md:hidden' : ''}`}>
              <AmbientSoundControl />
              
              {onToggleZenMode && (
                <button 
                  onClick={onToggleZenMode}
                  className={`p-2 text-pink-200 hover:text-pink-400 hover:bg-pink-50 rounded-full transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none focus-visible:opacity-100 ${
                    isZenMode ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover/zen:opacity-100'
                  }`}
                  title={isZenMode ? "Exit Focus Mode (F)" : "Focus Mode (F)"}
                >
                  {isZenMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Zen Mode Pomodoro Timer */}
        {isZenMode && (
          <div className="static md:absolute md:top-6 md:right-6 md:z-20 flex flex-col md:items-end gap-3 md:gap-1.5 group w-full md:w-auto mt-6 md:mt-0 bg-pink-50/50 md:bg-transparent p-4 md:p-0 rounded-2xl md:rounded-none">
            
            <div className="flex flex-col sm:flex-row md:flex-row items-center gap-3 md:opacity-80 md:group-hover:opacity-100 transition-opacity justify-between md:justify-end w-full md:w-auto">
              <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 md:translate-x-4 md:group-hover:translate-x-0 w-full sm:w-auto justify-center">
                <button 
                  onClick={() => {
                    if (onAdjustTimer) {
                      onAdjustTimer(-5 * 60);
                    } else if (setTimeLeft && setInitialTime) {
                      setTimeLeft(prev => Math.max(0, prev - 5 * 60));
                      setInitialTime(prev => Math.max(0, prev - 5 * 60));
                    }
                  }}
                  className="p-3 md:p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-pink-400 hover:text-pink-500 hover:bg-pink-100 md:hover:bg-pink-50 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
                  title="Subtract 5m"
                >
                  <Minus size={16} />
                </button>
                <button 
                  onClick={() => {
                    if (onAdjustTimer) {
                      onAdjustTimer(5 * 60);
                    } else if (setTimeLeft && setInitialTime) {
                      setTimeLeft(prev => prev + 5 * 60);
                      setInitialTime(prev => prev + 5 * 60);
                    }
                  }}
                  className="p-3 md:p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-pink-400 hover:text-pink-500 hover:bg-pink-100 md:hover:bg-pink-50 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
                  title="Add 5m"
                >
                  <Plus size={16} />
                </button>
                
                <div className="w-px h-6 md:h-4 bg-pink-200 md:bg-pink-100 mx-1"></div>
                
                <button 
                  onClick={() => {
                    if (onToggleTimer) {
                      onToggleTimer();
                    } else if (setIsTimerRunning) {
                      setIsTimerRunning(!isTimerRunning);
                    }
                  }}
                  className="p-3 md:p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-pink-400 hover:text-pink-500 hover:bg-pink-100 md:hover:bg-pink-50 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
                  title={isTimerRunning ? "Pause" : "Play"}
                >
                  {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button 
                  onClick={() => {
                    if (onResetTimer) {
                      onResetTimer();
                    } else if (setTimeLeft && initialTime !== undefined && setIsTimerRunning) {
                      setTimeLeft(initialTime);
                      setIsTimerRunning(false);
                    }
                  }}
                  className="p-3 md:p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-pink-400 hover:text-pink-500 hover:bg-pink-100 md:hover:bg-pink-50 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
                  title="Reset"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
              
              <div className="flex items-center gap-1.5">
                <div className="hidden md:flex items-center">
                  <AmbientSoundControl />
                </div>
                <div className="text-pink-500 md:text-pink-400 text-3xl sm:text-2xl md:text-xl font-medium tracking-widest font-mono select-none px-2 w-full sm:w-auto text-center sm:text-right">
                  {Math.floor((timeLeft || 0) / 60).toString().padStart(2, '0')}:{(timeLeft || 0) % 60 === 0 ? '00' : ((timeLeft || 0) % 60).toString().padStart(2, '0')}
                </div>
                {onToggleZenMode && (
                  <button 
                    onClick={onToggleZenMode}
                    className="hidden md:flex p-1.5 text-pink-300 hover:text-pink-500 hover:bg-pink-100/50 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
                    title="Exit Focus Mode (F)"
                  >
                    <Minimize2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start md:justify-end gap-1.5 md:gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 md:-translate-y-2 md:group-hover:translate-y-0 w-full md:w-auto">
              {[5, 10, 15, 20, 30].map(mins => (
                <button
                  key={mins}
                  onClick={() => handleTimerChange && handleTimerChange(mins)}
                  className="flex-1 sm:flex-none min-w-[44px] min-h-[44px] px-3 md:px-2 py-2 md:py-1 text-sm md:text-sm font-medium text-pink-400 md:text-pink-300 bg-white md:bg-transparent hover:text-pink-600 md:hover:text-pink-500 hover:bg-pink-100 md:hover:bg-pink-50 rounded-xl md:rounded-lg shadow-sm md:shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
                >
                  {mins}m
                </button>
              ))}
            </div>

          </div>
        )}
      </div>

      <div className="flex-1 overflow-visible lg:overflow-y-auto mb-4 pr-0 md:pr-2 min-h-0 relative w-full max-w-full">
        {/* Overdue Past Tasks Smart Rollover Banner */}
        {isViewingToday && overdueTasksCount > 0 && !isRolloverDismissed && (
          <div className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-slide-up-fade">
            <div className="flex items-center gap-3">
              <span className="text-xl select-none">⏳</span>
              <div>
                <h5 className="text-xs sm:text-sm font-semibold text-amber-900">
                  {overdueTasksCount} unfinished task{overdueTasksCount > 1 ? 's' : ''} from past days
                </h5>
                <p className="text-[11px] text-amber-700/80 mt-0.5">
                  Would you like to roll them over to today?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (onRolloverTasks) onRolloverTasks();
                }}
                className="px-3.5 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-semibold rounded-xl transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 hover:scale-105 active:scale-95"
              >
                Move to Today 🌸
              </button>
              <button
                type="button"
                onClick={() => setIsRolloverDismissed(true)}
                className="px-2.5 py-1.5 text-amber-700/70 hover:text-amber-900 hover:bg-amber-100/60 text-xs font-medium rounded-xl transition-colors focus-visible:outline-none"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {isPerfectDay && tasks.length > 0 && (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-pink-50/90 via-pink-100/40 to-pink-50/90 border border-pink-100/80 shadow-[0_4px_20px_rgba(244,114,182,0.06)] flex items-center gap-3.5 animate-slide-up-fade">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl shrink-0 select-none">
              🌸
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-pink-700">All tasks completed!</h4>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-pink-200/60 text-pink-700 px-2 py-0.5 rounded-full">
                  Perfect Day
                </span>
              </div>
              <p className="text-xs text-pink-500/80 mt-0.5">
                You've completed everything planned for today. Time to rest and recharge 🍵
              </p>
            </div>
          </div>
        )}

        {/* Category Tag Filters (Shown if at least one task has a tag) */}
        {availableTags.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTagFilter('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                activeTagFilter === 'all'
                  ? 'bg-pink-100 text-pink-700 font-semibold shadow-xs'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-pink-50/50'
              }`}
            >
              All ({tasks.length})
            </button>
            {availableTags.map(tag => {
              const conf = TAG_CONFIG[tag];
              const isSelected = activeTagFilter === tag;
              const count = tasks.filter(t => t.tag === tag).length;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setActiveTagFilter(isSelected ? 'all' : tag);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all border ${
                    isSelected
                      ? `${conf.bgClass} ${conf.textClass} ${conf.borderClass} font-semibold ring-1 ring-pink-200 shadow-xs`
                      : 'bg-white/70 text-gray-500 border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <span>{conf.icon}</span>
                  <span>{conf.label}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="h-full min-h-[180px] text-center text-gray-400 flex flex-col items-center justify-center animate-slide-up-fade relative overflow-hidden rounded-2xl w-full p-6">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-pink-400 rounded-full blur-3xl opacity-5 pointer-events-none animate-breathe"></div>
            
            <div className="w-16 h-16 bg-pink-50/80 border border-pink-100 rounded-2xl flex items-center justify-center mb-3 text-2xl relative z-10 shadow-sm">
              🌸
            </div>
            <h4 className="text-base font-medium text-gray-700 mb-1 relative z-10">Clear mind, calm day</h4>
            <p className="text-xs text-gray-400 mb-4 max-w-xs relative z-10">No tasks scheduled for today. Take a mindful break or add your first goal.</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-500 rounded-xl font-medium text-xs transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none flex items-center gap-1.5 relative z-10 hover:scale-105 active:scale-95"
              title="Add a new task (Press 'N')"
            >
              <Plus size={16} />
              Add Task (N)
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {displayedTasks.map(task => (
              <li 
                key={task.id} 
                draggable
                onDragStart={(e) => {
                  handleDragStart(e, task.taskId);
                  e.dataTransfer.setData('text/plain', task.taskId);
                }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, task.taskId)}
                onDragEnd={() => setDraggedTaskId(null)}
                className={`group flex items-center justify-between p-3 md:p-4 rounded-2xl border border-pink-50 hover:bg-pink-50/50 transition-colors animate-slide-up-fade cursor-grab active:cursor-grabbing ${draggedTaskId === task.taskId ? 'opacity-50 border-dashed border-pink-200' : ''}`}
              >
                <div className="flex items-center gap-2 md:gap-4 flex-1 overflow-hidden">
                  <div className="text-pink-100 hover:text-pink-300 cursor-grab active:cursor-grabbing px-1 touch-none hidden md:block">
                    <GripVertical size={16} />
                  </div>
                  
                  <button 
                    onClick={() => handleToggle(task.taskId, dateStr, task.isCompleted)}
                    className={`relative transition-all duration-300 ease-out flex items-center justify-center shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none min-w-[44px] min-h-[44px] hover:scale-105 active:scale-90
                    ${task.isCompleted 
                      ? 'text-pink-400 scale-110 drop-shadow-[0_0_6px_rgba(249,168,212,0.4)]' 
                      : 'text-gray-300 group-hover:text-pink-200'
                    }`}
                  >
                    {task.isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>
                  
                  {editingTaskId === task.taskId ? (
                    <input
                      type="text"
                      autoFocus
                      maxLength={250}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, task.taskId)}
                      onBlur={() => saveEdit(task.taskId)}
                      className="text-base md:text-lg bg-transparent border-b border-pink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 rounded text-gray-700 flex-1 truncate py-2"
                    />
                  ) : (
                    <span 
                      onDoubleClick={() => handleDoubleClick(task.taskId, task.title)}
                      className={`text-base md:text-lg transition-all duration-300 flex-1 truncate cursor-text select-none py-2 flex items-center gap-2 ${task.isCompleted ? 'text-gray-400 line-through opacity-70' : 'text-gray-700'}`}
                    >
                      <span className="truncate">{renderTaskTitle(task.title)}</span>
                      {task.tag && TAG_CONFIG[task.tag] && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${TAG_CONFIG[task.tag].bgClass} ${TAG_CONFIG[task.tag].textClass} ${TAG_CONFIG[task.tag].borderClass}`}>
                          <span>{TAG_CONFIG[task.tag].icon}</span>
                          <span className="hidden sm:inline">{TAG_CONFIG[task.tag].label}</span>
                        </span>
                      )}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-0.5 shrink-0">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleDoubleClick(task.taskId, task.title);
                    }}
                    className="opacity-100 md:opacity-0 group-hover:opacity-100 min-w-[36px] min-h-[36px] md:min-w-[40px] md:min-h-[40px] flex items-center justify-center text-pink-200 hover:text-pink-400 hover:bg-pink-50 transition-all duration-300 rounded-full focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none"
                    title="Edit task"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (task.recurrence !== 'none') {
                        setTaskToDelete({ taskId: task.taskId, recurrence: task.recurrence });
                      } else {
                        onDeleteTask(task.taskId);
                      }
                    }}
                    className="opacity-100 md:opacity-0 group-hover:opacity-100 min-w-[36px] min-h-[36px] md:min-w-[40px] md:min-h-[40px] flex items-center justify-center text-pink-200 hover:text-pink-400 hover:bg-pink-50 transition-all duration-300 rounded-full focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none"
                    title="Delete task"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pt-3 md:pt-4 border-t border-pink-50 mt-auto shrink-0">
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full py-4 flex items-center justify-center gap-2 text-pink-400 font-medium hover:bg-pink-50 rounded-2xl transition-colors focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none"
          >
            <Plus size={20} />
            Add a new task
          </button>
        ) : (
          <form onSubmit={handleAddTask} className="flex flex-col gap-4 bg-transparent md:bg-pink-50/30 p-0 md:p-4 rounded-none md:rounded-2xl border-none md:border md:border-pink-50">
            <input
              type="text"
              autoFocus
              maxLength={250}
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a new task... (Press 'N')"
              className="w-full bg-transparent border-b border-pink-200 px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 rounded text-gray-700 placeholder-gray-400"
            />
            {/* Tag Selection Chips */}
            <div className="flex flex-wrap items-center gap-1.5 -mt-1">
              <span className="text-xs text-gray-400 mr-0.5">Tag:</span>
              {(Object.keys(TAG_CONFIG) as TaskTag[]).map(t => {
                const conf = TAG_CONFIG[t];
                const isSelected = selectedTag === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setSelectedTag(isSelected ? undefined : t);
                    }}
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all ${
                      isSelected
                        ? `${conf.bgClass} ${conf.textClass} ${conf.borderClass} ring-2 ring-pink-300 font-semibold shadow-xs scale-105`
                        : 'bg-white/80 hover:bg-gray-50 text-gray-500 border-gray-200/80 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span>{conf.icon}</span>
                    <span>{conf.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 relative">
                <span className="mr-1">Repeat:</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowRecurrenceDropdown(!showRecurrenceDropdown)}
                    className="bg-white border border-pink-100 rounded-lg px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 text-gray-600 min-w-[100px] text-left"
                  >
                    {recurrence === 'none' ? 'Once' : recurrence === 'daily' ? 'Daily' : recurrence === 'weekly' ? 'Weekly' : 'Bi-weekly'}
                  </button>
                  
                  {showRecurrenceDropdown && (
                    <div className="absolute bottom-full mb-1 left-0 w-full bg-white border border-pink-50 rounded-xl shadow-sm z-20 py-1 overflow-hidden animate-slide-up-fade">
                      <ul className="flex flex-col">
                        {(['none', 'daily', 'weekly', 'biweekly'] as RecurrenceType[]).map((val) => (
                          <li key={val}>
                            <button
                              type="button"
                              onClick={() => {
                                setRecurrence(val);
                                setShowRecurrenceDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-gray-600 hover:bg-pink-50 focus-visible:bg-pink-50 focus-visible:outline-none transition-colors"
                            >
                              {val === 'none' ? 'Once' : val === 'daily' ? 'Daily' : val === 'weekly' ? 'Weekly' : 'Bi-weekly'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors text-sm font-medium focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="px-4 py-2 bg-pink-200 hover:bg-pink-300 disabled:opacity-50 disabled:hover:bg-pink-200 text-gray-800 rounded-xl transition-colors text-sm font-medium focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none"
                >
                  Save Task
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Delete Recurring Task Modal */}
      {taskToDelete && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setTaskToDelete(null); }}
        >
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full animate-slide-up-fade border border-pink-100">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Delete recurring task</h3>
            <p className="text-gray-500 text-sm mb-6">This is a repeating task. How would you like to delete it?</p>
            
            <div className="flex flex-col gap-3">
              {onDeleteTaskInstance && (
                <button
                  onClick={() => {
                    onDeleteTaskInstance(taskToDelete.taskId, dateStr);
                    setTaskToDelete(null);
                  }}
                  className="w-full py-3 px-4 text-left bg-pink-50 hover:bg-pink-100 rounded-xl text-gray-700 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none"
                >
                  Delete this day only
                </button>
              )}
              {onDeleteTaskFuture && (
                <button
                  onClick={() => {
                    onDeleteTaskFuture(taskToDelete.taskId, dateStr);
                    setTaskToDelete(null);
                  }}
                  className="w-full py-3 px-4 text-left bg-pink-50 hover:bg-pink-100 rounded-xl text-gray-700 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none"
                >
                  Delete this and following days
                </button>
              )}
              <button
                onClick={() => {
                  onDeleteTask(taskToDelete.taskId);
                  setTaskToDelete(null);
                }}
                className="w-full py-3 px-4 text-left bg-pink-100 hover:bg-pink-200 text-pink-600 font-medium rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none"
              >
                Delete all tasks
              </button>
              <button
                onClick={() => setTaskToDelete(null)}
                className="w-full py-3 mt-2 text-center text-gray-400 hover:text-gray-600 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-gray-200 focus-visible:outline-none rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const DailyTaskList = React.memo(DailyTaskListComponent);

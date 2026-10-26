import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { DailyTask, RecurrenceType, TaskTag, Subtask } from '../types';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  GripVertical,
  Play,
  Pause,
  RotateCcw,
  Minus,
  Pencil,
  Timer,
  ListTodo,
  CheckSquare,
  Square,
  X,
  ChevronDown,
  ChevronUp,
  Star,
  ArrowRight,
  Copy,
  Link2,
  MoreHorizontal,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSoftPop, playBambooTap, playWaterDrop, playSoftSwoosh, triggerSakuraPetals } from '../utils/audio';
import { hapticLight, hapticSuccess, hapticCelebration } from '../utils/haptics';
import { AmbientSoundControl } from './AmbientSoundControl';

export const TAG_CONFIG: Record<TaskTag, { label: string; icon: string; bgClass: string; textClass: string; borderClass: string }> = {
  work: { label: 'Work', icon: '💼', bgClass: 'bg-blue-50/90', textClass: 'text-blue-600', borderClass: 'border-blue-100' },
  personal: { label: 'Personal', icon: '🌿', bgClass: 'bg-emerald-50/90', textClass: 'text-emerald-600', borderClass: 'border-emerald-100' },
  health: { label: 'Health', icon: '🧘', bgClass: 'bg-amber-50/90', textClass: 'text-amber-600', borderClass: 'border-amber-100' },
  ideas: { label: 'Idea', icon: '💡', bgClass: 'bg-purple-50/90', textClass: 'text-purple-600', borderClass: 'border-purple-100' },
  priority: { label: 'Priority', icon: '⭐', bgClass: 'bg-rose-50/90', textClass: 'text-rose-600', borderClass: 'border-rose-100' },
};

function formatFocusMinutes(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

function extractFirstUrl(text: string): { url: string; displayLabel: string } | null {
  const match = text.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i);
  if (!match) return null;
  const raw = match[0].replace(/[.,)]+$/, '');
  const url = raw.startsWith('http') ? raw : `https://${raw}`;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    return { url, displayLabel: host || 'Link' };
  } catch {
    return { url, displayLabel: 'Link' };
  }
}

interface DailyTaskListProps {
  selectedDate: Date;
  tasks: DailyTask[];
  onToggleTask: (taskId: string, dateStr: string) => void;
  onAddTask: (
    title: string,
    dateStr: string,
    recurrence: RecurrenceType,
    tag?: TaskTag,
    subtasks?: Subtask[],
    estimatedMinutes?: number,
    isPinned?: boolean
  ) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteTaskInstance?: (taskId: string, dateStr: string) => void;
  onDeleteTaskFuture?: (taskId: string, dateStr: string) => void;
  onEditTask: (taskId: string, newTitle: string) => void;
  onTogglePin?: (taskId: string) => void;
  onDeferTask?: (taskId: string, dateStr: string) => void;
  onDuplicateTask?: (taskId: string, dateStr: string) => void;
  onReorderTasks: (draggedId: string, targetId: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onAddSubtask?: (taskId: string, title: string) => void;
  onDeleteSubtask?: (taskId: string, subtaskId: string) => void;
  onStartFocus?: (task: { id: string; title: string }) => void;
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
  onFinishEarly?: () => void;
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
  onTogglePin,
  onDeferTask,
  onDuplicateTask,
  onReorderTasks,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onStartFocus,
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
  onFinishEarly,
  overdueTasksCount = 0,
  onRolloverTasks
}: DailyTaskListProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [selectedTag, setSelectedTag] = useState<TaskTag | undefined>(undefined);
  const [newEstimatedMinutes, setNewEstimatedMinutes] = useState<number | undefined>(undefined);
  const [newIsPinned, setNewIsPinned] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<TaskTag | 'all'>('all');
  const [isRolloverDismissed, setIsRolloverDismissed] = useState(false);
  const [showRecurrenceDropdown, setShowRecurrenceDropdown] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [activeAddDrawer, setActiveAddDrawer] = useState<'tag' | 'time' | 'checklist' | 'repeat' | null>(null);
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [newSubtasks, setNewSubtasks] = useState<string[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});
  const [inlineSubtaskInputs, setInlineSubtaskInputs] = useState<Record<string, string>>({});
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

  // Close more menu when clicking anywhere outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenMenuTaskId(null);
    };
    if (openMenuTaskId) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [openMenuTaskId]);

  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const progressPercent = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
  const isPerfectDay = tasks.length > 0 && completedTasks === tasks.length;

  const totalEstimatedMinutes = tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  const plannedTotalStr = totalEstimatedMinutes > 0
    ? `⏱️ ${totalEstimatedMinutes >= 60
        ? `${Math.floor(totalEstimatedMinutes / 60)}h ${totalEstimatedMinutes % 60 > 0 ? `${totalEstimatedMinutes % 60}m` : ''}`.trim()
        : `${totalEstimatedMinutes}m`} planned`
    : null;

  const availableTags = Array.from(new Set(tasks.map(t => t.tag).filter(Boolean))) as TaskTag[];
  const displayedTasks = activeTagFilter === 'all' 
    ? tasks 
    : tasks.filter(t => t.tag === activeTagFilter);

  // Global 'N' Hotkey for Add Task & 'Escape' to dismiss
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (taskToDelete) {
          e.preventDefault();
          setTaskToDelete(null);
          return;
        }
        if (editingTaskId) {
          e.preventDefault();
          setEditingTaskId(null);
          return;
        }
        if (isAdding) {
          e.preventDefault();
          setIsAdding(false);
          return;
        }
      }

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
  }, [taskToDelete, editingTaskId, isAdding]);

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

    const subtaskObjects: Subtask[] | undefined =
      newSubtasks.length > 0
        ? newSubtasks.map(t => ({
            id: Math.random().toString(36).substring(2, 9),
            title: t,
            isCompleted: false,
          }))
        : undefined;

    playWaterDrop();
    onAddTask(finalTitle || raw, dateStr, recurrence, finalTag, subtaskObjects, newEstimatedMinutes, newIsPinned);
    setNewTaskTitle('');
    setSelectedTag(undefined);
    setRecurrence('none');
    setNewSubtasks([]);
    setNewSubtaskInput('');
    setNewEstimatedMinutes(undefined);
    setNewIsPinned(false);
    setActiveAddDrawer(null);
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
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsAdding(false);
    }
  };

  const handleToggle = (taskId: string, dateString: string, isCompleted: boolean) => {
    if (!isCompleted) {
      playBambooTap();

      const isLastPending = tasks.filter(t => !t.isCompleted).length === 1;
      if (isLastPending) {
        hapticCelebration();
        triggerSakuraPetals();
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
    } else if (e.key === 'Escape') {
      setEditingTaskId(null);
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-gray-700">
                        {tasks.length > 0 ? `${completedTasks} of ${tasks.length}` : 'No tasks'}
                      </span>
                      {plannedTotalStr && (
                        <span className="text-[10px] font-semibold text-pink-600 bg-pink-50/90 px-2 py-0.5 rounded-full border border-pink-100/80 whitespace-nowrap">
                          {plannedTotalStr}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {tasks.length > 0 ? 'completed' : 'planned'}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <AmbientSoundControl align="right" dropDirection="down" />
              
              {onToggleZenMode && (
                <button 
                  type="button"
                  onClick={onToggleZenMode}
                  className={`p-2 text-pink-300 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none ${
                    isZenMode ? 'bg-pink-50 text-pink-500' : ''
                  }`}
                  title={isZenMode ? "Exit Zen View (Z)" : "Zen View (Z)"}
                >
                  {isZenMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
              )}
            </div>
          </div>
        </div>
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
          !isAdding ? (
            <div className="h-full min-h-[180px] text-center text-gray-400 flex flex-col items-center justify-center animate-slide-up-fade relative overflow-hidden rounded-2xl w-full p-6">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-pink-400 rounded-full blur-3xl opacity-5 pointer-events-none animate-breathe"></div>
              
              <div className="w-16 h-16 bg-pink-50/80 border border-pink-100 rounded-2xl flex items-center justify-center mb-3 text-2xl relative z-10 shadow-sm">
                🌸
              </div>
              <h4 className="text-base font-medium text-gray-700 mb-1 relative z-10">Clear mind, calm day</h4>
              <p className="text-xs text-gray-400 mb-4 max-w-xs relative z-10">No tasks scheduled for today. Take a mindful break or add your first goal.</p>
              <button 
                type="button"
                onClick={() => setIsAdding(true)}
                className="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-500 rounded-xl font-medium text-xs transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none flex items-center gap-1.5 relative z-10 hover:scale-105 active:scale-95 cursor-pointer"
                title="Add a new task (Press 'N')"
              >
                <Plus size={16} />
                Add Task (N)
              </button>
            </div>
          ) : (
            <div className="flex-1 min-h-[100px] flex flex-col items-center justify-center text-center text-gray-400 py-6 animate-slide-up-fade">
              <span className="text-2xl mb-2 select-none opacity-80">🌱</span>
              <p className="text-xs text-pink-500 font-semibold">Creating your first goal for today</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Press Enter to save or Esc to cancel</p>
            </div>
          )
        ) : (
          <ul className="space-y-3">
            {displayedTasks.map(task => {
              const subtasks = task.subtasks || [];
              const completedSubtasks = subtasks.filter(s => s.isCompleted).length;
              const subtaskPercent = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;
              const isExpanded = !!expandedTaskIds[task.taskId];
              const inlineInput = inlineSubtaskInputs[task.taskId] || '';

              return (
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
                  className={`group flex flex-col p-3 md:p-4 rounded-2xl border transition-colors animate-slide-up-fade cursor-grab active:cursor-grabbing ${
                    draggedTaskId === task.taskId
                      ? 'opacity-50 border-dashed border-pink-200'
                      : task.isPinned && !task.isCompleted
                      ? 'border-amber-300 bg-amber-50/20 hover:bg-amber-50/40 shadow-xs'
                      : 'border-pink-50 hover:bg-pink-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
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
                          className={`text-base md:text-lg transition-all duration-300 flex-1 truncate cursor-text select-none py-2 flex items-center gap-2 flex-wrap ${task.isCompleted ? 'text-gray-400 line-through opacity-70' : 'text-gray-700'}`}
                        >
                          <span className="truncate">{renderTaskTitle(task.title)}</span>
                          
                          {/* Focus of the Day Badge */}
                          {task.isPinned && !task.isCompleted && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300 bg-amber-100/70 text-amber-700 shrink-0">
                              <Star size={10} className="fill-amber-500 text-amber-500" />
                              <span>Focus of the Day</span>
                            </span>
                          )}

                          {/* Estimated Duration Badge */}
                          {task.estimatedMinutes && task.estimatedMinutes > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-pink-100 bg-white/80 text-gray-600 shrink-0">
                              <span>⏱️</span>
                              <span>{task.estimatedMinutes >= 60 ? `${Math.floor(task.estimatedMinutes / 60)}h ${task.estimatedMinutes % 60 ? `${task.estimatedMinutes % 60}m` : ''}`.trim() : `${task.estimatedMinutes}m`}</span>
                            </span>
                          )}

                          {/* Tag */}
                          {task.tag && TAG_CONFIG[task.tag] && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${TAG_CONFIG[task.tag].bgClass} ${TAG_CONFIG[task.tag].textClass} ${TAG_CONFIG[task.tag].borderClass}`}>
                              <span>{TAG_CONFIG[task.tag].icon}</span>
                              <span className="hidden sm:inline">{TAG_CONFIG[task.tag].label}</span>
                            </span>
                          )}

                          {/* Focus Time Badge */}
                          {task.focusedSeconds && task.focusedSeconds > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-pink-200 bg-pink-50 text-pink-600 shrink-0" title="Time spent focusing on this task">
                              <span>⏱️</span>
                              <span>{formatFocusMinutes(task.focusedSeconds)}</span>
                            </span>
                          ) : null}

                          {/* Quick Link Badge (Görev Kapsülü) */}
                          {(() => {
                            const linkInfo = extractFirstUrl(task.title);
                            if (!linkInfo) return null;
                            return (
                              <a
                                href={linkInfo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-pink-200 bg-pink-50/80 text-pink-600 hover:bg-pink-100 hover:text-pink-700 transition-colors shrink-0 max-w-[130px] truncate"
                                title={`Open ${linkInfo.url}`}
                              >
                                <Link2 size={10} />
                                <span className="truncate">{linkInfo.displayLabel}</span>
                              </a>
                            );
                          })()}

                          {/* Subtasks Progress Pill */}
                          {subtasks.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedTaskIds(prev => ({ ...prev, [task.taskId]: !prev[task.taskId] }));
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-pink-100 bg-pink-50/60 text-gray-600 hover:bg-pink-100/60 transition-colors shrink-0"
                            >
                              <ListTodo size={11} className="text-pink-400" />
                              <span>{completedSubtasks}/{subtasks.length}</span>
                              {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0 relative">
                      {!task.isCompleted ? (
                        <>
                          {/* Quick Focus Button */}
                          {onStartFocus && (
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation();
                                hapticSuccess();
                                onStartFocus({ id: task.taskId, title: task.title });
                              }}
                              className="opacity-100 md:opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center text-pink-500 hover:text-pink-700 hover:bg-pink-100/70 transition-all rounded-full focus-visible:opacity-100 cursor-pointer"
                              title="Focus on this task 🧘"
                            >
                              <Timer size={15} />
                            </button>
                          )}

                      {/* Quick Delete */}
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (task.recurrence !== 'none') {
                                setTaskToDelete({ taskId: task.taskId, recurrence: task.recurrence });
                              } else {
                                onDeleteTask(task.taskId);
                              }
                            }}
                            className="opacity-100 md:opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-full focus-visible:opacity-100 cursor-pointer"
                            title="Delete task"
                          >
                            <Trash2 size={14} />
                          </button>

                          {/* More Options Popover Menu */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuTaskId(prev => prev === task.taskId ? null : task.taskId);
                              }}
                              className={`opacity-100 md:opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center transition-all rounded-full cursor-pointer focus-visible:opacity-100 ${
                                openMenuTaskId === task.taskId
                                  ? '!opacity-100 bg-pink-100 text-pink-600'
                                  : 'text-gray-400 hover:text-gray-700 hover:bg-pink-50'
                              }`}
                              title="More actions"
                            >
                              <MoreHorizontal size={15} />
                            </button>

                            {openMenuTaskId === task.taskId && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1.5 w-48 bg-white/95 backdrop-blur-xl border border-pink-100 rounded-2xl shadow-[0_12px_32px_rgba(244,114,182,0.18)] py-1.5 z-40 animate-slide-up-fade text-xs font-medium text-gray-700"
                              >
                                {onTogglePin && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      hapticLight();
                                      onTogglePin(task.taskId);
                                      setOpenMenuTaskId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-pink-50/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                                  >
                                    <Star size={13} className={task.isPinned ? "fill-amber-500 text-amber-500" : "text-gray-400"} />
                                    <span>{task.isPinned ? 'Unpin Focus Goal' : 'Focus of the Day ⭐'}</span>
                                  </button>
                                )}

                                {onDeferTask && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      hapticLight();
                                      onDeferTask(task.taskId, dateStr);
                                      setOpenMenuTaskId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-pink-50/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                                  >
                                    <ArrowRight size={13} className="text-gray-400" />
                                    <span>Defer to Tomorrow 📅</span>
                                  </button>
                                )}

                                {onDuplicateTask && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      hapticLight();
                                      onDuplicateTask(task.taskId, dateStr);
                                      setOpenMenuTaskId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-pink-50/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                                  >
                                    <Copy size={13} className="text-gray-400" />
                                    <span>Duplicate Task 📋</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedTaskIds(prev => ({ ...prev, [task.taskId]: !prev[task.taskId] }));
                                    setOpenMenuTaskId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-pink-50/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <ListTodo size={13} className="text-gray-400" />
                                  <span>{subtasks.length > 0 ? (isExpanded ? 'Hide Checklist' : 'Show Checklist') : 'Add Checklist Steps'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDoubleClick(task.taskId, task.title);
                                    setOpenMenuTaskId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-pink-50/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Pencil size={13} className="text-gray-400" />
                                  <span>Rename (Edit)</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        /* Completed Task: ONLY Delete on hover */
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (task.recurrence !== 'none') {
                              setTaskToDelete({ taskId: task.taskId, recurrence: task.recurrence });
                            } else {
                              onDeleteTask(task.taskId);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-full cursor-pointer"
                          title="Delete completed task"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subtasks Accordion Body */}
                  {(isExpanded || (subtasks.length > 0 && !task.isCompleted)) && (
                    <div className="w-full mt-2.5 pl-8 md:pl-12 pr-2 pt-2 border-t border-pink-50/80 flex flex-col gap-2 animate-slide-up-fade">
                      {/* Progress Bar */}
                      {subtasks.length > 0 && (
                        <div className="w-full bg-pink-100/40 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-pink-400 h-full rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${subtaskPercent}%` }}
                          />
                        </div>
                      )}

                      {/* Checklist items */}
                      {subtasks.map(subtask => (
                        <div
                          key={subtask.id}
                          className="flex items-center justify-between text-xs py-1 group/st"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (onToggleSubtask) {
                                if (!subtask.isCompleted) {
                                  playBambooTap();
                                  hapticSuccess();
                                } else {
                                  hapticLight();
                                }
                                onToggleSubtask(task.taskId, subtask.id);
                              }
                            }}
                            className="flex items-center gap-2 text-left flex-1 min-w-0"
                          >
                            {subtask.isCompleted ? (
                              <CheckSquare size={14} className="text-pink-400 shrink-0" />
                            ) : (
                              <Square size={14} className="text-gray-300 group-hover/st:text-pink-300 shrink-0" />
                            )}
                            <span
                              className={`truncate ${
                                subtask.isCompleted
                                  ? 'text-gray-400 line-through opacity-70'
                                  : 'text-gray-700'
                              }`}
                            >
                              {subtask.title}
                            </span>
                          </button>
                          {onDeleteSubtask && (
                            <button
                              type="button"
                              onClick={() => onDeleteSubtask(task.taskId, subtask.id)}
                              className="text-gray-300 hover:text-rose-400 p-1 rounded transition-colors opacity-0 group-hover/st:opacity-100"
                              title="Delete step"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Quick inline subtask input */}
                      {onAddSubtask && (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            placeholder="Add subtask step..."
                            value={inlineInput}
                            onChange={(e) =>
                              setInlineSubtaskInputs(prev => ({
                                ...prev,
                                [task.taskId]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (inlineInput.trim()) {
                                  playWaterDrop();
                                  onAddSubtask(task.taskId, inlineInput.trim());
                                  setInlineSubtaskInputs(prev => ({ ...prev, [task.taskId]: '' }));
                                }
                              }
                            }}
                            className="flex-1 bg-white/70 border border-pink-100 rounded-lg px-2.5 py-1 text-xs text-gray-700 placeholder-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pink-300"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (inlineInput.trim()) {
                                playWaterDrop();
                                onAddSubtask(task.taskId, inlineInput.trim());
                                setInlineSubtaskInputs(prev => ({ ...prev, [task.taskId]: '' }));
                              }
                            }}
                            className="px-2.5 py-1 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-lg text-xs font-semibold transition-all"
                          >
                            + Add
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="pt-2 md:pt-3 border-t border-pink-50 mt-auto shrink-0">
        {!isAdding ? (
          <button 
            type="button"
            onClick={() => setIsAdding(true)}
            className="w-full py-2.5 md:py-3 flex items-center justify-center gap-2 text-pink-400 font-medium hover:bg-pink-50 rounded-2xl transition-colors focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none cursor-pointer"
          >
            <Plus size={18} />
            Add a new task
          </button>
        ) : (
          <form onSubmit={handleAddTask} className="flex flex-col gap-2.5 bg-white/80 backdrop-blur-md p-3 md:p-3.5 rounded-2xl border border-pink-200/90 shadow-sm animate-slide-up-fade">
            <input
              type="text"
              autoFocus
              maxLength={250}
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What would you like to achieve? (Press Enter to save)"
              className="w-full bg-transparent px-1 py-1.5 text-sm md:text-base text-gray-800 placeholder-gray-400 focus-visible:outline-none"
            />

            {/* Selected Options Badge Preview (if any is active) */}
            {(selectedTag || newEstimatedMinutes || newIsPinned || recurrence !== 'none' || newSubtasks.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {selectedTag && TAG_CONFIG[selectedTag] && (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${TAG_CONFIG[selectedTag].bgClass} ${TAG_CONFIG[selectedTag].textClass} ${TAG_CONFIG[selectedTag].borderClass}`}>
                    <span>{TAG_CONFIG[selectedTag].icon}</span>
                    <span>{TAG_CONFIG[selectedTag].label}</span>
                    <button type="button" onClick={() => setSelectedTag(undefined)} className="hover:opacity-70 ml-0.5 cursor-pointer"><X size={10} /></button>
                  </span>
                )}
                {newEstimatedMinutes && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border border-pink-200 bg-pink-50 text-pink-700">
                    <span>⏱️ {newEstimatedMinutes >= 60 ? `${Math.floor(newEstimatedMinutes / 60)}h ${newEstimatedMinutes % 60 ? `${newEstimatedMinutes % 60}m` : ''}`.trim() : `${newEstimatedMinutes}m`}</span>
                    <button type="button" onClick={() => setNewEstimatedMinutes(undefined)} className="hover:opacity-70 ml-0.5 cursor-pointer"><X size={10} /></button>
                  </span>
                )}
                {newIsPinned && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700">
                    <Star size={10} className="fill-amber-500 text-amber-500" />
                    <span>Focus Goal</span>
                    <button type="button" onClick={() => setNewIsPinned(false)} className="hover:opacity-70 ml-0.5 cursor-pointer"><X size={10} /></button>
                  </span>
                )}
                {recurrence !== 'none' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border border-pink-200 bg-white text-gray-600">
                    <span>🔁 {recurrence === 'daily' ? 'Daily' : recurrence === 'weekly' ? 'Weekly' : 'Bi-weekly'}</span>
                    <button type="button" onClick={() => setRecurrence('none')} className="hover:opacity-70 ml-0.5 cursor-pointer"><X size={10} /></button>
                  </span>
                )}
                {newSubtasks.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border border-pink-200 bg-pink-50 text-pink-600">
                    <span>📋 {newSubtasks.length} step{newSubtasks.length > 1 ? 's' : ''}</span>
                    <button type="button" onClick={() => setActiveAddDrawer(prev => prev === 'checklist' ? null : 'checklist')} className="hover:opacity-70 ml-0.5 text-[10px] underline cursor-pointer">view</button>
                  </span>
                )}
              </div>
            )}

            {/* Expandable Micro-Panels (On-Demand) */}
            {activeAddDrawer === 'tag' && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-pink-50/60 rounded-xl border border-pink-100/70 animate-slide-up-fade">
                <span className="text-[11px] text-gray-400 mr-1">Choose tag:</span>
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
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                        isSelected
                          ? `${conf.bgClass} ${conf.textClass} ${conf.borderClass} ring-2 ring-pink-300 font-semibold shadow-xs`
                          : 'bg-white/90 hover:bg-white text-gray-500 border-gray-200/70'
                      }`}
                    >
                      <span>{conf.icon}</span>
                      <span>{conf.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeAddDrawer === 'time' && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-pink-50/60 rounded-xl border border-pink-100/70 animate-slide-up-fade">
                <span className="text-[11px] text-gray-400 mr-1">Estimate duration:</span>
                {[
                  { label: 'None', val: undefined },
                  { label: '15m', val: 15 },
                  { label: '30m', val: 30 },
                  { label: '45m', val: 45 },
                  { label: '1h', val: 60 },
                  { label: '2h', val: 120 },
                ].map(opt => {
                  const isSelected = newEstimatedMinutes === opt.val;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setNewEstimatedMinutes(opt.val);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-pink-500 text-white border-pink-500 shadow-xs font-semibold'
                          : 'bg-white/90 hover:bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {activeAddDrawer === 'checklist' && (
              <div className="flex flex-col gap-2 p-2.5 bg-pink-50/60 rounded-xl border border-pink-100/70 animate-slide-up-fade">
                <span className="text-xs text-gray-500 font-medium">Subtasks / Checklist ({newSubtasks.length}):</span>
                {newSubtasks.length > 0 && (
                  <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                    {newSubtasks.map((st, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 rounded-lg border border-pink-100 shadow-2xs">
                        <span className="text-gray-700 truncate">{st}</span>
                        <button
                          type="button"
                          onClick={() => setNewSubtasks(prev => prev.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-rose-500 transition-colors ml-2 cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubtaskInput}
                    onChange={(e) => setNewSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newSubtaskInput.trim()) {
                          setNewSubtasks(prev => [...prev, newSubtaskInput.trim()]);
                          setNewSubtaskInput('');
                        }
                      }
                    }}
                    placeholder="Add step... (Enter)"
                    className="flex-1 bg-white border border-pink-100 rounded-lg px-2.5 py-1 text-xs text-gray-700 placeholder-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pink-300"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSubtaskInput.trim()) {
                        setNewSubtasks(prev => [...prev, newSubtaskInput.trim()]);
                        setNewSubtaskInput('');
                      }
                    }}
                    className="px-2.5 py-1 bg-pink-100 hover:bg-pink-200 text-pink-700 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>
            )}

            {activeAddDrawer === 'repeat' && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-pink-50/60 rounded-xl border border-pink-100/70 animate-slide-up-fade">
                <span className="text-[11px] text-gray-400 mr-1">Repeat schedule:</span>
                {[
                  { id: 'none', label: 'Once' },
                  { id: 'daily', label: 'Daily' },
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'biweekly', label: 'Bi-weekly' },
                ].map((opt) => {
                  const isSelected = recurrence === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setRecurrence(opt.id as RecurrenceType);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-pink-500 text-white border-pink-500 shadow-xs font-semibold'
                          : 'bg-white/90 hover:bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-pink-100/60">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveAddDrawer(prev => prev === 'tag' ? null : 'tag')}
                  className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                    activeAddDrawer === 'tag' || selectedTag
                      ? 'bg-pink-100 text-pink-600 font-semibold'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-pink-50'
                  }`}
                  title="Tag category"
                >
                  <span>🏷️</span>
                  <span className="text-[11px] hidden sm:inline">{selectedTag ? TAG_CONFIG[selectedTag].label : 'Tag'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAddDrawer(prev => prev === 'time' ? null : 'time')}
                  className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                    activeAddDrawer === 'time' || newEstimatedMinutes
                      ? 'bg-pink-100 text-pink-600 font-semibold'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-pink-50'
                  }`}
                  title="Estimated duration"
                >
                  <span>⏱️</span>
                  <span className="text-[11px] hidden sm:inline">{newEstimatedMinutes ? `${newEstimatedMinutes}m` : 'Time'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAddDrawer(prev => prev === 'checklist' ? null : 'checklist')}
                  className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                    activeAddDrawer === 'checklist' || newSubtasks.length > 0
                      ? 'bg-pink-100 text-pink-600 font-semibold'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-pink-50'
                  }`}
                  title="Add subtask steps"
                >
                  <ListTodo size={13} />
                  <span className="text-[11px] hidden sm:inline">Steps{newSubtasks.length > 0 ? ` (${newSubtasks.length})` : ''}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setNewIsPinned(!newIsPinned);
                  }}
                  className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                    newIsPinned
                      ? 'bg-amber-100 text-amber-700 font-semibold'
                      : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                  }`}
                  title="Focus of the Day (Priority)"
                >
                  <Star size={13} className={newIsPinned ? 'fill-amber-500 text-amber-500' : ''} />
                  <span className="text-[11px] hidden sm:inline">Priority</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAddDrawer(prev => prev === 'repeat' ? null : 'repeat')}
                  className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                    activeAddDrawer === 'repeat' || recurrence !== 'none'
                      ? 'bg-pink-100 text-pink-600 font-semibold'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-pink-50'
                  }`}
                  title="Recurrence"
                >
                  <span>🔁</span>
                  <span className="text-[11px] hidden sm:inline">{recurrence !== 'none' ? recurrence : 'Repeat'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAdding(false);
                    setActiveAddDrawer(null);
                  }}
                  className="px-2.5 py-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-xs font-medium cursor-pointer"
                >
                  Cancel (Esc)
                </button>
                <button 
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  Add Goal ↵
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

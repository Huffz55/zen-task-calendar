import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { DailyTask, RecurrenceType } from '../types';
import { CheckCircle2, Circle, Plus, Trash2, Maximize2, Minimize2, GripVertical, Play, Pause, RotateCcw, Minus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSoftPop } from '../utils/audio';

interface DailyTaskListProps {
  selectedDate: Date;
  tasks: DailyTask[];
  onToggleTask: (taskId: string, dateStr: string) => void;
  onAddTask: (title: string, dateStr: string, recurrence: RecurrenceType) => void;
  onDeleteTask: (taskId: string) => void;
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
}

export function DailyTaskList({ 
  selectedDate, 
  tasks, 
  onToggleTask, 
  onAddTask,
  onDeleteTask,
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
  handleTimerChange
}: DailyTaskListProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [showRecurrenceDropdown, setShowRecurrenceDropdown] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Inline editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const progressPercent = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
  const isPerfectDay = tasks.length > 0 && completedTasks === tasks.length;

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
    if (!newTaskTitle.trim()) return;
    onAddTask(newTaskTitle.trim(), dateStr, recurrence);
    setNewTaskTitle('');
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
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#fdf2f8', '#fbcfe8', '#ffffff'],
          disableForReducedMotion: false,
          zIndex: 100
        });
      }
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
      if (typeof window !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }
    setDraggedTaskId(null);
  };

  const renderTaskTitle = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        const href = part.startsWith('http') ? part : `https://${part}`;
        return (
          <a
            key={i}
            href={href}
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
            <div className="flex flex-col items-center justify-center">
              {isPerfectDay ? (
                <div aria-live="polite" className="text-xs md:text-sm font-medium text-pink-400 flex items-center gap-1 mb-1.5 transition-all duration-500">
                  Perfect Day 🌸
                </div>
              ) : (
                <div className="text-[10px] md:text-xs text-gray-400 mb-1.5 font-medium text-center transition-all duration-500">
                  {tasks.length > 0 ? `${completedTasks} / ${tasks.length} done` : 'No tasks'}
                </div>
              )}
              <div className="w-20 md:w-24 h-1.5 bg-pink-50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-pink-300 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            
            {onToggleZenMode && (
              <button 
                onClick={onToggleZenMode}
                className="opacity-100 md:opacity-0 md:group-hover/zen:opacity-100 p-2 text-pink-200 hover:text-pink-400 hover:bg-pink-50 rounded-full transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none focus-visible:opacity-100"
                title={isZenMode ? "Exit Focus Mode (F)" : "Focus Mode (F)"}
              >
                {isZenMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            )}
          </div>
        </div>

        {/* Zen Mode Pomodoro Timer */}
        {isZenMode && (
          <div className="static md:fixed md:top-8 md:right-8 md:z-50 flex flex-col md:items-end gap-3 md:gap-2 group w-full md:w-auto mt-6 md:mt-0 bg-pink-50/50 md:bg-transparent p-4 md:p-0 rounded-2xl md:rounded-none">
            
            <div className="flex flex-col sm:flex-row md:flex-row items-center gap-3 md:opacity-80 md:group-hover:opacity-100 transition-opacity justify-between md:justify-end w-full md:w-auto">
              <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 md:translate-x-4 md:group-hover:translate-x-0 w-full sm:w-auto justify-center">
                <button 
                  onClick={() => {
                    if(setTimeLeft && setInitialTime) {
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
                    if(setTimeLeft && setInitialTime) {
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
                  onClick={() => setIsTimerRunning && setIsTimerRunning(!isTimerRunning)}
                  className="p-3 md:p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-pink-400 hover:text-pink-500 hover:bg-pink-100 md:hover:bg-pink-50 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
                  title={isTimerRunning ? "Pause" : "Play"}
                >
                  {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button 
                  onClick={() => {
                    if(setTimeLeft && initialTime !== undefined && setIsTimerRunning) {
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
              
              <div className="text-pink-500 md:text-pink-400 text-3xl sm:text-2xl md:text-xl font-medium tracking-widest font-mono select-none px-2 w-full sm:w-auto text-center sm:text-right">
                {Math.floor((timeLeft || 0) / 60).toString().padStart(2, '0')}:{(timeLeft || 0) % 60 === 0 ? '00' : ((timeLeft || 0) % 60).toString().padStart(2, '0')}
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
        {tasks.length === 0 ? (
          <div className="h-full min-h-[160px] text-center text-gray-400 flex flex-col items-center justify-center animate-slide-up-fade relative overflow-hidden rounded-2xl w-full">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-pink-400 rounded-full blur-3xl opacity-5 pointer-events-none animate-breathe"></div>
            
            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mb-4 text-pink-200 relative z-10">
              <CheckCircle2 size={32} />
            </div>
            <p className="mb-4 relative z-10">No tasks for today. Take a rest or add one!</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="p-3 bg-pink-50 hover:bg-pink-100 text-pink-400 rounded-full transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none relative z-10"
              title="Add a new task"
            >
              <Plus size={24} />
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {tasks.map(task => (
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
                    className={`relative transition-all duration-300 ease-out flex items-center justify-center shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none min-w-[44px] min-h-[44px]
                    ${task.isCompleted 
                      ? 'text-pink-400 scale-110 drop-shadow-[0_0_6px_rgba(249,168,212,0.4)]' 
                      : 'text-gray-300 group-hover:text-pink-200 active:scale-90'
                    }`}
                  >
                    {task.isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>
                  
                  {editingTaskId === task.taskId ? (
                    <input
                      type="text"
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, task.taskId)}
                      onBlur={() => saveEdit(task.taskId)}
                      className="text-base md:text-lg bg-transparent border-b border-pink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 rounded text-gray-700 flex-1 truncate py-2"
                    />
                  ) : (
                    <span 
                      onDoubleClick={() => handleDoubleClick(task.taskId, task.title)}
                      className={`text-base md:text-lg transition-all duration-300 flex-1 truncate cursor-text select-none py-2 ${task.isCompleted ? 'text-gray-400 line-through opacity-70' : 'text-gray-700'}`}
                    >
                      {renderTaskTitle(task.title)}
                    </span>
                  )}
                </div>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteTask(task.taskId); }}
                  className="opacity-100 md:opacity-0 group-hover:opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center text-pink-200 hover:text-pink-400 hover:bg-pink-50 transition-all duration-300 rounded-full shrink-0 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none"
                  title="Delete task"
                >
                  <Trash2 size={18} />
                </button>
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
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a new task... (Press 'N')"
              className="w-full bg-transparent border-b border-pink-200 px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 rounded text-gray-700 placeholder-gray-400"
            />
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
    </div>
  );
}

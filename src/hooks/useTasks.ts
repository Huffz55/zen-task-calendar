import { useState, useEffect, useCallback } from 'react';
import type { Task, RecurrenceType, TaskTag, Subtask } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { differenceInDays, parseISO, isValid, subDays, addDays, format } from 'date-fns';
import { validateTask } from '../utils/validation';

import { defaultTaskStorage, TASKS_STORAGE_KEY } from '../services/storage/taskStorage';
import type { ITaskStorage } from '../services/storage/taskStorage';

function cleanupOldCompletedTasks(rawTasks: Task[]): { cleaned: Task[]; removedCount: number } {
  const now = new Date();
  const cleaned = rawTasks.filter(task => {
    // Only target non-recurring tasks
    const isNonRecurring = !task.recurrence || task.recurrence === 'none';
    if (!isNonRecurring) return true; // Keep recurring tasks

    // Check if task is completed
    const isCompleted = Array.isArray(task.completedDates) && (
      task.completedDates.includes(task.date) || task.completedDates.length > 0
    );
    if (!isCompleted) return true; // Keep incomplete tasks

    // Check if task date is older than 30 days
    const taskDate = parseISO(task.date);
    if (!isValid(taskDate)) return true; // Keep if invalid to avoid data loss

    const isOlderThan30Days = differenceInDays(now, taskDate) > 30;
    return !isOlderThan30Days;
  });

  return {
    cleaned,
    removedCount: rawTasks.length - cleaned.length
  };
}

export function useTasks(storage: ITaskStorage = defaultTaskStorage) {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const loaded = storage.loadTasks();
    const { cleaned, removedCount } = cleanupOldCompletedTasks(loaded);
    if (removedCount > 0) {
      storage.saveTasks(cleaned);
      return cleaned;
    }
    return loaded;
  });

  // Save to storage repository whenever tasks change
  useEffect(() => {
    storage.saveTasks(tasks);
  }, [tasks, storage]);

  // Real-time cloud subscription
  useEffect(() => {
    if (storage.subscribeTasks) {
      const unsubscribe = storage.subscribeTasks((remoteTasks) => {
        setTasks(remoteTasks);
      });
      return unsubscribe;
    }
  }, [storage]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TASKS_STORAGE_KEY || e.key === null) {
        try {
          if (e.key === null) {
            setTasks([]);
            return;
          }
          if (e.newValue) {
            const raw = JSON.parse(e.newValue);
            if (Array.isArray(raw)) {
              const validated: Task[] = [];
              for (const item of raw) {
                const v = validateTask(item);
                if (v) validated.push(v);
              }
              setTasks(validated);
            }
          } else {
            setTasks([]);
          }
        } catch (err) {
          console.error("Failed to sync tasks from storage event", err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addTask = useCallback((
    title: string,
    date: string,
    recurrence: RecurrenceType = 'none',
    tag?: TaskTag,
    subtasks?: Subtask[],
    estimatedMinutes?: number,
    isPinned?: boolean
  ) => {
    const newTask: Task = {
      id: uuidv4(),
      title,
      date, // this acts as the start date
      recurrence,
      tag,
      completedDates: [],
      subtasks: subtasks && subtasks.length > 0 ? subtasks : undefined,
      estimatedMinutes: estimatedMinutes && estimatedMinutes > 0 ? estimatedMinutes : undefined,
      isPinned: isPinned || undefined,
    };
    setTasks(prev => [...prev, newTask]);
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const deleteTaskInstance = useCallback((taskId: string, dateStr: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          excludedDates: [...(task.excludedDates || []), dateStr]
        };
      }
      return task;
    }));
  }, []);

  const deleteTaskFuture = useCallback((taskId: string, dateStr: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const targetDate = parseISO(dateStr);
        if (!isValid(targetDate)) return task;
        // Find the day before dateStr using date-fns for timezone-safe calendar calculation
        const prevDayStr = format(subDays(targetDate, 1), 'yyyy-MM-dd');
        
        return {
          ...task,
          endDate: prevDayStr
        };
      }
      return task;
    }));
  }, []);

  const toggleTaskCompletion = useCallback((taskId: string, dateStr: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const completedList = Array.isArray(task.completedDates) ? task.completedDates : [];
        const isCompleted = completedList.includes(dateStr);
        let newCompletedDates = [...completedList];
        
        if (isCompleted) {
          newCompletedDates = newCompletedDates.filter(d => d !== dateStr);
        } else {
          newCompletedDates.push(dateStr);
        }
        
        return { ...task, completedDates: newCompletedDates };
      }
      return task;
    }));
  }, []);

  // Utility to get tasks for a specific date
  const getTasksForDate = useCallback((dateStr: string) => {
    const targetDate = parseISO(dateStr);
    if (!isValid(targetDate)) return [];

    return tasks.filter(task => {
      const startDate = parseISO(task.date);
      if (!isValid(startDate)) return false;

      // If the target date is before the task's start date, it shouldn't appear
      if (dateStr < task.date) return false;

      // If the date is explicitly excluded
      if (task.excludedDates && task.excludedDates.includes(dateStr)) return false;

      // If the date is after the task's recurrence end date
      if (task.endDate && dateStr > task.endDate) return false;

      const diffDays = differenceInDays(targetDate, startDate);

      if (task.recurrence === 'none') {
        return dateStr === task.date;
      } else if (task.recurrence === 'daily') {
        return true;
      } else if (task.recurrence === 'weekly') {
        return diffDays % 7 === 0;
      } else if (task.recurrence === 'biweekly') {
        return diffDays % 14 === 0;
      }
      return false;
    }).map(task => ({
      id: `${task.id}-${dateStr}`,
      taskId: task.id,
      title: task.title,
      isCompleted: (Array.isArray(task.completedDates) ? task.completedDates : []).includes(dateStr),
      recurrence: task.recurrence,
      tag: task.tag,
      subtasks: task.subtasks,
      focusedSeconds: task.focusedSeconds,
      isPinned: task.isPinned,
      estimatedMinutes: task.estimatedMinutes,
    }));

    return mapped.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return 0;
    });
  }, [tasks]);

  const importTasks = useCallback((importedTasks: unknown) => {
    if (!Array.isArray(importedTasks)) return false;
    const validated: Task[] = [];
    for (const item of importedTasks) {
      const v = validateTask(item);
      if (v) validated.push(v);
    }
    if (validated.length === 0 && importedTasks.length > 0) return false;

    setTasks(validated);
    storage.saveTasks(validated);
    return true;
  }, [storage]);

  const editTask = useCallback((
    taskId: string,
    newTitle: string,
    newTag?: TaskTag,
    subtasks?: Subtask[],
    estimatedMinutes?: number,
    isPinned?: boolean
  ) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          title: newTitle.trim(),
          tag: newTag !== undefined ? newTag : t.tag,
          subtasks: subtasks !== undefined ? subtasks : t.subtasks,
          estimatedMinutes: estimatedMinutes !== undefined ? estimatedMinutes : t.estimatedMinutes,
          isPinned: isPinned !== undefined ? isPinned : t.isPinned,
        };
      }
      return t;
    }));
  }, []);

  const togglePinTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, isPinned: !t.isPinned };
      }
      return t;
    }));
  }, []);

  const deferTaskToTomorrow = useCallback((taskId: string, currentDateStr: string) => {
    const targetDate = parseISO(currentDateStr);
    if (!isValid(targetDate)) return;
    const tomorrowStr = format(addDays(targetDate, 1), 'yyyy-MM-dd');

    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        if (t.recurrence !== 'none') {
          return {
            ...t,
            excludedDates: [...(t.excludedDates || []), currentDateStr],
          };
        }
        return { ...t, date: tomorrowStr };
      }
      return t;
    }));
  }, []);

  const duplicateTask = useCallback((taskId: string, dateStr: string) => {
    let duplicated: Task | null = null;
    setTasks(prev => {
      const original = prev.find(t => t.id === taskId);
      if (!original) return prev;
      duplicated = {
        ...original,
        id: uuidv4(),
        title: `${original.title} (Copy)`,
        date: dateStr,
        recurrence: 'none',
        completedDates: [],
        subtasks: original.subtasks?.map(s => ({ ...s, id: uuidv4(), isCompleted: false })),
        isPinned: false,
      };
      return [...prev, duplicated];
    });
    return duplicated;
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.subtasks) {
        const updatedSubs = t.subtasks.map(s =>
          s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
        );
        return { ...t, subtasks: updatedSubs };
      }
      return t;
    }));
  }, []);

  const addSubtask = useCallback((taskId: string, title: string) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const newSub: Subtask = {
      id: uuidv4(),
      title: cleanTitle,
      isCompleted: false,
    };
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, subtasks: [...(t.subtasks || []), newSub] };
      }
      return t;
    }));
  }, []);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.subtasks) {
        return { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) };
      }
      return t;
    }));
  }, []);

  const addTaskFocusTime = useCallback((taskId: string, seconds: number) => {
    if (seconds <= 0) return;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          focusedSeconds: (t.focusedSeconds || 0) + seconds,
        };
      }
      return t;
    }));
  }, []);

  const reorderTasks = useCallback((draggedId: string, targetId: string) => {
    setTasks(prev => {
      const draggedIndex = prev.findIndex(t => t.id === draggedId);
      const targetIndex = prev.findIndex(t => t.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
        return prev;
      }
      
      const newTasks = [...prev];
      const [draggedItem] = newTasks.splice(draggedIndex, 1);
      newTasks.splice(targetIndex, 0, draggedItem);
      
      return newTasks;
    });
  }, []);

  const restoreTask = useCallback((task: Task) => {
    setTasks(prev => {
      const exists = prev.some(t => t.id === task.id);
      if (exists) {
        return prev.map(t => t.id === task.id ? task : t);
      }
      return [...prev, task];
    });
  }, []);

  const rescheduleTask = useCallback((taskId: string, newDateStr: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, date: newDateStr };
      }
      return t;
    }));
  }, []);

  const rolloverOverdueTasks = useCallback((targetDateStr: string) => {
    let count = 0;
    setTasks(prev => prev.map(task => {
      const isNonRecurring = !task.recurrence || task.recurrence === 'none';
      const isCompleted = (Array.isArray(task.completedDates) ? task.completedDates : []).includes(task.date);
      const isOverdue = task.date < targetDateStr;

      if (isNonRecurring && !isCompleted && isOverdue) {
        count++;
        return {
          ...task,
          date: targetDateStr,
        };
      }
      return task;
    }));
    return count;
  }, []);

  const getOverdueTasksCount = useCallback((todayStr: string) => {
    return tasks.filter(task => {
      const isNonRecurring = !task.recurrence || task.recurrence === 'none';
      const isCompleted = (Array.isArray(task.completedDates) ? task.completedDates : []).includes(task.date);
      const isOverdue = task.date < todayStr;
      return isNonRecurring && !isCompleted && isOverdue;
    }).length;
  }, [tasks]);

  return {
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
    togglePinTask,
    deferTaskToTomorrow,
    duplicateTask,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    addTaskFocusTime,
    reorderTasks,
    rescheduleTask,
    rolloverOverdueTasks,
    getOverdueTasksCount,
  };
}

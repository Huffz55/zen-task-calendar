import { useState, useEffect, useCallback } from 'react';
import type { Task, RecurrenceType, TaskTag } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { differenceInDays, parseISO, isValid, subDays, format } from 'date-fns';
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

  const addTask = useCallback((title: string, date: string, recurrence: RecurrenceType, tag?: TaskTag) => {
    const newTask: Task = {
      id: uuidv4(),
      title,
      date, // this acts as the start date
      recurrence,
      tag,
      completedDates: [],
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
    }));
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

  const editTask = useCallback((taskId: string, newTitle: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, title: newTitle } : t));
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
    reorderTasks,
    rescheduleTask,
    rolloverOverdueTasks,
    getOverdueTasksCount,
  };
}

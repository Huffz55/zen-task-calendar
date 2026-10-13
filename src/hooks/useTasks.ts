import { useState, useEffect, useCallback } from 'react';
import type { Task, RecurrenceType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { differenceInDays, parseISO, isValid } from 'date-fns';

const STORAGE_KEY = 'noteapp_tasks_v1';

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

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed: Task[] = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const { cleaned, removedCount } = cleanupOldCompletedTasks(parsed);
        if (removedCount > 0) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
          return cleaned;
        }
        return parsed;
      }
      return parsed;
    } catch (e) {
      console.error("Failed to parse tasks from localStorage", e);
      return [];
    }
  });

  // Save to local storage whenever tasks change, avoiding redundant writes
  useEffect(() => {
    const currentStored = localStorage.getItem(STORAGE_KEY);
    const newSerialized = JSON.stringify(tasks);
    if (currentStored !== newSerialized) {
      localStorage.setItem(STORAGE_KEY, newSerialized);
    }
  }, [tasks]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) {
        try {
          if (e.key === null) {
            setTasks([]);
            return;
          }
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed)) {
              setTasks(parsed);
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

  const addTask = useCallback((title: string, date: string, recurrence: RecurrenceType) => {
    const newTask: Task = {
      id: uuidv4(),
      title,
      date, // this acts as the start date
      recurrence,
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
        // Find the day before dateStr
        const targetDate = new Date(dateStr);
        targetDate.setDate(targetDate.getDate() - 1);
        // Format to YYYY-MM-DD
        const prevDayStr = targetDate.toISOString().split('T')[0];
        
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
        const isCompleted = task.completedDates.includes(dateStr);
        let newCompletedDates = [...task.completedDates];
        
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
      isCompleted: task.completedDates.includes(dateStr),
      recurrence: task.recurrence,
    }));
  }, [tasks]);

  const importTasks = useCallback((importedTasks: Task[]) => {
    // Basic validation to ensure it looks like an array of tasks
    if (Array.isArray(importedTasks) && importedTasks.every(t => t.id && t.title)) {
      setTasks(importedTasks);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(importedTasks));
      return true;
    }
    return false;
  }, []);

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
  };
}

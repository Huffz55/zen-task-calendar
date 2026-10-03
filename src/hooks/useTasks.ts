import { useState, useEffect, useCallback } from 'react';
import type { Task, RecurrenceType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { differenceInDays, parseISO, isValid } from 'date-fns';

const STORAGE_KEY = 'noteapp_tasks_v1';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to parse tasks from localStorage", e);
      return [];
    }
  });

  // Save to local storage whenever tasks change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

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
    }));
  }, [tasks]);

  const importTasks = useCallback((importedTasks: Task[]) => {
    // Basic validation to ensure it looks like an array of tasks
    if (Array.isArray(importedTasks) && importedTasks.every(t => t.id && t.title)) {
      setTasks(importedTasks);
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
    setTasks(prev => [...prev, task]);
  }, []);

  return {
    tasks,
    addTask,
    deleteTask,
    restoreTask,
    toggleTaskCompletion,
    getTasksForDate,
    importTasks,
    editTask,
    reorderTasks,
  };
}

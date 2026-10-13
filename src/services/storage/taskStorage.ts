import type { Task, CustomList } from '../../types';
import { validateTask, validateCustomList } from '../../utils/validation';

export const TASKS_STORAGE_KEY = 'noteapp_tasks_v1';
export const LISTS_STORAGE_KEY = 'noteapp_lists_v1';

export interface ITaskStorage {
  loadTasks(): Task[];
  saveTasks(tasks: Task[]): void;
}

export interface IListStorage {
  loadLists(): CustomList[];
  saveLists(lists: CustomList[]): void;
}

export class LocalTaskStorage implements ITaskStorage {
  loadTasks(): Task[] {
    try {
      const stored = localStorage.getItem(TASKS_STORAGE_KEY);
      const raw: unknown = stored ? JSON.parse(stored) : [];
      if (Array.isArray(raw)) {
        const validated: Task[] = [];
        for (const item of raw) {
          const v = validateTask(item);
          if (v) validated.push(v);
        }
        return validated;
      }
      return [];
    } catch (e) {
      console.error('Failed to parse tasks from localStorage', e);
      return [];
    }
  }

  saveTasks(tasks: Task[]): void {
    try {
      const currentStored = localStorage.getItem(TASKS_STORAGE_KEY);
      const newSerialized = JSON.stringify(tasks);
      if (currentStored !== newSerialized) {
        localStorage.setItem(TASKS_STORAGE_KEY, newSerialized);
      }
    } catch (err: unknown) {
      const errorObj = err as { name?: string; code?: number };
      if (errorObj?.name === 'QuotaExceededError' || errorObj?.code === 22 || errorObj?.code === 1014) {
        window.dispatchEvent(
          new CustomEvent('zen_storage_quota_exceeded', {
            detail: { message: 'Storage quota exceeded. Please export backup and clean tasks.' },
          })
        );
      }
      console.error('Failed to save tasks to localStorage', err);
    }
  }
}

export class LocalListStorage implements IListStorage {
  loadLists(): CustomList[] {
    try {
      const stored = localStorage.getItem(LISTS_STORAGE_KEY);
      const raw: unknown = stored ? JSON.parse(stored) : [];
      if (Array.isArray(raw)) {
        const validated: CustomList[] = [];
        for (const item of raw) {
          const v = validateCustomList(item);
          if (v) validated.push(v);
        }
        return validated;
      }
      return [];
    } catch (e) {
      console.error('Failed to parse lists from localStorage', e);
      return [];
    }
  }

  saveLists(lists: CustomList[]): void {
    try {
      const currentStored = localStorage.getItem(LISTS_STORAGE_KEY);
      const newSerialized = JSON.stringify(lists);
      if (currentStored !== newSerialized) {
        localStorage.setItem(LISTS_STORAGE_KEY, newSerialized);
      }
    } catch (err: unknown) {
      const errorObj = err as { name?: string; code?: number };
      if (errorObj?.name === 'QuotaExceededError' || errorObj?.code === 22 || errorObj?.code === 1014) {
        window.dispatchEvent(
          new CustomEvent('zen_storage_quota_exceeded', {
            detail: { message: 'Storage quota exceeded. Please export backup and clear old lists.' },
          })
        );
      }
      console.error('Failed to save lists to localStorage', err);
    }
  }
}

export const defaultTaskStorage: ITaskStorage = new LocalTaskStorage();
export const defaultListStorage: IListStorage = new LocalListStorage();

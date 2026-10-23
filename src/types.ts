export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly';

export type TaskTag = 'work' | 'personal' | 'health' | 'ideas' | 'priority';

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  recurrence: RecurrenceType;
  tag?: TaskTag;
  completedDates: string[]; // List of YYYY-MM-DD when this task was completed
  excludedDates?: string[]; // List of YYYY-MM-DD when this task was skipped/deleted for that specific day
  endDate?: string; // YYYY-MM-DD when this task recurrence ends
  updatedAt?: number; // epoch ms for conflict resolution
}

export interface DailyTask {
  id: string;
  title: string;
  isCompleted: boolean;
  taskId: string;
  recurrence: RecurrenceType;
  tag?: TaskTag;
}

export interface ListItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface CustomList {
  id: string;
  title: string;
  items: ListItem[];
  updatedAt?: number; // epoch ms for conflict resolution
}

export interface SyncDocState<T> {
  items: T[];
  deletedIds: string[];
  updatedAt: number;
}

export interface FocusSession {
  id: string;
  date: string; // YYYY-MM-DD
  durationSeconds: number;
  timestamp: number;
}


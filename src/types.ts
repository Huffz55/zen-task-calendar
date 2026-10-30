export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly';

export type TaskTag = 'work' | 'personal' | 'health' | 'ideas' | 'priority';

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  recurrence: RecurrenceType;
  tag?: TaskTag;
  completedDates: string[]; // List of YYYY-MM-DD when this task was completed
  excludedDates?: string[]; // List of YYYY-MM-DD when this task was skipped/deleted for that specific day
  endDate?: string; // YYYY-MM-DD when this task recurrence ends
  subtasks?: Subtask[];
  focusedSeconds?: number;
  isPinned?: boolean; // One Big Thing / Focus of the Day
  isEvening?: boolean; // Things 3: This Evening (Bu Akşam) distinction
  isGhost?: boolean; // Amie / Cron: Ghost Block (Hayalet Blok - tentative)
  isInbox?: boolean; // Sunsama: Triage / Quarantine inbox
  estimatedMinutes?: number; // Estimated duration in minutes
  isArchived?: boolean; // Auto-archived to Zen Cemetery (Görev Mezarlığı)
  archivedAt?: string; // YYYY-MM-DD
  updatedAt?: number; // epoch ms for conflict resolution
}

export interface DailyTask {
  id: string;
  title: string;
  isCompleted: boolean;
  taskId: string;
  recurrence: RecurrenceType;
  tag?: TaskTag;
  subtasks?: Subtask[];
  focusedSeconds?: number;
  isPinned?: boolean;
  isEvening?: boolean;
  isGhost?: boolean;
  isInbox?: boolean;
  estimatedMinutes?: number;
  isArchived?: boolean;
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
  taskId?: string;
  taskTitle?: string;
}

export interface ZenMilestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}


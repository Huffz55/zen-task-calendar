export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly';

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  recurrence: RecurrenceType;
  completedDates: string[]; // List of YYYY-MM-DD when this task was completed
}

export interface DailyTask {
  id: string;
  title: string;
  isCompleted: boolean;
  taskId: string;
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
}

import type { Task, CustomList, ListItem, RecurrenceType, TaskTag, Subtask } from '../types';
import { parseISO, isValid } from 'date-fns';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_RECURRENCES: Set<RecurrenceType> = new Set(['none', 'daily', 'weekly', 'biweekly']);
const VALID_TAGS: Set<TaskTag> = new Set(['work', 'personal', 'health', 'ideas', 'priority']);

const MAX_STRING_LENGTH = 500;
const MAX_BACKUP_ITEMS = 5000;

function isValidDateString(str: unknown): str is string {
  if (typeof str !== 'string' || !DATE_REGEX.test(str)) return false;
  const parsed = parseISO(str);
  return isValid(parsed);
}

function sanitizeText(str: unknown, maxLen = MAX_STRING_LENGTH): string {
  if (typeof str !== 'string') return '';
  // Strip null bytes and non-printable control characters (ASCII 0-31 except tab and newline)
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

export function validateTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const candidate = raw as Record<string, unknown>;

  // Block prototype pollution
  if ('__proto__' in candidate || 'constructor' in candidate) {
    if (!Object.prototype.hasOwnProperty.call(candidate, 'id')) return null;
  }

  const id = typeof candidate.id === 'string' && candidate.id.trim().length > 0
    ? candidate.id.trim().slice(0, 100)
    : null;
  if (!id) return null;

  const title = sanitizeText(candidate.title);
  if (!title) return null;

  const date = isValidDateString(candidate.date) ? candidate.date : null;
  if (!date) return null;

  let recurrence: RecurrenceType = 'none';
  if (typeof candidate.recurrence === 'string' && VALID_RECURRENCES.has(candidate.recurrence as RecurrenceType)) {
    recurrence = candidate.recurrence as RecurrenceType;
  }

  let tag: TaskTag | undefined = undefined;
  if (typeof candidate.tag === 'string' && VALID_TAGS.has(candidate.tag as TaskTag)) {
    tag = candidate.tag as TaskTag;
  }

  const completedDates: string[] = Array.isArray(candidate.completedDates)
    ? candidate.completedDates.filter(isValidDateString)
    : [];

  const excludedDates: string[] | undefined = Array.isArray(candidate.excludedDates)
    ? candidate.excludedDates.filter(isValidDateString)
    : undefined;

  const endDate: string | undefined = isValidDateString(candidate.endDate)
    ? candidate.endDate
    : undefined;

  let subtasks: Subtask[] | undefined = undefined;
  if (Array.isArray(candidate.subtasks)) {
    const validSubs: Subtask[] = [];
    for (const sub of candidate.subtasks) {
      if (sub && typeof sub === 'object') {
        const sId = typeof sub.id === 'string' && sub.id.trim() ? sub.id.trim().slice(0, 100) : null;
        const sTitle = sanitizeText(sub.title, 200);
        if (sId && sTitle) {
          validSubs.push({
            id: sId,
            title: sTitle,
            isCompleted: Boolean(sub.isCompleted),
          });
        }
      }
    }
    subtasks = validSubs;
  }

  const focusedSeconds = typeof candidate.focusedSeconds === 'number' && candidate.focusedSeconds >= 0
    ? Math.floor(candidate.focusedSeconds)
    : undefined;

  return {
    id,
    title,
    date,
    recurrence,
    tag,
    completedDates,
    excludedDates,
    endDate,
    subtasks,
    focusedSeconds,
  };
}

export function validateCustomList(raw: unknown): CustomList | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const candidate = raw as Record<string, unknown>;

  const id = typeof candidate.id === 'string' && candidate.id.trim().length > 0
    ? candidate.id.trim().slice(0, 100)
    : null;
  if (!id) return null;

  const title = sanitizeText(candidate.title, 200);
  if (!title) return null;

  const rawItems = Array.isArray(candidate.items) ? candidate.items : [];
  const items: ListItem[] = [];

  for (const item of rawItems) {
    if (item && typeof item === 'object') {
      const itemRecord = item as Record<string, unknown>;
      const itemId = typeof itemRecord.id === 'string' ? itemRecord.id.slice(0, 100) : null;
      const text = sanitizeText(itemRecord.text, 300);
      if (itemId && text) {
        items.push({
          id: itemId,
          text,
          completed: Boolean(itemRecord.completed),
        });
      }
    }
  }

  return {
    id,
    title,
    items,
  };
}

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  tasks: Task[];
  lists: CustomList[];
}

export function validateBackupPayload(parsed: unknown): BackupValidationResult {
  if (!parsed) {
    return { isValid: false, error: 'Backup file is empty or invalid JSON.', tasks: [], lists: [] };
  }

  // Case 1: Legacy Array format (only tasks)
  if (Array.isArray(parsed)) {
    if (parsed.length > MAX_BACKUP_ITEMS) {
      return { isValid: false, error: `Backup contains more than ${MAX_BACKUP_ITEMS} items (limit exceeded).`, tasks: [], lists: [] };
    }

    const tasks: Task[] = [];
    for (const item of parsed) {
      const valid = validateTask(item);
      if (valid) tasks.push(valid);
    }

    if (tasks.length === 0 && parsed.length > 0) {
      return { isValid: false, error: 'No valid task records found in the backup file.', tasks: [], lists: [] };
    }

    return { isValid: true, tasks, lists: [] };
  }

  // Case 2: Object format ({ tasks: [...], lists: [...] })
  if (typeof parsed === 'object') {
    const payload = parsed as Record<string, unknown>;
    const tasks: Task[] = [];
    const lists: CustomList[] = [];

    if (Array.isArray(payload.tasks)) {
      if (payload.tasks.length > MAX_BACKUP_ITEMS) {
        return { isValid: false, error: `Backup tasks exceed ${MAX_BACKUP_ITEMS} items limit.`, tasks: [], lists: [] };
      }
      for (const item of payload.tasks) {
        const valid = validateTask(item);
        if (valid) tasks.push(valid);
      }
    }

    if (Array.isArray(payload.lists)) {
      if (payload.lists.length > MAX_BACKUP_ITEMS) {
        return { isValid: false, error: `Backup lists exceed ${MAX_BACKUP_ITEMS} items limit.`, tasks: [], lists: [] };
      }
      for (const item of payload.lists) {
        const valid = validateCustomList(item);
        if (valid) lists.push(valid);
      }
    }

    if (tasks.length === 0 && lists.length === 0) {
      return { isValid: false, error: 'The backup file does not contain valid task or checklist data.', tasks: [], lists: [] };
    }

    return { isValid: true, tasks, lists };
  }

  return { isValid: false, error: 'Unexpected backup file structure.', tasks: [], lists: [] };
}

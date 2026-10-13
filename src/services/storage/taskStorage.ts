import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { Task, CustomList, SyncDocState } from '../../types';
import { validateTask, validateCustomList } from '../../utils/validation';
import { db, ensureAuth } from '../firebase/firebaseClient';
import { mergeItemsWithTombstones, cleanUndefined } from './syncEngine';
import { getSyncKey, setSyncKey } from './syncKeyManager';

export const TASKS_STORAGE_KEY = 'noteapp_tasks_v1';
export const LISTS_STORAGE_KEY = 'noteapp_lists_v1';
export const TASKS_DELETED_KEY = 'noteapp_tasks_deleted_ids_v1';
export const LISTS_DELETED_KEY = 'noteapp_lists_deleted_ids_v1';

export interface ITaskStorage {
  loadTasks(): Task[];
  saveTasks(tasks: Task[]): void;
  subscribeTasks?(callback: (tasks: Task[]) => void): () => void;
  switchSyncKey?(newKey: string): void;
}

export interface IListStorage {
  loadLists(): CustomList[];
  saveLists(lists: CustomList[]): void;
  subscribeLists?(callback: (lists: CustomList[]) => void): () => void;
  switchSyncKey?(newKey: string): void;
}

function loadDeletedIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveDeletedIds(key: string, ids: string[]): void {
  try {
    const capped = ids.slice(-1000);
    localStorage.setItem(key, JSON.stringify(capped));
  } catch {}
}

export class HybridFirestoreTaskStorage implements ITaskStorage {
  private isApplyingRemoteUpdate = false;
  private lastPushedHash = '';
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUnsubscribe: (() => void) | null = null;
  private activeSubscriber: ((tasks: Task[]) => void) | null = null;

  private getDocRef() {
    const key = getSyncKey();
    return doc(db, 'workspaces', `${key}_tasks`);
  }

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
      console.error('[SyncError] Failed to parse tasks from localStorage', e);
      return [];
    }
  }

  saveTasks(tasks: Task[]): void {
    try {
      // 1. Previous tasks for diffing deletions & content changes
      const prevStored = localStorage.getItem(TASKS_STORAGE_KEY);
      const prevTasks: Task[] = prevStored ? JSON.parse(prevStored) : [];
      const prevMap = new Map(prevTasks.map(t => [t.id, t]));

      // 2. Track deleted IDs (Tombstones)
      const currentIds = new Set(tasks.map(t => t.id));
      const newlyDeletedIds = prevTasks.filter(t => !currentIds.has(t.id)).map(t => t.id);
      const existingDeletedIds = loadDeletedIds(TASKS_DELETED_KEY);
      const updatedDeletedIds = Array.from(new Set([...existingDeletedIds, ...newlyDeletedIds]));
      if (newlyDeletedIds.length > 0) {
        saveDeletedIds(TASKS_DELETED_KEY, updatedDeletedIds);
      }

      // 3. Attach updatedAt timestamp to modified/new tasks
      const now = Date.now();
      const tasksWithTimestamps: Task[] = tasks.map(t => {
        const prev = prevMap.get(t.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(t)) {
          return { ...t, updatedAt: now };
        }
        return { ...t, updatedAt: t.updatedAt || now };
      });

      // 4. Always save to localStorage immediately (0ms local-first guarantee)
      const newSerialized = JSON.stringify(tasksWithTimestamps);
      localStorage.setItem(TASKS_STORAGE_KEY, newSerialized);

      // 5. Infinite Echo Loop Protection
      if (this.isApplyingRemoteUpdate || newSerialized === this.lastPushedHash) {
        return;
      }

      this.lastPushedHash = newSerialized;

      // 6. Push to Firestore
      if (this.pushTimer) {
        clearTimeout(this.pushTimer);
      }
      this.pushTimer = setTimeout(async () => {
        try {
          await ensureAuth();
          const taskDocRef = this.getDocRef();
          const payload: SyncDocState<Task> = {
            items: cleanUndefined(tasksWithTimestamps),
            deletedIds: updatedDeletedIds,
            updatedAt: Date.now(),
          };
          await setDoc(taskDocRef, payload);
          console.log(`[Sync] Pushed tasks to ${this.getDocRef().path} (count: ${tasksWithTimestamps.length})`);
        } catch (err) {
          console.error('[SyncError Tasks]: Failed to push tasks to Firestore:', err);
        }
      }, 150);
    } catch (err) {
      console.error('[SyncError Tasks]: Failed in saveTasks', err);
    }
  }

  subscribeTasks(callback: (tasks: Task[]) => void): () => void {
    this.activeSubscriber = callback;
    let isCancelled = false;

    ensureAuth()
      .then(() => {
        if (isCancelled) return;
        const taskDocRef = this.getDocRef();

        const unsubscribe = onSnapshot(
          taskDocRef,
          snapshot => {
            // If document does not exist in cloud for this key, initialize it with local data
            if (!snapshot.exists()) {
              const localTasks = this.loadTasks();
              const localDeletedIds = loadDeletedIds(TASKS_DELETED_KEY);
              if (localTasks.length > 0 || localDeletedIds.length > 0) {
                console.log(`[Sync] Initializing cloud document ${taskDocRef.path} with local data...`);
                const payload: SyncDocState<Task> = {
                  items: cleanUndefined(localTasks),
                  deletedIds: localDeletedIds,
                  updatedAt: Date.now(),
                };
                setDoc(taskDocRef, payload).catch(err => {
                  console.error('[SyncError Tasks]: Failed to initialize empty tasks doc:', err);
                });
              }
              return;
            }

            const data = snapshot.data() as SyncDocState<Task> | undefined;
            if (!data || !Array.isArray(data.items)) return;

            // Load local state & tombstones
            const localTasks = this.loadTasks();
            const localDeletedIds = loadDeletedIds(TASKS_DELETED_KEY);
            const remoteDeletedIds = Array.isArray(data.deletedIds) ? data.deletedIds : [];
            const combinedDeletedIds = new Set([...localDeletedIds, ...remoteDeletedIds]);

            // Save combined tombstones
            saveDeletedIds(TASKS_DELETED_KEY, Array.from(combinedDeletedIds));

            // Merge with tombstones
            const merged = mergeItemsWithTombstones(localTasks, data.items, combinedDeletedIds);
            const mergedSerialized = JSON.stringify(merged);

            // If merged state is different from local, apply it
            if (mergedSerialized !== JSON.stringify(localTasks)) {
              console.log(`[Sync] Received updated tasks from ${taskDocRef.path} (count: ${merged.length})`);
              this.isApplyingRemoteUpdate = true;
              this.lastPushedHash = mergedSerialized;
              localStorage.setItem(TASKS_STORAGE_KEY, mergedSerialized);

              // Notify hook to update React state
              callback(merged);

              // Reset echo guard
              setTimeout(() => {
                this.isApplyingRemoteUpdate = false;
              }, 150);
            }
          },
          err => {
            console.error('[SyncError Tasks]: onSnapshot listener error:', err);
          }
        );

        this.currentUnsubscribe = unsubscribe;
      })
      .catch(err => {
        console.error('[SyncError Tasks]: Failed to initialize task subscription:', err);
      });

    return () => {
      isCancelled = true;
      if (this.currentUnsubscribe) {
        this.currentUnsubscribe();
        this.currentUnsubscribe = null;
      }
      if (this.pushTimer) {
        clearTimeout(this.pushTimer);
      }
    };
  }

  switchSyncKey(newKey: string): void {
    setSyncKey(newKey);
    if (this.currentUnsubscribe) {
      this.currentUnsubscribe();
      this.currentUnsubscribe = null;
    }
    this.lastPushedHash = '';
    if (this.activeSubscriber) {
      this.subscribeTasks(this.activeSubscriber);
    }
  }
}

export class HybridFirestoreListStorage implements IListStorage {
  private isApplyingRemoteUpdate = false;
  private lastPushedHash = '';
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUnsubscribe: (() => void) | null = null;
  private activeSubscriber: ((lists: CustomList[]) => void) | null = null;

  private getDocRef() {
    const key = getSyncKey();
    return doc(db, 'workspaces', `${key}_lists`);
  }

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
      console.error('[SyncError] Failed to parse lists from localStorage', e);
      return [];
    }
  }

  saveLists(lists: CustomList[]): void {
    try {
      // 1. Previous lists for diffing deletions
      const prevStored = localStorage.getItem(LISTS_STORAGE_KEY);
      const prevLists: CustomList[] = prevStored ? JSON.parse(prevStored) : [];
      const prevMap = new Map(prevLists.map(l => [l.id, l]));

      // 2. Track deleted list IDs
      const currentIds = new Set(lists.map(l => l.id));
      const newlyDeletedIds = prevLists.filter(l => !currentIds.has(l.id)).map(l => l.id);
      const existingDeletedIds = loadDeletedIds(LISTS_DELETED_KEY);
      const updatedDeletedIds = Array.from(new Set([...existingDeletedIds, ...newlyDeletedIds]));
      if (newlyDeletedIds.length > 0) {
        saveDeletedIds(LISTS_DELETED_KEY, updatedDeletedIds);
      }

      // 3. Attach updatedAt timestamp
      const now = Date.now();
      const listsWithTimestamps: CustomList[] = lists.map(l => {
        const prev = prevMap.get(l.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(l)) {
          return { ...l, updatedAt: now };
        }
        return { ...l, updatedAt: l.updatedAt || now };
      });

      // 4. Save to localStorage immediately
      const newSerialized = JSON.stringify(listsWithTimestamps);
      localStorage.setItem(LISTS_STORAGE_KEY, newSerialized);

      // 5. Infinite Echo Loop Protection
      if (this.isApplyingRemoteUpdate || newSerialized === this.lastPushedHash) {
        return;
      }

      this.lastPushedHash = newSerialized;

      // 6. Push to Firestore
      if (this.pushTimer) {
        clearTimeout(this.pushTimer);
      }
      this.pushTimer = setTimeout(async () => {
        try {
          await ensureAuth();
          const listDocRef = this.getDocRef();
          const payload: SyncDocState<CustomList> = {
            items: cleanUndefined(listsWithTimestamps),
            deletedIds: updatedDeletedIds,
            updatedAt: Date.now(),
          };
          await setDoc(listDocRef, payload);
          console.log(`[Sync] Pushed lists to ${this.getDocRef().path} (count: ${listsWithTimestamps.length})`);
        } catch (err) {
          console.error('[SyncError Lists]: Failed to push lists to Firestore:', err);
        }
      }, 150);
    } catch (err) {
      console.error('[SyncError Lists]: Failed in saveLists', err);
    }
  }

  subscribeLists(callback: (lists: CustomList[]) => void): () => void {
    this.activeSubscriber = callback;
    let isCancelled = false;

    ensureAuth()
      .then(() => {
        if (isCancelled) return;
        const listDocRef = this.getDocRef();

        const unsubscribe = onSnapshot(
          listDocRef,
          snapshot => {
            if (!snapshot.exists()) {
              const localLists = this.loadLists();
              const localDeletedIds = loadDeletedIds(LISTS_DELETED_KEY);
              if (localLists.length > 0 || localDeletedIds.length > 0) {
                console.log(`[Sync] Initializing cloud document ${listDocRef.path} with local data...`);
                const payload: SyncDocState<CustomList> = {
                  items: cleanUndefined(localLists),
                  deletedIds: localDeletedIds,
                  updatedAt: Date.now(),
                };
                setDoc(listDocRef, payload).catch(err => {
                  console.error('[SyncError Lists]: Failed to initialize empty lists doc:', err);
                });
              }
              return;
            }

            const data = snapshot.data() as SyncDocState<CustomList> | undefined;
            if (!data || !Array.isArray(data.items)) return;

            // Load local state & tombstones
            const localLists = this.loadLists();
            const localDeletedIds = loadDeletedIds(LISTS_DELETED_KEY);
            const remoteDeletedIds = Array.isArray(data.deletedIds) ? data.deletedIds : [];
            const combinedDeletedIds = new Set([...localDeletedIds, ...remoteDeletedIds]);

            // Save combined tombstones
            saveDeletedIds(LISTS_DELETED_KEY, Array.from(combinedDeletedIds));

            // Merge with tombstones
            const merged = mergeItemsWithTombstones(localLists, data.items, combinedDeletedIds);
            const mergedSerialized = JSON.stringify(merged);

            if (mergedSerialized !== JSON.stringify(localLists)) {
              console.log(`[Sync] Received updated lists from ${listDocRef.path} (count: ${merged.length})`);
              this.isApplyingRemoteUpdate = true;
              this.lastPushedHash = mergedSerialized;
              localStorage.setItem(LISTS_STORAGE_KEY, mergedSerialized);

              // Notify hook to update React state
              callback(merged);

              // Reset echo guard
              setTimeout(() => {
                this.isApplyingRemoteUpdate = false;
              }, 150);
            }
          },
          err => {
            console.error('[SyncError Lists]: onSnapshot listener error:', err);
          }
        );

        this.currentUnsubscribe = unsubscribe;
      })
      .catch(err => {
        console.error('[SyncError Lists]: Failed to initialize list subscription:', err);
      });

    return () => {
      isCancelled = true;
      if (this.currentUnsubscribe) {
        this.currentUnsubscribe();
        this.currentUnsubscribe = null;
      }
      if (this.pushTimer) {
        clearTimeout(this.pushTimer);
      }
    };
  }

  switchSyncKey(newKey: string): void {
    setSyncKey(newKey);
    if (this.currentUnsubscribe) {
      this.currentUnsubscribe();
      this.currentUnsubscribe = null;
    }
    this.lastPushedHash = '';
    if (this.activeSubscriber) {
      this.subscribeLists(this.activeSubscriber);
    }
  }
}

export const defaultTaskStorage: ITaskStorage = new HybridFirestoreTaskStorage();
export const defaultListStorage: IListStorage = new HybridFirestoreListStorage();

export function switchGlobalSyncKey(newKey: string): boolean {
  if (!setSyncKey(newKey)) return false;
  (defaultTaskStorage as HybridFirestoreTaskStorage).switchSyncKey(newKey);
  (defaultListStorage as HybridFirestoreListStorage).switchSyncKey(newKey);
  return true;
}

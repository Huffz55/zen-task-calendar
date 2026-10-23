import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { FocusSession } from '../../types';
import { db, ensureAuth } from '../firebase/firebaseClient';
import { getSyncKey } from './syncKeyManager';

export const FOCUS_SESSIONS_STORAGE_KEY = 'noteapp_focus_sessions_v1';

export class WebFocusStorage {
  private isApplyingRemoteUpdate = false;
  private lastPushedHash = '';
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUnsubscribe: (() => void) | null = null;
  private activeSubscriber: ((sessions: FocusSession[]) => void) | null = null;

  loadSessions(): FocusSession[] {
    try {
      const stored = localStorage.getItem(FOCUS_SESSIONS_STORAGE_KEY);
      if (!stored) return [];
      const raw = JSON.parse(stored);
      if (Array.isArray(raw)) return raw;
    } catch {}
    return [];
  }

  saveSessions(sessions: FocusSession[]): void {
    try {
      const serialized = JSON.stringify(sessions);
      localStorage.setItem(FOCUS_SESSIONS_STORAGE_KEY, serialized);

      if (this.isApplyingRemoteUpdate || serialized === this.lastPushedHash) {
        return;
      }
      this.lastPushedHash = serialized;

      if (this.pushTimer) clearTimeout(this.pushTimer);
      this.pushTimer = setTimeout(async () => {
        try {
          await ensureAuth();
          const syncKey = getSyncKey();
          const focusDocRef = doc(db, 'workspaces', `${syncKey}_focus`);
          await setDoc(focusDocRef, {
            items: sessions,
            updatedAt: Date.now(),
          });
        } catch (err) {
          console.error('[SyncError Web Focus]: Failed to push to Firestore:', err);
        }
      }, 150);
    } catch (e) {
      console.error('[SyncError Web Focus]: saveSessions failed:', e);
    }
  }

  subscribeSessions(callback: (sessions: FocusSession[]) => void): () => void {
    this.activeSubscriber = callback;
    let isCancelled = false;

    ensureAuth()
      .then(async () => {
        if (isCancelled) return;
        const syncKey = getSyncKey();
        const focusDocRef = doc(db, 'workspaces', `${syncKey}_focus`);

        this.currentUnsubscribe = onSnapshot(
          focusDocRef,
          (snapshot) => {
            if (!snapshot.exists()) return;
            const data = snapshot.data();
            const remoteItems: FocusSession[] = Array.isArray(data?.items) ? data.items : [];

            const localItems = this.loadSessions();
            const map = new Map<string, FocusSession>();
            for (const item of localItems) map.set(item.id, item);
            for (const item of remoteItems) map.set(item.id, item);

            const merged = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
            const serializedMerged = JSON.stringify(merged);
            const serializedLocal = JSON.stringify(localItems);

            if (serializedMerged !== serializedLocal) {
              this.isApplyingRemoteUpdate = true;
              this.lastPushedHash = serializedMerged;
              localStorage.setItem(FOCUS_SESSIONS_STORAGE_KEY, serializedMerged);
              this.isApplyingRemoteUpdate = false;
              this.activeSubscriber?.(merged);
            }
          },
          (err) => {
            console.error('[SyncError Web Focus]: onSnapshot failed:', err);
          }
        );
      })
      .catch((err) => {
        console.error('[SyncError Web Focus]: ensureAuth failed:', err);
      });

    return () => {
      isCancelled = true;
      if (this.currentUnsubscribe) {
        this.currentUnsubscribe();
        this.currentUnsubscribe = null;
      }
      this.activeSubscriber = null;
    };
  }

  switchSyncKey(_newKey: string): void {
    if (this.currentUnsubscribe) {
      this.currentUnsubscribe();
      this.currentUnsubscribe = null;
    }
    this.lastPushedHash = '';
    const currentCallback = this.activeSubscriber;
    if (currentCallback) {
      this.subscribeSessions(currentCallback);
    }
  }
}

export const defaultFocusStorage = new WebFocusStorage();

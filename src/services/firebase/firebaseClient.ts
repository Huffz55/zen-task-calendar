import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCSnWuNSR4KWIX79xomrJnzplFTpB5Qqgk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "noteapp-sync-8d335.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://noteapp-sync-8d335-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "noteapp-sync-8d335",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "noteapp-sync-8d335.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "432161165401",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:432161165401:web:64a010a00557ac2fbb2148",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

let dbInstance: ReturnType<typeof getFirestore>;
try {
  dbInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
  });
} catch {
  dbInstance = getFirestore(app);
}
export const db = dbInstance;

let authInitPromise: Promise<void> | null = null;

export async function ensureAuth(): Promise<void> {
  if (auth.currentUser) {
    return;
  }

  if (!authInitPromise) {
    authInitPromise = signInAnonymously(auth)
      .then(() => {
        authInitPromise = null;
      })
      .catch(err => {
        console.error('[SyncError Auth]: Anonymous sign-in failed:', err);
        authInitPromise = null;
        throw err;
      });
  }

  return authInitPromise;
}

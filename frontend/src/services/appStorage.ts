/**
 * Hissaby Buddy Unified Hybrid Storage Engine
 * Combines ultra-fast synchronous localStorage (0ms initial React mount)
 * with robust asynchronous IndexedDB (high capacity, persistent offline storage)
 * for instant lightning-fast navigation across all pages.
 */

const DB_NAME = 'hissaby_app_offline_v1';
const DB_VERSION = 1;
const STORE_NAME = 'offline_cache';

// Standardized Storage Keys
export const STORAGE_KEYS = {
  TRANSACTIONS: 'hissaby_cached_transactions',
  METRICS: 'hissaby_cached_metrics',
  NOTIFICATIONS: 'hissaby_notifications_cache_v1',
  RECURRING: 'hissaby_cached_recurring',
  PROFILE: 'hissaby_cached_profile',
  WORKSPACES: 'hissaby_cached_workspaces',
  SPENDING_TRENDS: 'hissaby_cached_trends',
  LOANS: 'hissaby_cached_loans_v1',
  MOVED_TO_LOAN_IDS: 'hissaby_moved_to_loan_ids_v1',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// ─────────────────────────────────────────────────────────────────────────────
// Native IndexedDB Engine (Safe, Promise-based, browser-native)
// ─────────────────────────────────────────────────────────────────────────────
class IndexedDBService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB not supported in this environment'));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbPromise;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? (req.result.data as T) : null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async set<T>(key: string, data: T): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ key, data, updatedAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // Non-blocking fallback
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // Non-blocking fallback
    }
  }
}

export const idb = new IndexedDBService();

// ─────────────────────────────────────────────────────────────────────────────
// AppStorage API: Dual Synchronous LocalStorage + Asynchronous IndexedDB
// ─────────────────────────────────────────────────────────────────────────────
export const appStorage = {
  /**
   * Synchronously retrieve initial state for 0ms React component render.
   */
  getInitial<T>(key: string, fallback: T): T {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(key);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          // Purge legacy 50,000 default balance placeholder to ensure account displays 0
          if (key === STORAGE_KEYS.METRICS && parsed && typeof parsed === 'object') {
            if ((parsed as any).totalBalance === 50000) {
              (parsed as any).totalBalance = 0;
              window.localStorage.setItem(key, JSON.stringify(parsed));
            }
          }
          return parsed as T;
        }
      }
    } catch {}
    return fallback;
  },

  /**
   * Persist data instantly to localStorage, background-sync to IndexedDB,
   * and broadcast update event to synchronize all open views in 0ms.
   */
  save<T>(key: string, data: T): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(data));
      }
    } catch {}

    // Persist to high-capacity IndexedDB asynchronously
    idb.set(key, data);

    // Broadcast change across components for real-time reactivity
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hissaby_storage_updated', {
          detail: { key, data }
        })
      );
    }
  },

  /**
   * Check IndexedDB in background to hydrate if localStorage was empty or partitioned.
   */
  async hydrateFromIndexedDB<T>(key: string, onHydrate: (data: T) => void): Promise<void> {
    try {
      const idbData = await idb.get<T>(key);
      if (idbData !== null) {
        // Sanitize legacy 50,000 balance in IndexedDB
        if (key === STORAGE_KEYS.METRICS && idbData && typeof idbData === 'object') {
          if ((idbData as any).totalBalance === 50000) {
            (idbData as any).totalBalance = 0;
            idb.set(key, idbData);
          }
        }
        // Synchronize back to localStorage for next synchronous read
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, JSON.stringify(idbData));
          }
        } catch {}
        onHydrate(idbData);
      }
    } catch {}
  },

  /**
   * Remove item from both localStorage and IndexedDB.
   */
  remove(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
    idb.remove(key);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hissaby_storage_updated', {
          detail: { key, data: null }
        })
      );
    }
  },

  /**
   * Subscribe to real-time storage changes for a specific key.
   */
  subscribe<T>(key: string, callback: (data: T) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string; data: T }>;
      if (customEvent.detail && customEvent.detail.key === key) {
        callback(customEvent.detail.data);
      }
    };

    window.addEventListener('hissaby_storage_updated', handler);
    return () => window.removeEventListener('hissaby_storage_updated', handler);
  }
};

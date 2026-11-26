import { StudioState } from '../types';

const DB_NAME = 'NextStudioOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'workspace';
const STATE_RECORD_KEY = 'current_project';

const STORAGE_KEY = 'nextstudio_saved_project_v3';
const LEGACY_STORAGE_KEY_V2 = 'photostudio_bd_saved_project_v2';
const LEGACY_STORAGE_KEY_V1 = 'photostudio_bd_saved_project_v1';

let cachedDbPromise: Promise<IDBDatabase | null> | null = null;

function openOfflineDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (cachedDbPromise) return cachedDbPromise;

  cachedDbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onclose = () => {
          cachedDbPromise = null;
        };
        db.onversionchange = () => {
          db.close();
          cachedDbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        cachedDbPromise = null;
        resolve(null);
      };
    } catch {
      cachedDbPromise = null;
      resolve(null);
    }
  });

  return cachedDbPromise;
}

/**
 * Saves complete NextStudio project state to IndexedDB (handles large high-res photos & scans offline)
 * and mirrors lightweight settings to localStorage for instant initial theme/preferences read.
 */
export async function saveStateOffline(state: StudioState): Promise<boolean> {
  let savedToIdb = false;
  try {
    const db = await openOfflineDB();
    if (db) {
      savedToIdb = await new Promise<boolean>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(state, STATE_RECORD_KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    }
  } catch {
    cachedDbPromise = null;
    savedToIdb = false;
  }

  // Always mirror compact preferences (theme/mode/paper) so startup has zero flash
  try {
    localStorage.setItem(
      'nextstudio_prefs',
      JSON.stringify({ theme: state.theme, lang: state.lang, mode: state.mode })
    );
  } catch {
    // ignore
  }

  // Fallback to localStorage if IndexedDB was unavailable
  if (!savedToIdb) {
    return saveStateToLocal(state);
  }
  return true;
}

/**
 * Loads complete saved project from IndexedDB first, falling back to localStorage / legacy keys.
 */
export async function loadStateOffline(): Promise<StudioState | null> {
  try {
    const db = await openOfflineDB();
    if (db) {
      const record = await new Promise<StudioState | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(STATE_RECORD_KEY);
        req.onsuccess = () => resolve((req.result as StudioState) || null);
        req.onerror = () => resolve(null);
      });
      if (record) return record;
    }
  } catch {
    cachedDbPromise = null;
    // fallback to localStorage
  }

  return loadStateFromLocal();
}

export function loadQuickPrefs(): { theme?: 'light' | 'dark'; lang?: 'bn' | 'en'; mode?: StudioState['mode'] } | null {
  try {
    const raw = localStorage.getItem('nextstudio_prefs');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function saveStateToLocal(state: StudioState): boolean {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (err) {
    console.warn('Storage quota or error when saving state:', err);
    return false;
  }
}

export function loadStateFromLocal(): StudioState | null {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY_V2);
    if (raw) {
      return JSON.parse(raw);
    }
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY_V1);
    if (legacyRaw) {
      const parsed: StudioState = JSON.parse(legacyRaw);
      parsed.cuttingGuide = 'none';
      parsed.autoRemoveBgOnUpload = false;
      return parsed;
    }
    return null;
  } catch (err) {
    console.warn('Failed to parse saved state:', err);
    return null;
  }
}

export function exportProjectAsJson(state: StudioState) {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NextStudio-project-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importProjectFromJson(file: File): Promise<StudioState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

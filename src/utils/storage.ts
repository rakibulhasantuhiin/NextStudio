import { StudioState } from '../types';

const STORAGE_KEY = 'photostudio_bd_saved_project_v2';
const LEGACY_STORAGE_KEY = 'photostudio_bd_saved_project_v1';

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
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check legacy key
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const parsed: StudioState = JSON.parse(legacyRaw);
        // Force new defaults: cuttingGuide = 'none', autoRemoveBgOnUpload = false
        parsed.cuttingGuide = 'none';
        parsed.autoRemoveBgOnUpload = false;
        return parsed;
      }
      return null;
    }
    return JSON.parse(raw);
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
  a.download = `photostudio-project-${new Date().toISOString().slice(0, 10)}.json`;
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

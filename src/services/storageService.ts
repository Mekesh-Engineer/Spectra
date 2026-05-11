const STORAGE_PREFIX = "spectra_";

export const storageService = {
  get: <T>(key: string): T | null => {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  set: <T>(key: string, value: T): void => {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  },

  remove: (key: string): void => {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  },

  clear: (): void => {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(STORAGE_PREFIX)
    );
    keys.forEach((k) => localStorage.removeItem(k));
  },
};

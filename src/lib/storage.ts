import { DEFAULT_MATCH_KEYWORDS, type MatchSettings } from "../config";

type StorageKeys = string | string[] | Record<string, unknown> | null | undefined;

type StorageSnapshot = Record<string, unknown>;

interface StorageDriver {
  get(keys?: StorageKeys): Promise<StorageSnapshot>;
  set(items: StorageSnapshot): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
}

const MATCH_SETTINGS_KEY = "matchSettings";
const PANEL_WIDTH_KEY = "panelWidth";

const fallbackStore = new Map<string, unknown>();

const fallbackDriver: StorageDriver = {
  async get(keys) {
    const result: StorageSnapshot = {};

    if (keys === null || typeof keys === "undefined") {
      for (const [key, value] of fallbackStore.entries()) {
        result[key] = value;
      }
      return result;
    }

    if (typeof keys === "string") {
      if (fallbackStore.has(keys)) {
        result[keys] = fallbackStore.get(keys);
      }
      return result;
    }

    if (Array.isArray(keys)) {
      for (const key of keys) {
        if (fallbackStore.has(key)) {
          result[key] = fallbackStore.get(key);
        }
      }
      return result;
    }

    for (const [key, defaultValue] of Object.entries(keys)) {
      if (fallbackStore.has(key)) {
        result[key] = fallbackStore.get(key);
      } else if (typeof defaultValue !== "undefined") {
        result[key] = defaultValue;
      }
    }

    return result;
  },
  async set(items) {
    for (const [key, value] of Object.entries(items)) {
      fallbackStore.set(key, value);
    }
  },
  async remove(keys) {
    if (Array.isArray(keys)) {
      keys.forEach((key) => fallbackStore.delete(key));
      return;
    }

    fallbackStore.delete(keys);
  },
  async clear() {
    fallbackStore.clear();
  }
};

function createChromeDriver(): StorageDriver | null {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return null;
  }

  const { local } = chrome.storage;

  return {
    get(keys) {
      return new Promise<StorageSnapshot>((resolve, reject) => {
        local.get(keys ?? null, (items) => {
          const error = chrome.runtime?.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }

          resolve(items);
        });
      });
    },
    set(items) {
      return new Promise<void>((resolve, reject) => {
        local.set(items, () => {
          const error = chrome.runtime?.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }

          resolve();
        });
      });
    },
    remove(keys) {
      return new Promise<void>((resolve, reject) => {
        local.remove(keys, () => {
          const error = chrome.runtime?.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }

          resolve();
        });
      });
    },
    clear() {
      return new Promise<void>((resolve, reject) => {
        local.clear(() => {
          const error = chrome.runtime?.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }

          resolve();
        });
      });
    }
  };
}

const driver: StorageDriver = createChromeDriver() ?? fallbackDriver;

function sanitizeKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_MATCH_KEYWORDS];
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);

  const unique = Array.from(new Set(normalized.map((keyword) => keyword.toLowerCase())));

  return unique.length > 0 ? unique : [...DEFAULT_MATCH_KEYWORDS];
}

export async function loadMatchSettings(): Promise<MatchSettings> {
  const snapshot = await driver.get(MATCH_SETTINGS_KEY);
  const stored = snapshot[MATCH_SETTINGS_KEY];

  if (typeof stored !== "object" || stored === null) {
    return { keywords: [...DEFAULT_MATCH_KEYWORDS] };
  }

  const { keywords } = stored as Partial<MatchSettings>;

  return { keywords: sanitizeKeywords(keywords) };
}

export async function saveMatchSettings(settings: MatchSettings): Promise<void> {
  const keywords = sanitizeKeywords(settings.keywords);
  await driver.set({ [MATCH_SETTINGS_KEY]: { keywords } satisfies MatchSettings });
}

export async function loadPanelWidth(): Promise<number | undefined> {
  const snapshot = await driver.get(PANEL_WIDTH_KEY);
  const width = snapshot[PANEL_WIDTH_KEY];

  return typeof width === "number" && Number.isFinite(width) ? width : undefined;
}

export async function savePanelWidth(width: number): Promise<void> {
  if (typeof width !== "number" || !Number.isFinite(width)) {
    throw new TypeError("Panel width must be a finite number");
  }

  await driver.set({ [PANEL_WIDTH_KEY]: width });
}

export async function clearPersistedState(): Promise<void> {
  await driver.remove([MATCH_SETTINGS_KEY, PANEL_WIDTH_KEY]);
}

export async function clearAllStorage(): Promise<void> {
  await driver.clear();
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { DocumentData } from 'firebase/firestore';
import { useFirestoreDocument } from '../../lib/firestore-helpers';
import { SEED_HOUSEHOLD } from '../../db/seed';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface SettingsState {
  dailyLimit: number;
  theme: Theme;
}

interface SettingsContextValue {
  dailyLimit: number;
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  ready: boolean;
  setDailyLimit: (value: number) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);
const COLLECTION = 'settings';
const DOC_ID = 'main';

const DEFAULT_STATE: SettingsState = {
  dailyLimit: SEED_HOUSEHOLD.defaultDailyLimit,
  theme: 'dark',
};

const THEME_LS_KEY = 'theme_preference_v1';

function validate(raw: DocumentData): SettingsState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Record<string, unknown>;

  const limit =
    typeof data.dailyLimit === 'number' && data.dailyLimit > 0
      ? data.dailyLimit
      : DEFAULT_STATE.dailyLimit;

  const themeRaw = data.theme;
  const theme: Theme =
    themeRaw === 'light' || themeRaw === 'dark' || themeRaw === 'system'
      ? themeRaw
      : DEFAULT_STATE.theme;

  return { dailyLimit: limit, theme };
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

interface ProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: ProviderProps) {
  const { data, ready, save } = useFirestoreDocument<SettingsState>(
    COLLECTION,
    DOC_ID,
    validate,
    DEFAULT_STATE,
  );

  // System tema değişikliğini dinle (kullanıcı OS-level temayı değiştirirse)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme(),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent): void => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const effective = data ?? DEFAULT_STATE;
  const resolvedTheme: ResolvedTheme =
    effective.theme === 'system' ? systemTheme : effective.theme;

  // Tema HTML root'una uygulanır
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Tema localStorage'a yedekle (FOUC önleme — index.html bootstrap script okuyacak)
  useEffect(() => {
    try {
      localStorage.setItem(THEME_LS_KEY, effective.theme);
    } catch {
      // sessizce geç
    }
  }, [effective.theme]);

  const setDailyLimit = useCallback(
    async (value: number): Promise<void> => {
      const next = Math.max(1, Math.round(value));
      await save({ ...effective, dailyLimit: next });
    },
    [effective, save],
  );

  const setTheme = useCallback(
    async (theme: Theme): Promise<void> => {
      await save({ ...effective, theme });
    },
    [effective, save],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      dailyLimit: effective.dailyLimit,
      theme: effective.theme,
      resolvedTheme,
      ready,
      setDailyLimit,
      setTheme,
    }),
    [effective, resolvedTheme, ready, setDailyLimit, setTheme],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings, SettingsProvider içinde kullanılmalı.');
  }
  return ctx;
}

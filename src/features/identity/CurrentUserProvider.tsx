import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Identity = 'emre' | 'sila';

interface CurrentUserContextValue {
  current: Identity;
  setCurrent: (id: Identity) => void;
  toggle: () => void;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);
const STORAGE_KEY = 'current_user_v1';

function loadCurrent(): Identity {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'sila' ? 'sila' : 'emre';
  } catch {
    return 'emre';
  }
}

interface ProviderProps {
  children: ReactNode;
}

export function CurrentUserProvider({ children }: ProviderProps) {
  const [current, setCurrentState] = useState<Identity>(() => loadCurrent());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, current);
    } catch {
      // sessizce geç
    }
  }, [current]);

  const value = useMemo<CurrentUserContextValue>(
    () => ({
      current,
      setCurrent: (id) => setCurrentState(id),
      toggle: () =>
        setCurrentState((prev) => (prev === 'emre' ? 'sila' : 'emre')),
    }),
    [current],
  );

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error('useCurrentUser, CurrentUserProvider içinde kullanılmalı.');
  }
  return ctx;
}

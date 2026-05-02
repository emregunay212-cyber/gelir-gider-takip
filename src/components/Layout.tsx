import { Link, Outlet } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import BottomNav from './BottomNav';
import { useCurrentUser } from '../features/identity/CurrentUserProvider';
import { useOnlineStatus } from '../features/connection/useOnlineStatus';

const IDENTITY_LABEL = { emre: 'Emre', sila: 'Sıla' } as const;
const IDENTITY_BADGE = {
  emre: 'bg-[var(--color-emre)]/15 text-[var(--color-emre)]',
  sila: 'bg-[var(--color-sila)]/15 text-[var(--color-sila)]',
} as const;

export default function Layout() {
  const { current, toggle } = useCurrentUser();
  const online = useOnlineStatus();

  return (
    <div className="flex min-h-svh flex-col bg-[var(--color-bg)]">
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-[var(--color-text)]">
              Aile Bütçe
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  online
                    ? 'bg-[var(--color-success)]'
                    : 'bg-[var(--color-warning)]'
                }`}
                aria-hidden
              />
              {online ? 'Canlı senkron' : 'Çevrimdışı (cache)'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${IDENTITY_BADGE[current]}`}
              aria-label="Kullanıcı değiştir"
              title="Tıklayarak Emre / Sıla arasında geçiş yap"
            >
              {IDENTITY_LABEL[current]}
            </button>
            <Link
              to="/ayarlar"
              aria-label="Ayarlar"
              className="rounded-lg p-2 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
            >
              <SettingsIcon size={20} />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4 pb-28">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}

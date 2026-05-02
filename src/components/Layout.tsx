import { Link, Outlet } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import BottomNav from './BottomNav';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/features/identity/CurrentUserProvider';
import { useOnlineStatus } from '@/features/connection/useOnlineStatus';

const IDENTITY_LABEL = { emre: 'Emre', sila: 'Sıla' } as const;

export default function Layout() {
  const { current, toggle } = useCurrentUser();
  const online = useOnlineStatus();

  const identityClasses =
    current === 'emre'
      ? 'bg-[var(--color-emre)]/15 text-[var(--color-emre)] border-[var(--color-emre)]/40 hover:bg-[var(--color-emre)]/25'
      : 'bg-[var(--color-sila)]/15 text-[var(--color-sila)] border-[var(--color-sila)]/40 hover:bg-[var(--color-sila)]/25';

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <h1 className="text-base font-semibold">Aile Bütçe</h1>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
              aria-label="Kullanıcı değiştir"
              title="Tıklayarak Emre / Sıla arasında geçiş yap"
            >
              <Badge
                variant="outline"
                className={`cursor-pointer px-2.5 py-1 text-xs font-semibold transition-colors ${identityClasses}`}
              >
                {IDENTITY_LABEL[current]}
              </Badge>
            </button>
            <Link
              to="/ayarlar"
              aria-label="Ayarlar"
              className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <SettingsIcon className="size-5" />
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

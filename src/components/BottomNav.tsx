import { NavLink } from 'react-router-dom';
import {
  Home,
  CreditCard,
  Wallet,
  Banknote,
  Receipt,
  Calendar,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Ana', Icon: Home, end: true },
  { to: '/borclar', label: 'Borçlar', Icon: CreditCard },
  { to: '/gelirler', label: 'Gelirler', Icon: Banknote },
  { to: '/hesaplar', label: 'Kasa', Icon: Wallet },
  { to: '/faturalar', label: 'Faturalar', Icon: Receipt },
  { to: '/gecmis', label: 'Geçmiş', Icon: Calendar },
];

export default function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-1">
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] transition-colors',
                  isActive
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-muted)]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

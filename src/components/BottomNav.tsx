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
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

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
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-1">
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      className="absolute inset-x-2 top-0 h-[2px] rounded-full bg-primary"
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  <motion.div
                    animate={{
                      scale: isActive ? 1.1 : 1,
                      y: isActive ? -1 : 0,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 20,
                    }}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                  </motion.div>
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

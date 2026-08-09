import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NAV, isNavItemActive } from '../constants/nav';

// Painel — mesmo item da Sidebar, fora do array NAV de propósito (ver
// comentário em Sidebar.jsx): só vira uma 4ª aba pra quem é admin, o
// layout de 3 abas de todo mundo continua igual.
const ADMIN_ITEM = {
  path: '/admin',
  exact: false,
  tabLabel: 'Painel',
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
};

// Tab bar fixa — navegação principal no mobile, no lugar do menu hambúrguer.
export default function BottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const items = user?.is_admin ? [...NAV, ADMIN_ITEM] : NAV;

  return (
    <nav
      className="md:hidden flex items-stretch bg-navy-900 border-t border-navy-600 flex-shrink-0"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((item) => {
        const active = isNavItemActive(item, pathname);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[60px] py-2 text-[11px] font-medium transition-colors ${
              active ? 'text-accent' : 'text-slate-500'
            }`}
          >
            {item.icon}
            {item.tabLabel ?? item.label}
          </Link>
        );
      })}
    </nav>
  );
}

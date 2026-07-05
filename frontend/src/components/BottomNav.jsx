import { Link, useLocation } from 'react-router-dom';
import { NAV, isNavItemActive } from '../constants/nav';

// Tab bar fixa — navegação principal no mobile, no lugar do menu hambúrguer.
export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="md:hidden flex items-stretch bg-navy-900 border-t border-navy-600 flex-shrink-0"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV.map((item) => {
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

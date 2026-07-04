import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV = [
  {
    path: '/',
    exact: true,
    label: 'Mapa',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
      </svg>
    ),
  },
  {
    path: '/add-station',
    exact: false,
    label: 'Cadastrar Posto',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
  {
    path: '/profile',
    exact: false,
    label: 'Meu Perfil',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    onClose();
    navigate('/login');
  }

  function isActive(item) {
    return item.exact ? pathname === item.path : pathname.startsWith(item.path);
  }

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          sidebar fixed inset-y-0 left-0 w-[280px] flex flex-col
          bg-[#0a1628] border-r border-[#1a2d50]
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-[60px] border-b border-[#1a2d50] flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center text-base flex-shrink-0">
            ⛽
          </div>
          <div>
            <p className="font-bold text-[#f59e0b] leading-none text-[15px]" style={{ fontFamily: 'Space Grotesk' }}>
              TanqueCerto
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Postos confiáveis</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#ffffff08] border border-transparent'
                  }
                `}
              >
                <span className={`flex-shrink-0 ${active ? 'text-[#f59e0b]' : 'text-slate-500'}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer — user info ou login/register */}
        <div className="border-t border-[#1a2d50] p-4 flex-shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-[#060d1f] flex-shrink-0 shadow-md"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                {user.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate leading-tight">{user.name}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sair"
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                to="/login"
                onClick={onClose}
                className="flex items-center justify-center w-full text-sm font-semibold py-2.5 rounded-xl border border-[#1a2d50] text-slate-300 hover:text-[#f59e0b] hover:border-[#f59e0b]/30 hover:bg-[#f59e0b]/5 transition-all"
              >
                Entrar
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="flex items-center justify-center w-full text-sm font-bold py-2.5 rounded-xl bg-[#f59e0b] text-[#060d1f] hover:bg-[#d97706] transition-colors shadow-md shadow-[#f59e0b]/10"
              >
                Criar conta
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

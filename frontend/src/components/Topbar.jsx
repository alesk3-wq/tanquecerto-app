import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OctaIcon from '../assets/OctaIcon';

const TITLES = {
  '/':            'Octa',
  '/mapa':        'Octa',
  '/add-station': 'Cadastrar Posto',
  '/tanque':      'Meu Tanque',
  '/profile':     'Meu Perfil',
};

// Destinos principais (abas da BottomNav) — sem botão voltar.
const TAB_ROOTS = ['/', '/mapa', '/add-station', '/tanque'];

function getTitle(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/stations/') && pathname.endsWith('/report')) return 'Nova Avaliação';
  if (pathname.startsWith('/stations/') && pathname.endsWith('/refuel')) return 'Registrar Abastecimento';
  if (pathname.startsWith('/stations/')) return 'Detalhes do Posto';
  return 'Octa';
}

export default function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const showBack = !TAB_ROOTS.includes(pathname);

  return (
    <header className="h-[60px] flex items-center gap-3 px-4 border-b border-navy-600 bg-navy-900 flex-shrink-0 z-20">
      {showBack ? (
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="w-11 h-11 -ml-2.5 flex items-center justify-center rounded-full hover:bg-navy-600 active:bg-navy-600 transition-colors text-slate-300 hover:text-accent flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      ) : (
        <span
          className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 md:hidden"
          aria-hidden="true"
        >
          <OctaIcon size={16} />
        </span>
      )}

      <h1 className="font-semibold text-slate-100 text-[15px] truncate flex-1" style={{ fontFamily: 'Poppins' }}>
        {getTitle(pathname)}
      </h1>

      {/* Avatar → Perfil (no desktop o atalho é o rodapé da sidebar) */}
      {user && pathname !== '/profile' && (
        <Link
          to="/profile"
          aria-label="Meu perfil"
          className="md:hidden w-11 h-11 -mr-1.5 flex items-center justify-center flex-shrink-0"
        >
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-navy-950 shadow-md"
            style={{ background: 'linear-gradient(135deg, #ff7a00, #d96800)' }}
          >
            {user.name[0].toUpperCase()}
          </span>
        </Link>
      )}
    </header>
  );
}

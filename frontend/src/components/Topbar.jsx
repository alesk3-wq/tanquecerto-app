import { useLocation, useNavigate } from 'react-router-dom';

const TITLES = {
  '/':            'TanqueCerto',
  '/add-station': 'Cadastrar Posto',
  '/profile':     'Meu Perfil',
};

function getTitle(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/stations/') && pathname.endsWith('/report')) return 'Nova Avaliação';
  if (pathname.startsWith('/stations/')) return 'Detalhes do Posto';
  return 'TanqueCerto';
}

export default function Topbar({ onMenuClick }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const showBack = pathname !== '/' && !pathname.startsWith('/add-station') && pathname !== '/profile';

  return (
    <header className="h-[60px] flex items-center gap-3 px-4 border-b border-[#1a2d50] bg-[#0a1628] flex-shrink-0 z-20">
      {/* Hambúrguer — só mobile */}
      <button
        onClick={onMenuClick}
        className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#1a2d50] transition-colors text-slate-400 hover:text-slate-200 flex-shrink-0"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Voltar — só em sub-telas no desktop */}
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-[#1a2d50] transition-colors text-slate-400 hover:text-slate-200 flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      )}

      <h1 className="font-semibold text-slate-100 text-[15px]" style={{ fontFamily: 'Space Grotesk' }}>
        {getTitle(pathname)}
      </h1>
    </header>
  );
}

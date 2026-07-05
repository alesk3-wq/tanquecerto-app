import { useLocation, useNavigate } from 'react-router-dom';

const TITLES = {
  '/':            'TanqueCerto',
  '/add-station': 'Cadastrar Posto',
  '/profile':     'Meu Perfil',
};

function getTitle(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/stations/') && pathname.endsWith('/report')) return 'Nova Avaliação';
  if (pathname.startsWith('/stations/') && pathname.endsWith('/refuel')) return 'Registrar Abastecimento';
  if (pathname.startsWith('/stations/')) return 'Detalhes do Posto';
  return 'TanqueCerto';
}

export default function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // "/" , "/add-station" e "/profile" são destinos principais (abas) — sem botão voltar.
  const showBack = pathname !== '/' && pathname !== '/add-station' && pathname !== '/profile';

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
          className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-base flex-shrink-0 md:hidden"
          aria-hidden="true"
        >
          ⛽
        </span>
      )}

      <h1 className="font-semibold text-slate-100 text-[15px] truncate" style={{ fontFamily: 'Space Grotesk' }}>
        {getTitle(pathname)}
      </h1>
    </header>
  );
}

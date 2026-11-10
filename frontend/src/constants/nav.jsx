// Itens de navegação principais — usados pela Sidebar (desktop) e pela BottomNav (mobile).
export const NAV = [
  {
    path: '/mapa',
    exact: true,
    label: 'Mapa',
    tabLabel: 'Mapa',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
      </svg>
    ),
  },
  {
    path: '/add-station',
    exact: false,
    label: 'Cadastrar Posto',
    tabLabel: 'Cadastrar',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
  {
    // Ícone provisório de bomba — o usuário vai mandar o SVG definitivo.
    path: '/tanque',
    exact: false,
    label: 'Meu Tanque',
    tabLabel: 'Tanque',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="3" y1="22" x2="15" y2="22"/>
        <line x1="4" y1="9" x2="14" y2="9"/>
        <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/>
        <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>
      </svg>
    ),
  },
];

export function isNavItemActive(item, pathname) {
  return item.exact ? pathname === item.path : pathname.startsWith(item.path);
}

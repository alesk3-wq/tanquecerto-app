// Itens de navegação principais — usados pela Sidebar (desktop) e pela BottomNav (mobile).
export const NAV = [
  {
    path: '/',
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
    path: '/profile',
    exact: false,
    label: 'Meu Perfil',
    tabLabel: 'Perfil',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export function isNavItemActive(item, pathname) {
  return item.exact ? pathname === item.path : pathname.startsWith(item.path);
}

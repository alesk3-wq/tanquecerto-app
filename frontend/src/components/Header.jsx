import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="bg-[#0a1628] border-b border-[#1a2d50] px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <Link to="/" className="flex items-center gap-2">
        <span className="text-xl">⛽</span>
        <span className="font-bold text-lg text-[#f59e0b]" style={{ fontFamily: 'Space Grotesk' }}>
          TanqueCerto
        </span>
      </Link>

      <nav className="flex items-center gap-3">
        {user ? (
          <>
            <Link
              to="/add-station"
              className="text-sm text-slate-300 hover:text-[#f59e0b] transition-colors"
            >
              + Posto
            </Link>
            <Link
              to="/profile"
              className="text-sm text-slate-300 hover:text-[#f59e0b] transition-colors"
            >
              {user.name.split(' ')[0]}
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-red-400 transition-colors"
            >
              Sair
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-sm text-slate-300 hover:text-[#f59e0b] transition-colors">
              Entrar
            </Link>
            <Link
              to="/register"
              className="text-sm bg-[#f59e0b] text-[#060d1f] font-semibold px-3 py-1.5 rounded-lg hover:bg-[#d97706] transition-colors"
            >
              Cadastrar
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

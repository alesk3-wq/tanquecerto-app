import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Portão do painel administrativo no frontend — puramente cosmético. Quem
// protege de verdade é o middleware adminOnly do backend; aqui é só pra não
// mostrar uma tela quebrada pra quem não tem acesso.
//
// Redireciona pro mapa (e não pro login) de propósito: não vale anunciar que
// a rota existe pra quem não é admin.
export default function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user?.is_admin) return <Navigate to="/mapa" replace />;

  return <Outlet />;
}

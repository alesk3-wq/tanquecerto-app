import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Landing from '../pages/Landing';

// Raiz do site ("/"): visitante não logado vê a página de apresentação
// (é o link que vai pras redes sociais); quem já está logado vai direto
// pro mapa, que mora em /mapa. Assim os `navigate('/')` espalhados pelo
// app continuam funcionando sem precisar ser reescritos.
export default function RootRoute() {
  const { user, loading } = useAuth();

  // Sem isso, quem já está logado veria a apresentação piscar antes do
  // /auth/me responder.
  if (loading) {
    return (
      <div className="min-h-dvh bg-navy-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <Navigate to="/mapa" replace /> : <Landing />;
}

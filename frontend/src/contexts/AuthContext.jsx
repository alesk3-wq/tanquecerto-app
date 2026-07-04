import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Só há o que carregar se existe token salvo
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.get('/auth/me')
      .then(r => setUser(r.data))
      .catch((err) => {
        // Só descarta o token se ele for de fato inválido (401).
        // Erro de rede/500 transitório não destrói a sessão.
        if (err.response?.status === 401) localStorage.removeItem('token');
      })
      .finally(() => setLoading(false));
  }, []);

  // Disparado pelo interceptor do axios quando qualquer chamada retorna 401
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('tanquecerto:unauthorized', onUnauthorized);
    return () => window.removeEventListener('tanquecerto:unauthorized', onUnauthorized);
  }, []);

  function login(token, userData) {
    localStorage.setItem('token', token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sessão expirada/inválida: limpa o token e avisa o AuthContext.
// Exceção para /auth/* — senha errada no login não pode deslogar.
api.interceptors.response.use(null, (error) => {
  const status = error.response?.status;
  const url = error.config?.url ?? '';
  if (status === 401 && !url.startsWith('/auth/')) {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('tanquecerto:unauthorized'));
  }
  return Promise.reject(error);
});

export default api;

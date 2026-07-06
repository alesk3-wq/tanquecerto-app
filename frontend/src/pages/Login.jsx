import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import AuthLayout, { AuthSubmitButton, authInputClass, authLabelClass } from '../layouts/AuthLayout';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      navigate(location.state?.from ?? '/');
    } catch (err) {
      setError(err.response?.data?.error ?? 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      subtitle="O Waze dos postos de combustível"
      cardTitle="Entrar na conta"
      footer={
        <>
          Não tem conta?{' '}
          <Link to="/register" className="text-accent font-semibold hover:underline">
            Cadastre-se grátis
          </Link>
          <br />
          <Link to="/instalar" className="text-slate-600 hover:text-accent text-xs mt-2 inline-block">
            📲 Instalar o app no celular
          </Link>
        </>
      }
    >
      <ErrorMessage message={error} className="mb-4" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="login-email" className={authLabelClass}>E-mail</label>
          <input
            id="login-email"
            type="email" required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="seu@email.com"
            className={authInputClass}
          />
        </div>

        <div>
          <label htmlFor="login-password" className={authLabelClass}>Senha</label>
          <input
            id="login-password"
            type="password" required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            className={authInputClass}
          />
        </div>

        <AuthSubmitButton loading={loading} loadingText="Entrando...">
          Entrar →
        </AuthSubmitButton>
      </form>
    </AuthLayout>
  );
}

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import AuthLayout, { AuthSubmitButton, authInputClass, authLabelClass } from '../layouts/AuthLayout';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error ?? err.response?.data?.errors?.[0]?.msg ?? 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      subtitle="Redefinir senha"
      cardTitle="Nova senha"
      footer={
        <Link to="/login" className="text-accent font-semibold hover:underline">
          Voltar para o login
        </Link>
      }
    >
      {done ? (
        <p className="text-sm text-slate-300 leading-relaxed">
          Senha alterada com sucesso. Redirecionando para o login...
        </p>
      ) : (
        <>
          <ErrorMessage message={error} className="mb-4" />
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="reset-password" className={authLabelClass}>Nova senha</label>
              <input
                id="reset-password"
                type="password" required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={authInputClass}
              />
            </div>
            <div>
              <label htmlFor="reset-confirm" className={authLabelClass}>Confirmar nova senha</label>
              <input
                id="reset-confirm"
                type="password" required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                className={authInputClass}
              />
            </div>
            <AuthSubmitButton loading={loading} loadingText="Salvando...">
              Redefinir senha →
            </AuthSubmitButton>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

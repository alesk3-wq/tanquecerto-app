import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import AuthLayout, { AuthSubmitButton, authInputClass, authLabelClass } from '../layouts/AuthLayout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSuccessMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.error ?? err.response?.data?.errors?.[0]?.msg ?? 'Erro ao solicitar recuperação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      subtitle="Recuperar senha"
      cardTitle="Esqueci minha senha"
      footer={
        <Link to="/login" className="text-accent font-semibold hover:underline">
          Voltar para o login
        </Link>
      }
    >
      {successMessage ? (
        <p className="text-sm text-slate-300 leading-relaxed">{successMessage}</p>
      ) : (
        <>
          <ErrorMessage message={error} className="mb-4" />
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="forgot-email" className={authLabelClass}>E-mail</label>
              <input
                id="forgot-email"
                type="email" required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className={authInputClass}
              />
            </div>
            <AuthSubmitButton loading={loading} loadingText="Enviando...">
              Enviar instruções →
            </AuthSubmitButton>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

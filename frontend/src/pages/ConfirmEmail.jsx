import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import AuthLayout, { AuthSubmitButton, authInputClass, authLabelClass } from '../layouts/AuthLayout';

export default function ConfirmEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.post('/auth/confirm-email', { token })
      .then(({ data }) => { if (!cancelled) { setStatus('success'); setMessage(data.message); } })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(err.response?.data?.error ?? 'Link inválido ou expirado.');
      });
    return () => { cancelled = true; };
  }, [token]);

  async function handleResend(e) {
    e.preventDefault();
    setResendLoading(true);
    setResendMessage('');
    try {
      const { data } = await api.post('/auth/resend-confirmation', { email: resendEmail });
      setResendMessage(data.message);
    } catch {
      setResendMessage('Erro ao reenviar. Tente novamente.');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <AuthLayout
      subtitle="Confirmação de e-mail"
      cardTitle="Confirmar conta"
      footer={
        <Link to="/login" className="text-accent font-semibold hover:underline">
          Voltar para o login
        </Link>
      }
    >
      {status === 'loading' && (
        <p className="text-sm text-slate-400">Confirmando...</p>
      )}

      {status === 'success' && (
        <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
      )}

      {status === 'error' && (
        <>
          <ErrorMessage message={message} className="mb-4" />
          {resendMessage ? (
            <p className="text-sm text-slate-300 leading-relaxed">{resendMessage}</p>
          ) : (
            <form onSubmit={handleResend} className="flex flex-col gap-4">
              <div>
                <label htmlFor="resend-email" className={authLabelClass}>
                  Reenviar confirmação pra este e-mail
                </label>
                <input
                  id="resend-email"
                  type="email" required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={authInputClass}
                />
              </div>
              <AuthSubmitButton loading={resendLoading} loadingText="Enviando...">
                Reenviar →
              </AuthSubmitButton>
            </form>
          )}
        </>
      )}
    </AuthLayout>
  );
}

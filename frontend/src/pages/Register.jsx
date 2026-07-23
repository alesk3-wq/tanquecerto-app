import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import AuthLayout, { AuthSubmitButton, authInputClass, authLabelClass } from '../layouts/AuthLayout';
import { isValidCPF } from '../utils/cpf';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', cpf: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!isValidCPF(form.cpf)) {
      setError('CPF inválido.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setSuccessMessage(data.message);
    } catch (err) {
      const msg = err.response?.data?.error ?? err.response?.data?.errors?.[0]?.msg ?? 'Erro ao cadastrar.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      subtitle="Crie sua conta gratuita"
      cardTitle="Criar conta"
      footer={
        <>
          Já tem conta?{' '}
          <Link to="/login" className="text-accent font-semibold hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      {successMessage ? (
        <p className="text-sm text-slate-300 leading-relaxed">{successMessage}</p>
      ) : (
      <>
      <ErrorMessage message={error} className="mb-4" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="reg-name" className={authLabelClass}>Nome completo</label>
          <input
            id="reg-name"
            type="text" required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="João Silva"
            className={authInputClass}
          />
        </div>

        <div>
          <label htmlFor="reg-email" className={authLabelClass}>E-mail</label>
          <input
            id="reg-email"
            type="email" required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="seu@email.com"
            className={authInputClass}
          />
        </div>

        <div>
          <label htmlFor="reg-password" className={authLabelClass}>Senha</label>
          <input
            id="reg-password"
            type="password" required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Mínimo 6 caracteres"
            className={authInputClass}
          />
        </div>

        <div>
          <label htmlFor="reg-cpf" className={authLabelClass}>CPF</label>
          <input
            id="reg-cpf"
            type="text" required
            value={form.cpf}
            onChange={(e) => setForm({ ...form, cpf: e.target.value })}
            placeholder="000.000.000-00"
            className={authInputClass}
          />
        </div>

        <div>
          <label htmlFor="reg-phone" className={authLabelClass}>
            Telefone <span className="text-slate-700 font-normal normal-case">(opcional)</span>
          </label>
          <input
            id="reg-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(11) 99999-9999"
            className={authInputClass}
          />
        </div>

        <AuthSubmitButton loading={loading} loadingText="Cadastrando...">
          Criar conta →
        </AuthSubmitButton>
      </form>
      </>
      )}
    </AuthLayout>
  );
}

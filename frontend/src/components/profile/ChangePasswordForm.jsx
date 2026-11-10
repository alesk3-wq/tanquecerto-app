import { useState } from 'react';
import api from '../../api/api';
import { SheetButton } from '../BottomSheet';
import { Field, fieldClass } from '../tank/VehicleForm';

// Perfil → Conta → Alterar senha. Pede a senha atual.
export default function ChangePasswordForm({ onDone, onCancel }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.current) return setError('Informe a senha atual.');
    if (form.next.length < 6) return setError('A nova senha precisa ter no mínimo 6 caracteres.');
    if (form.next !== form.confirm) return setError('A confirmação não bate com a nova senha.');
    setSaving(true);
    try {
      await api.put('/auth/me/password', { current_password: form.current, new_password: form.next });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error ?? err.response?.data?.errors?.[0]?.msg ?? 'Não foi possível alterar a senha.');
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <p className="text-3xl" aria-hidden="true">✅</p>
        <p className="text-slate-100 font-semibold mt-2">Senha alterada!</p>
        <p className="text-sm text-slate-400 mt-1">Use a nova senha no próximo login.</p>
        <SheetButton variant="primary" className="mt-5" onClick={onDone}>Ok</SheetButton>
      </div>
    );
  }

  const type = show ? 'text' : 'password';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Senha atual">
        <input type={type} value={form.current} onChange={set('current')} autoComplete="current-password" className={fieldClass} />
      </Field>
      <Field label="Nova senha">
        <input type={type} value={form.next} onChange={set('next')} autoComplete="new-password"
          placeholder="Mínimo 6 caracteres" className={fieldClass} />
      </Field>
      <Field label="Confirmar nova senha">
        <input type={type} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" className={fieldClass} />
      </Field>
      <label className="flex items-center gap-3 min-h-11 text-sm text-slate-300 cursor-pointer">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="accent-accent w-5 h-5" />
        Mostrar senhas
      </label>

      {error && <p className="text-sm text-rep-bad">{error}</p>}

      <div className="space-y-3 pt-1">
        <SheetButton type="submit" variant="primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Alterar senha'}
        </SheetButton>
        <SheetButton onClick={onCancel} disabled={saving}>Cancelar</SheetButton>
      </div>
      <p className="text-xs text-slate-500 text-center">
        Esqueceu a senha atual? Saia da conta e use “Esqueci minha senha” na tela de login.
      </p>
    </form>
  );
}

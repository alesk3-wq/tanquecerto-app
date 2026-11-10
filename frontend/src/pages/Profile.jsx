import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import Icon from '../components/Icon';
import StatCard from '../components/StatCard';
import BottomSheet, { SheetButton } from '../components/BottomSheet';
import { fieldClass } from '../components/tank/VehicleForm';
import useSheet from '../hooks/useSheet';
import PersonalDataForm from '../components/profile/PersonalDataForm';
import ChangePasswordForm from '../components/profile/ChangePasswordForm';
import { formatPhone } from '../lib/phone';
import { FUEL_LABELS } from '../constants/fuels';

// Perfil — só o que é do USUÁRIO: dados da conta, as avaliações que ele fez,
// sair e excluir conta. Abastecimentos/veículos/favoritos moram em "Meu
// Tanque" (/tanque). Chega-se aqui tocando no avatar/nome (topo no celular,
// rodapé da sidebar no desktop).

const TYPE_LABELS = { good: '✅ Positivo', suspect: '⚠️ Suspeito', bad: '❌ Negativo' };

const cardClass =
  'block w-full text-left bg-navy-800 rounded-xl border border-navy-600 p-4 cursor-pointer ' +
  'hover:border-accent/30 hover:bg-navy-750 transition-all active:scale-[0.98]';

function Row({ icon, label, hint, onClick, danger }) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full min-h-14 flex items-center gap-3 px-4 text-left transition-colors hover:bg-navy-750 ${danger ? 'text-rep-bad' : 'text-slate-200'}`}>
      <span className="w-5 flex justify-center flex-shrink-0" aria-hidden="true">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-slate-500 mt-0.5">{hint}</span>}
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-slate-600">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [sheet, openSheet, closeSheet] = useSheet('acao');

  const [reports, setReports] = useState([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [r, f] = await Promise.all([api.get('/reports/mine'), api.get('/favorites')]);
      setReports(r.data.data);
      setFavoritesCount(f.data.length);
      setError('');
    } catch {
      setError('Não foi possível carregar suas avaliações.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch-on-mount: os setState acontecem após o await, não sincronamente.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAll(); }, [loadAll]);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function openDeleteAccount() {
    setDeletePassword('');
    setDeleteError('');
    openSheet('excluir-conta');
  }

  async function handleDeleteAccount(e) {
    e.preventDefault();
    setDeleteError('');
    if (!deletePassword) {
      setDeleteError('Digite sua senha para confirmar.');
      return;
    }
    setDeletingAccount(true);
    try {
      await api.delete('/auth/me', { data: { password: deletePassword } });
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setDeleteError(
        err.response?.data?.error ??
        err.response?.data?.errors?.[0]?.msg ??
        'Não foi possível excluir a conta.'
      );
      setDeletingAccount(false);
    }
  }

  if (!user) return null;

  const positives = reports.filter((r) => r.type === 'good').length;

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden px-4 pt-6 pb-6"
        style={{ background: 'linear-gradient(160deg, #0d2246 0%, #0a1628 70%, #060d1f 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 30%, #ff7a00 0%, transparent 50%)' }} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-navy-950 shadow-lg shadow-accent/20 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #ff7a00, #d96800)' }}>
            {user.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-xl text-slate-100 truncate">{user.name}</h1>
            <p className="text-sm text-slate-400 truncate">{user.email}</p>
            {user.created_at && (
              <p className="text-xs text-slate-500 mt-1">
                No Octa desde {new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-3 mt-6">
          <StatCard value={reports.length} label="Avaliações" color="text-accent" />
          <StatCard value={positives} label="Positivas" color="text-rep-good" />
          <StatCard value={favoritesCount} label="Favoritos" color="text-slate-300" extra={<Icon name="coracao" size={12} />} />
        </div>
      </div>

      {/* Minhas avaliações */}
      <section className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Icon name="estrela" size={14} />Minhas avaliações
        </h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <ErrorMessage message={error} onRetry={() => { setLoading(true); setError(''); loadAll(); }} />
        ) : reports.length === 0 ? (
          <div className="text-center py-10 bg-navy-800 rounded-2xl border border-dashed border-navy-600">
            <p className="text-slate-500 text-sm">Você ainda não fez nenhuma avaliação.</p>
            <button onClick={() => navigate('/mapa')} className="mt-3 text-sm text-accent hover:underline font-medium">
              Explorar postos →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <button key={r.id} type="button" className={cardClass} onClick={() => navigate(`/stations/${r.station_id}`)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-200 truncate">{r.station_name}</p>
                    {r.station_brand && <p className="text-xs text-slate-500 mt-0.5">{r.station_brand}</p>}
                  </div>
                  <span className="text-sm whitespace-nowrap flex-shrink-0">{TYPE_LABELS[r.type]}</span>
                </div>
                {r.description && <p className="text-sm text-slate-400 mt-2 line-clamp-2">{r.description}</p>}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-navy-600">
                  <span className="text-xs text-slate-600 bg-navy-950/50 px-2 py-0.5 rounded-full">{FUEL_LABELS[r.fuel_type]}</span>
                  <span className="text-xs text-slate-600 ml-auto">{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Conta */}
      <section className="px-4 mt-8">
        <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Icon name="configuracoes" size={14} />Conta
        </h2>
        <div className="bg-navy-800 border border-navy-600 rounded-xl overflow-hidden divide-y divide-navy-600">
          <Row
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
            label="Dados pessoais"
            hint={user.phone ? `Nome e telefone · ${formatPhone(user.phone)}` : 'Nome e telefone'}
            onClick={() => openSheet('dados')}
          />
          <Row
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
            label="Alterar senha"
            onClick={() => openSheet('senha')}
          />
          <Row
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>}
            label="Sair da conta"
            onClick={() => openSheet('sair')}
          />
          <Row
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>}
            label="Excluir minha conta"
            hint="Apaga seus dados em definitivo"
            onClick={openDeleteAccount}
            danger
          />
        </div>
      </section>

      {/* Sobre */}
      <section className="px-4 mt-8">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Sobre o Octa</h2>
        <div className="bg-navy-800 border border-navy-600 rounded-xl overflow-hidden divide-y divide-navy-600">
          <Row icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} label="Política de privacidade"
            onClick={() => window.open('/privacidade', '_blank', 'noopener')} />
          <Row icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>} label="Fale com a gente" hint="contato@octa.eco.br"
            onClick={() => { window.location.href = 'mailto:contato@octa.eco.br'; }} />
        </div>
      </section>

      {/* — Dados pessoais — */}
      <BottomSheet open={sheet === 'dados'} onClose={closeSheet} title="Dados pessoais">
        <PersonalDataForm user={user} onSaved={(u) => { updateUser(u); closeSheet(); }} onCancel={closeSheet} />
      </BottomSheet>

      {/* — Alterar senha — */}
      <BottomSheet open={sheet === 'senha'} onClose={closeSheet} title="Alterar senha">
        <ChangePasswordForm onDone={closeSheet} onCancel={closeSheet} />
      </BottomSheet>

      {/* — Confirmar saída — */}
      <BottomSheet open={sheet === 'sair'} onClose={closeSheet} title="Sair da conta?"
        subtitle="Você vai precisar entrar de novo pra registrar abastecimentos e avaliar postos.">
        <div className="space-y-3 mt-2">
          <SheetButton variant="primary" onClick={handleLogout}>Sair</SheetButton>
          <SheetButton onClick={closeSheet}>Cancelar</SheetButton>
        </div>
      </BottomSheet>

      {/* — Exclusão de conta (LGPD art. 18 + exigência da Google Play) — */}
      <BottomSheet open={sheet === 'excluir-conta'} onClose={closeSheet} title="Excluir minha conta">
        <form onSubmit={handleDeleteAccount}>
          <p className="text-sm text-slate-400 leading-relaxed">
            Apaga em definitivo seu perfil, veículos, abastecimentos, avaliações, votos e
            favoritos. Postos que você cadastrou continuam no mapa, sem vínculo com a sua
            conta. A ação não pode ser desfeita.{' '}
            <a href="/excluir-conta" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              Saiba mais
            </a>
          </p>
          <input
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Digite sua senha para confirmar"
            autoComplete="current-password"
            className={`${fieldClass} mt-4`}
          />
          {deleteError && <p className="text-sm text-rep-bad mt-2">{deleteError}</p>}
          <div className="space-y-3 mt-4">
            <SheetButton type="submit" variant="danger" disabled={deletingAccount}>
              {deletingAccount ? 'Excluindo...' : 'Excluir permanentemente'}
            </SheetButton>
            <SheetButton onClick={closeSheet} disabled={deletingAccount}>Cancelar</SheetButton>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}

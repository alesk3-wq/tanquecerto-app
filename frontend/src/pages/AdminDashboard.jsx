import { useEffect, useState, useCallback } from 'react';
import api from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import StatCard from '../components/StatCard';
import BarChart from '../components/BarChart';
import { FUEL_LABELS } from '../constants/fuels';

const TYPE_LABELS = { good: '✅', suspect: '⚠️', bad: '❌' };

function Secao({ title, children, hint }) {
  return (
    <section className="mt-6">
      <div className="mb-3">
        <h2 className="font-semibold text-slate-200">{title}</h2>
        {hint && <p className="text-xs text-slate-600 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function ListaRecente({ title, items, vazio, render }) {
  return (
    <div className="bg-navy-800 border border-navy-600 rounded-2xl overflow-hidden">
      <div className="px-4 pt-3.5 pb-2.5 border-b border-navy-600">
        <p className="text-sm font-semibold text-slate-200">{title}</p>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-5 text-center text-sm text-slate-600">{vazio}</p>
      ) : (
        <div className="divide-y divide-navy-600">
          {items.map((it, i) => (
            <div key={it.id ?? i} className="px-4 py-2.5">{render(it)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function quando(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/metrics');
      setData(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error ?? 'Não foi possível carregar as métricas.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch-on-mount: os setState acontecem após o await, não sincronamente.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-14">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <ErrorMessage message={error} onRetry={() => { setLoading(true); load(); }} />
      </div>
    );
  }

  const { totais: t, engajamento: e, crescimento: c, recentes: r } = data;
  const pctConfirmado = t.usuarios ? Math.round((e.email_confirmado / t.usuarios) * 100) : 0;
  const pctAbasteceu = t.usuarios ? Math.round((e.usuarios_que_abasteceram / t.usuarios) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold text-slate-100">Painel</h1>
        <button onClick={() => { setLoading(true); load(); }}
          className="text-xs text-accent hover:underline font-medium">
          Atualizar
        </button>
      </div>

      <Secao title="Totais">
        <div className="grid grid-cols-3 gap-3">
          <StatCard value={t.usuarios} label="Usuários" color="text-accent" />
          <StatCard value={t.abastecimentos} label="Abastecimentos" color="text-rep-good" />
          <StatCard value={t.veiculos} label="Veículos" />
          <StatCard value={t.avaliacoes_combustivel} label="Aval. combustível" />
          <StatCard value={t.avaliacoes_atendimento} label="Aval. atendimento" />
          <StatCard value={t.favoritos} label="Favoritos" />
        </div>
      </Secao>

      <Secao
        title="Postos"
        hint="Os da ANP vieram da importação; os cadastrados por usuário são o sinal de que a comunidade está ativa."
      >
        <div className="grid grid-cols-3 gap-3">
          <StatCard value={t.postos_total.toLocaleString('pt-BR')} label="Total" />
          <StatCard value={t.postos_anp.toLocaleString('pt-BR')} label="Da ANP" />
          <StatCard value={t.postos_usuario} label="Por usuários" color="text-accent" />
        </div>
      </Secao>

      <Secao title="Crescimento" hint={`Novos registros por dia, últimos ${c.dias} dias.`}>
        <div className="space-y-3">
          <BarChart data={c.usuarios} label="Novos usuários" />
          <BarChart data={c.abastecimentos} label="Abastecimentos" color="bg-rep-good" />
          <BarChart data={c.avaliacoes} label="Avaliações de combustível" />
          <BarChart data={c.postos} label="Postos cadastrados por usuários" />
        </div>
      </Secao>

      <Secao title="Engajamento">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            value={`${e.email_confirmado} (${pctConfirmado}%)`}
            label="Confirmaram e-mail"
            color="text-rep-good"
          />
          <StatCard
            value={`${e.usuarios_que_abasteceram} (${pctAbasteceu}%)`}
            label="Já abasteceram"
            color="text-accent"
          />
          <StatCard value={e.postos_com_reputacao} label={`Com reputação (${e.min_reports}+ aval.)`} />
          <StatCard
            value={e.postos_sinalizados}
            label={`Sinalizados (${e.min_flags}+)`}
            color={e.postos_sinalizados > 0 ? 'text-rep-bad' : 'text-slate-200'}
          />
        </div>
      </Secao>

      <Secao title="Últimas atividades">
        <div className="space-y-3">
          <ListaRecente
            title="Abastecimentos"
            items={r.abastecimentos}
            vazio="Nenhum abastecimento ainda."
            render={(it) => (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm text-slate-200 truncate">{it.posto}</p>
                  <p className="text-xs text-slate-600 flex-shrink-0">{quando(it.created_at)}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {it.usuario} · {FUEL_LABELS[it.fuel_type] ?? it.fuel_type} · {it.liters}L ·
                  {' '}R$ {parseFloat(it.total_value).toFixed(2)}
                </p>
              </>
            )}
          />
          <ListaRecente
            title="Avaliações de combustível"
            items={r.avaliacoes}
            vazio="Nenhuma avaliação ainda."
            render={(it) => (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm text-slate-200 truncate">
                    {TYPE_LABELS[it.type]} {it.posto}
                  </p>
                  <p className="text-xs text-slate-600 flex-shrink-0">{quando(it.created_at)}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {it.usuario} · {FUEL_LABELS[it.fuel_type] ?? it.fuel_type}
                </p>
              </>
            )}
          />
          <ListaRecente
            title="Postos cadastrados por usuários"
            items={r.postos}
            vazio="Nenhum posto cadastrado por usuário ainda."
            render={(it) => (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm text-slate-200 truncate">{it.name}</p>
                  <p className="text-xs text-slate-600 flex-shrink-0">{quando(it.created_at)}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {it.brand ? `${it.brand} · ` : ''}por {it.usuario ?? 'conta removida'}
                </p>
              </>
            )}
          />
          <ListaRecente
            title="Usuários novos"
            items={r.usuarios}
            vazio="Nenhum usuário ainda."
            render={(it) => (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm text-slate-200 truncate">{it.name}</p>
                  <p className="text-xs text-slate-600 flex-shrink-0">{quando(it.created_at)}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {it.email}
                  {!it.email_verified_at && (
                    <span className="text-rep-suspect"> · e-mail não confirmado</span>
                  )}
                </p>
              </>
            )}
          />
        </div>
      </Secao>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import SuccessOverlay, { OverlayPrimaryButton, OverlaySecondaryButton } from '../components/SuccessOverlay';
import Button from '../components/Button';
import { FUEL_LABELS } from '../constants/fuels';
import { repColor } from '../constants/reputation';
import { REPORT_TAG_LABELS, REPORT_TAG_ORDER } from '../constants/reportTags';

const TYPES = [
  { value: 'good',    label: '✅ Positivo',  desc: 'Combustível de qualidade, sem problemas',     border: 'border-rep-good/40',    bg: 'bg-rep-good/10'    },
  { value: 'suspect', label: '⚠️ Suspeito',  desc: 'Algo me deixou desconfiado',                 border: 'border-rep-suspect/40', bg: 'bg-rep-suspect/10' },
  { value: 'bad',     label: '❌ Negativo',   desc: 'Problema claro: adulteração, falha, etc.',   border: 'border-rep-bad/40',     bg: 'bg-rep-bad/10'     },
];

const TYPE_RESULT = {
  good:    { label: 'Positiva', icon: '✅' },
  suspect: { label: 'Suspeita', icon: '⚠️' },
  bad:     { label: 'Negativa', icon: '❌' },
};

export default function AddReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [type, setType] = useState('');
  const [tags, setTags] = useState([]); // sintomas específicos, só suspect/bad
  const [refuel, setRefuel] = useState(undefined); // undefined = carregando, null = inelegível
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  function handleTypeChange(value) {
    setType(value);
    if (value !== 'suspect' && value !== 'bad') setTags([]);
  }

  function toggleTag(tag) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  useEffect(() => {
    api.get(`/stations/${id}/reviewable-refuel`)
      .then(({ data }) => setRefuel(data))
      .catch(() => setRefuel(null));
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!type) { setError('Selecione o tipo de avaliação.'); return; }
    setError('');
    setLoading(true);
    try {
      const showTags = type === 'suspect' || type === 'bad';
      await api.post('/reports', {
        station_id: parseInt(id),
        type,
        ...(showTags && tags.length ? { tags } : {}),
      });
      setSubmitted(type);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Erro ao enviar avaliação.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    const tc = TYPE_RESULT[submitted];
    const color = repColor(submitted);
    return (
      <SuccessOverlay icon="⭐" title="Obrigado!">
        <p className="text-rep-unknown text-sm leading-relaxed mb-5">
          Sua avaliação foi enviada e já contribui para a reputação do posto.
        </p>

        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7"
          style={{ background: `${color}18`, border: `1px solid ${color}40` }}
        >
          <span className="text-sm" aria-hidden="true">{tc.icon}</span>
          <span className="text-[13px] font-semibold" style={{ color }}>
            Avaliação {tc.label}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <OverlayPrimaryButton onClick={() => navigate('/')}>
            Ir para o mapa
          </OverlayPrimaryButton>
          <OverlaySecondaryButton onClick={() => navigate(`/stations/${id}`)}>
            Ver o posto
          </OverlaySecondaryButton>
        </div>
      </SuccessOverlay>
    );
  }

  // Carregando elegibilidade
  if (refuel === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Sem abastecimento elegível (ex: acesso direto pela URL)
  if (refuel === null) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 p-6 text-center">
          <p className="text-3xl mb-3" aria-hidden="true">⛽</p>
          <p className="text-slate-200 font-semibold mb-1">Avaliação disponível após abastecer</p>
          <p className="text-sm text-slate-500 mb-5">
            Você precisa registrar um abastecimento neste posto antes de avaliá-lo.
          </p>
          <div className="flex flex-col gap-3">
            <Button size="md" onClick={() => navigate(`/stations/${id}/refuel`)}>⛽ Abastecer</Button>
            <Button size="md" variant="ghost" onClick={() => navigate('/')}>Voltar ao mapa</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-100">Avaliar combustível</h1>

      {/* Abastecimento sendo avaliado (só leitura) */}
      <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 p-4">
        <p className={'block text-rep-unknown text-[11px] font-semibold uppercase tracking-[0.07em] mb-2'}>
          Você está avaliando o abastecimento
        </p>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-slate-100 truncate">{refuel.station_name}</p>
            {refuel.station_brand && <p className="text-sm text-slate-500">{refuel.station_brand}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-semibold text-accent">{FUEL_LABELS[refuel.fuel_type] ?? refuel.fuel_type}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date(refuel.refueled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} />

        <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 p-4">
          <p className="font-medium text-slate-300 mb-3">Notou algo no combustível?</p>
          <div className="space-y-2">
            {TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  type === t.value
                    ? `${t.border} ${t.bg}`
                    : 'border-navy-600 hover:border-navy-500'
                }`}
              >
                <input type="radio" name="type" value={t.value}
                  checked={type === t.value}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="mt-0.5 accent-accent" />
                <div>
                  <p className="font-medium text-sm text-slate-200">{t.label}</p>
                  <p className="text-xs text-slate-500">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {(type === 'suspect' || type === 'bad') && (
          <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 p-4">
            <p className="font-medium text-slate-300 mb-1">
              Notou algum problema específico com o combustível?{' '}
              <span className="text-slate-600 font-normal">(opcional)</span>
            </p>
            <p className="text-xs text-slate-500 mb-3">Marque só o que você realmente notou.</p>
            <div className="space-y-2">
              {REPORT_TAG_ORDER.map((tag) => (
                <label key={tag}
                  className="flex items-start gap-3 bg-navy-950 border border-navy-600 rounded-[10px] px-3.5 py-3 cursor-pointer">
                  <input type="checkbox" checked={tags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                    className="mt-0.5 accent-accent w-4 h-4" />
                  <span className="text-sm text-slate-200">{REPORT_TAG_LABELS[tag]}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar avaliação'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate('/')}>
          Prefiro aguardar para testar o combustível
        </Button>
      </form>
    </div>
  );
}

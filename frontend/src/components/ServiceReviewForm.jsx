import { useState } from 'react';
import api from '../api/api';
import ErrorMessage from './ErrorMessage';
import Button from './Button';

const SENTIMENTS = [
  { value: 'good',    emoji: '🙂', label: 'Bom' },
  { value: 'neutral', emoji: '😐', label: 'Neutro' },
  { value: 'bad',     emoji: '🙁', label: 'Ruim' },
];

// Avaliação de atendimento/estrutura/localização — trilha separada de
// combustível, com texto livre (risco de acusação infundada é específico de
// adulteração de combustível, não se aplica aqui). Reaproveitado na tela de
// sucesso do abastecimento (inline) e na tela dedicada alcançada pelo
// lembrete adiado.
export default function ServiceReviewForm({ stationId, onSubmitted, onSkip }) {
  const [sentiment, setSentiment] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!sentiment) { setError('Escolha como foi o atendimento.'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/service-reviews', {
        station_id: stationId, sentiment, comment: comment.trim() || null,
      });
      onSubmitted?.(data);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Erro ao enviar avaliação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-left">
      <ErrorMessage message={error} />

      <div className="flex gap-2">
        {SENTIMENTS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSentiment(s.value)}
            aria-pressed={sentiment === s.value}
            className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-all cursor-pointer ${
              sentiment === s.value ? 'border-accent bg-accent/10' : 'border-navy-600 hover:border-navy-500'
            }`}
          >
            <span className="text-2xl leading-none" aria-hidden="true">{s.emoji}</span>
            <span className="text-xs text-slate-300">{s.label}</span>
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="Conte como foi o atendimento, se é fácil de encontrar, como está a estrutura... (opcional)"
        className="w-full bg-navy-950 border border-navy-600 rounded-[10px] px-3.5 py-[11px] text-slate-100 text-sm outline-none focus:border-accent/60 transition-colors placeholder-slate-600 resize-none"
      />

      <div className="flex items-center gap-3">
        <Button type="submit" size="md" disabled={loading} className="flex-1">
          {loading ? 'Enviando...' : 'Enviar avaliação'}
        </Button>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-slate-500 hover:text-slate-300 px-2 cursor-pointer"
          >
            Agora não
          </button>
        )}
      </div>
    </form>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const STORAGE_KEY = 'tanquecerto_review_reminder_shown';

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Chave inclui `kind` — combustível e atendimento são lembretes independentes
// pro mesmo abastecimento, dispensar um não pode dispensar o outro junto.
function alreadyShownToday(kind, refuelId) {
  const map = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  return map[`${kind}_${refuelId}`] === today();
}

function markShownToday(kind, refuelId) {
  const map = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  map[`${kind}_${refuelId}`] = today();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

// `enabled` vem de fora (Home só liga quando há sessão ativa) — mantido como
// parâmetro separado do `user` porque já existiu um gate prévio aqui (prompt
// de abastecimento, removido) e pode voltar a existir um no futuro.
export default function usePendingReviewPrompt({ user, enabled }) {
  const [step, setStep] = useState('closed');
  const [pending, setPending] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled || !user) return;
    let cancelled = false;
    api.get('/refuels/pending-review').then(({ data }) => {
      if (cancelled || !data) return;
      if (alreadyShownToday(data.kind, data.id)) return;
      setPending(data);
      setStep('ask');
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [enabled, user]);

  function onYes() {
    markShownToday(pending.kind, pending.id);
    if (pending.kind === 'service') {
      navigate(`/stations/${pending.station_id}/service-review`);
    } else {
      navigate(`/stations/${pending.station_id}/report`, {
        state: { prefill: { fuel_type: pending.fuel_type, refueled_at: pending.refueled_at } },
      });
    }
  }

  function onNo() {
    markShownToday(pending.kind, pending.id);
    setStep('closed');
  }

  return { step, pending, onYes, onNo };
}

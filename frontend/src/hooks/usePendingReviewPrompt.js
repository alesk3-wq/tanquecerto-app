import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const STORAGE_KEY = 'tanquecerto_review_reminder_shown';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function alreadyShownToday(refuelId) {
  const map = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  return map[refuelId] === today();
}

function markShownToday(refuelId) {
  const map = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  map[refuelId] = today();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

// Só é considerado depois que o prompt "Você está abastecendo?" já foi respondido/fechado
// nesta montagem da Home (controlado pelo `enabled` vindo de fora).
export default function usePendingReviewPrompt({ user, enabled }) {
  const [step, setStep] = useState('closed');
  const [pending, setPending] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled || !user) return;
    let cancelled = false;
    api.get('/refuels/pending-review').then(({ data }) => {
      if (cancelled || !data) return;
      if (alreadyShownToday(data.id)) return;
      setPending(data);
      setStep('ask');
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [enabled, user]);

  function onYes() {
    markShownToday(pending.id);
    navigate(`/stations/${pending.station_id}/report`, {
      state: { prefill: { fuel_type: pending.fuel_type, refueled_at: pending.refueled_at } },
    });
  }

  function onNo() {
    markShownToday(pending.id);
    setStep('closed');
  }

  return { step, pending, onYes, onNo };
}

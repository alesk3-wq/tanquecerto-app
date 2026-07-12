import { useState } from 'react';

const STORAGE_KEY = 'tanquecerto_onboarding_seen';

function getSeen() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}

// Dica de onboarding dispensável, vista uma vez pra sempre (por id) — mesmo
// padrão de localStorage do usePendingReviewPrompt.js, só que sem reset diário.
export default function useOnboardingTip(tipId) {
  const [seen, setSeen] = useState(() => !!getSeen()[tipId]);

  function dismiss() {
    const map = getSeen();
    map[tipId] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    setSeen(true);
  }

  return { show: !seen, dismiss };
}

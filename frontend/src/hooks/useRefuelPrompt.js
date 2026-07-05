import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { REFUEL_CHECK_RADIUS_KM } from '../constants/map';

// Steps: closed | ask | locating | gpsError | checking | apiError | askRegister
export default function useRefuelPrompt({ user, userPos, gpsError, retryLocate }) {
  const [step, setStep] = useState('closed');
  const [askedOnce, setAskedOnce] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // `user` só fica disponível depois do GET /auth/me (assíncrono) — mostra o
  // prompt assim que soubermos que há sessão ativa, toda vez que a Home monta.
  // `askedOnce` deixa outros gates (ex: lembrete de avaliação pendente) saberem
  // que este prompt já foi exibido pelo menos uma vez, e não só que está "closed"
  // por ainda não ter iniciado.
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep('ask');
    setAskedOnce(true);
  }, [user]);

  // Aguarda userPos/gpsError chegarem enquanto estamos em "locating"
  useEffect(() => {
    if (step !== 'locating') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (userPos) { setStep('checking'); runCheck(userPos); }
    else if (gpsError) setStep('gpsError');
  }, [step, userPos, gpsError]); // eslint-disable-line react-hooks/exhaustive-deps

  async function runCheck(pos) {
    setError('');
    try {
      const { data } = await api.get('/stations/near', {
        params: { lat: pos.lat, lng: pos.lng, radius: REFUEL_CHECK_RADIUS_KM },
      });
      if (data.length > 0) {
        navigate(`/stations/${data[0].id}/refuel`);
      } else {
        setStep('askRegister');
      }
    } catch {
      setError('Não foi possível verificar os postos próximos.');
      setStep('apiError');
    }
  }

  function onYes() {
    if (step === 'ask') {
      if (userPos) { setStep('checking'); runCheck(userPos); }
      else if (gpsError) setStep('gpsError');
      else setStep('locating');
    } else if (step === 'askRegister') {
      navigate('/add-station', { state: { initialPosition: userPos } });
    }
  }

  function onNo() {
    setStep('closed');
  }

  function onCancel() {
    setStep('closed');
  }

  function onRetry() {
    if (step === 'gpsError') { retryLocate(); setStep('locating'); }
    if (step === 'apiError') { setStep('checking'); runCheck(userPos); }
  }

  return { step, askedOnce, error, onYes, onNo, onCancel, onRetry };
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import SuccessOverlay, { OverlayPrimaryButton, OverlaySecondaryButton } from '../components/SuccessOverlay';
import Button from '../components/Button';
import ServiceReviewForm from '../components/ServiceReviewForm';

// Espelha AddReport.jsx, mas pra trilha de atendimento — alcançada pelo
// lembrete adiado (ou direto, se o usuário pulou na tela de sucesso do
// abastecimento).
export default function AddServiceReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [refuel, setRefuel] = useState(undefined); // undefined = carregando, null = inelegível
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get(`/stations/${id}/reviewable-service-refuel`)
      .then(({ data }) => setRefuel(data))
      .catch(() => setRefuel(null));
  }, [id]);

  if (submitted) {
    return (
      <SuccessOverlay icon="🙌" title="Obrigado!">
        <p className="text-rep-unknown text-sm leading-relaxed mb-7">
          Sua avaliação de atendimento foi enviada.
        </p>
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
            Você precisa registrar um abastecimento neste posto antes de avaliar o atendimento.
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
      <h1 className="text-xl font-bold text-slate-100">Avaliar atendimento</h1>

      <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 p-4">
        <p className="block text-rep-unknown text-[11px] font-semibold uppercase tracking-[0.07em] mb-2">
          Você está avaliando
        </p>
        <p className="font-semibold text-slate-100 truncate">{refuel.station_name}</p>
        {refuel.station_brand && <p className="text-sm text-slate-500">{refuel.station_brand}</p>}
      </div>

      <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 p-4">
        <ServiceReviewForm stationId={id} onSubmitted={() => setSubmitted(true)} />
      </div>

      <Button type="button" variant="ghost" onClick={() => navigate('/')}>
        Voltar ao mapa
      </Button>
    </div>
  );
}

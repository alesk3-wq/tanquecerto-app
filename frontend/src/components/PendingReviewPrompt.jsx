import FullScreenPrompt from './FullScreenPrompt';

const COPY = {
  fuel:    { icon: '⭐', title: 'Avaliar combustível', desc: 'Já faz alguns dias do seu abastecimento — como foi o combustível?' },
  service: { icon: '🙂', title: 'Avaliar atendimento', desc: 'Já faz alguns dias do seu abastecimento — como foi o atendimento?' },
};

export default function PendingReviewPrompt({ step, pending, onYes, onNo }) {
  if (step !== 'ask' || !pending) return null;
  const copy = COPY[pending.kind] ?? COPY.fuel;

  return (
    <FullScreenPrompt
      icon={copy.icon}
      title={`${copy.title} — ${pending.station_name}`}
      desc={copy.desc}
      primaryLabel="Avaliar agora"
      onPrimary={onYes}
      secondaryLabel="Agora não"
      onSecondary={onNo}
    />
  );
}

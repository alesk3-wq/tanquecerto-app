import FullScreenPrompt from './FullScreenPrompt';

export default function PendingReviewPrompt({ step, pending, onYes, onNo }) {
  if (step !== 'ask' || !pending) return null;

  return (
    <FullScreenPrompt
      icon="⭐"
      title={`Avaliar ${pending.station_name}?`}
      desc="Já faz alguns dias do seu abastecimento — como foi o combustível?"
      primaryLabel="Avaliar agora"
      onPrimary={onYes}
      secondaryLabel="Agora não"
      onSecondary={onNo}
    />
  );
}

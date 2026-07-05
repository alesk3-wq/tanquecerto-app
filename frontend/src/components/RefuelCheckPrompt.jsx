import FullScreenPrompt from './FullScreenPrompt';

const CONTENT = {
  ask: {
    icon: '⛽',
    title: 'Você está abastecendo agora?',
    primaryLabel: 'Sim',
    secondaryLabel: 'Não',
  },
  locating: {
    icon: '📍',
    title: 'Obtendo sua localização...',
    spinner: true,
    secondaryLabel: 'Cancelar',
  },
  gpsError: {
    icon: '⚠️',
    title: 'Não conseguimos te localizar',
    desc: 'Verifique a permissão de localização do navegador.',
    primaryLabel: 'Tentar novamente',
    secondaryLabel: 'Cancelar',
  },
  checking: {
    icon: '🔍',
    title: 'Procurando postos por perto...',
    spinner: true,
  },
  apiError: {
    icon: '⚠️',
    title: 'Algo deu errado',
    primaryLabel: 'Tentar novamente',
    secondaryLabel: 'Cancelar',
  },
  askRegister: {
    icon: '📌',
    title: 'Não achamos nenhum posto aqui perto',
    desc: 'Quer cadastrar este posto agora?',
    primaryLabel: 'Sim, cadastrar',
    secondaryLabel: 'Não',
  },
};

export default function RefuelCheckPrompt({ step, error, onYes, onNo, onCancel, onRetry }) {
  if (step === 'closed') return null;

  const c = CONTENT[step];
  const primaryAction = step === 'gpsError' || step === 'apiError' ? onRetry : onYes;
  const secondaryAction = step === 'ask' || step === 'askRegister' ? onNo : onCancel;

  return (
    <FullScreenPrompt
      icon={c.icon}
      title={c.title}
      desc={c.desc}
      spinner={c.spinner}
      error={step === 'apiError' ? error : undefined}
      primaryLabel={c.primaryLabel}
      onPrimary={primaryAction}
      secondaryLabel={c.secondaryLabel}
      onSecondary={secondaryAction}
    />
  );
}

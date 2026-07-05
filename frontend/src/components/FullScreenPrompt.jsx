import Button from './Button';
import ErrorMessage from './ErrorMessage';

// Casco visual compartilhado pelos prompts de tela cheia (RefuelCheckPrompt, PendingReviewPrompt):
// fundo preto full-bleed + ícone/título/desc central + botões grandes empilhados embaixo.
export default function FullScreenPrompt({
  icon, title, desc, spinner, error,
  primaryLabel, onPrimary, secondaryLabel, onSecondary,
}) {
  return (
    <div className="fixed inset-0 z-[900] bg-void flex flex-col justify-between p-6">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
        <span className="text-5xl" aria-hidden="true">{icon}</span>
        <h2 className="text-xl font-bold text-slate-100 max-w-xs">{title}</h2>
        {desc && <p className="text-sm text-slate-500 max-w-xs">{desc}</p>}
        {error && <ErrorMessage message={error} className="max-w-xs" />}
        {spinner && (
          <div className="w-8 h-8 border-2 border-rep-good border-t-transparent rounded-full animate-spin mt-2" />
        )}
      </div>

      {(primaryLabel || secondaryLabel) && (
        <div className="flex flex-col gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {primaryLabel && (
            <Button variant="neon" size="lg" onClick={onPrimary}>
              {primaryLabel}
            </Button>
          )}
          {secondaryLabel && (
            <Button variant="ghost" size="lg" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

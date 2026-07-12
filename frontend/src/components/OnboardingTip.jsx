// Dica dispensável inline — mesmo estilo visual do box de "Preço por litro"
// em AddRefuel.jsx, reaproveitável pra qualquer dica de onboarding futura.
export default function OnboardingTip({ children, onDismiss }) {
  return (
    <div className="bg-accent/[0.07] border border-accent/20 rounded-[10px] px-3.5 py-3 flex items-start gap-2.5">
      <span className="text-base leading-none" aria-hidden="true">💡</span>
      <p className="flex-1 text-xs text-slate-300 leading-relaxed">{children}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dispensar dica"
        className="text-slate-500 hover:text-slate-300 text-sm leading-none flex-shrink-0"
      >✕</button>
    </div>
  );
}

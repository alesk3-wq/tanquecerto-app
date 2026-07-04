// Overlay fullscreen de sucesso — usado após cadastrar posto,
// enviar avaliação e registrar abastecimento.
export default function SuccessOverlay({ icon = '✅', iconTone = 'accent', title, children }) {
  const tones = {
    accent: 'bg-accent/12 border-accent/35 shadow-[0_0_32px_rgba(245,158,11,0.12)]',
    good:   'bg-rep-good/12 border-rep-good/30',
    warn:   'bg-rep-suspect/12 border-rep-suspect/35',
  };

  return (
    <div className="fixed inset-0 z-[900] bg-navy-950/88 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-navy-800 border border-navy-600 rounded-[20px] px-7 py-8 max-w-[380px] w-full shadow-2xl shadow-black/50 text-center">
        <div
          aria-hidden="true"
          className={`w-16 h-16 rounded-2xl border-[1.5px] flex items-center justify-center text-3xl mx-auto mb-5 ${tones[iconTone] ?? tones.accent}`}
        >
          {icon}
        </div>
        {title && (
          <h2 className="text-slate-100 font-bold text-xl mb-2" style={{ fontFamily: 'Space Grotesk' }}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}

// Botões padrão do overlay
export function OverlayPrimaryButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-accent text-navy-950 font-bold text-[15px] rounded-xl py-3.5 hover:bg-accent-dark transition-colors shadow-lg shadow-accent/25"
    >
      {children}
    </button>
  );
}

export function OverlaySecondaryButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-transparent border border-navy-600 text-slate-500 font-medium text-sm rounded-xl py-3 hover:text-slate-300 hover:border-navy-500 transition-colors"
    >
      {children}
    </button>
  );
}

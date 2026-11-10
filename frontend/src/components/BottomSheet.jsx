import { useEffect, useRef } from 'react';

// Card flutuante que sobe de baixo (no desktop vira um modal centralizado) —
// mesmo visual do painel "Postos próximos" do mapa. Usado pra concentrar as
// ações de um item (carro, abastecimento...) num lugar só, com botões grandes
// e espaçados, em vez de ícones pequenos colados na lista (toque acidental).
//
// Quem abre/fecha é o pai (ver hooks/useSheet.js, que amarra o card à URL pra
// o botão voltar do Android fechar o card em vez de sair da tela).
export default function BottomSheet({ open, onClose, title, subtitle, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-end md:items-center justify-center">
      {/* Fundo escurecido — tocar fora fecha */}
      <div
        className="absolute inset-0 bg-black/60 sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className="sheet-panel relative w-full md:max-w-lg bg-navy-900 rounded-t-3xl md:rounded-3xl shadow-[0_-12px_32px_rgba(0,0,0,0.45)] flex flex-col focus:outline-none"
        style={{ maxHeight: '88dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Alça + cabeçalho */}
        <div className="flex-shrink-0">
          <div className="flex justify-center pt-2.5 pb-1 md:hidden">
            <div className="w-10 h-1.5 rounded-full bg-navy-600" />
          </div>
          <div className="flex items-start gap-3 px-5 pt-2 md:pt-5 pb-3">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="font-semibold text-lg text-slate-100 leading-tight">{title}</h2>
              )}
              {subtitle && <div className="text-sm text-slate-400 mt-1">{subtitle}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="w-10 h-10 -mr-2 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-100 hover:bg-navy-600 transition-colors flex-shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

// Botão de ação dentro do card — alto (48px) e de largura total, pra não
// ter erro de toque. variant: primary | secondary | danger.
export function SheetButton({ variant = 'secondary', className = '', children, ...props }) {
  const styles = {
    primary: 'bg-accent text-navy-950 font-bold hover:bg-accent-dark',
    secondary: 'bg-navy-800 border border-navy-600 text-slate-200 font-semibold hover:border-accent/30 hover:bg-navy-750',
    danger: 'bg-rep-bad text-white font-bold',
    'danger-ghost': 'border border-rep-bad/30 text-rep-bad font-semibold hover:bg-rep-bad/10',
  };
  return (
    <button
      type="button"
      className={`w-full min-h-12 flex items-center justify-center gap-2 rounded-xl px-4 text-sm transition-all active:scale-[0.98] disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Exclusão em duas etapas dentro do card: primeiro toque só revela a
// confirmação, e ela fica separada das outras ações por uma linha.
export function SheetDeleteAction({ label, confirmText, onConfirm, confirming, setConfirming, busy }) {
  return (
    <div className="mt-6 pt-5 border-t border-navy-600">
      {!confirming ? (
        <SheetButton variant="danger-ghost" onClick={() => setConfirming(true)}>
          {label}
        </SheetButton>
      ) : (
        <div className="bg-rep-bad/10 border border-rep-bad/30 rounded-xl p-4">
          <p className="text-sm text-slate-200">{confirmText}</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <SheetButton onClick={() => setConfirming(false)} disabled={busy}>Cancelar</SheetButton>
            <SheetButton variant="danger" onClick={onConfirm} disabled={busy}>
              {busy ? 'Excluindo...' : 'Sim, excluir'}
            </SheetButton>
          </div>
        </div>
      )}
    </div>
  );
}

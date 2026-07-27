// Linha de passo numerado (círculo com número + título + descrição).
// Usado no passo a passo de instalação (Install.jsx) e no "como funciona"
// da página de apresentação (Landing.jsx).
export default function Step({ n, title, desc }) {
  return (
    <div className="flex items-start gap-3 bg-navy-950 border border-navy-600 rounded-xl p-3.5">
      <div className="w-8 h-8 rounded-full bg-accent/12 text-accent font-bold text-sm flex items-center justify-center flex-shrink-0">
        {n}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

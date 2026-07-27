import { useState } from 'react';

// Gráfico de barras diário, feito à mão (sem biblioteca — o frontend tem só 6
// dependências de runtime e uma lib de gráfico custaria ~100kb num PWA que roda
// no celular).
//
// Uma série por gráfico de propósito: o título já diz o que é, então não
// precisa de legenda, e não há risco de duas cores se confundirem. O laranja
// da marca tem contraste 6.6:1 no fundo navy dos cards (mínimo pra elemento
// gráfico é 3:1).
export default function BarChart({ data, label, color = 'bg-accent' }) {
  const [hover, setHover] = useState(null);

  const total = data.reduce((acc, d) => acc + d.total, 0);
  const max = Math.max(...data.map((d) => d.total), 1);

  function formatDia(iso) {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  }

  return (
    <div className="bg-navy-800 border border-navy-600 rounded-2xl p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-sm font-semibold text-slate-200">{label}</p>
        <p className="text-xs text-slate-500">
          <span className="text-slate-300 font-semibold">{total}</span> em {data.length} dias
        </p>
      </div>

      {/* Altura fixa e barras finas com 2px de respiro entre elas */}
      <div className="relative">
        {hover && (
          <div className="absolute -top-1 left-0 right-0 text-center pointer-events-none z-10">
            <span className="inline-block bg-navy-950 border border-navy-500 rounded-lg px-2 py-1 text-[11px] text-slate-200 shadow-lg">
              {formatDia(hover.dia)}: <span className="font-semibold text-accent">{hover.total}</span>
            </span>
          </div>
        )}
        <div className="flex items-end gap-[2px] h-20" onMouseLeave={() => setHover(null)}>
          {data.map((d) => (
            <div
              key={d.dia}
              className="flex-1 h-full flex items-end cursor-default"
              onMouseEnter={() => setHover(d)}
              title={`${formatDia(d.dia)}: ${d.total}`}
            >
              <div
                className={`w-full rounded-t ${d.total > 0 ? color : 'bg-navy-600'} transition-opacity ${
                  hover && hover.dia !== d.dia ? 'opacity-40' : ''
                }`}
                // Dias com zero ficam com um traço mínimo visível — some
                // completamente daria a impressão de "buraco" no período.
                style={{ height: d.total > 0 ? `${Math.max((d.total / max) * 100, 6)}%` : '2px' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Eixo discreto: só as pontas do período, sem número em cada barra */}
      <div className="flex justify-between mt-1.5 text-[10px] text-slate-600">
        <span>{formatDia(data[0]?.dia ?? '')}</span>
        <span>máx: {max}</span>
        <span>{formatDia(data[data.length - 1]?.dia ?? '')}</span>
      </div>
    </div>
  );
}

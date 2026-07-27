// Cartão de número (valor grande + rótulo). Usado no Perfil e no painel
// administrativo. O valor vem pronto pra exibir — quem chama formata.
export default function StatCard({ value, label, color = 'text-slate-200', extra }) {
  return (
    <div className="bg-navy-950/50 rounded-xl p-3 text-center border border-navy-600/50 shadow-md shadow-black/20">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1">{extra}{label}</p>
    </div>
  );
}

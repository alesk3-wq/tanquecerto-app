import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto p-4 mt-10">
      <div className="text-center py-14 bg-navy-800/50 rounded-2xl border border-dashed border-navy-600">
        <p className="text-4xl mb-3" aria-hidden="true">🗺️</p>
        <h1 className="text-lg font-bold text-slate-100 mb-1">Página não encontrada</h1>
        <p className="text-slate-500 text-sm mb-4">O endereço que você acessou não existe.</p>
        <Link to="/" className="text-sm text-accent hover:underline font-medium">
          ← Voltar ao mapa
        </Link>
      </div>
    </div>
  );
}

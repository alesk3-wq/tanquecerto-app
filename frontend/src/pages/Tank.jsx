import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import Icon from '../components/Icon';
import StatCard from '../components/StatCard';
import ReputationBadge from '../components/ReputationBadge';
import BottomSheet from '../components/BottomSheet';
import RefuelSheet from '../components/tank/RefuelSheet';
import VehicleSheet from '../components/tank/VehicleSheet';
import VehicleForm from '../components/tank/VehicleForm';
import useSheet from '../hooks/useSheet';
import { FUEL_LABELS } from '../constants/fuels';

// "Meu Tanque" — a aba da bomba: tudo que é do dia a dia do usuário com o
// carro (abastecimentos, veículos, postos favoritos). Tocar num item abre um
// card flutuante com as ações dele (ver BottomSheet) — nada de ícones de
// editar/excluir pequenos colados na lista.
//
// Aba ativa e card aberto ficam na URL (?aba=, ?item=) pra o voltar do
// Android funcionar e pra voltar de um posto cair na mesma aba.

const TABS = [
  { key: 'abastecimentos', label: 'Abastecimentos', icon: <Icon name="combustivel" size={14} /> },
  { key: 'veiculos',       label: 'Veículos',       icon: <span aria-hidden="true">🚗</span> },
  { key: 'favoritos',      label: 'Favoritos',      icon: <Icon name="coracao" size={14} /> },
];

const cardClass =
  'block w-full text-left bg-navy-800 rounded-xl border border-navy-600 p-4 cursor-pointer ' +
  'hover:border-accent/30 hover:bg-navy-750 transition-all active:scale-[0.98]';

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-slate-600 flex-shrink-0">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function Tank() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get('aba')) ? params.get('aba') : 'abastecimentos';
  const [item, openItem, closeItem] = useSheet('item');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [refuels, setRefuels] = useState([]);
  const [refuelStats, setRefuelStats] = useState({ total: 0, total_liters: 0, total_spent: 0 });
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [refuelsLoading, setRefuelsLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const applyRefuels = (data) => {
    setRefuels(data.data);
    setRefuelStats({ total: data.total, total_liters: data.total_liters, total_spent: data.total_spent });
  };

  const loadAll = useCallback(async () => {
    try {
      const [rf, v, f] = await Promise.all([
        api.get('/refuels/mine'),
        api.get('/vehicles/mine'),
        api.get('/favorites'),
      ]);
      applyRefuels(rf.data);
      setVehicles(v.data);
      setFavorites(f.data);
      setError('');
    } catch {
      setError('Não foi possível carregar seus dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch-on-mount: os setState acontecem após o await, não sincronamente.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAll(); }, [loadAll]);

  async function changeVehicleFilter(vehicleId) {
    setVehicleFilter(vehicleId);
    setRefuelsLoading(true);
    try {
      const { data } = await api.get('/refuels/mine', vehicleId ? { params: { vehicle_id: vehicleId } } : undefined);
      applyRefuels(data);
    } catch {
      setError('Não foi possível filtrar os abastecimentos.');
    } finally {
      setRefuelsLoading(false);
    }
  }

  // Editar/excluir um abastecimento (ou excluir um carro) mexe no consumo
  // médio e nos nomes exibidos — recarrega as duas listas; quem sabe
  // recalcular é o backend.
  async function reloadRefuelsAndVehicles() {
    const [rf, v] = await Promise.all([
      api.get('/refuels/mine', vehicleFilter ? { params: { vehicle_id: vehicleFilter } } : undefined),
      api.get('/vehicles/mine'),
    ]);
    applyRefuels(rf.data);
    setVehicles(v.data);
  }

  function selectTab(key) {
    setParams({ aba: key }, { replace: true });
  }

  async function setDefaultVehicle(id) {
    await api.put(`/vehicles/${id}/default`);
    setVehicles((prev) => prev.map((v) => ({ ...v, is_default: v.id === id })));
  }

  async function addVehicle(payload) {
    const { data } = await api.post('/vehicles', payload);
    setVehicles((prev) => [data, ...prev]);
    closeItem();
  }

  function showVehicleRefuels(vehicleId) {
    // Troca de aba e fecha o card numa navegação só (replace), sem empilhar.
    setParams({ aba: 'abastecimentos' }, { replace: true });
    changeVehicleFilter(String(vehicleId));
  }

  // ?item=abastecimento-12 | carro-3 | novo-carro
  const [itemKind, itemId] = item ? [item.replace(/-\d+$/, ''), parseInt(item.split('-').pop())] : [];
  const sheetRefuel  = itemKind === 'abastecimento' ? refuels.find((r) => r.id === itemId) : null;
  const sheetVehicle = itemKind === 'carro' ? vehicles.find((v) => v.id === itemId) : null;

  const counts = { abastecimentos: refuelStats.total, veiculos: vehicles.length, favoritos: favorites.length };

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Abas */}
      <div className="flex border-b border-navy-600 px-2 bg-navy-900 sticky top-0 z-10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => selectTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-1 min-h-12 text-[13px] font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="hidden sm:inline-flex">{t.icon}</span>
            {t.label}
            {!loading && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-navy-600 text-slate-400">{counts[t.key]}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-14">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="px-4 mt-4">
          <ErrorMessage message={error} onRetry={() => { setLoading(true); setError(''); loadAll(); }} />
        </div>
      ) : (
        <div className="px-4 mt-4">

          {/* — ABASTECIMENTOS — */}
          {tab === 'abastecimentos' && (
            <>
              {vehicles.length > 0 && (
                <select
                  value={vehicleFilter}
                  onChange={(e) => changeVehicleFilter(e.target.value)}
                  aria-label="Filtrar abastecimentos por carro"
                  className="w-full bg-navy-800 border border-navy-600 text-slate-200 text-sm rounded-xl px-4 py-3 mb-3 focus:outline-none focus:border-accent/40 cursor-pointer"
                >
                  <option value="">Todos os carros</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.year})</option>
                  ))}
                </select>
              )}

              <div className={`transition-opacity ${refuelsLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                {refuelStats.total > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <StatCard value={refuelStats.total} label="Total" color="text-accent" />
                    <StatCard value={`${parseFloat(refuelStats.total_liters).toFixed(0)}L`} label="Litros" color="text-slate-300" />
                    <StatCard value={`R$${parseFloat(refuelStats.total_spent).toFixed(0)}`} label="Gasto" color="text-rep-good" />
                  </div>
                )}
                {refuels.length === 0 ? (
                  <EmptyState
                    icon={<Icon name="combustivel" size={28} />}
                    text={vehicleFilter ? 'Nenhum abastecimento registrado com esse carro.' : 'Nenhum abastecimento registrado.'}
                    actionLabel="Explorar postos →"
                    onAction={() => navigate('/mapa')}
                  />
                ) : (
                  <div className="space-y-3">
                    {refuels.map((r) => (
                      <button key={r.id} type="button" className={cardClass} onClick={() => openItem(`abastecimento-${r.id}`)}>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-200 truncate">{r.station_name}</p>
                            {r.station_brand && <p className="text-xs text-slate-500 mt-0.5">{r.station_brand}</p>}
                            {r.vehicle_brand && (
                              <p className="text-xs text-slate-500 mt-0.5">🚗 {r.vehicle_brand} {r.vehicle_model}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs text-slate-500">{new Date(r.refueled_at).toLocaleDateString('pt-BR')}</span>
                            <Chevron />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-navy-950 rounded-lg px-1 py-1.5">
                            <p className="text-xs text-slate-500">{FUEL_LABELS[r.fuel_type]}</p>
                          </div>
                          <div className="bg-navy-950 rounded-lg px-1 py-1.5">
                            <p className="text-xs font-semibold text-slate-200">{parseFloat(r.liters).toFixed(2)} L</p>
                          </div>
                          <div className="bg-navy-950 rounded-lg px-1 py-1.5">
                            <p className="text-xs font-semibold text-accent">R$ {parseFloat(r.total_value).toFixed(2)}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* — VEÍCULOS — */}
          {tab === 'veiculos' && (
            <>
              <button
                type="button"
                onClick={() => openItem('novo-carro')}
                className="w-full min-h-12 mb-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-accent/40 text-accent text-sm font-semibold hover:bg-accent/5 transition-colors"
              >
                + Adicionar carro
              </button>
              {vehicles.length === 0 ? (
                <EmptyState icon="🚗" text="Você ainda não cadastrou nenhum carro." />
              ) : (
                <div className="space-y-3">
                  {vehicles.map((v) => (
                    <button key={v.id} type="button" className={`${cardClass} flex items-center gap-3`}
                      onClick={() => openItem(`carro-${v.id}`)}>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-200 truncate flex items-center gap-2">
                          {v.brand} {v.model} <span className="text-slate-500 font-normal">({v.year})</span>
                          {v.is_default && (
                            <span className="text-[11px] font-semibold text-accent bg-accent/10 border border-accent/30 rounded-full px-2 py-0.5 flex items-center gap-1">
                              <Icon name="estrela" size={10} />Padrão
                            </span>
                          )}
                        </p>
                        {v.consumption?.length > 0 ? (
                          <p className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3">
                            {v.consumption.map((c) => (
                              <span key={c.fuel_type} className="flex items-center gap-1">
                                <Icon name="grafico" size={11} />{c.avg_consumption} km/l ({FUEL_LABELS[c.fuel_type]})
                              </span>
                            ))}
                          </p>
                        ) : v.default_fuel_type && (
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Icon name="combustivel" size={11} />{FUEL_LABELS[v.default_fuel_type]}
                          </p>
                        )}
                      </div>
                      <Chevron />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* — FAVORITOS — tocar abre o posto; desfavoritar é pelo ♥ da página do posto */}
          {tab === 'favoritos' && (
            favorites.length === 0 ? (
              <EmptyState icon={<Icon name="coracao" size={28} />} text="Você ainda não favoritou nenhum posto."
                actionLabel="Explorar postos →" onAction={() => navigate('/mapa')} />
            ) : (
              <div className="space-y-3">
                {favorites.map((s) => (
                  <button key={s.id} type="button" className={`${cardClass} flex items-center gap-3`}
                    onClick={() => navigate(`/stations/${s.id}`)}>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-slate-200 truncate">{s.name}</p>
                      {s.brand && <p className="text-xs text-slate-500 mt-0.5">{s.brand}</p>}
                      {s.address && (
                        <p className="text-xs text-slate-600 mt-0.5 truncate flex items-center gap-1">
                          <Icon name="pin" size={11} />{s.address}
                        </p>
                      )}
                    </div>
                    <ReputationBadge reputation={s.reputation} />
                    <Chevron />
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* — Cards flutuantes — */}
      {sheetRefuel && (
        <RefuelSheet
          key={sheetRefuel.id}
          refuel={sheetRefuel}
          vehicles={vehicles}
          onClose={closeItem}
          onChanged={reloadRefuelsAndVehicles}
          onOpenStation={(id) => navigate(`/stations/${id}`, { replace: true })}
        />
      )}
      {sheetVehicle && (
        <VehicleSheet
          key={sheetVehicle.id}
          vehicle={sheetVehicle}
          onClose={closeItem}
          // PUT de edição não devolve is_default — mantém o que já estava.
          onUpdated={(data) => setVehicles((prev) => prev.map((v) => (v.id === data.id ? { ...v, ...data } : v)))}
          onDeleted={(id) => {
            setVehicles((prev) => prev.filter((v) => v.id !== id));
            // Abastecimentos do carro ficam sem veículo (ON DELETE SET NULL) — recarrega pra refletir
            // (e solta o filtro, se era justamente esse carro).
            changeVehicleFilter(vehicleFilter === String(id) ? '' : vehicleFilter);
          }}
          onSetDefault={setDefaultVehicle}
          onShowRefuels={showVehicleRefuels}
        />
      )}
      <BottomSheet open={item === 'novo-carro'} onClose={closeItem} title="Adicionar carro"
        subtitle="Usado pra calcular o consumo médio a cada abastecimento.">
        <VehicleForm submitLabel="Adicionar carro" onSubmit={addVehicle} onCancel={closeItem} />
      </BottomSheet>
    </div>
  );
}

function EmptyState({ icon, text, actionLabel, onAction }) {
  return (
    <div className="text-center py-12 bg-navy-800 rounded-2xl border border-dashed border-navy-600">
      <p className="text-3xl mb-2" aria-hidden="true">{icon}</p>
      <p className="text-slate-500 text-sm">{text}</p>
      {onAction && (
        <button onClick={onAction} className="mt-3 text-sm text-accent hover:underline font-medium">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

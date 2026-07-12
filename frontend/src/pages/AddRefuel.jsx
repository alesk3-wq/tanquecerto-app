import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import SuccessOverlay, { OverlayPrimaryButton, OverlaySecondaryButton } from '../components/SuccessOverlay';
import Button from '../components/Button';
import OnboardingTip from '../components/OnboardingTip';
import { FUEL_LABELS } from '../constants/fuels';
import { REFUEL_CHECK_RADIUS_KM } from '../constants/map';
import { haversineKm } from '../lib/distance';
import useOnboardingTip from '../hooks/useOnboardingTip';

const inputClass =
  'w-full bg-navy-950 border border-navy-600 rounded-[10px] px-3.5 py-[11px] text-slate-100 text-sm ' +
  'outline-none focus:border-accent/60 transition-colors placeholder-slate-600';

const labelClass =
  'block text-rep-unknown text-[11px] font-semibold uppercase tracking-[0.07em] mb-1.5';

function formatCooldownTime(date) {
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay ? time : `${date.toLocaleDateString('pt-BR')} ${time}`;
}

export default function AddRefuel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fullTankTip = useOnboardingTip('full_tank_rule');

  const today = new Date().toISOString().split('T')[0];

  const [station, setStation]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError]       = useState('');
  const [form, setForm]         = useState({
    vehicle_id:  '',
    fuel_type:   'gasoline',
    liters:      '',
    total_value: '',
    km:          '',
    full_tank:   true,
    notes:       '',
    refueled_at: today,
  });

  const [vehicles, setVehicles] = useState([]);
  const [newVehicle, setNewVehicle] = useState({ brand: '', model: '', year: '' });
  const [vehicleError, setVehicleError] = useState('');
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Só libera abastecer se o usuário estiver no posto (GPS a <= 200m)
  const [locationStatus, setLocationStatus] = useState('checking'); // checking | ok | far | denied
  const [distanceM, setDistanceM] = useState(null);
  // Coordenadas cruas capturadas — enviadas no submit pro servidor refazer a
  // mesma checagem de raio (reforço além do gate client-side).
  const [position, setPosition] = useState(null);

  // Checagem prévia do cooldown anti-fraude (3h entre abastecimentos no mesmo
  // posto) — bloqueia a tela inteira antes de mostrar o formulário, em vez de
  // deixar preencher tudo pra só descobrir no submit.
  // undefined = checando | null = livre | Date = bloqueado até essa hora
  const [cooldown, setCooldown] = useState(undefined);

  useEffect(() => {
    api.get(`/stations/${id}`).then(({ data }) => setStation(data)).catch(() => navigate('/'));
    api.get(`/stations/${id}/refuel-cooldown`)
      .then(({ data }) => setCooldown(data.blocked ? new Date(data.available_at) : null))
      .catch(() => setCooldown(null)); // falha na checagem não bloqueia — o servidor ainda aplica a regra no submit
  }, [id, navigate]);

  const checkLocation = useCallback((st) => {
    if (!st || !navigator.geolocation) { setLocationStatus('denied'); return; }
    setLocationStatus('checking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const km = haversineKm(pos.coords.latitude, pos.coords.longitude, parseFloat(st.latitude), parseFloat(st.longitude));
        setDistanceM(Math.round(km * 1000));
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus(km <= REFUEL_CHECK_RADIUS_KM ? 'ok' : 'far');
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (station && cooldown === null) checkLocation(station);
  }, [station, cooldown, checkLocation]);

  useEffect(() => {
    api.get('/vehicles/mine').then(({ data }) => {
      setVehicles(data);
      // Pré-seleciona o carro padrão; sem nenhum definido, cai pro mais
      // recente (primeiro da lista, mesmo fallback de antes)
      const preselect = data.find((v) => v.is_default) ?? data[0];
      if (preselect) applyVehicleSelection(preselect);
    }).catch(() => {});
  }, []);

  async function addVehicle() {
    setVehicleError('');
    if (!newVehicle.brand.trim() || !newVehicle.model.trim() || !newVehicle.year) {
      setVehicleError('Preencha marca, modelo e ano.');
      return;
    }
    setSavingVehicle(true);
    try {
      const { data } = await api.post('/vehicles', {
        brand: newVehicle.brand.trim(),
        model: newVehicle.model.trim(),
        year: parseInt(newVehicle.year),
      });
      setVehicles((prev) => [data, ...prev]);
      applyVehicleSelection(data);
      setNewVehicle({ brand: '', model: '', year: '' });
    } catch (err) {
      setVehicleError(err.response?.data?.error ?? 'Erro ao adicionar veículo.');
    } finally {
      setSavingVehicle(false);
    }
  }

  const pricePerLiter = form.liters && form.total_value
    ? (parseFloat(form.total_value) / parseFloat(form.liters)).toFixed(3)
    : null;

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Troca o carro e, se ele tiver combustível padrão definido, já pré-preenche
  // o combustível junto (sem carro ou sem padrão definido, mantém o que já
  // estava selecionado).
  function applyVehicleSelection(vehicle) {
    setForm((f) => ({
      ...f,
      vehicle_id: vehicle ? String(vehicle.id) : '',
      fuel_type: vehicle?.default_fuel_type ?? f.fuel_type,
    }));
  }

  // Aviso (não bloqueante) de KM menor que o último abastecimento do carro selecionado
  const selectedVehicle = vehicles.find((v) => String(v.id) === form.vehicle_id);
  const kmWarning =
    selectedVehicle?.last_km && form.km && parseInt(form.km) < selectedVehicle.last_km
      ? selectedVehicle.last_km
      : null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.liters || !form.total_value) { setError('Informe litros e valor total.'); return; }
    if (form.vehicle_id && !form.km) { setError('Informe o KM do veículo (necessário para calcular o consumo).'); return; }
    setError('');
    setLoading(true);
    try {
      const payload = {
        station_id:  parseInt(id),
        vehicle_id:  form.vehicle_id ? parseInt(form.vehicle_id) : null,
        fuel_type:   form.fuel_type,
        liters:      parseFloat(form.liters),
        total_value: parseFloat(form.total_value),
        refueled_at: form.refueled_at,
        km:          form.km ? parseInt(form.km) : null,
        full_tank:   form.full_tank,
        notes:       form.notes || null,
        latitude:    position?.lat,
        longitude:   position?.lng,
      };
      await api.post('/refuels', payload);
      setSubmitted({ ...payload, price_per_liter: pricePerLiter, station_name: station?.name });
    } catch (err) {
      setError(err.response?.data?.error ?? err.response?.data?.errors?.[0]?.msg ?? 'Erro ao registrar.');
    } finally {
      setLoading(false);
    }
  }

  // — Tela de sucesso —
  if (submitted) {
    return (
      <SuccessOverlay icon="⛽" title="Abastecimento registrado!">
        <p className="text-slate-600 text-[13px] mb-5">{submitted.station_name}</p>

        {/* Resumo */}
        <div className="bg-navy-950 border border-navy-600 rounded-[14px] px-4 py-3.5 mb-6 text-left">
          {[
            ['Combustível', FUEL_LABELS[submitted.fuel_type]],
            ['Litros', `${submitted.liters} L`],
            ['Total', `R$ ${parseFloat(submitted.total_value).toFixed(2)}`],
            ['Preço/L', submitted.price_per_liter ? `R$ ${submitted.price_per_liter}` : '—'],
            submitted.km ? ['KM', submitted.km.toLocaleString('pt-BR')] : null,
          ].filter(Boolean).map(([label, value]) => (
            <div key={label} className="flex justify-between mb-1.5 last:mb-0">
              <span className="text-slate-600 text-[13px]">{label}</span>
              <span className="text-slate-200 text-[13px] font-semibold">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <OverlayPrimaryButton
            onClick={() => navigate(`/stations/${id}/report`, {
              state: { prefill: { fuel_type: submitted.fuel_type, refueled_at: submitted.refueled_at } },
            })}
          >
            Avaliar agora →
          </OverlayPrimaryButton>
          <OverlaySecondaryButton onClick={() => navigate('/')}>
            Aguardar para testar o combustível
          </OverlaySecondaryButton>
        </div>
      </SuccessOverlay>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
      {station && (
        <div>
          <h1 className="text-xl font-bold text-slate-100">Registrar abastecimento</h1>
          <p className="text-sm text-slate-500 mt-0.5">📍 {station.name}{station.brand ? ` • ${station.brand}` : ''}</p>
        </div>
      )}

      {station && cooldown === undefined && (
        <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 p-6 text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Verificando abastecimentos recentes...</p>
        </div>
      )}

      {station && cooldown && (
        <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 p-6 text-center">
          <p className="text-3xl mb-3" aria-hidden="true">⏳</p>
          <p className="text-slate-200 font-semibold mb-1">Você já abasteceu aqui recentemente</p>
          <p className="text-sm text-slate-500 mb-5">
            Para evitar registros duplicados, só dá pra registrar outro abastecimento
            neste posto a partir de {formatCooldownTime(cooldown)}.
          </p>
          <Button size="md" variant="ghost" onClick={() => navigate('/')}>Voltar ao mapa</Button>
        </div>
      )}

      {station && cooldown === null && locationStatus !== 'ok' && (
        <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 p-6 text-center">
          {locationStatus === 'checking' && (
            <>
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-slate-400">Verificando se você está no posto...</p>
            </>
          )}
          {locationStatus === 'far' && (
            <>
              <p className="text-3xl mb-3" aria-hidden="true">📍</p>
              <p className="text-slate-200 font-semibold mb-1">Você precisa estar no posto</p>
              <p className="text-sm text-slate-500 mb-5">
                Só é possível registrar o abastecimento estando no posto.
                {distanceM != null && ` Você está a cerca de ${distanceM >= 1000 ? (distanceM / 1000).toFixed(1) + ' km' : distanceM + ' m'} daqui.`}
              </p>
              <Button size="md" onClick={() => checkLocation(station)}>Tentar novamente</Button>
            </>
          )}
          {locationStatus === 'denied' && (
            <>
              <p className="text-3xl mb-3" aria-hidden="true">⚠️</p>
              <p className="text-slate-200 font-semibold mb-1">Não foi possível obter sua localização</p>
              <p className="text-sm text-slate-500 mb-5">
                Ative o acesso à localização no navegador para registrar o abastecimento no posto.
              </p>
              <Button size="md" onClick={() => checkLocation(station)}>Tentar novamente</Button>
            </>
          )}
        </div>
      )}

      {cooldown === null && locationStatus === 'ok' && (
      <form onSubmit={handleSubmit} className="space-y-3">
        <ErrorMessage message={error} />

        <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 p-4 space-y-4">

          {/* Veículo */}
          <div>
            <label htmlFor="refuel-vehicle" className={labelClass}>
              Veículo{' '}
              <span className="text-slate-700 font-normal normal-case">(opcional)</span>
            </label>
            <select id="refuel-vehicle" value={form.vehicle_id}
              onChange={(e) => applyVehicleSelection(vehicles.find((v) => String(v.id) === e.target.value))}
              className={`${inputClass} cursor-pointer`}>
              <option value="">Não informar</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.year})</option>
              ))}
            </select>
            {form.vehicle_id && (
              <p className="text-xs text-slate-600 mt-1.5">
                Informe o KM abaixo pra acompanharmos o consumo deste carro.
              </p>
            )}
            {vehicles.length > 0 && (
              <button type="button" onClick={() => navigate('/profile', { state: { tab: 'vehicles' } })}
                className="text-xs text-accent hover:underline mt-1.5">
                Gerenciar veículos →
              </button>
            )}
          </div>

          {vehicles.length === 0 && (
            <div className="bg-navy-950 border border-navy-600 rounded-[10px] px-3.5 py-3 space-y-2">
              <p className="text-xs text-slate-500">
                Cadastre seu carro pra acompanhar o consumo médio nos postos que visitar.
              </p>
              <ErrorMessage message={vehicleError} />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={newVehicle.brand}
                  onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                  placeholder="Marca" className={`${inputClass} col-span-2`} />
                <input
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                  placeholder="Modelo" className={inputClass} />
                <input
                  value={newVehicle.year} type="number"
                  onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                  placeholder="Ano" className={inputClass} />
              </div>
              <button type="button" onClick={addVehicle} disabled={savingVehicle}
                className="w-full bg-navy-800 border border-navy-600 text-slate-200 font-semibold text-sm rounded-lg px-3 py-2 disabled:opacity-50">
                {savingVehicle ? 'Salvando...' : 'Salvar carro'}
              </button>
            </div>
          )}

          {/* Data e Combustível */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="refuel-date" className={labelClass}>Data</label>
              <input id="refuel-date" type="date" required value={form.refueled_at}
                onChange={(e) => set('refueled_at', e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label htmlFor="refuel-fuel" className={labelClass}>Combustível</label>
              <select id="refuel-fuel" value={form.fuel_type} onChange={(e) => set('fuel_type', e.target.value)}
                className={`${inputClass} cursor-pointer`}>
                {Object.entries(FUEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Litros e Total */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="refuel-liters" className={labelClass}>Litros</label>
              <input id="refuel-liters" type="number" step="0.001" min="0.1" required
                placeholder="40.500" value={form.liters}
                onChange={(e) => set('liters', e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label htmlFor="refuel-total" className={labelClass}>Total (R$)</label>
              <input id="refuel-total" type="number" step="0.01" min="0.01" required
                placeholder="235.00" value={form.total_value}
                onChange={(e) => set('total_value', e.target.value)}
                className={inputClass} />
            </div>
          </div>

          {/* Preço por litro (calculado) */}
          {pricePerLiter && (
            <div className="bg-accent/[0.07] border border-accent/20 rounded-[10px] px-3.5 py-2.5 flex justify-between items-center">
              <span className="text-rep-unknown text-[13px]">Preço por litro</span>
              <span className="text-accent font-bold text-[15px]">R$ {pricePerLiter}</span>
            </div>
          )}

          {/* KM */}
          <div>
            <label htmlFor="refuel-km" className={labelClass}>
              KM do veículo{' '}
              {form.vehicle_id ? (
                <span className="text-rep-suspect font-normal normal-case">(obrigatório)</span>
              ) : (
                <span className="text-slate-700 font-normal normal-case">(opcional)</span>
              )}
            </label>
            <input id="refuel-km" type="number" min="0" placeholder="85000" required={!!form.vehicle_id}
              value={form.km} onChange={(e) => set('km', e.target.value)}
              className={inputClass} />
            {kmWarning && (
              <p className="text-xs text-rep-suspect mt-1.5">
                ⚠️ KM menor que o do último abastecimento deste carro ({kmWarning.toLocaleString('pt-BR')} km).
                Confira se digitou certo.
              </p>
            )}
          </div>

          {/* Tanque cheio */}
          <label htmlFor="refuel-fulltank"
            className="flex items-start gap-3 bg-navy-950 border border-navy-600 rounded-[10px] px-3.5 py-3 cursor-pointer">
            <input id="refuel-fulltank" type="checkbox" checked={form.full_tank}
              onChange={(e) => set('full_tank', e.target.checked)}
              className="mt-0.5 accent-accent w-4 h-4" />
            <span>
              <span className="block text-sm font-medium text-slate-200">Completei o tanque</span>
              <span className="block text-xs text-slate-600 mt-0.5">
                Só abastecimentos de tanque cheio entram no cálculo de consumo (km/l).
              </span>
            </span>
          </label>

          {fullTankTip.show && (
            <OnboardingTip onDismiss={fullTankTip.dismiss}>
              Marque sempre que completar o tanque. Comparamos com o próximo
              abastecimento de tanque cheio (pode ser em outro posto) pra calcular
              o consumo médio (km/l) do seu carro.
            </OnboardingTip>
          )}

          {/* Observação */}
          <div>
            <label htmlFor="refuel-notes" className={labelClass}>
              Observação{' '}
              <span className="text-slate-700 font-normal normal-case">(opcional)</span>
            </label>
            <textarea id="refuel-notes" rows={2} maxLength={500} placeholder="Qualquer observação..."
              value={form.notes} onChange={(e) => set('notes', e.target.value)}
              className={`${inputClass} resize-none leading-normal`} />
          </div>
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : '⛽ Registrar abastecimento'}
        </Button>
      </form>
      )}
    </div>
  );
}

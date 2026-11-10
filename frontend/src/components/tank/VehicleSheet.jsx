import { useState } from 'react';
import api from '../../api/api';
import BottomSheet, { SheetButton, SheetDeleteAction } from '../BottomSheet';
import Icon from '../Icon';
import { FUEL_LABELS } from '../../constants/fuels';
import VehicleForm from './VehicleForm';

// Card de um carro: consumo + Ver abastecimentos / Definir padrão / Editar / Excluir.
export default function VehicleSheet({ vehicle, onClose, onUpdated, onDeleted, onSetDefault, onShowRefuels }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const name = `${vehicle.brand} ${vehicle.model}`;

  async function handleSave(payload) {
    const { data } = await api.put(`/vehicles/${vehicle.id}`, payload);
    onUpdated(data);
    setEditing(false);
  }

  async function handleDefault() {
    setBusy(true);
    setError('');
    try {
      await onSetDefault(vehicle.id);
    } catch {
      setError('Não foi possível definir o carro padrão.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError('');
    try {
      await api.delete(`/vehicles/${vehicle.id}`);
      onDeleted(vehicle.id);
      onClose();
    } catch {
      setError('Não foi possível remover o veículo.');
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={editing ? 'Editar carro' : name}
      subtitle={editing ? name : (
        <span className="flex items-center gap-2 flex-wrap">
          {vehicle.year}
          {vehicle.is_default && (
            <span className="text-xs font-semibold text-accent bg-accent/10 border border-accent/30 rounded-full px-2 py-0.5 flex items-center gap-1">
              <Icon name="estrela" size={11} />Padrão
            </span>
          )}
        </span>
      )}
    >
      {editing ? (
        <VehicleForm initial={vehicle} submitLabel="Salvar alterações" onSubmit={handleSave} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <div className="space-y-3">
            <div className="bg-navy-800 border border-navy-600 rounded-xl px-3.5 py-3">
              <p className="text-xs text-slate-500">Combustível padrão</p>
              <p className="text-sm font-semibold text-slate-100 mt-0.5">
                {vehicle.default_fuel_type ? FUEL_LABELS[vehicle.default_fuel_type] : 'Não definido'}
              </p>
            </div>
            <div className="bg-navy-800 border border-navy-600 rounded-xl px-3.5 py-3">
              <p className="text-xs text-slate-500 flex items-center gap-1.5"><Icon name="grafico" size={12} />Consumo médio</p>
              {vehicle.consumption?.length > 0 ? (
                <div className="mt-1 space-y-0.5">
                  {vehicle.consumption.map((c) => (
                    <p key={c.fuel_type} className="text-sm text-slate-100">
                      <span className="font-semibold">{c.avg_consumption} km/l</span>
                      <span className="text-slate-500"> · {FUEL_LABELS[c.fuel_type]}</span>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-0.5">
                  Ainda sem dados. Registre abastecimentos com KM e tanque cheio pra calcular.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3 mt-5">
            <SheetButton variant="primary" onClick={() => onShowRefuels(vehicle.id)}>
              Ver abastecimentos deste carro
            </SheetButton>
            {!vehicle.is_default && (
              <SheetButton onClick={handleDefault} disabled={busy}>
                <Icon name="estrela" size={14} />Definir como carro padrão
              </SheetButton>
            )}
            <SheetButton onClick={() => setEditing(true)}>Editar carro</SheetButton>
          </div>

          {error && <p className="text-sm text-rep-bad mt-4">{error}</p>}

          <SheetDeleteAction
            label="Excluir carro"
            confirmText={`Excluir ${name} (${vehicle.year})? Os abastecimentos dele continuam salvos, sem carro vinculado.`}
            confirming={confirming}
            setConfirming={setConfirming}
            onConfirm={handleDelete}
            busy={busy}
          />
        </>
      )}
    </BottomSheet>
  );
}

import { useState } from 'react';
import api from '../../api/api';
import BottomSheet, { SheetButton, SheetDeleteAction } from '../BottomSheet';
import { FUEL_LABELS } from '../../constants/fuels';
import RefuelForm from './RefuelForm';

function Info({ label, value, accent }) {
  return (
    <div className="bg-navy-800 border border-navy-600 rounded-xl px-3.5 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${accent ?? 'text-slate-100'}`}>{value}</p>
    </div>
  );
}

// Card de um abastecimento: detalhes + Editar / Ver posto / Excluir.
export default function RefuelSheet({ refuel, vehicles, onClose, onChanged, onOpenStation }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/refuels/${refuel.id}`);
      await onChanged();
      onClose();
    } catch {
      setError('Não foi possível excluir o abastecimento.');
      setDeleting(false);
    }
  }

  const date = new Date(refuel.refueled_at).toLocaleDateString('pt-BR');

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={editing ? 'Editar abastecimento' : refuel.station_name}
      subtitle={editing ? refuel.station_name : [refuel.station_brand, date].filter(Boolean).join(' · ')}
    >
      {editing ? (
        <RefuelForm
          refuel={refuel}
          vehicles={vehicles}
          onSaved={async () => { await onChanged(); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Info label="Valor total" value={`R$ ${parseFloat(refuel.total_value).toFixed(2)}`} accent="text-accent" />
            <Info label="Litros" value={`${parseFloat(refuel.liters).toFixed(2)} L`} />
            <Info label="Combustível" value={FUEL_LABELS[refuel.fuel_type]} />
            {refuel.price_per_liter && (
              <Info label="Preço por litro" value={`R$ ${parseFloat(refuel.price_per_liter).toFixed(3)}`} />
            )}
            <Info label="Veículo" value={refuel.vehicle_brand ? `${refuel.vehicle_brand} ${refuel.vehicle_model}` : 'Não informado'} />
            {refuel.km != null && <Info label="KM" value={Number(refuel.km).toLocaleString('pt-BR')} />}
            <Info label="Tanque" value={refuel.full_tank ? 'Completo' : 'Parcial'} />
          </div>
          {refuel.notes && (
            <p className="text-sm text-slate-400 mt-3 bg-navy-800 border border-navy-600 rounded-xl px-3.5 py-3 whitespace-pre-line">
              {refuel.notes}
            </p>
          )}

          <div className="space-y-3 mt-5">
            <SheetButton variant="primary" onClick={() => setEditing(true)}>Editar abastecimento</SheetButton>
            <SheetButton onClick={() => onOpenStation(refuel.station_id)}>Ver posto →</SheetButton>
          </div>

          {error && <p className="text-sm text-rep-bad mt-4">{error}</p>}

          <SheetDeleteAction
            label="Excluir abastecimento"
            confirmText="Excluir este abastecimento? Isso não pode ser desfeito."
            confirming={confirming}
            setConfirming={setConfirming}
            onConfirm={handleDelete}
            busy={deleting}
          />
        </>
      )}
    </BottomSheet>
  );
}

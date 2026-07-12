// Pares de abastecimento de tanque cheio consecutivos do mesmo veículo (LEAD()
// por vehicle_id, ordenado por data — em QUALQUER posto, não precisa ser o
// mesmo) com o consumo (km/l) já calculado por intervalo, excluindo intervalos
// com um parcial no meio. Extraída de stationsController::getVehicleStats pra
// não duplicar essa lógica (a parte propensa a erro) em cada agrupamento novo
// que precisar dela — quem usa escreve seu próprio SELECT/GROUP BY/HAVING em
// cima da CTE `measurements`.
const MEASUREMENTS_CTE = `
  WITH ordered AS (
    SELECT r.user_id, r.station_id, r.fuel_type, r.vehicle_id, r.km, r.liters,
           r.refueled_at, r.created_at,
           LEAD(r.km) OVER (PARTITION BY r.vehicle_id ORDER BY r.refueled_at, r.created_at) AS next_km,
           LEAD(r.liters) OVER (PARTITION BY r.vehicle_id ORDER BY r.refueled_at, r.created_at) AS next_liters,
           LEAD(r.refueled_at) OVER (PARTITION BY r.vehicle_id ORDER BY r.refueled_at, r.created_at) AS next_refueled_at,
           LEAD(r.created_at) OVER (PARTITION BY r.vehicle_id ORDER BY r.refueled_at, r.created_at) AS next_created_at
    FROM refuels r
    WHERE r.vehicle_id IS NOT NULL AND r.km IS NOT NULL AND r.full_tank = 1
  ),
  measurements AS (
    SELECT o.user_id, o.station_id, o.fuel_type, o.vehicle_id,
           (o.next_km - o.km) / o.next_liters AS consumption
    FROM ordered o
    WHERE o.next_km IS NOT NULL AND o.next_liters IS NOT NULL AND o.next_km > o.km
      AND NOT EXISTS (
        SELECT 1 FROM refuels p
        WHERE p.vehicle_id = o.vehicle_id AND p.full_tank = 0
          AND (p.refueled_at, p.created_at) > (o.refueled_at, o.created_at)
          AND (p.refueled_at, p.created_at) < (o.next_refueled_at, o.next_created_at)
      )
  )
`;

// Medições cruas por veículo (histórico do próprio dono) — sem exigir usuários
// diferentes, já é o histórico de uma pessoa só.
const MIN_MEASUREMENTS = 3;

// Média pública por posto — exige múltiplos usuários com o mesmo perfil de
// veículo, pra um hábito de uma pessoa só não definir a média do posto
// (mesmo espírito de MIN_REPORTS/MIN_STATION_FLAGS).
const MIN_DISTINCT_USERS = 3;

module.exports = { MEASUREMENTS_CTE, MIN_MEASUREMENTS, MIN_DISTINCT_USERS };

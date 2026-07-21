// Importa/resincroniza a base nacional de postos da ANP (API pública, sem
// autenticação: https://revendedoresapi.anp.gov.br/v1/combustivel) na tabela
// `stations`. Ver plano/CLAUDE.md pra contexto completo do algoritmo de dedup.
//
// Uso:
//   node scripts/import-anp-stations.js            # importa tudo (10 páginas)
//   node scripts/import-anp-stations.js --pages=1   # só a 1ª página, pra teste
//
// Idempotente: pode rodar de novo quantas vezes quiser, não duplica linha.
require('dotenv').config();
const db = require('../src/config/db');
const { haversineDistance } = require('../src/utils/distance');

const API_BASE = 'https://revendedoresapi.anp.gov.br/v1/combustivel';
const MATCH_RADIUS_KM = 0.1; // mesmo raio do aviso de duplicata em AddStation.jsx
const PAGE_DELAY_MS = 400;
const BATCH_SIZE = 1000;
const MAX_RETRIES = 3;

const pagesArg = process.argv.find((a) => a.startsWith('--pages='));
const maxPages = pagesArg ? parseInt(pagesArg.split('=')[1]) : null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(numeroPagina) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${API_BASE}?numeroPagina=${numeroPagina}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.succeeded) throw new Error(`API retornou succeeded=false: ${json.title}`);
      return json;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) await sleep(1000 * 2 ** (attempt - 1));
    }
  }
  throw new Error(`Falha ao buscar página ${numeroPagina} após ${MAX_RETRIES} tentativas: ${lastErr.message}`);
}

function formatAddress(row) {
  const parts = [
    row.endereco?.trim(),
    row.complemento?.trim(),
  ].filter(Boolean).join(', ');
  const line2 = [row.bairro?.trim(), row.municipio?.trim()].filter(Boolean).join(', ');
  const full = [parts, line2 && `${line2} - ${row.uf ?? ''}`, row.cep?.trim()].filter(Boolean).join(' - ');
  return full.slice(0, 255);
}

// Normaliza uma linha da ANP pro formato que a gente grava — retorna null
// (e loga o motivo) quando a linha não tem o mínimo necessário pra existir
// como posto no nosso banco.
function parseRow(row, skipped) {
  const lat = parseFloat(row.latitude);
  const lng = parseFloat(row.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    skipped.no_coords++;
    return null;
  }
  const cnpj = (row.cnpj ?? '').replace(/\D/g, '').slice(0, 14) || null;
  return {
    codigo_simp: String(row.codigoSIMP),
    name: (row.razaoSocial ?? '').trim().slice(0, 150) || 'Posto sem nome (ANP)',
    brand: (row.distribuidora ?? '').trim().slice(0, 100) || null,
    address: formatAddress(row),
    latitude: lat,
    longitude: lng,
    cnpj,
    compliance_flag: Array.isArray(row.inadimplenciaPMQC) && row.inadimplenciaPMQC.length > 0 ? 1 : 0,
  };
}

async function loadUserStations() {
  const [unlinked] = await db.query(
    `SELECT id, latitude, longitude FROM stations WHERE source = 'user' AND anp_codigo_simp IS NULL`
  );
  const [linked] = await db.query(
    `SELECT id, anp_codigo_simp FROM stations WHERE source = 'user' AND anp_codigo_simp IS NOT NULL`
  );
  const linkedByCodigo = new Map(linked.map((r) => [r.anp_codigo_simp, r.id]));
  return { candidates: unlinked.map((r) => ({ ...r, latitude: parseFloat(r.latitude), longitude: parseFloat(r.longitude) })), linkedByCodigo };
}

// Acha o candidato mais próximo dentro do raio; avisa (sem travar) se mais
// de um candidato cai dentro do raio, já que aí a escolha é arbitrária.
function findSpatialMatch(row, candidates) {
  let best = null;
  let matchCount = 0;
  for (const c of candidates) {
    const dist = haversineDistance(row.latitude, row.longitude, c.latitude, c.longitude);
    if (dist <= MATCH_RADIUS_KM) {
      matchCount++;
      if (!best || dist < best.dist) best = { id: c.id, dist };
    }
  }
  if (matchCount > 1) {
    console.warn(`  aviso: ${matchCount} postos de usuário a <${MATCH_RADIUS_KM * 1000}m do posto ANP ${row.codigo_simp} — usando o mais próximo`);
  }
  return best;
}

async function main() {
  console.log('Buscando página 1 pra descobrir o total...');
  const first = await fetchPage(1);
  const totalPaginas = maxPages ?? first.searchPageFilter.totalPagina;
  console.log(`Total de páginas: ${first.searchPageFilter.totalPagina} (${first.searchPageFilter.totalRegistro} registros). Rodando ${totalPaginas}.`);

  const { candidates, linkedByCodigo } = await loadUserStations();
  console.log(`Postos de usuário: ${candidates.length} ainda sem vínculo ANP, ${linkedByCodigo.size} já vinculados de rodada anterior.`);

  const skipped = { no_coords: 0 };
  let fastPathCount = 0;
  let spatialMatchCount = 0;
  const upsertBatch = [];
  let upsertAffectedTotal = 0;
  let rowsParsed = 0;

  async function flushUpsertBatch() {
    if (upsertBatch.length === 0) return;
    const values = upsertBatch.map((r) => [
      r.name, r.brand, r.address, r.latitude, r.longitude,
      null, 'anp', r.cnpj, r.codigo_simp, r.compliance_flag, new Date(),
    ]);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        `INSERT INTO stations
           (name, brand, address, latitude, longitude, created_by, source, cnpj, anp_codigo_simp, anp_compliance_flag, anp_synced_at)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           name = VALUES(name), brand = VALUES(brand), address = VALUES(address),
           latitude = VALUES(latitude), longitude = VALUES(longitude),
           cnpj = VALUES(cnpj), anp_compliance_flag = VALUES(anp_compliance_flag),
           anp_synced_at = VALUES(anp_synced_at)`,
        [values]
      );
      await conn.commit();
      upsertAffectedTotal += result.affectedRows;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    upsertBatch.length = 0;
  }

  async function processRow(rawRow) {
    const row = parseRow(rawRow, skipped);
    if (!row) return;
    rowsParsed++;

    if (linkedByCodigo.has(row.codigo_simp)) {
      const stationId = linkedByCodigo.get(row.codigo_simp);
      await db.query(
        `UPDATE stations SET cnpj = ?, anp_compliance_flag = ?, anp_synced_at = NOW() WHERE id = ?`,
        [row.cnpj, row.compliance_flag, stationId]
      );
      fastPathCount++;
      return;
    }

    const match = findSpatialMatch(row, candidates);
    if (match) {
      await db.query(
        `UPDATE stations SET cnpj = ?, anp_codigo_simp = ?, anp_compliance_flag = ?, anp_synced_at = NOW() WHERE id = ?`,
        [row.cnpj, row.codigo_simp, row.compliance_flag, match.id]
      );
      const idx = candidates.findIndex((c) => c.id === match.id);
      if (idx !== -1) candidates.splice(idx, 1);
      spatialMatchCount++;
      return;
    }

    upsertBatch.push(row);
    if (upsertBatch.length >= BATCH_SIZE) await flushUpsertBatch();
  }

  for (let pagina = 1; pagina <= totalPaginas; pagina++) {
    const json = pagina === 1 ? first : await fetchPage(pagina);
    console.log(`Página ${pagina}/${totalPaginas}: ${json.data.length} registros.`);
    for (const rawRow of json.data) {
      await processRow(rawRow);
    }
    if (pagina < totalPaginas) await sleep(PAGE_DELAY_MS);
  }

  await flushUpsertBatch();

  console.log('--- Resumo ---');
  console.log(`Linhas processadas: ${rowsParsed}`);
  console.log(`Puladas (sem coordenada): ${skipped.no_coords}`);
  console.log(`Fast-path (já vinculadas): ${fastPathCount}`);
  console.log(`Match espacial novo (posto de usuário atualizado): ${spatialMatchCount}`);
  console.log(`Upsert ANP (criadas/atualizadas, affectedRows agregado ~${upsertAffectedTotal}): ${rowsParsed - fastPathCount - spatialMatchCount}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('ERRO FATAL:', err.message);
  process.exit(1);
});

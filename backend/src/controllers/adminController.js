const db = require('../config/db');
const { MIN_STATION_FLAGS } = require('../services/stationStatusService');

// Mesmo mínimo do reputationService (não exportado de lá) — um posto só ganha
// reputação com 3+ avaliações.
const MIN_REPORTS = 3;

const GROWTH_DAYS = 30;

// Preenche os dias sem registro com zero. Sem isso o gráfico "pula" os dias
// parados, dando impressão de crescimento contínuo onde não houve.
function toDailySeries(rows, days = GROWTH_DAYS) {
  const byDay = new Map(rows.map((r) => [r.dia instanceof Date ? r.dia.toISOString().slice(0, 10) : String(r.dia), Number(r.total)]));
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push({ dia: key, total: byDay.get(key) ?? 0 });
  }
  return series;
}

// Série diária dos últimos GROWTH_DAYS pra uma tabela qualquer que tenha
// created_at. `table` NUNCA vem do usuário — é literal do código, então
// interpolar aqui é seguro (não dá pra parametrizar nome de tabela com ?).
async function dailyCounts(table, where = '') {
  const [rows] = await db.query(
    `SELECT DATE(created_at) AS dia, COUNT(*) AS total
     FROM ${table}
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) ${where}
     GROUP BY DATE(created_at)`,
    [GROWTH_DAYS]
  );
  return toDailySeries(rows);
}

// ATENÇÃO: nenhuma consulta aqui pode devolver `cpf`. É dado sensível que o
// app inteiro foi feito pra nunca exibir — nem pro próprio dono da conta.
async function getMetrics(req, res, next) {
  try {
    const [
      [[usuarios]], [[veiculos]], [[postosAnp]], [[postosUsuario]],
      [[abastecimentos]], [[avaliacoesCombustivel]], [[avaliacoesAtendimento]], [[favoritos]],
      [[emailConfirmado]], [[usuariosQueAbasteceram]],
      [[postosComReputacao]], [[postosSinalizados]],
    ] = await Promise.all([
      db.query('SELECT COUNT(*) AS n FROM users'),
      db.query('SELECT COUNT(*) AS n FROM vehicles'),
      db.query("SELECT COUNT(*) AS n FROM stations WHERE source = 'anp'"),
      db.query("SELECT COUNT(*) AS n FROM stations WHERE source = 'user'"),
      db.query('SELECT COUNT(*) AS n FROM refuels'),
      db.query('SELECT COUNT(*) AS n FROM reports'),
      db.query('SELECT COUNT(*) AS n FROM service_reviews'),
      db.query('SELECT COUNT(*) AS n FROM favorites'),
      db.query('SELECT COUNT(*) AS n FROM users WHERE email_verified_at IS NOT NULL'),
      db.query('SELECT COUNT(DISTINCT user_id) AS n FROM refuels'),
      db.query(
        `SELECT COUNT(*) AS n FROM (
           SELECT station_id FROM reports GROUP BY station_id HAVING COUNT(*) >= ?
         ) x`,
        [MIN_REPORTS]
      ),
      db.query(
        `SELECT COUNT(*) AS n FROM (
           SELECT station_id FROM station_flags GROUP BY station_id HAVING COUNT(*) >= ?
         ) x`,
        [MIN_STATION_FLAGS]
      ),
    ]);

    const [crescUsuarios, crescAbastecimentos, crescAvaliacoes, crescPostos] = await Promise.all([
      dailyCounts('users'),
      dailyCounts('refuels'),
      dailyCounts('reports'),
      dailyCounts('stations', "AND source = 'user'"),
    ]);

    const [
      [ultimosAbastecimentos], [ultimasAvaliacoes], [ultimosPostos], [ultimosUsuarios],
    ] = await Promise.all([
      db.query(
        `SELECT r.id, r.liters, r.total_value, r.fuel_type, r.created_at,
                u.name AS usuario, s.name AS posto
         FROM refuels r
         JOIN users u ON u.id = r.user_id
         JOIN stations s ON s.id = r.station_id
         ORDER BY r.created_at DESC LIMIT 10`
      ),
      db.query(
        `SELECT rep.id, rep.type, rep.fuel_type, rep.created_at,
                u.name AS usuario, s.name AS posto
         FROM reports rep
         JOIN users u ON u.id = rep.user_id
         JOIN stations s ON s.id = rep.station_id
         ORDER BY rep.created_at DESC LIMIT 10`
      ),
      db.query(
        `SELECT s.id, s.name, s.brand, s.created_at, u.name AS usuario
         FROM stations s
         LEFT JOIN users u ON u.id = s.created_by
         WHERE s.source = 'user'
         ORDER BY s.created_at DESC LIMIT 10`
      ),
      db.query(
        `SELECT id, name, email, email_verified_at, created_at
         FROM users ORDER BY created_at DESC LIMIT 10`
      ),
    ]);

    res.json({
      totais: {
        usuarios: usuarios.n,
        veiculos: veiculos.n,
        postos_anp: postosAnp.n,
        postos_usuario: postosUsuario.n,
        postos_total: postosAnp.n + postosUsuario.n,
        abastecimentos: abastecimentos.n,
        avaliacoes_combustivel: avaliacoesCombustivel.n,
        avaliacoes_atendimento: avaliacoesAtendimento.n,
        favoritos: favoritos.n,
      },
      engajamento: {
        email_confirmado: emailConfirmado.n,
        usuarios_que_abasteceram: usuariosQueAbasteceram.n,
        postos_com_reputacao: postosComReputacao.n,
        postos_sinalizados: postosSinalizados.n,
        min_reports: MIN_REPORTS,
        min_flags: MIN_STATION_FLAGS,
      },
      crescimento: {
        dias: GROWTH_DAYS,
        usuarios: crescUsuarios,
        abastecimentos: crescAbastecimentos,
        avaliacoes: crescAvaliacoes,
        postos: crescPostos,
      },
      recentes: {
        abastecimentos: ultimosAbastecimentos,
        avaliacoes: ultimasAvaliacoes,
        postos: ultimosPostos,
        usuarios: ultimosUsuarios,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMetrics };

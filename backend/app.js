require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const errorHandler = require('./src/middlewares/errorHandler');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Só confia em X-Forwarded-For vindo do próprio localhost — necessário pro rate
// limit (authRateLimit) enxergar o IP real do cliente quando o tailscale serve
// estiver ativo (proxy local); não abre brecha de spoofing porque só localhost
// é confiado.
app.set('trust proxy', 'loopback');

// Em produção o Express serve o frontend (mesma origem) — CORS só é útil em dev,
// para testes diretos contra a porta 3000.
if (!isProduction) app.use(cors());
app.use(express.json());

// API canônica sob /api (o proxy do Vite encaminha /api sem reescrever)
const apiRouter = express.Router();
apiRouter.use('/auth',      require('./src/routes/auth'));
apiRouter.use('/stations',  require('./src/routes/stations'));
apiRouter.use('/reports',   require('./src/routes/reports'));
apiRouter.use('/favorites', require('./src/routes/favorites'));
apiRouter.use('/refuels',   require('./src/routes/refuels'));
apiRouter.use('/vehicles',  require('./src/routes/vehicles'));
apiRouter.use('/service-reviews', require('./src/routes/serviceReviews'));
apiRouter.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', apiRouter);
// Rota de API desconhecida responde JSON — precisa vir antes do fallback SPA
app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

// Produção: serve o build do frontend + fallback SPA
// (Express 5: usar '/*splat' — 'app.get("*")' quebra na inicialização)
if (isProduction) {
  const dist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(dist));
  app.get('/*splat', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST; // ex: 127.0.0.1 em produção atrás do tailscale serve
app.listen(PORT, HOST, () => console.log(`TanqueCerto API rodando na porta ${PORT}`));

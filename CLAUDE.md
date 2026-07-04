# TanqueCerto — Contexto do Projeto

## O que é

Plataforma colaborativa estilo "Waze dos postos de combustível". Motoristas avaliam postos e um sistema de reputação calcula se o posto é confiável, suspeito ou problemático.

## Stack

| Camada   | Tech                                           |
|----------|------------------------------------------------|
| Backend  | Node.js + Express + MySQL + JWT + bcryptjs     |
| Frontend | React + Vite + Tailwind CSS v4 + Leaflet       |
| Banco    | MySQL 8.4 — schema em `backend/database.sql`   |

## Estrutura de pastas

```
/backend
  app.js                        ← entrada do servidor (porta 3000)
  .env                          ← credenciais (não versionar)
  database.sql                  ← script de criação do banco
  src/
    config/db.js                ← pool MySQL
    controllers/                ← authController, stationsController, reportsController
    services/reputationService  ← lógica good/suspect/bad/unknown
    middlewares/                ← auth (JWT), errorHandler
    routes/                     ← auth, stations, reports
    utils/distance.js           ← fórmula Haversine

/frontend
  src/
    api/api.js                  ← axios com interceptor JWT, proxy /api → localhost:3000
    contexts/AuthContext.jsx    ← user, login(), logout()
    components/
      Header.jsx
      StationCard.jsx
      ReputationBadge.jsx
    pages/
      Home.jsx                  ← mapa Leaflet + lista de postos próximos
      StationDetails.jsx        ← detalhes + stats + avaliações
      AddReport.jsx             ← formulário de avaliação
      AddStation.jsx            ← cadastro com clique no mapa
      Login.jsx / Register.jsx
      Profile.jsx               ← histórico do usuário
```

## Como rodar

### Pré-requisitos
- Node.js instalado
- MySQL 8.4 instalado e rodando

### Primeira vez num PC novo
```bash
# 1. Criar o banco
# Abra o MySQL e rode: backend/database.sql

# 2. Configurar credenciais
# Copie backend/.env.example para backend/.env e preencha:
#   DB_PASSWORD=sua_senha_mysql
#   JWT_SECRET=qualquer_string_longa_aleatoria

# 3. Instalar dependências
cd backend && npm install
cd ../frontend && npm install
```

### Rodar o projeto
```bash
# Terminal 1 — backend (porta 3000)
cd backend
npm run dev

# Terminal 2 — frontend (porta 5173)
cd frontend
npm run dev
```

Acesse: http://localhost:5173

## Sistema de reputação

| Tipo de relato | Pontos |
|----------------|--------|
| Positivo       | +2     |
| Suspeito       | -1     |
| Negativo       | -2     |

| Score    | Reputação | Cor      |
|----------|-----------|----------|
| ≥ 5      | good      | Verde    |
| 1 a 4    | suspect   | Laranja  |
| ≤ 0      | bad       | Vermelho |
| < 3 relatos | unknown | Cinza  |

## API — endpoints principais

Todas as rotas vivem sob o prefixo `/api` (igual em dev e produção):

```
POST /api/auth/register          Cadastro
POST /api/auth/login             Login → retorna JWT
GET  /api/auth/me                Usuário logado

GET  /api/stations               Lista paginada
POST /api/stations               Cadastrar posto (auth)
GET  /api/stations/near          Buscar por GPS (?lat=&lng=&radius=)
GET  /api/stations/:id           Detalhes
GET  /api/stations/:id/stats     Estatísticas de reputação
GET  /api/stations/:id/reports   Avaliações paginadas

POST /api/reports                Criar avaliação (auth, 1/dia/posto)
GET  /api/reports/mine           Minhas avaliações (auth)

GET  /api/health                 Healthcheck
```

## Visual

- Tema dark navy (`#060d1f`) + dourado (`#f59e0b`)
- Tokens de cor definidos em `frontend/src/index.css` (`@theme`: navy-950/900/800/750/600, accent, rep-*)
- Cores de reputação em JS: `frontend/src/constants/reputation.js` (manter em sincronia com o @theme)
- Fontes: Space Grotesk (títulos) + Inter (corpo)
- Mapa: CartoDB Dark Matter (dark tile gratuito)
- Marcadores coloridos por reputação no mapa
- Ponto dourado = posição do usuário

## Status atual

- [x] Backend completo (auth, postos, relatos, reputação)
- [x] Frontend completo (todas as telas)
- [x] Visual dark navy + dourado aplicado
- [x] Fix: posição GPS cacheada no localStorage (postos recarregam ao voltar ao mapa)
- [x] Refactor de robustez: interceptor 401 + logout automático, ProtectedRoute,
      erros de rede visíveis (ErrorMessage + retry), GPS negado tratado, rota 404,
      tokens Tailwind, componentes compartilhados (AuthLayout, SuccessOverlay)
- [x] Produção: API sob `/api`, Express serve `frontend/dist` (NODE_ENV=production)
- [x] Guia de deploy Linux + MariaDB + Tailscale HTTPS: ver `DEPLOY.md`

## Deploy

Ver `DEPLOY.md` — servidor Linux nativo (systemd), MariaDB, HTTPS via
`tailscale serve` (obrigatório para o GPS funcionar no celular).
O banco chama-se `tanquecerto` (antes era `tanquecerto_teste`).

## Próximas features planejadas (roadmap)

- Busca por nome de posto
- Filtro por tipo de combustível no mapa
- Notificações quando próximo de posto suspeito
- Upload de fotos
- Gamificação (pontos por avaliação)
- App mobile (React Native)
- IA para detectar padrões de fraude

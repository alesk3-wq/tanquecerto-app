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

**Só avalia quem abasteceu** (evita falso positivo): `POST /api/reports` exige um
abastecimento do usuário naquele posto **sem avaliação criada depois dele** (mesma
condição do lembrete pendente — `NOT EXISTS report com created_at >= refuel.refueled_at`).
Avaliou → o refuel deixa de ser elegível, só libera abastecendo de novo; 2 abastecimentos
sem avaliar contam como 1 avaliação. Inelegível → 403. O caminho na UI é abastecer →
"Avaliar agora" (ou o lembrete de 2 dias); não há mais botão "Avaliar" solto nos detalhes.
Limite adicional de 1 avaliação/posto/dia (429) mantido.
O **combustível da avaliação é autoritativo do servidor**: vem do abastecimento elegível
mais recente (`GET /api/stations/:id/reviewable-refuel`), não do cliente — a tela de
avaliação só exibe posto/bandeira/data/combustível em leitura, sem seletor.

**Abastecer só no posto**: `AddRefuel.jsx` pede a posição do usuário e só mostra o
formulário se o GPS estiver a ≤ 200m do posto (`REFUEL_CHECK_RADIUS_KM`, haversine em
`frontend/src/lib/distance.js`). Fora do raio / GPS negado → bloqueio com "Tentar
novamente". Enforcement é **só frontend** por enquanto (GPS é client-asserted; validar no
servidor é reforço futuro no roadmap).

**Cooldown anti-fraude**: `POST /api/refuels` recusa (429) se o mesmo usuário já
registrou um abastecimento naquele posto nas últimas **3h** (`MIN_HOURS_BETWEEN_REFUELS`
em `refuelsController`, ancorado em `created_at`). É por posto — abastecer em outro posto
no período segue liberado.

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

POST /api/refuels                 Registrar abastecimento (auth, vehicle_id opcional)
GET  /api/refuels/mine            Meus abastecimentos, paginado (auth)
GET  /api/refuels/pending-review  Abastecimento pendente de avaliação, se houver (auth)

POST   /api/vehicles              Cadastrar veículo: brand/model/year (auth)
GET    /api/vehicles/mine         Meus veículos (auth)
DELETE /api/vehicles/:id          Remover veículo (auth, só o dono)

GET  /api/stations/:id/vehicle-stats  Consumo médio (km/l) por veículo neste posto
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
- [x] Prompt "Você está abastecendo?" ao abrir a Home (logado, toda vez): localiza o
      usuário, acha posto cadastrado por perto (`useRefuelPrompt.js` +
      `RefuelCheckPrompt.jsx`) e leva direto pro abastecimento; se não achar, oferece
      cadastrar o posto com endereço preenchido via reverse geocoding Nominatim
      (`lib/geocode.js`, sem API key).
- [x] Fluxo invertido: cadastrar posto / concluir abastecimento leva para o
      abastecimento e só depois para a avaliação (nunca mais direto pra avaliação).
      Avaliação tem opção "aguardar para testar o combustível" (não envia nada) e
      vem com o tipo de combustível pré-preenchido quando chega de um abastecimento.
- [x] Lembrete de avaliação pendente: `GET /api/refuels/pending-review` (sem tabela
      nova — deriva comparando `refuels` sem `reports` correspondente) alimenta um
      prompt "Avaliar {posto}" (`usePendingReviewPrompt.js` + `PendingReviewPrompt.jsx`)
      que aparece depois do prompt de abastecimento, no máximo 1x/dia (localStorage),
      numa janela de 2 a 9 dias após o abastecimento (depois disso expira sozinho).
- [x] Removido o campo de texto livre da avaliação (frontend apenas — coluna
      `reports.description` continua existindo no banco, só não é mais usada).
- [x] Botão neon (`Button.jsx` variant `neon`, verde `rep-good` com glow) + fundo
      `--color-void` (preto puro) para os prompts de tela cheia, estilo Uber.
- [x] Bug corrigido: validação de `notes` em `POST /refuels` rejeitava `null`
      explicitamente (faltava `{ nullable: true }`), travando qualquer abastecimento
      sem observação — já estava assim antes desta sessão, não relacionado às
      mudanças acima.

- [x] PWA instalável: `frontend/public/manifest.json` + ícones (192/512,
      `⛽` sobre navy-950) + service worker mínimo sem cache
      (`frontend/public/sw.js`, registrado em `main.jsx`). Nova tela
      `/instalar` (`Install.jsx`, usa `AuthLayout`) detecta Android
      (botão nativo via `beforeinstallprompt`, fallback manual em 4s se
      não disparar), iOS (passo a passo Safari, sem prompt nativo),
      já-instalado (`display-mode: standalone`) e desktop. Link no rodapé
      do Login.
- [x] Cadastro de veículos (marca/modelo/ano, texto livre) — tabela `vehicles`,
      CRUD completo (`POST`/`GET mine`/`PUT :id`/`DELETE :id` em `/api/vehicles`),
      aba "Meus Carros" em `Profile.jsx` (adicionar/editar ✎/remover ✕).
      Abastecimento (`AddRefuel.jsx`) pré-seleciona o carro cadastrado mais
      recentemente (dropdown pra trocar se tiver mais de um), com cadastro
      rápido inline se o usuário não tiver nenhum ainda, e link "Gerenciar
      veículos" direto pra aba certa do Perfil.
- [x] Consumo médio por posto (km/l): quando um veículo é selecionado no
      abastecimento, o KM do odômetro vira **obrigatório** (antes era opcional).
      `GET /api/stations/:id/vehicle-stats` calcula a distância entre dois
      abastecimentos consecutivos do mesmo veículo (janela `LEAD()`, MySQL 8+) e
      atribui o km/l ao posto/combustível do abastecimento mais antigo do par.
      Só mostra a média com **mínimo de 3 medições** por marca/modelo/ano/combustível
      (mesmo critério do `MIN_REPORTS` da reputação). Exibido em `StationDetails.jsx`
      na seção "Consumo médio por veículo", **lado a lado** com a avaliação por
      texto (Positivo/Suspeito/Negativo) — não substitui, é aditivo.
- [x] **Fix importante de CSS**: `index.css` tinha um reset (`* { margin:0;
      padding:0 }`) fora de qualquer `@layer`. No Tailwind v4, CSS fora de layer
      sempre vence sobre CSS em layer (as utilities do Tailwind vivem em
      `@layer utilities`) — isso zerava `mb-8`, `p-4`, `space-y-*` etc **no app
      inteiro**, não só num lugar. Era a causa real do "formulário
      espremido/encostado no canto". Corrigido envolvendo o reset em
      `@layer base`. **Ao adicionar CSS solto em `index.css` no futuro, sempre
      colocar dentro de `@layer base` (ou `components`) — nunca fora —, senão
      ele volta a atropelar qualquer utility do Tailwind.**
- [x] Fix: linha de veículo em "Meus Carros" estourava a tela (misturava
      `cardClass` com `block` embutido + `flex` no mesmo elemento — os dois
      brigando pelo `display`). Agora usa um card dedicado sem esse conflito,
      e a barra de abas do Perfil rola horizontalmente sozinha
      (`overflow-x-auto` + `flex-shrink-0`) em vez de arrastar a página
      inteira quando não cabem as 4 abas numa tela estreita.
- [x] Preço médio calculado dos abastecimentos: `GET /api/stations/:id/prices`
      mescla o preço manual (`fuel_prices`, "última informação vence" — quem
      informa por último sobrescreve, sem histórico) com uma média de
      `total_value/liters` dos abastecimentos reais dos **últimos 15 dias**
      (janela pra não pegar preço desatualizado). Mostrado lado a lado em
      `StationDetails.jsx`: preço manual em destaque + "méd. abastec." embaixo
      quando os dois existem; se só houver média calculada (sem preço manual
      informado ainda), ela vira o valor principal com o nº de abastecimentos.
      Aditivo — não tira o "+ Informar" manual, só soma um sinal mais difícil
      de forjar (exige abastecimento de verdade registrado no app).

- [x] Flag "tanque cheio" (`refuels.full_tank`, default 1, migração aplicada):
      o km/l só usa pares de abastecimentos de tanque cheio **sem parcial entre
      eles** (`NOT EXISTS` com comparação de tuplas em `getVehicleStats`) — um
      parcial no meio invalidava a conta. Checkbox "Completei o tanque"
      (marcado por padrão) em `AddRefuel.jsx`. Preço médio e lembrete de
      avaliação continuam contando parciais.
- [x] Aviso (não bloqueante) de KM menor que o do último abastecimento do
      carro — `GET /vehicles/mine` agora retorna `last_km` por veículo.
- [x] Busca por nome/bandeira na Home (filtro client-side, lista + marcadores)
      e preço da gasolina no card (`gas_price` no `/stations/near`: manual tem
      prioridade, senão média 15 dias; duas queries agrupadas, não por posto).
- [x] Fix z-index: controles do Leaflet (zoom/atribuição, z 1000) vazavam por cima
      dos overlays de tela cheia (`FullScreenPrompt`/`SuccessOverlay`, subidos p/ 1100).
- [x] Avaliação só após abastecimento + combustível autoritativo do servidor, e
      abastecer só estando no posto (GPS ≤ 200m) — ver seção "Sistema de reputação".
- [x] Cooldown anti-fraude de 3h entre abastecimentos do mesmo usuário no mesmo posto
      (429 em `POST /api/refuels`) — ver seção "Sistema de reputação".

**Estado em 2026-07-07: tudo commitado (até `94a63a3`), pushado pro GitHub e buildado
em produção (backend reiniciado). Nenhuma tarefa pendente desta rodada.** Próximo
passo combinado com o usuário: continuar melhorando visualmente as telas de
cadastro/formulário aos poucos (ele vai apontando ajustes conforme usa — não é pra
fazer uma repaginada grande de uma vez).

**Nota operacional:** o usuário disse que pode parar/reiniciar o `tanquecerto.service`
direto pra testar, sem precisar montar instância isolada em `127.0.0.1` toda vez —
só tomar cuidado pra não deixar frontend e backend fora de sincronia (rodar
`npm run build` já publica o dist ao vivo, então terminar as duas pontas antes de
buildar).

## Deploy

Ver `DEPLOY.md` — servidor Linux nativo (systemd), MariaDB, HTTPS via
`tailscale serve` (obrigatório para o GPS funcionar no celular).
O banco chama-se `tanquecerto` (antes era `tanquecerto_teste`).

## Próximas features planejadas (roadmap)

- **Tutorial de onboarding** (combinado com o usuário): cards de primeira visita
  por tela ("coach marks"), ensinando principalmente a regra da média de consumo —
  completar o tanque no mesmo posto pelo menos 2–3 vezes pro km/l aparecer.
  A base técnica já existe (flag `full_tank` + mínimo de 3 medições).
- **Backup automático do banco** (recomendado, ainda não feito): mysqldump diário
  via cron com rotação — hoje não existe backup nenhum e há usuários reais.
- **Rate limiting** no login/registro (recomendado, ainda não feito): sem proteção
  contra força bruta hoje.
- **Validação server-side de presença no abastecimento** (reforço futuro): hoje o gate
  de "estar no posto" (GPS ≤ 200m) é só no frontend. O POST /refuels poderia receber a
  coordenada e recusar se longe do posto — ainda burlável via GPS falso, mas camada extra.
- Fix do N+1 em `/stations/near` (uma query de reports por posto; os preços já
  foram feitos agrupados, falta a reputação).
- Filtro por tipo de combustível no mapa
- Notificações quando próximo de posto suspeito
- Upload de fotos
- Gamificação (pontos por avaliação)
- App mobile (React Native)
- IA para detectar padrões de fraude

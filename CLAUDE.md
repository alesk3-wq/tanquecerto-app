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
condição do lembrete pendente — `NOT EXISTS report com created_at >= refuel.created_at`,
compara com o instante do registro do abastecimento, não com a data escolhida pelo
usuário — ver bug corrigido no changelog, comparar com `refueled_at` fazia dois ciclos
abastecer→avaliar no mesmo dia se atropelarem).
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
novamente". `POST /refuels` também valida **no servidor**: exige `latitude`/`longitude`
no body e refaz a mesma conta (`haversineDistance`, `backend/src/utils/distance.js`)
contra as coordenadas reais do posto no banco, recusando (403) se longe — fecha a
brecha de pular o frontend e bater direto na API (GPS falso via navegador continua
possível, é limite de qualquer app web).

**Cooldown anti-fraude**: `POST /api/refuels` recusa (429) se o mesmo usuário já
registrou um abastecimento naquele posto nas últimas **3h** (`MIN_HOURS_BETWEEN_REFUELS`
em `refuelsController`, ancorado em `created_at`). É por posto — abastecer em outro posto
no período segue liberado. `GET /api/stations/:id/refuel-cooldown` checa a mesma regra
**antes** de `AddRefuel.jsx` pedir GPS ou mostrar o formulário — bloqueado, mostra direto
"você já abasteceu aqui recentemente, disponível às HH:MM", sem deixar preencher nada
à toa (antes só descobria no submit, com erro fora da tela — ver changelog).

**Sintomas de combustível (tags), sem texto livre**: o campo de comentário livre foi
removido antes por risco de acusação infundada sem embasamento (coluna
`reports.description` segue no banco, sem uso). No lugar, `POST /api/reports` aceita
`tags` opcional — só válido quando `type` é suspect/bad, vocabulário fechado de 7
sintomas (`engasgo`, `cheiro_cor`, `consumo_pior`, `luz_acesa`, `bomba_suspeita`,
`motor_irregular`, `preco_divergente` — ver `frontend/src/constants/reportTags.js`,
espelhado no `ENUM` de `report_tags.tag`); valores fora da lista ou tags mandadas com
`type=good` são descartados silenciosamente, sem erro. `GET
/api/stations/:id/problem-tags` devolve um resumo agregado por posto, mas só sintomas
com **2+ menções** (com 1 só, o "agregado" reexporia o sintoma daquele relato
específico — contrariaria a decisão de nunca marcar avaliação individual). Exibido em
`StationDetails.jsx` como card "⚠️ Problemas mais citados", só quando a lista vier
não-vazia. Não entra no score de reputação — `reputationService` continua olhando só
`type` (good/suspect/bad), tags são camada informativa à parte.

## Status de existência do posto (station_status)

Qualquer usuário pode cadastrar um posto só com nome e lat/lng — sem dedupe nem
moderação. Pra postos que não existem de verdade (pin errado, trote, posto fechado),
em vez de apagar por tempo sem abastecimento (arriscado: refuels/reports têm ON
DELETE CASCADE em station_id, e ausência de abastecimento não prova que o posto não
existe), o status é **computado na leitura** (stationStatusService.js, sem coluna
nova em stations, sem cron):

```
flagged      flag_count >= MIN_STATION_FLAGS (3)
unconfirmed  senão, se idade >= GRACE_PERIOD_DAYS (14) e nunca teve refuel
active       caso contrário
```

- unconfirmed: só um badge informativo (StationStatusBadge), nunca oculta nada —
  mesmo espírito do bucket unknown da reputação.
- flagged: quórum de POST /api/stations/:id/flag (toggle, tabela station_flags,
  auth) — usuário sinaliza "não encontrei esse posto aqui". Some por padrão de GET
  /api/stations e /api/stations/near, mas nunca é apagado: continua acessível via
  GET /api/stations/:id (link direto), e sai do quórum sozinho se as sinalizações
  forem desmarcadas. O botão de sinalizar em StationDetails.jsx só aparece pra quem
  está dentro do raio de GPS do abastecimento (REFUEL_CHECK_RADIUS_KM), e o
  abastecimento continua liberado normalmente num posto flagged (um abastecimento
  real ali é contraevidência).

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

POST /api/reports                Criar avaliação (auth, 1/dia/posto; tags opcional em suspect/bad)
GET  /api/reports/mine           Minhas avaliações (auth)

GET  /api/stations/:id/problem-tags  Sintomas de combustível mais citados (agregado, 2+ menções)
POST /api/stations/:id/flag      Sinalizar/desmarcar "este posto não existe" (auth)

GET  /api/health                 Healthcheck

POST /api/refuels                 Registrar abastecimento (auth, vehicle_id opcional,
                                   latitude/longitude obrigatórios)
GET  /api/refuels/mine            Meus abastecimentos, paginado (auth, ?vehicle_id= filtra)
GET  /api/refuels/pending-review  Abastecimento pendente de avaliação, se houver (auth)
GET  /api/stations/:id/refuel-cooldown  Checagem prévia do cooldown de 3h (auth)

POST   /api/vehicles              Cadastrar veículo: brand/model/year/default_fuel_type (auth)
GET    /api/vehicles/mine         Meus veículos, com consumption[] por combustível (auth)
PUT    /api/vehicles/:id          Editar veículo (auth, só o dono)
PUT    /api/vehicles/:id/default  Definir como carro padrão (auth, desmarca os demais)
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
- [x] Status de existência do posto (`active`/`unconfirmed`/`flagged`), computado na
      leitura sem coluna nova nem cron — ver seção "Status de existência do posto".
      Sinalização comunitária (`station_flags`, quórum de 3) oculta posto da
      busca por padrão sem nunca apagar; badge "não confirmado" pra posto antigo
      sem abastecimento é só informativo.
- [x] Sintomas de combustível como tags fechadas em vez de texto livre
      (`report_tags`, 7 opções, só suspect/bad) — ver seção "Sistema de reputação".
      Resumo agregado por posto (2+ menções) em vez de expor avaliação individual;
      não entra no score de reputação.
- [x] Carro padrão (`vehicles.is_default`): o primeiro carro cadastrado já nasce
      padrão; `PUT /vehicles/:id/default` troca (desmarca os demais, só um por
      vez). `GET /vehicles/mine` ordena padrão primeiro. Abastecimento
      (`AddRefuel.jsx`) pré-seleciona o carro padrão em vez do mais recente
      cadastrado; sem nenhum definido, cai pro mais recente (fallback antigo).
      Perfil mostra badge "⭐ Padrão" + botão ☆ pra definir nos outros.
- [x] Combustível padrão por carro (`vehicles.default_fuel_type`, nullable):
      definido no formulário de carro do Perfil (select opcional). Ao selecionar
      esse carro no abastecimento (pré-seleção automática ou troca manual no
      dropdown), o combustível do formulário já vem preenchido — só se o carro
      tiver um padrão definido, senão mantém o que já estava selecionado.
- [x] Confirmação ao excluir carro: clicar em ✕ no Perfil não apaga mais na
      hora — o card vira "Excluir {carro}? Não / Sim, excluir" inline antes de
      chamar `DELETE /vehicles/:id`.
- [x] Lista de abastecimentos do Perfil mostra o carro usado (🚗 marca modelo)
      quando o abastecimento tem `vehicle_id` — `GET /refuels/mine` ganhou
      `LEFT JOIN vehicles`.
- [x] Botão "Abastecer" do mapa fica inteligente: dentro do raio de GPS do posto
      (mesmo `REFUEL_CHECK_RADIUS_KM`) vai direto pro abastecimento; fora do raio
      abre o Google Maps com rota (`openRoute`, movido pra `lib/directions.js`,
      compartilhado com o card da lista). **Substitui o prompt "Você está
      abastecendo?"** (item acima — `useRefuelPrompt.js`/`RefuelCheckPrompt.jsx`
      apagados) por um botão flutuante "⛽ Abastecer" que só aparece no mapa quando
      o GPS confirma presença num posto cadastrado, sem interromper quem não está
      em posto nenhum. Cadastro manual de posto continua pela aba de navegação; só
      a sugestão automática de cadastrar saiu.
- [x] Bloqueio de cooldown antes de abrir a tela de abastecimento — ver seção
      "Sistema de reputação" (`GET /api/stations/:id/refuel-cooldown`).
- [x] Bug corrigido: elegibilidade de avaliação comparava com `refueled_at` (só a
      data, sem hora) em vez de `created_at` do abastecimento, em
      `reportsController::create`, `stationsController::getReviewableRefuel` e
      `refuelsController::pendingReview` — dois ciclos abastecer→avaliar no mesmo
      posto no mesmo dia calendário se atropelavam (o segundo abastecimento nunca
      ficava elegível, com a mensagem enganosa "precisa abastecer antes"). Corrigido
      nos 3 lugares — ver seção "Sistema de reputação".
- [x] Lista "Postos próximos" e mapa integrados: tocar um posto na lista centraliza
      o mapa nele e abre o popup do marcador (`MapFlyTo`, mesmo padrão do
      `LocateUser`, usa `markerRefs` pra chamar `.openPopup()`); o card selecionado
      ganha botões "🧭 Rota" e "Ver detalhes →" inline — `StationCard` virou `div`
      clicável (`role="button"`) em vez de `<button>`, pra comportar botões
      aninhados (mesmo padrão já usado nos favoritos do Perfil). Com abastecer e
      rota cobertos pelo mapa, o botão "⛽ Abastecer" saiu de "Ver detalhes"
      completamente — em qualquer caminho de entrada (mapa, lista, Perfil).
- [x] Rate limiting em `/api/auth/login` (10 tentativas/15min) e
      `/api/auth/register` (5/1h), por IP (`express-rate-limit`,
      `backend/src/middlewares/authRateLimit.js`), resposta no mesmo formato
      `{ error }` dos outros 429 do app. `app.set('trust proxy', 'loopback')`
      adicionado — necessário pro rate limit enxergar o IP real do cliente quando
      o `tailscale serve` for ativado (hoje o acesso é direto pelo IP do Tailscale,
      sem proxy no meio).
- [x] Backup automático do banco: `backend/scripts/backup-db.sh` (mysqldump
      `--single-transaction`, senha via `--defaults-extra-file` temporário —
      não aparece em `ps aux`), cron diário às 3h (`/etc/cron.d/tanquecerto-backup`,
      fora do repo, roda como `alex` — o usuário real do systemd, `DEPLOY.md`
      descreve um usuário `tanquecerto` dedicado que não existe de fato no
      servidor) com rotação de 14 dias. Dumps em `/var/backups/tanquecerto/` —
      fora de `/opt/tanquecerto` de propósito, fora da árvore do git como
      proteção extra além do `.gitignore`. Só local por enquanto; cópia externa
      (rclone/S3) fica pra quando houver destino definido.
- [x] Validação server-side de GPS no abastecimento — ver seção "Sistema de
      reputação".
- [x] Onboarding do consumo médio (km/l): dica dispensável (💡, "vista uma vez
      pra sempre" via localStorage, `useOnboardingTip.js` + `OnboardingTip.jsx`,
      reaproveitável pra dicas futuras) perto do checkbox "Completei o tanque"
      em `AddRefuel.jsx`, explicando que o abastecimento **seguinte** (em
      qualquer posto, não precisa ser o mesmo) é o que fecha a conta do km/l.
- [x] Consumo médio: pessoal por veículo (soma medidas de **todos** os postos
      onde o carro abasteceu, não só um) exibido no Perfil → Meus Carros
      (`GET /vehicles/mine` ganhou `consumption: [{fuel_type, avg_consumption,
      samples}]`). A CTE de cálculo (pares de tanque-cheio consecutivos via
      `LEAD()`, antes só dentro de `getVehicleStats`) foi extraída pra
      `backend/src/services/consumptionService.js` (`MEASUREMENTS_CTE`),
      compartilhada entre posto e pessoal. Média **pública do posto**
      (`GET /stations/:id/vehicle-stats`) passa a exigir **3 usuários
      diferentes** com o mesmo perfil de veículo
      (`COUNT(DISTINCT user_id) >= MIN_DISTINCT_USERS`, era só `COUNT(*) >= 3`
      medições que podiam ser todas da mesma pessoa) — evita que o hábito de um
      usuário só defina a média pública do posto. Texto vazio de "Consumo médio
      por veículo" em `StationDetails.jsx` atualizado pra explicar isso.
- [x] Perfil: aba "Abastecimentos" passa a ser a primeira (e a padrão ao abrir
      a tela), "Avaliações" vai pro final (era a primeira). Aba ganha filtro
      por carro (`<select>`, "Todos os carros" + cada veículo) — filtra lista
      **e** totais (Total/Litros/Gasto) via `GET /refuels/mine?vehicle_id=`, no
      servidor (não só a página já carregada no navegador).
- [x] Fix do N+1 em `GET /stations/near`: a reputação era a última consulta
      por posto dentro do loop de distância (preço e status já tinham sido
      agrupados antes) — agora uma query só (`station_id IN (ids)`, relatos
      agrupados em JS antes de `buildStats`). A função passa de `1 + N + 2 + 2`
      consultas pra uma quantidade constante de 6, não importa quantos postos
      estejam no raio.

**Estado em 2026-07-12: tudo implementado, testado, publicado em produção,
commitado e enviado ao GitHub.** Próximo passo combinado com o usuário:
continuar melhorando visualmente as telas de cadastro/formulário aos poucos
(ele vai apontando ajustes conforme usa — não é pra fazer uma repaginada
grande de uma vez). Itens de risco do roadmap (backup, rate limiting,
validação server-side de GPS), o tutorial de onboarding e o fix do N+1
combinados anteriormente estão todos feitos agora.

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

- Filtro por tipo de combustível no mapa
- Notificações quando próximo de posto suspeito
- Upload de fotos
- Gamificação (pontos por avaliação)
- App mobile (React Native)
- IA para detectar padrões de fraude

# Octa na Google Play — guia, decisões e rascunhos

Documento de trabalho pra publicação do Octa na Play Store (primeira vez).
Criado em 2026-09-10. Atualizar conforme cada etapa é concluída.

> Contexto rápido: o Octa é um **PWA**. O app da Play é um **TWA** (Trusted Web
> Activity) — uma casca fina, gerada com o **Bubblewrap**, que abre
> `https://octa.eco.br` em tela cheia, sem barra de navegador. Não é um
> app nativo; toda a lógica continua no site.

---

## 1. Decisões

| Item | Valor | Observação |
|---|---|---|
| Nome na loja / launcher | **Octa** | máx. 30 caracteres |
| **Package name** (application ID) | **`br.eco.octa`** ✅ confirmado (2026-09-10) | **IMUTÁVEL após o 1º upload.** Ver nota abaixo. |
| Conta de desenvolvedor | **Pessoal** | Sujeita ao teste fechado de **12 testadores por 14 dias** antes de liberar produção (regra pra contas pessoais criadas após nov/2023 — confirmar em *Play Console → Configurações → Detalhes do desenvolvedor*). |
| Categoria | **Mapas e navegação** | alternativa: "Automóveis e veículos" |
| Preço | Grátis, sem anúncios, sem compras no app | |
| Público-alvo | **18+** | A política de privacidade diz que o app não é direcionado a menores. Marcar só faixas adultas mantém o app fora do programa "Voltado para a família". |

### Nota sobre o package name

O padrão Android é **domínio ao contrário**. Seu domínio é `octa.eco.br`, então
o reverso é **`br.eco.octa`**. Vantagens: segue a convenção, deixa claro quem é o
dono, e casa com o `assetlinks.json` que vai ligar o site ao app.

Você cogitou `octa.eco`. Isso é *tecnicamente válido* (tem os dois segmentos
mínimos), mas está na ordem "pra frente", foge da convenção, e — como qualquer
package name — **nunca poderá ser alterado** depois do primeiro envio. Se quiser
um pouco mais de espaço, `br.eco.octa.app` também é comum. Minha recomendação
firme: **`br.eco.octa`**.

➡️ **Ação sua:** confirmar o package name pra eu travar no Bubblewrap.

---

## 2. Divisão de tarefas

**O que eu (Claude) faço na PS2 / no repo:**
- Instalar o Bubblewrap (JDK 17 + Android SDK) — precisa da sua liberação pra instalar pacotes.
- `bubblewrap init` / `build` → gerar o `.aab` e a **upload key**.
- Gerar e publicar `octa.eco.br/.well-known/assetlinks.json`.
- Criar a conta de teste pra revisão do Google.
- Tirar os screenshots do app rodando.
- Recortar a imagem de destaque 1024×500.
- Rascunhar todos os textos (este documento).

**O que só você faz (Play Console, no navegador):**
- Criar o app no Play Console.
- Fazer upload do `.aab`.
- Preencher os formulários de *App content* (eu te guio campo a campo — seções 5 a 8).
- Subir os textos e imagens da ficha.
- Configurar as trilhas de teste e convidar os 12 testadores.
- Aceitar o Play App Signing (**sempre aceitar**).
- Guardar em local seguro o backup da upload key que eu gerar.

---

## 3. Ficha da loja (Store listing) — rascunho

### Nome (máx. 30)
```
Octa
```
(alternativa: `Octa — postos de confiança`)

### Descrição curta (máx. 80)
```
Postos confiáveis avaliados por quem abastece e o consumo real do seu carro.
```

### Descrição completa (máx. 4000)
```
O Octa é uma comunidade de motoristas que mostra, na prática, em quais postos
dá pra confiar.

FUJA DE COMBUSTÍVEL RUIM
Antes de abastecer, veja o que outros motoristas relataram sobre a qualidade do
combustível de cada posto. A reputação é construída só por quem abasteceu ali de
verdade — o app confirma pelo GPS que você esteve no posto antes de liberar a
avaliação.

SAIBA O CONSUMO REAL DO SEU CARRO
Registre seus abastecimentos em segundos: litros, valor e a quilometragem. O Octa
calcula quantos km/l cada carro seu faz de verdade — e mostra a média por posto,
pra você comparar.

PREÇO E REPUTAÇÃO NO MAPA
Encontre os postos perto de você com o preço informado pela comunidade e a média
dos abastecimentos recentes. Marcadores coloridos mostram a reputação de cada
posto de relance.

38 MIL POSTOS JÁ NO MAPA
Toda a base de postos registrados na ANP já está disponível. A reputação de cada
um aparece conforme os motoristas avaliam.

COMO FUNCIONA
1. Abasteceu? Registre no app (o GPS confirma que você está no posto).
2. Rodou com o combustível? Avalie — a nota vem no próximo abastecimento, porque
   só dá pra sentir a qualidade depois de rodar com ele.
3. Acompanhe a reputação dos postos e o consumo real dos seus carros.

O Octa é grátis e sem anúncios. Seus dados de abastecimento são seus: você pode
excluir a conta e todo o histórico quando quiser, direto no app.
```

### Recursos gráficos

| Recurso | Exigência | Situação |
|---|---|---|
| Ícone do app | 512×512, PNG 32-bit com alpha | ✅ Temos `frontend/public/icons/icon-512.png` (512×512 RGBA). Conferir se o desenho tem folga nas bordas (a Play aplica máscara). |
| Imagem de destaque | 1024×500, PNG/JPG, **sem** transparência | ⚠️ Temos `og-image.png` 1200×630 — proporção diferente. Preciso recortar/reexportar pra 1024×500. |
| Screenshots de celular | 2 a 8, PNG/JPG, lado maior 320–3840px, proporção entre 16:9 e 9:16 | ❌ Não temos. Vou capturar: (1) mapa com postos, (2) detalhe de um posto, (3) tela de abastecimento, (4) perfil com consumo km/l. |
| Screenshots de tablet | opcional | pular por ora |

---

## 4. Como o app é empacotado (referência técnica)

1. **Bubblewrap** lê `https://octa.eco.br/manifest.json` e gera um projeto Android
   (`twa-manifest.json` + Gradle).
2. `bubblewrap build` produz:
   - `app-release-bundle.aab` → é isso que sobe na Play Console.
   - `app-release-signed.apk` → pra instalar no celular e testar.
   - uma **upload key** (`android.keystore`) → **fazer backup**. Se sumir, dá pra
     resetar via suporte do Google, mas é chato.
3. **Play App Signing**: o Google guarda a chave final de distribuição; você só
   assina com a upload key. Aceitar sempre.
4. **Digital Asset Links**: pra tirar a barra de endereço, o site precisa servir
   `https://octa.eco.br/.well-known/assetlinks.json` com o package name e o
   fingerprint SHA-256 da chave **de distribuição do Google** (aparece no Play
   Console em *Configuração → Integridade do app → Assinatura de apps*, depois do
   1º upload). Eu gero o arquivo e faço deploy (mesmo esquema estático das
   páginas `/privacidade` e `/excluir-conta`).
5. **Permissão de localização**: dentro do TWA, a geolocalização passa pelo
   provedor de Custom Tabs (Chrome) e usa a permissão do próprio Chrome — o app
   Android **não** precisa declarar `ACCESS_FINE_LOCATION` no manifesto. Meta: não
   deixar o Bubblewrap adicionar a permissão de location no `twa-manifest.json`,
   pra não cair no formulário de "permissões sensíveis".
6. **Target API level**: o Bubblewrap recente já mira a API exigida pela Play pra
   apps novos. Confirmar na hora do build.

---

## 5. App content — declarações (guia campo a campo)

Preencher em *Play Console → Política e programas → App content*.

| Seção | Resposta |
|---|---|
| **Política de Privacidade** | `https://octa.eco.br/privacidade` |
| **Acesso ao app** | ✅ Conta de teste criada em produção (2026-09-11): **`revisao@octa.eco.br`**, e-mail já confirmado direto no banco (não depende de caixa de entrada real). **Senha: fora deste arquivo** (o repo é público) — está só no chat da sessão; pegar ali e colar direto no formulário do Play Console, não versionar em lugar nenhum. Resposta em "Todos os recursos ficam disponíveis sem login?": **Não**. Texto de instrução pro formulário: <br>*"Faça login com a conta fornecida. O mapa, a lista de postos e os detalhes de cada posto ficam visíveis sem login. Para testar o registro de abastecimento ou uma avaliação, é necessário estar fisicamente a até 200m de um posto cadastrado (o app valida por GPS) — não é possível simular isso do escritório; o restante do fluxo (perfil, veículos, favoritos) não tem essa exigência."* |
| **Anúncios** | Não contém anúncios. |
| **Classificação de conteúdo** | Responder o questionário IARC (seção 6). |
| **Público-alvo e conteúdo** | Faixas etárias: **apenas 18+**. Não é voltado para crianças. |
| **Notícias** | Não é app de notícias. |
| **App de COVID-19** | Não. |
| **Segurança dos dados** | Ver seção 7. |
| **Recursos do governo** | Não. |
| **Recursos financeiros** | **Não.** O app registra gastos pessoais com combustível, mas não é um serviço financeiro (sem crédito, investimento, pagamento ou transferência). |
| **Saúde** | Não. |

---

## 6. Classificação de conteúdo (questionário IARC) — respostas previstas

Todas as respostas **NÃO**, exceto onde indicado:

- Violência, sangue, crueldade: **Não**
- Conteúdo sexual / nudez: **Não**
- Linguagem imprópria / palavrões: **Não**
- Drogas, álcool, tabaco: **Não**
- Jogos de azar / simulação de apostas: **Não**
- Medo / conteúdo assustador: **Não**
- Os usuários podem **interagir ou trocar conteúdo** entre si? **Não** — as
  avaliações são agregadas, sem texto livre, sem perfis públicos, sem chat, sem
  mensagens diretas.
- O app **compartilha a localização do usuário** com outros usuários? **Não** —
  a posição é usada só pra confirmar presença no posto e nunca é exibida a
  terceiros.
- O app permite **compras digitais**? **Não**
- Categoria do app: **Utilitário / Produtividade / Comunicação** → na prática o
  IARC deve retornar **Livre (L) / Everyone**.

---

## 7. Segurança dos dados (Data safety) — respostas

Perguntas de topo:
- O app coleta ou compartilha algum dos tipos de dados exigidos? **Sim**
- Todos os dados são **criptografados em trânsito**? **Sim** (HTTPS/TLS em tudo)
- Você oferece uma forma de **solicitar exclusão de dados**? **Sim** →
  `https://octa.eco.br/excluir-conta` (e exclusão dentro do app, em Perfil)

> "Compartilhado" na definição do Google = transferir para uma **terceira parte**.
> O Octa não compartilha dados com ninguém para publicidade ou análise. Os itens
> abaixo marcados como compartilhados referem-se a serviços que recebem o dado
> para executar uma função pedida pelo usuário (geocodificação e rota).

| Tipo de dado | Coletado | Compartilhado | Obrigatório? | Finalidade |
|---|---|---|---|---|
| **Nome** | Sim | Não | Obrigatório | Gestão de conta |
| **E-mail** | Sim | Não | Obrigatório | Gestão de conta; confirmação de cadastro e redefinição de senha (via Resend) |
| **Localização precisa** | Sim | **Sim** (Nominatim/OpenStreetMap ao cadastrar um posto; Google Maps ao pedir rota) | Opcional | Funcionalidade do app (mostrar postos próximos, preencher endereço); prevenção de fraude/segurança (confirmar presença no posto) |
| **Ações no app** (abastecimentos, avaliações, veículos, favoritos) | Sim | Não | Obrigatório | Funcionalidade do app; reputação e consumo agregados |
| **Dados de compra / financeiros** | Não | — | — | (valores de abastecimento são "ações no app", não histórico de compra) |
| **Mensagens** | Não | — | — | Sem chat/DM/e-mail dentro do app |
| **Fotos e vídeos** | Não | — | — | (upload de fotos está no roadmap — atualizar quando entrar) |
| **Contatos, agenda, SMS, chamadas, áudio** | Não | — | — | |
| **Info de saúde / condicionamento físico** | Não | — | — | |
| **Identificadores do dispositivo / de publicidade** | Não | — | — | Sem advertising ID, sem SDK de analytics |
| **Logs de erro / diagnóstico** | Não (do dispositivo) | — | — | Erros são logados no servidor, não coletados do aparelho |

Observação sobre **IP**: processado transitoriamente para entrega do serviço e
limitação de tentativas de login. O formulário do Google normalmente não exige
declarar IP isoladamente quando não é usado para rastreamento — não declarar como
"identificador do dispositivo".

**Consistência:** estas respostas batem com as seções 2, 3 e 4 da política em
`/privacidade`. Se mudar uma, mudar a outra.

---

## 8. Plano de teste fechado (12 testadores × 14 dias)

1. **Trilha interna** primeiro: subir o `.aab`, adicionar você (e 1–2 pessoas de
   confiança) como testadores internos, instalar pelo link, confirmar que abre em
   tela cheia, sem barra de endereço, login e mapa funcionando.
2. **Trilha de teste fechado**: criar uma lista de e-mails com **12 pessoas**
   (têm que ser as contas Google que elas usam na Play Store). Cada uma precisa:
   - abrir o link de opt-in,
   - aceitar participar,
   - instalar o app pela Play.
3. O período de **14 dias** exige os 12 testadores participando de forma
   contínua. Recrutar com folga (13–15) pra cobrir quem desistir.
4. Coletar feedback informal (não precisa ser via Play).
5. Depois dos 14 dias, aparece a opção de **aplicar para acesso à produção** —
   é um formulário curto sobre o teste. Aprovado isso, cria-se o release de
   produção e ele passa pela revisão normal do Google (1–7 dias).

---

## 9. Checklist geral

**Pré-requisitos web**
- [x] HTTPS + domínio próprio (`octa.eco.br`)
- [x] Web manifest válido (nome, ícones 192/512/maskable, standalone)
- [x] Política de privacidade no ar (`/privacidade`)
- [x] Exclusão de conta: in-app + página web (`/excluir-conta`, `DELETE /api/auth/me`)
- [x] E-mail de contato ativo (`contato@octa.eco.br`)
- [ ] `assetlinks.json` em `/.well-known/` (depois da 1ª subida do `.aab`)

**Build**
- [x] Confirmar package name → `br.eco.octa`
- [x] Criar o app no Play Console (nome "Octa", pt-BR, grátis)
- [ ] Instalar Bubblewrap na PS2 (JDK 17 + Android SDK)
- [ ] `bubblewrap init` (nome "Octa", cores `#060d1f`, package `br.eco.octa`)
- [ ] Conferir que não entrou permissão de localização no `twa-manifest.json`
- [ ] `bubblewrap build` → `.aab` + `.apk`
- [ ] **Backup da upload key** (guardar fora do servidor)
- [ ] Testar o `.apk` num Android real

**Play Console**
- [ ] Criar o app (nome "Octa", idioma padrão pt-BR, app, grátis)
- [ ] Aceitar o Play App Signing
- [ ] Upload do `.aab` na trilha interna
- [ ] Pegar o SHA-256 da chave de distribuição → gerar/deployar `assetlinks.json`
- [ ] Ficha da loja: nome, descrições, ícone 512, destaque 1024×500, 2–8 screenshots
- [ ] App content: privacidade, acesso ao app (conta de teste), anúncios, público-alvo
- [ ] Classificação de conteúdo (questionário)
- [ ] Segurança dos dados (formulário)
- [x] Criar conta de teste `revisao@octa.eco.br` (e-mail confirmado no banco, senha entregue fora do repo)
- [ ] Trilha de teste fechado + 12 testadores + opt-in
- [ ] Aguardar 14 dias
- [ ] Aplicar para produção → release de produção → revisão do Google

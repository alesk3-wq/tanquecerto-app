# Deploy do TanqueCerto — Linux + MariaDB + Tailscale

Guia para subir o app num servidor Linux e acessá-lo do celular via Tailscale
**com HTTPS** (obrigatório para o GPS funcionar no navegador do celular).

> Assume **Debian 12 / Ubuntu 22.04+**. Para outras distros, troque o gerenciador
> de pacotes (`dnf` no Fedora/RHEL, `pacman` no Arch) — os passos de systemd,
> MariaDB e Tailscale são os mesmos.

## Visão geral

```
Celular (Tailscale) ──HTTPS──> tailscale serve ──HTTP──> Node :3000 ──> MariaDB
                                                  └── serve também o frontend (dist/)
```

Em produção o próprio Express serve o build do frontend e a API sob `/api` —
um único processo, uma única porta.

---

## 1. Node.js LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # deve mostrar v22.x
```

## 2. MariaDB

```bash
sudo apt install -y mariadb-server
sudo mysql_secure_installation   # defina senha do root, remova acesso anônimo
```

Criar banco e usuário dedicado (não use root no app):

```bash
sudo mariadb
```

```sql
CREATE DATABASE IF NOT EXISTS tanquecerto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tanquecerto'@'localhost' IDENTIFIED BY 'ESCOLHA_UMA_SENHA';
GRANT ALL PRIVILEGES ON tanquecerto.* TO 'tanquecerto'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Importar o schema (o script já cria/usa o banco `tanquecerto`):

```bash
sudo mariadb < backend/database.sql
```

> **Nota (dev local):** o banco antes se chamava `tanquecerto_teste`. Se seu
> `.env` de desenvolvimento ainda aponta para ele, atualize `DB_NAME=tanquecerto`
> e reimporte o schema, ou renomeie o banco antigo.

## 3. Código no servidor

```bash
sudo mkdir -p /opt/tanquecerto
sudo chown $USER /opt/tanquecerto
# copie o projeto (do seu PC, via git clone, scp ou rsync — exclua node_modules):
# rsync -av --exclude node_modules --exclude .env ./ usuario@servidor:/opt/tanquecerto/
```

Dependências do backend (só produção):

```bash
cd /opt/tanquecerto/backend
npm ci --omit=dev
```

`.env` de produção — crie `/opt/tanquecerto/backend/.env`:

```ini
NODE_ENV=production
PORT=3000
HOST=127.0.0.1

DB_HOST=localhost
DB_PORT=3306
DB_USER=tanquecerto
DB_PASSWORD=A_SENHA_QUE_VOCE_ESCOLHEU
DB_NAME=tanquecerto

JWT_SECRET=COLE_AQUI_O_RESULTADO_DE:openssl rand -base64 48
JWT_EXPIRES_IN=7d
```

```bash
chmod 600 .env   # só o dono lê
```

> `HOST=127.0.0.1` evita expor a porta 3000 na rede local — o acesso externo
> passa pelo `tailscale serve`, que conecta via localhost.

## 4. Build do frontend

No servidor:

```bash
cd /opt/tanquecerto/frontend
npm ci
npm run build    # gera frontend/dist — é isso que o Express serve
```

(Alternativa para servidor fraco: rode `npm run build` no seu PC e envie só a
pasta `frontend/dist` para o servidor.)

Teste rápido antes do systemd:

```bash
cd /opt/tanquecerto/backend
node app.js
# em outro terminal:
curl http://localhost:3000/api/health   # → {"status":"ok"}
curl -s http://localhost:3000/ | head   # → HTML do app
# Ctrl+C para parar
```

## 5. Serviço systemd

Criar usuário de sistema e ajustar dono:

```bash
sudo useradd -r -s /usr/sbin/nologin tanquecerto
sudo chown -R tanquecerto:tanquecerto /opt/tanquecerto
```

Criar `/etc/systemd/system/tanquecerto.service`:

```ini
[Unit]
Description=TanqueCerto
After=network.target mariadb.service
Wants=mariadb.service

[Service]
User=tanquecerto
WorkingDirectory=/opt/tanquecerto/backend
ExecStart=/usr/bin/node app.js
Environment=NODE_ENV=production
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

(O dotenv lê o `.env` do WorkingDirectory automaticamente.)

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tanquecerto
sudo systemctl status tanquecerto          # deve estar "active (running)"
journalctl -u tanquecerto -f               # logs ao vivo
```

## 6. HTTPS com Tailscale (essencial para o GPS)

O navegador **bloqueia geolocalização em HTTP**. O `tailscale serve` resolve:
ele publica `https://SEU-SERVIDOR.SEU-TAILNET.ts.net` com certificado válido e
repassa para a porta 3000 local.

1. No **admin console** do Tailscale (https://login.tailscale.com/admin/dns):
   - habilite **MagicDNS**;
   - habilite **HTTPS Certificates**.

2. No servidor:

```bash
sudo tailscale serve --bg 3000
tailscale serve status   # mostra a URL https pública do tailnet
```

- `--bg` deixa persistente (sobrevive a reboot).
- Para desfazer: `sudo tailscale serve reset`.
- O primeiro acesso pode demorar ~1 min (emissão do certificado Let's Encrypt).

## 7. Teste no celular

1. Instale o Tailscale no celular e entre na mesma tailnet.
2. Abra `https://SEU-SERVIDOR.SEU-TAILNET.ts.net` no navegador.
3. O site deve pedir permissão de localização — permita.
4. O mapa centraliza na sua posição e lista os postos próximos. 🎉

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| GPS não pede permissão | Acessou via HTTP ou IP direto — use a URL `https://...ts.net` |
| `502` no navegador | App não está rodando — `systemctl status tanquecerto` |
| Erro de conexão MySQL nos logs | Senha/usuário errados no `.env`, ou MariaDB parado |
| Certificado demora | Normal no primeiro acesso; confira HTTPS Certificates no admin console |
| API responde HTML | Rota errada — a API vive sob `/api/...` (ex: `/api/stations`) |

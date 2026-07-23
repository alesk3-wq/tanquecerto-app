CREATE DATABASE IF NOT EXISTS tanquecerto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tanquecerto;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email_verified_at TIMESTAMP NULL,
  phone VARCHAR(20) NULL,
  cpf CHAR(11) NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tokens de uso único (recuperação de senha e confirmação de e-mail) — uma
-- tabela reutilizável pras duas trilhas, em vez de duas tabelas parecidas.
-- Guarda o hash do token (SHA-256), nunca o token em texto puro: o token cru
-- só existe no link enviado por e-mail e na requisição de troca/confirmação,
-- um vazamento do banco não permite forjar link nenhum.
CREATE TABLE IF NOT EXISTS auth_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  type ENUM('password_reset', 'email_confirmation') NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  brand VARCHAR(100),
  address VARCHAR(255),
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  created_by INT NULL,
  source ENUM('user', 'anp') NOT NULL DEFAULT 'user',
  cnpj CHAR(14) NULL,
  anp_codigo_simp VARCHAR(20) NULL,
  anp_compliance_flag TINYINT(1) NULL,
  anp_synced_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  station_id INT NOT NULL,
  type ENUM('good', 'suspect', 'bad') NOT NULL,
  fuel_type ENUM('gasoline', 'ethanol', 'diesel', 'gnv') DEFAULT 'gasoline',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  station_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_favorites (user_id, station_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  brand VARCHAR(60) NOT NULL,
  model VARCHAR(60) NOT NULL,
  year SMALLINT NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  default_fuel_type ENUM('gasoline', 'ethanol', 'diesel', 'gnv') NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS refuels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  vehicle_id INT NULL,
  station_id INT NOT NULL,
  fuel_type ENUM('gasoline', 'ethanol', 'diesel', 'gnv') NOT NULL,
  liters DECIMAL(8,3) NOT NULL,
  total_value DECIMAL(10,2) NOT NULL,
  km INT,
  full_tank TINYINT(1) NOT NULL DEFAULT 1,
  notes TEXT,
  refueled_at DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);

-- Avaliação de atendimento/estrutura/localização — trilha separada de
-- combustível (reports), com texto livre (risco de acusação infundada é
-- específico de adulteração de combustível, não se aplica aqui). Não entra
-- na reputação do posto (station_status/reputationService).
CREATE TABLE IF NOT EXISTS service_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  station_id INT NOT NULL,
  sentiment ENUM('good', 'neutral', 'bad') NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS report_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  report_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vote (user_id, report_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Sintomas específicos de combustível marcados numa avaliação (vocabulário
-- fechado — ver frontend/src/constants/reportTags.js). Substituem o antigo
-- campo de texto livre (removido antes por risco de acusação infundada).
CREATE TABLE IF NOT EXISTS report_tags (
  report_id INT NOT NULL,
  tag ENUM('engasgo','cheiro_cor','consumo_pior','luz_acesa',
           'bomba_suspeita','motor_irregular','preco_divergente') NOT NULL,
  PRIMARY KEY (report_id, tag),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Sinalização comunitária: "não encontrei esse posto no endereço indicado"
CREATE TABLE IF NOT EXISTS station_flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  station_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_station_flag (user_id, station_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fuel_prices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  station_id INT NOT NULL,
  user_id INT NOT NULL,
  fuel_type ENUM('gasoline', 'ethanol', 'diesel', 'gnv') NOT NULL,
  price DECIMAL(6,3) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fuel_prices (station_id, fuel_type),
  FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índice para acelerar busca por geolocalização
CREATE INDEX idx_stations_location ON stations(latitude, longitude);
-- Chave de upsert idempotente pra importação/resincronização com a ANP (aceita NULL, postos manuais não vinculados)
CREATE UNIQUE INDEX uq_stations_anp_codigo_simp ON stations(anp_codigo_simp);
-- Consulta futura por CNPJ (suporte/dedup)
CREATE INDEX idx_stations_cnpj ON stations(cnpj);
-- Índice para limitar 1 relato por usuário por dia
CREATE INDEX idx_reports_user_station_date ON reports(user_id, station_id, created_at);
-- Índice para achar o abastecimento anterior/seguinte do mesmo veículo (cálculo de consumo)
CREATE INDEX idx_refuels_vehicle_date ON refuels(vehicle_id, refueled_at, created_at);
-- Índice para contar rapidamente sinalizações por posto (quórum de "posto não existe")
CREATE INDEX idx_station_flags_station ON station_flags(station_id);
-- Índice para listar/agregar avaliações de atendimento por posto
CREATE INDEX idx_service_reviews_station ON service_reviews(station_id);
-- Índice para invalidar tokens pendentes do mesmo tipo antes de emitir um novo
CREATE INDEX idx_auth_tokens_user_type ON auth_tokens(user_id, type);

-- ==========================================================================
-- SCHEMA SQL OFICIAL - CLOUDFLARE D1 (DATABASE SQLITE NUVEM)
-- Torneio de Robótica Colégio Anchieta — Edital 08/2026
-- Compatível 100% com as rotas do Worker API e config/regrasTorneio.js
-- ==========================================================================

-- 1. Tabela de Equipes Participantes
CREATE TABLE IF NOT EXISTS equipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipe TEXT NOT NULL UNIQUE,               -- Nome da Equipe (ex: 'Anchieta1')
    escola TEXT NOT NULL,                      -- Nome da Escola/Colégio
    categoria TEXT NOT NULL DEFAULT 'LEGO / Educacional',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Voltas e Tempos Oficiais da Pista (Alimentada pela Mesa do Operador)
CREATE TABLE IF NOT EXISTS corridas (
    uuid TEXT PRIMARY KEY,                     -- UUID gerado na mesa (ex: 'REC-XYZ123')
    equipe TEXT NOT NULL,                      -- Nome da equipe
    escola TEXT DEFAULT '',                    -- Nome da escola
    categoria TEXT NOT NULL DEFAULT 'LEGO / Educacional',
    rodada INTEGER NOT NULL DEFAULT 1,         -- 1 ou 2
    tempo_ms INTEGER NOT NULL DEFAULT 0,       -- Tempo líquido em milissegundos
    infracoes INTEGER NOT NULL DEFAULT 0,      -- Quantidade de infrações (0 a 5)
    status TEXT NOT NULL DEFAULT 'VALID',      -- 'VALID', 'DNF', 'TIME_UP'
    timestamp TEXT NOT NULL,                   -- ISO 8601 timestamp
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Avaliações dos Juízes de Paddock (Rubricas de 3 Níveis - Edital 08)
-- Mantém as colunas originais para 100% de retrocompatibilidade sem necessidade de migração destrutiva
CREATE TABLE IF NOT EXISTS avaliacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipe_id TEXT DEFAULT 'EQ-01',
    equipe TEXT NOT NULL,
    escola TEXT DEFAULT '',
    categoria TEXT DEFAULT 'LEGO / Educacional',
    juiz_nome TEXT NOT NULL,
    juiz TEXT DEFAULT '',
    caracterizacao REAL NOT NULL DEFAULT 2.0,
    mecanica REAL NOT NULL DEFAULT 2.0,
    superacao REAL NOT NULL DEFAULT 2.0,
    torcida REAL NOT NULL DEFAULT 2.0,
    fair_play REAL NOT NULL DEFAULT 2.0,
    -- Colunas legadas espelhadas para compatibilidade total
    nota_caracterizacao REAL DEFAULT 2.0,
    nota_mecanica REAL DEFAULT 2.0,
    voto_superacao REAL DEFAULT 2.0,
    nota_torcida REAL DEFAULT 2.0,
    voto_fair_play REAL DEFAULT 2.0,
    observacoes TEXT DEFAULT '',
    timestamp TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices de Performance para Apuração em Tempo Real
CREATE INDEX IF NOT EXISTS idx_corridas_equipe ON corridas(equipe);
CREATE INDEX IF NOT EXISTS idx_corridas_status ON corridas(status);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_equipe ON avaliacoes(equipe);

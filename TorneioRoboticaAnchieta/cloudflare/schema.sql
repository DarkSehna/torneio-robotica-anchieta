-- ==========================================================================
-- SCHEMA SQL OFICIAL - CLOUDFLARE D1 (DATABASE SQLITE NUVEM)
-- Torneio de Robótica Colégio Anchieta
-- ==========================================================================

-- 1. Tabela de Equipes Participantes
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,                       -- Ex: 'EQ-01'
    name TEXT NOT NULL,                        -- Nome da Equipe
    school TEXT NOT NULL,                      -- Nome da Escola/Colégio
    category TEXT NOT NULL,                    -- 'LEGO / Educacional' ou 'Aberta / Maker'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Voltas e Tempos Oficiais da Pista (Alimentada pela Mesa do Operador)
CREATE TABLE IF NOT EXISTS rounds (
    id TEXT PRIMARY KEY,                       -- UUID gerado na mesa (ex: 'REC-XYZ123')
    team_id TEXT NOT NULL,                     -- Referência da equipe
    round_number TEXT NOT NULL,                -- 'Round 1' ou 'Round 2'
    category TEXT NOT NULL,                    -- 'LEGO / Educacional' ou 'Aberta / Maker'
    time_ms INTEGER NOT NULL,                  -- Tempo líquido em milissegundos
    time_formatted TEXT NOT NULL,              -- '01:45.32'
    fouls INTEGER DEFAULT 0,                   -- Quantidade de infrações (0 a 5)
    status TEXT NOT NULL,                      -- 'VALID', 'DNF', 'TIME_UP'
    recorded_at TEXT NOT NULL,                 -- Horário local registrado
    timestamp INTEGER NOT NULL,                -- Epoch timestamp para ordenação
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- 3. Tabela de Avaliação dos Juízes de Paddock (Fase 3 - Celular/Mobile)
CREATE TABLE IF NOT EXISTS paddock_evaluations (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    judge_name TEXT NOT NULL,
    engineering_score REAL DEFAULT 0,          -- Pontuação de Engenharia/Mecânica
    programming_score REAL DEFAULT 0,          -- Pontuação de Algoritmo/Código
    notebook_score REAL DEFAULT 0,             -- Caderno de Engenharia
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Índices de Performance para Apuração Rápida
CREATE INDEX IF NOT EXISTS idx_rounds_team ON rounds(team_id);
CREATE INDEX IF NOT EXISTS idx_rounds_category ON rounds(category);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON rounds(status);

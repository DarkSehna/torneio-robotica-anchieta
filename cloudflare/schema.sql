-- ==========================================================================
-- SCHEMA SQL OFICIAL - CLOUDFLARE D1 (DATABASE SQLITE NUVEM)
-- Torneio de Robótica Colégio Anchieta — Edital 08/2026
-- Compatível 100% com as rotas do Worker API e config/regrasTorneio.js
-- ==========================================================================

-- 1. Tabela de Equipes Participantes & Credenciamento
CREATE TABLE IF NOT EXISTS equipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipe TEXT NOT NULL UNIQUE,               -- Nome da Equipe (ex: 'Anchieta1')
    escola TEXT NOT NULL,                      -- Nome da Escola/Colégio
    categoria TEXT NOT NULL DEFAULT 'LEGO / Educacional',
    professor TEXT DEFAULT '',                 -- Nome do Professor / Orientador
    integrantes TEXT DEFAULT '',               -- Nomes dos Alunos integrantes (2 a 4)
    checkin INTEGER DEFAULT 0,                 -- 0 = Pendente, 1 = Check-in Realizado
    inspecao INTEGER DEFAULT 0,                -- 0 = Pendente, 1 = Inspeção Técnica OK (25x25cm / <=2kg)
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
    caracterizacao REAL NOT NULL DEFAULT 2.0,            -- Melhor Caracterização do Robô (Carro)
    caracterizacao_equipe REAL NOT NULL DEFAULT 2.0,     -- Melhor Caracterização da Equipe
    mecanica REAL NOT NULL DEFAULT 2.0,
    superacao REAL NOT NULL DEFAULT 2.0,
    torcida REAL NOT NULL DEFAULT 2.0,
    fair_play REAL NOT NULL DEFAULT 2.0,
    -- Colunas legadas espelhadas para compatibilidade total
    nota_caracterizacao REAL DEFAULT 2.0,
    nota_caracterizacao_equipe REAL DEFAULT 2.0,
    nota_mecanica REAL DEFAULT 2.0,
    voto_superacao REAL DEFAULT 2.0,
    nota_torcida REAL DEFAULT 2.0,
    voto_fair_play REAL DEFAULT 2.0,
    observacoes TEXT DEFAULT '',
    timestamp TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Estado da Arena (Trava de Conflito em Tempo Real com a Pista de Teste)
CREATE TABLE IF NOT EXISTS arena_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    equipe_atual TEXT DEFAULT '',
    status_atual TEXT DEFAULT 'READY',
    equipe_proxima TEXT DEFAULT '',
    rodada INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices de Performance para Apuração em Tempo Real
CREATE INDEX IF NOT EXISTS idx_corridas_equipe ON corridas(equipe);
CREATE INDEX IF NOT EXISTS idx_corridas_status ON corridas(status);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_equipe ON avaliacoes(equipe);

/**
 * Torneio de Robótica Anchieta - Base de Equipes e Gestão de Participantes
 * Deduplicação Inteligente, Auto-Purga de Versão e Prioridade Nuvem (Cloudflare D1)
 */

const TEAMS_CACHE_VERSION = 'v2026_anchieta_oficial_v7';

// As equipes oficiais do torneio
const DEFAULT_TEAMS = [
  { id: "EQ-01", name: "Anchieta1", school: "Colégio Anchieta", category: "LEGO / Educacional" },
  { id: "EQ-02", name: "Anchieta 2", school: "Colégio Anchieta", category: "LEGO / Educacional" },
  { id: "EQ-03", name: "Anchieta 3", school: "Colégio Anchieta", category: "LEGO / Educacional" },
  { id: "EQ-04", name: "Anchieta 4", school: "Colégio Anchieta", category: "LEGO / Educacional" },
  { id: "EQ-05", name: "Anchieta5", school: "Colégio Anchieta", category: "LEGO / Educacional" },
  { id: "EQ-06", name: "Anchieta6", school: "Colégio Anchieta", category: "LEGO / Educacional" },
  { id: "EQ-07", name: "Farroupilha 1", school: "Colégio Farroupilha", category: "LEGO / Educacional" },
  { id: "EQ-08", name: "Farroupilha 2", school: "Colégio Farroupilha", category: "LEGO / Educacional" },
  { id: "EQ-09", name: "Província 1", school: "Colégio Província", category: "LEGO / Educacional" },
  { id: "EQ-10", name: "Província 2", school: "Colégio Província", category: "LEGO / Educacional" },
  { id: "EQ-11", name: "Província 3", school: "Colégio Província", category: "LEGO / Educacional" }
];

// AUTO-PURGA TRANSPARENTE DE CACHE ANTIGO:
// Executa imediatamente ao carregar o script.
// Se o navegador móvel ou desktop estiver com versão antiga ou dados de teste com "RoboStorm",
// limpa automaticamente o localStorage sem exigir ação do usuário.
try {
  const currentVersion = localStorage.getItem('torneio_anchieta_version');
  const rawCache = localStorage.getItem('torneio_anchieta_teams') || '';
  if (currentVersion !== TEAMS_CACHE_VERSION || rawCache.includes('RoboStorm') || rawCache.includes('CyberKnights')) {
    localStorage.removeItem('torneio_anchieta_teams');
    localStorage.setItem('torneio_anchieta_version', TEAMS_CACHE_VERSION);
    // Também limpa avaliações de teste do paddock que continham RoboStorm
    const paddockCache = localStorage.getItem('paddock_evaluations_cache') || '';
    if (paddockCache.includes('RoboStorm')) {
      try {
        const evals = JSON.parse(paddockCache);
        const filtered = evals.filter(e => (e.equipe !== 'RoboStorm' && e.equipe_id !== 'RoboStorm'));
        localStorage.setItem('paddock_evaluations_cache', JSON.stringify(filtered));
      } catch (err) {}
    }
  }
} catch (e) {
  console.warn('Erro na purga de cache:', e);
}

class TeamsManager {
  constructor() {
    this.teams = [];
  }

  // Deduplicação estrita por nome da equipe (case-insensitive / sem espaços extras)
  deduplicate(list) {
    const seen = new Set();
    const result = [];
    for (const item of list) {
      const teamName = (item.name || item.equipe || "").trim();
      if (!teamName) continue;
      // Ignora resquícios de mocks antigos
      if (teamName.toLowerCase() === 'robostorm' || teamName.toLowerCase() === 'cyberknights') continue;
      
      const key = teamName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          id: item.id || `EQ-${String(result.length + 1).padStart(2, '0')}`,
          name: teamName,
          school: (item.school || item.escola || "Colégio Anchieta").trim(),
          category: item.category || item.categoria || "LEGO / Educacional"
        });
      }
    }
    return result;
  }

  async load(forceRefresh = false) {
    // 1. PRIORIDADE MÁXIMA: NUVEM (Cloudflare D1) com Cache-Busting
    // Busca sempre os dados oficiais em tempo real para sincronização transparente
    if (window.cloudAPI) {
      try {
        const cloudTeams = await window.cloudAPI.getEquipes();
        if (Array.isArray(cloudTeams)) {
          // Respeita a lista da nuvem, mesmo se o administrador tiver deletado todas as equipes ([])
          const mapped = cloudTeams.map((t, idx) => ({
            id: t.id ? `EQ-${String(t.id).padStart(2, '0')}` : `EQ-${String(idx + 1).padStart(2, '0')}`,
            name: t.equipe || t.name,
            school: t.escola || t.school || "Colégio Anchieta",
            category: t.categoria || t.category || "LEGO / Educacional"
          }));
          this.teams = this.deduplicate(mapped);
          this.saveCache();
          return this.teams;
        }
      } catch (err) {
        console.warn('Falha ao buscar equipes no Cloudflare D1 (modo offline):', err);
      }
    }

    // 2. FALLBACK OFFLINE: Cache Local do Navegador (se a nuvem estiver indisponível)
    if (!forceRefresh) {
      const cached = localStorage.getItem('torneio_anchieta_teams');
      if (cached !== null) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            this.teams = this.deduplicate(parsed);
            return this.teams;
          }
        } catch (e) {
          console.warn('Erro ao ler cache local de equipes:', e);
        }
      }
    }

    // 3. FALLBACK ESTÁTICO: shared/data/teams.json
    try {
      const paths = ['shared/data/teams.json', '../shared/data/teams.json', 'data/teams.json'];
      for (const p of paths) {
        try {
          const resp = await fetch(`${p}?_t=${Date.now()}`);
          if (resp.ok) {
            const fileTeams = await resp.json();
            if (Array.isArray(fileTeams)) {
              this.teams = this.deduplicate(fileTeams);
              this.saveCache();
              return this.teams;
            }
          }
        } catch (_) {}
      }
    } catch (err) {
      // Ignora erro local
    }

    // 4. FALLBACK PADRÃO INICIAL
    this.teams = this.deduplicate(DEFAULT_TEAMS);
    this.saveCache();
    return this.teams;
  }

  saveCache() {
    localStorage.setItem('torneio_anchieta_teams', JSON.stringify(this.teams));
    localStorage.setItem('torneio_anchieta_version', TEAMS_CACHE_VERSION);
  }

  getAll() {
    return this.teams;
  }

  getById(id) {
    return this.getAll().find(t => t.id === id) || null;
  }

  filter(query = '', category = '') {
    const q = query.trim().toLowerCase();
    return this.getAll().filter(t => {
      const matchQuery = !q || t.name.toLowerCase().includes(q) || t.school.toLowerCase().includes(q) || (t.id && t.id.toLowerCase().includes(q));
      const matchCat = !category || t.category === category;
      return matchQuery && matchCat;
    });
  }

  addTeam(team) {
    const teamName = (team.name || "").trim();
    if (!teamName) return null;

    const existing = this.teams.find(t => t.name.toLowerCase() === teamName.toLowerCase());
    if (existing) {
      return existing;
    }

    const newTeam = {
      id: team.id || `EQ-${String(this.teams.length + 1).padStart(2, '0')}`,
      name: teamName,
      school: (team.school || 'Colégio Anchieta').trim(),
      category: team.category || 'LEGO / Educacional'
    };
    this.teams.push(newTeam);
    this.saveCache();
    return newTeam;
  }

  removeTeam(idOrName) {
    this.teams = this.teams.filter(t => t.id !== idOrName && t.name !== idOrName);
    this.saveCache();
  }
}

window.teamsManager = new TeamsManager();

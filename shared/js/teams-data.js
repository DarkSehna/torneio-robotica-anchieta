/**
 * Torneio de Robótica Anchieta - Base de Equipes e Gestão de Participantes
 * Deduplicação Inteligente, Auto-Purga de Versão e Prioridade Nuvem (Cloudflare D1)
 */

const TEAMS_CACHE_VERSION = 'v2026_anchieta_oficial_v12_lgpd';

// As equipes oficiais do torneio (Minimização LGPD: sem nomes completos de alunos/menores expostos no código público)
const DEFAULT_TEAMS = [
  // Equipes presentes no D1 em produção
  { id: "EQ-105", name: "RoboTitans", school: "Colégio Exemplo Sul", category: "LEGO / Educacional", professor: "Prof. Carlos Eduardo", integrantes: "", checkin: true, inspecao: true },
  { id: "EQ-106", name: "CyberFalcões", school: "Instituto Norte", category: "LEGO / Educacional", professor: "Profª. Vanessa Lima", integrantes: "", checkin: true, inspecao: true },
  { id: "EQ-107", name: "LinhaVeloz", school: "Colégio Horizonte", category: "LEGO / Educacional", professor: "Prof. Rodrigo Santos", integrantes: "", checkin: true, inspecao: true },
  { id: "EQ-108", name: "Engrenagem X", school: "Escola Modelo", category: "LEGO / Educacional", professor: "Profª. Juliana Silva", integrantes: "", checkin: true, inspecao: true },
  { id: "EQ-109", name: "TurboPID", school: "Colégio Anchieta (Teste)", category: "LEGO / Educacional", professor: "Prof. Fernando Rocha", integrantes: "", checkin: true, inspecao: true },

  // Equipes Oficiais do Colégio Anchieta & Convidados
  { id: "EQ-01", name: "Anchieta1", school: "Colégio Anchieta", category: "LEGO / Educacional", professor: "Prof. Marcos Silva", integrantes: "", checkin: true, inspecao: true },
  { id: "EQ-02", name: "Anchieta 2", school: "Colégio Anchieta", category: "LEGO / Educacional", professor: "Prof. Marcos Silva", integrantes: "", checkin: true, inspecao: true },
  { id: "EQ-03", name: "Anchieta 3", school: "Colégio Anchieta", category: "LEGO / Educacional", professor: "Profª. Carla Mendes", integrantes: "", checkin: true, inspecao: false },
  { id: "EQ-04", name: "Anchieta 4", school: "Colégio Anchieta", category: "LEGO / Educacional", professor: "Profª. Carla Mendes", integrantes: "", checkin: false, inspecao: false },
  { id: "EQ-05", name: "Anchieta5", school: "Colégio Anchieta", category: "LEGO / Educacional", professor: "Prof. Roberto Dias", integrantes: "", checkin: true, inspecao: true },
  { id: "EQ-06", name: "Anchieta6", school: "Colégio Anchieta", category: "LEGO / Educacional", professor: "Prof. Roberto Dias", integrantes: "", checkin: false, inspecao: false },
  { id: "EQ-07", name: "Farroupilha 1", school: "Colégio Farroupilha", category: "LEGO / Educacional", professor: "Profª. Fernanda Prado", integrantes: "", checkin: true, inspecao: true },
  { id: "EQ-08", name: "Farroupilha 2", school: "Colégio Farroupilha", category: "LEGO / Educacional", professor: "Profª. Fernanda Prado", integrantes: "", checkin: true, inspecao: true },
  { id: "EQ-09", name: "Província 1", school: "Colégio Província", category: "LEGO / Educacional", professor: "Prof. Eduardo Schmidt", integrantes: "", checkin: true, inspecao: true },
  { id: "EQ-10", name: "Província 2", school: "Colégio Província", category: "LEGO / Educacional", professor: "Prof. Eduardo Schmidt", integrantes: "", checkin: false, inspecao: false },
  { id: "EQ-11", name: "Província 3", school: "Colégio Província", category: "LEGO / Educacional", professor: "Prof. Eduardo Schmidt", integrantes: "", checkin: true, inspecao: true }
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
          category: item.category || item.categoria || "LEGO / Educacional",
          professor: (item.professor || item.tecnico || "").trim(),
          integrantes: (typeof item.integrantes === 'string' ? item.integrantes : (Array.isArray(item.integrantes) ? item.integrantes.join(', ') : "")).trim(),
          checkin: item.checkin === 1 || item.checkin === true || item.checkin === '1',
          inspecao: item.inspecao === 1 || item.inspecao === true || item.inspecao === '1'
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
          // Respeita a lista da nuvem e mescla inteligentemente dados cadastrais caso o D1 ainda esteja vazio
          const mapped = cloudTeams.map((t, idx) => {
            const teamName = (t.equipe || t.name || '').trim();
            const defaultMatch = DEFAULT_TEAMS.find(dt => dt.name.toLowerCase() === teamName.toLowerCase());
            
            const school = (t.escola || t.school || (defaultMatch ? defaultMatch.school : "Colégio Anchieta")).trim();
            const category = (t.categoria || t.category || (defaultMatch ? defaultMatch.category : "LEGO / Educacional")).trim();
            const professor = (t.professor && t.professor.trim()) ? t.professor.trim() : (defaultMatch ? defaultMatch.professor : "");
            const integrantes = (t.integrantes && t.integrantes.trim()) ? t.integrantes.trim() : (defaultMatch ? defaultMatch.integrantes : "");

            return {
              id: t.id ? `EQ-${String(t.id).padStart(2, '0')}` : `EQ-${String(idx + 1).padStart(2, '0')}`,
              name: teamName,
              school: school,
              category: category,
              professor: professor,
              integrantes: integrantes,
              checkin: t.checkin === 1 || t.checkin === true || t.checkin === '1' || (defaultMatch && (t.checkin === null || t.checkin === undefined) ? defaultMatch.checkin : false),
              inspecao: t.inspecao === 1 || t.inspecao === true || t.inspecao === '1' || (defaultMatch && (t.inspecao === null || t.inspecao === undefined) ? defaultMatch.inspecao : false)
            };
          });
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
    const isCatUnica = !!window.REGRAS_TORNEIO?.categoriaUnica;
    return this.getAll().filter(t => {
      const matchQuery = !q || t.name.toLowerCase().includes(q) || t.school.toLowerCase().includes(q) || (t.id && t.id.toLowerCase().includes(q));
      const matchCat = isCatUnica || !category || t.category === category;
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
      category: team.category || 'LEGO / Educacional',
      professor: (team.professor || '').trim(),
      integrantes: (typeof team.integrantes === 'string' ? team.integrantes : (Array.isArray(team.integrantes) ? team.integrantes.join(', ') : '')).trim(),
      checkin: !!team.checkin,
      inspecao: !!team.inspecao
    };
    this.teams.push(newTeam);
    this.saveCache();
    return newTeam;
  }

  toggleCheckin(idOrName) {
    const team = this.teams.find(t => t.id === idOrName || t.name.toLowerCase() === String(idOrName).toLowerCase());
    if (team) {
      team.checkin = !team.checkin;
      this.saveCache();
      return team;
    }
    return null;
  }

  toggleInspecao(idOrName) {
    const team = this.teams.find(t => t.id === idOrName || t.name.toLowerCase() === String(idOrName).toLowerCase());
    if (team) {
      team.inspecao = !team.inspecao;
      this.saveCache();
      return team;
    }
    return null;
  }

  setStatus(idOrName, { checkin, inspecao }) {
    const team = this.teams.find(t => t.id === idOrName || t.name.toLowerCase() === String(idOrName).toLowerCase());
    if (team) {
      if (checkin !== undefined) team.checkin = !!checkin;
      if (inspecao !== undefined) team.inspecao = !!inspecao;
      this.saveCache();
      return team;
    }
    return null;
  }

  removeTeam(idOrName) {
    this.teams = this.teams.filter(t => t.id !== idOrName && t.name !== idOrName);
    this.saveCache();
  }
}

window.teamsManager = new TeamsManager();

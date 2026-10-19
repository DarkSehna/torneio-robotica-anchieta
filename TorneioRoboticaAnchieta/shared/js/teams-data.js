/**
 * Torneio de Robótica Anchieta - Base de Equipes e Gestão de Participantes
 * Deduplicação Inteligente e Prioridade Local Resiliente
 */

const DEFAULT_TEAMS = [
  { id: "EQ-01", name: "RoboStorm", school: "Colégio Anchieta", category: "LEGO / Educacional" },
  { id: "EQ-02", name: "CyberKnights", school: "Colégio Anchieta", category: "Aberta / Maker" },
  { id: "EQ-03", name: "Titanium Bot", school: "Escola SESI Integrada", category: "LEGO / Educacional" },
  { id: "EQ-04", name: "Vortex Alpha", school: "Instituto Federal Tecnológico", category: "Aberta / Maker" },
  { id: "EQ-05", name: "Minerva Tech", school: "Colégio São Francisco", category: "LEGO / Educacional" },
  { id: "EQ-06", name: "Omega Circuit", school: "Colégio Marista", category: "Aberta / Maker" },
  { id: "EQ-07", name: "Pioneiros da Robótica", school: "Colégio Anchieta", category: "LEGO / Educacional" },
  { id: "EQ-08", name: "ByteCrafters", school: "Escola Estadual Tiradentes", category: "Aberta / Maker" }
];

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

  async load() {
    // 1. Prioridade Máxima: Cache Local do Operador (preserva exclusões e edições manuais feitas no Admin)
    const cached = localStorage.getItem('torneio_anchieta_teams');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.teams = this.deduplicate(parsed);
          this.saveCache();
          return this.teams;
        }
      } catch (e) {
        console.warn('Erro ao ler cache de equipes:', e);
      }
    }

    // 2. Se o cache local estiver vazio, busca do Cloudflare D1
    if (window.cloudAPI) {
      try {
        const cloudTeams = await window.cloudAPI.getEquipes();
        if (Array.isArray(cloudTeams) && cloudTeams.length > 0) {
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
        console.warn('Falha ao buscar equipes no Cloudflare:', err);
      }
    }

    // 3. Fallback do arquivo local teams.json
    try {
      const resp = await fetch('data/teams.json');
      if (resp.ok) {
        const fileTeams = await resp.json();
        this.teams = this.deduplicate(fileTeams);
        this.saveCache();
        return this.teams;
      }
    } catch (err) {
      // Ignora erro do protocolo file://
    }

    // 4. Fallback padrão
    this.teams = this.deduplicate(DEFAULT_TEAMS);
    this.saveCache();
    return this.teams;
  }

  saveCache() {
    localStorage.setItem('torneio_anchieta_teams', JSON.stringify(this.teams));
  }

  getAll() {
    return this.teams.length > 0 ? this.teams : DEFAULT_TEAMS;
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

    // Impede duplicata ao adicionar
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

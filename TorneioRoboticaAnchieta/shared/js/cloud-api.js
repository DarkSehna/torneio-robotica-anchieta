/**
 * Torneio de Robótica Anchieta - Cliente Oficial Cloudflare Workers API
 * Endpoint: https://torneio-api.gabrielsehna.workers.dev
 * Compatibilidade estrita com o schema D1 SQLite
 */

class CloudflareTorneioAPI {
  constructor(baseUrl = 'https://torneio-api.gabrielsehna.workers.dev') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.isOnline = false;
  }

  async checkHealth() {
    try {
      const resp = await fetch(`${this.baseUrl}/`, { method: 'GET' });
      if (resp.ok) {
        const data = await resp.json();
        this.isOnline = data.status === 'online';
        return { online: true, data };
      }
    } catch (e) {
      this.isOnline = false;
    }
    return { online: false };
  }

  // Obter Equipes do Cloudflare D1 (GET /api/equipes)
  async getEquipes() {
    try {
      const resp = await fetch(`${this.baseUrl}/api/equipes`, { method: 'GET' });
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn('Falha ao obter equipes do Cloudflare D1:', e);
    }
    return null;
  }

  // Cadastrar Equipes no Cloudflare D1 (POST /api/equipes)
  // Aceita objeto único { equipe, escola, categoria } ou Array de equipes
  async salvarEquipes(equipes) {
    try {
      const lista = Array.isArray(equipes) ? equipes : [equipes];
      const payload = lista.map(item => ({
        equipe: item.equipe || item.name || item.nome,
        escola: item.escola || item.school || "",
        categoria: item.categoria || item.category || "LEGO / Educacional"
      }));

      const resp = await fetch(`${this.baseUrl}/api/equipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return { ok: resp.ok, status: resp.status, data: await resp.json().catch(() => ({})) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Excluir Equipe Individual por ID ou Nome (DELETE /api/equipes/:param)
  async excluirEquipe(idOuNome) {
    try {
      const param = encodeURIComponent(idOuNome);
      const resp = await fetch(`${this.baseUrl}/api/equipes/${param}`, {
        method: 'DELETE'
      });
      return { ok: resp.ok, status: resp.status, data: await resp.json().catch(() => ({})) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Limpar Todas as Equipes do Cloudflare D1 (POST /api/equipes/limpar)
  async limparTodasEquipes() {
    try {
      const resp = await fetch(`${this.baseUrl}/api/equipes/limpar`, {
        method: 'POST'
      });
      return { ok: resp.ok, status: resp.status, data: await resp.json().catch(() => ({})) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Obter Corridas da Pista (GET /api/corridas)
  async getCorridas() {
    try {
      const resp = await fetch(`${this.baseUrl}/api/corridas`, { method: 'GET' });
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn('Falha ao obter corridas do Cloudflare D1:', e);
    }
    return null;
  }

  // Sincronizar Corridas Oficiais (POST /api/corridas)
  // Suporta envio individual ou em lote (batch da Sync Queue)
  async salvarCorridas(corridas) {
    try {
      const lista = Array.isArray(corridas) ? corridas : [corridas];
      const payload = lista.map(c => {
        // Extrai número da rodada se vier 'Round 1' ou 'Round 2'
        let rodadaNum = 1;
        if (typeof c.rodada === 'number') {
          rodadaNum = c.rodada;
        } else if (typeof c.round === 'string') {
          rodadaNum = parseInt(c.round.replace(/\D/g, ''), 10) || 1;
        } else if (typeof c.rodada === 'string') {
          rodadaNum = parseInt(c.rodada.replace(/\D/g, ''), 10) || 1;
        }

        return {
          uuid: c.uuid || c.id || ('REC-' + Date.now().toString(36).toUpperCase()),
          equipe: c.equipe || c.teamName || c.nome || "Equipe",
          escola: c.escola || c.schoolName || c.school || "",
          categoria: c.categoria || c.category || "LEGO / Educacional",
          rodada: rodadaNum,
          tempo_ms: Number(c.tempo_ms ?? c.timeMs ?? 0),
          infracoes: Number(c.infracoes ?? c.fouls ?? 0),
          status: c.status || "VALID",
          timestamp: c.timestamp ? new Date(c.timestamp).toISOString() : new Date().toISOString()
        };
      });

      const resp = await fetch(`${this.baseUrl}/api/corridas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return { ok: resp.ok, status: resp.status, data: await resp.json().catch(() => ({})) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ==========================================
  // ROTAS DOS JUÍZES DE PADDOCK (/api/avaliacoes)
  // ==========================================
  async getAvaliacoes() {
    try {
      const resp = await fetch(`${this.baseUrl}/api/avaliacoes`, { method: 'GET' });
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn('Falha ao obter avaliações:', e);
    }
    return null;
  }

  async salvarAvaliacao(avaliacao) {
    try {
      const payload = {
        juiz: avaliacao.juiz || "Juiz Oficial",
        equipe: avaliacao.equipe,
        escola: avaliacao.escola || "",
        categoria: avaliacao.categoria || "LEGO / Educacional",
        nota_mecanica: Number(avaliacao.nota_mecanica) || 0,
        nota_caracterizacao: Number(avaliacao.nota_caracterizacao) || 0,
        voto_superacao: avaliacao.voto_superacao ? 1 : 0,
        voto_fair_play: avaliacao.voto_fair_play ? 1 : 0,
        nota_torcida: Number(avaliacao.nota_torcida) || 0,
        observacoes: avaliacao.observacoes || "",
        timestamp: avaliacao.timestamp || new Date().toISOString()
      };

      const resp = await fetch(`${this.baseUrl}/api/avaliacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return { ok: resp.ok, status: resp.status, data: await resp.json().catch(() => ({})) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async excluirAvaliacao(id) {
    try {
      const resp = await fetch(`${this.baseUrl}/api/avaliacoes/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return { ok: resp.ok, status: resp.status, data: await resp.json().catch(() => ({})) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Rota Unificada de Apuração (GET /api/apuracao)
  async getApuracao() {
    try {
      const resp = await fetch(`${this.baseUrl}/api/apuracao`, { method: 'GET' });
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn('Falha ao obter apuração da nuvem:', e);
    }
    return null;
  }
}

window.cloudAPI = new CloudflareTorneioAPI();

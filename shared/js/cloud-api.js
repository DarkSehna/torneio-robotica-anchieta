/**
 * Torneio de Robótica Anchieta - Cliente Oficial Cloudflare Workers API
 * Endpoint: https://torneio-api.gabrielsehna.workers.dev
 * Compatibilidade estrita com o schema D1 SQLite e Política Anti-Cache (Zero Cache Móvel)
 */

class CloudflareTorneioAPI {
  constructor(baseUrl = 'https://torneio-api.gabrielsehna.workers.dev') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.isOnline = false;
  }

  // Gera URL com timestamp anti-cache para garantir que navegadores (móveis e desktop)
  // nunca usem cache HTTP de disco, mantendo a requisição como CORS Simple Request (sem Preflight OPTIONS)
  _getNoCacheUrl(endpoint) {
    const sep = endpoint.includes('?') ? '&' : '?';
    return `${this.baseUrl}${endpoint}${sep}_t=${Date.now()}`;
  }

  // Obtém o token administrativo da sessão (auth-guard.js) para o header X-Admin-Token
  _getAdminToken() {
    try {
      if (typeof window !== 'undefined' && typeof window.getAdminToken === 'function') {
        return window.getAdminToken() || '';
      }
      if (typeof sessionStorage !== 'undefined') {
        return sessionStorage.getItem('torneio_anchieta_admin_token') || '';
      }
    } catch (e) {}
    return '';
  }

  // Trata resposta 401 do Worker avisando o operador para refazer o login no painel Admin/Apuração
  _handleAdminUnauthorized(resp) {
    if (resp && resp.status === 401) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('torneio_anchieta_auth_token');
          sessionStorage.removeItem('torneio_anchieta_admin_token');
        }
      } catch (e) {}
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('🔒 Acesso não autorizado pelo servidor (Erro 401 - X-Admin-Token). Por favor, refaça o login com a senha oficial no painel Admin/Apuração.');
      }
      return true;
    }
    return false;
  }

  async checkHealth() {
    try {
      const resp = await fetch(this._getNoCacheUrl('/'), {
        method: 'GET'
      });
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
  // Envia X-Admin-Token quando o token existir na sessão
  async getEquipes() {
    try {
      const adminToken = this._getAdminToken();
      const fetchOptions = { method: 'GET' };
      if (adminToken) {
        fetchOptions.headers = { 'X-Admin-Token': adminToken };
      }
      const resp = await fetch(this._getNoCacheUrl('/api/equipes'), fetchOptions);
      if (this._handleAdminUnauthorized(resp)) return null;
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn('Falha ao obter equipes do Cloudflare D1:', e);
    }
    return null;
  }

  // Cadastrar Equipes no Cloudflare D1 (POST /api/equipes) — Requer X-Admin-Token
  async salvarEquipes(equipes) {
    try {
      const lista = Array.isArray(equipes) ? equipes : [equipes];
      const payload = lista.map(item => ({
        equipe: item.equipe || item.name || item.nome,
        escola: item.escola || item.school || "",
        categoria: item.categoria || item.category || "LEGO / Educacional",
        professor: item.professor || item.tecnico || "",
        integrantes: typeof item.integrantes === 'string' ? item.integrantes : (Array.isArray(item.integrantes) ? item.integrantes.join(', ') : ""),
        checkin: item.checkin ? 1 : 0,
        inspecao: item.inspecao ? 1 : 0
      }));

      const resp = await fetch(`${this.baseUrl}/api/equipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': this._getAdminToken()
        },
        body: JSON.stringify(payload)
      });
      this._handleAdminUnauthorized(resp);
      return { ok: resp.ok, status: resp.status, data: await resp.json().catch(() => ({})) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Atualizar Status de Credenciamento / Inspeção Técnica no D1 (POST /api/equipes/status)
  // Rota aberta para a equipe da portaria (não exige X-Admin-Token)
  async atualizarStatusEquipe(equipeOuId, { checkin, inspecao }) {
    try {
      const payload = {
        equipe: typeof equipeOuId === 'string' ? equipeOuId : undefined,
        id: typeof equipeOuId === 'number' ? equipeOuId : undefined,
        checkin: checkin !== undefined ? !!checkin : undefined,
        inspecao: inspecao !== undefined ? !!inspecao : undefined
      };

      const resp = await fetch(`${this.baseUrl}/api/equipes/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return { ok: resp.ok, status: resp.status, data: await resp.json().catch(() => ({})) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Excluir Equipe Individual por ID ou Nome (DELETE /api/equipes/:param) — Requer X-Admin-Token
  async excluirEquipe(idOuNome) {
    try {
      const param = encodeURIComponent(idOuNome);
      const resp = await fetch(`${this.baseUrl}/api/equipes/${param}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Token': this._getAdminToken()
        }
      });
      this._handleAdminUnauthorized(resp);
      return { ok: resp.ok, status: resp.status, data: await resp.json().catch(() => ({})) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Limpar Todas as Equipes do Cloudflare D1 (POST /api/equipes/limpar) — Requer X-Admin-Token
  async limparTodasEquipes() {
    try {
      const resp = await fetch(`${this.baseUrl}/api/equipes/limpar`, {
        method: 'POST',
        headers: {
          'X-Admin-Token': this._getAdminToken()
        }
      });
      this._handleAdminUnauthorized(resp);
      return { ok: resp.ok, status: resp.status, data: await resp.json().catch(() => ({})) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Obter Corridas da Pista (GET /api/corridas)
  async getCorridas() {
    try {
      const resp = await fetch(this._getNoCacheUrl('/api/corridas'), {
        method: 'GET'
      });
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn('Falha ao obter corridas do Cloudflare D1:', e);
    }
    return null;
  }

  // Sincronizar Corridas Oficiais (POST /api/corridas)
  async salvarCorridas(corridas) {
    try {
      const lista = Array.isArray(corridas) ? corridas : [corridas];
      const payload = lista.map(c => {
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

  // Excluir Corrida Individual por UUID (DELETE /api/corridas/:uuid) — Requer X-Admin-Token
  async excluirCorrida(uuid) {
    try {
      const resp = await fetch(`${this.baseUrl}/api/corridas/${encodeURIComponent(uuid)}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Token': this._getAdminToken()
        }
      });
      this._handleAdminUnauthorized(resp);
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
      const resp = await fetch(this._getNoCacheUrl('/api/avaliacoes'), {
        method: 'GET'
      });
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
      const regras = (typeof window !== 'undefined' && window.REGRAS_TORNEIO) ? window.REGRAS_TORNEIO : null;
      const payload = {
        equipe_id: avaliacao.equipe_id || avaliacao.id || "EQ-01",
        juiz_nome: avaliacao.juiz_nome || avaliacao.juiz || "Juiz Oficial",
        observacoes: avaliacao.observacoes || "",
        timestamp: avaliacao.timestamp || new Date().toISOString(),

        // Compatibilidade com Worker / SQLite D1 existente
        juiz: avaliacao.juiz_nome || avaliacao.juiz || "Juiz Oficial",
        equipe: avaliacao.equipe || avaliacao.equipe_nome || avaliacao.equipe_id || "Equipe",
        escola: avaliacao.escola || "",
        categoria: avaliacao.categoria || "LEGO / Educacional"
      };

      if (regras && Array.isArray(regras.criteriosPaddock)) {
        // Parametrização e validação centralizada via config/regrasTorneio.js
        for (const crit of regras.criteriosPaddock) {
          if (crit.ativo === false) {
            // Critério inativo na edição atual: fallback neutro 2.0 para manter compatibilidade com D1
            payload[crit.id] = 2.0;
            if (crit.colunaLegadaDb) payload[crit.colunaLegadaDb] = 2.0;
            continue;
          }
          const valorExtraido = regras.extrairNotaDeRegistro(avaliacao, crit.id);
          const valorValidado = regras.validarNota(valorExtraido);
          if (valorValidado === null) {
            return {
              ok: false,
              error: `Nota inválida (${valorExtraido}) para o critério "${crit.premio}". Valores aceitos: ${regras.escalaNotas.map(n => n.valor).join(', ')}.`
            };
          }
          payload[crit.id] = valorValidado;
          if (crit.colunaLegadaDb) {
            payload[crit.colunaLegadaDb] = valorValidado;
          }
        }
      } else {
        // Fallback caso regrasTorneio.js não esteja carregado na página
        payload.caracterizacao = Number(avaliacao.caracterizacao ?? avaliacao.nota_caracterizacao ?? 0);
        payload.caracterizacao_equipe = Number(avaliacao.caracterizacao_equipe ?? avaliacao.nota_caracterizacao_equipe ?? 0);
        payload.mecanica = Number(avaliacao.mecanica ?? avaliacao.nota_mecanica ?? 0);
        payload.superacao = Number(avaliacao.superacao ?? avaliacao.voto_superacao ?? 0);
        payload.torcida = Number(avaliacao.torcida ?? avaliacao.nota_torcida ?? 0);
        payload.fair_play = Number(avaliacao.fair_play ?? avaliacao.voto_fair_play ?? 0);

        payload.nota_mecanica = payload.mecanica;
        payload.nota_caracterizacao = payload.caracterizacao;
        payload.nota_caracterizacao_equipe = payload.caracterizacao_equipe;
        payload.voto_superacao = payload.superacao;
        payload.voto_fair_play = payload.fair_play;
        payload.nota_torcida = payload.torcida;
      }

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

  // Excluir Avaliação Individual por ID (DELETE /api/avaliacoes/:id) — Requer X-Admin-Token
  async excluirAvaliacao(id) {
    try {
      const resp = await fetch(`${this.baseUrl}/api/avaliacoes/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Token': this._getAdminToken()
        }
      });
      this._handleAdminUnauthorized(resp);
      return { ok: resp.ok, status: resp.status, data: await resp.json().catch(() => ({})) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Limpar Todas as Corridas do Cloudflare D1
  async limparTodasCorridas() {
    try {
      const corridas = await this.getCorridas();
      if (!Array.isArray(corridas) || corridas.length === 0) return { ok: true, count: 0 };
      await Promise.all(corridas.map(c => this.excluirCorrida(c.uuid)));
      return { ok: true, count: corridas.length };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Limpar Todas as Avaliações de Paddock do Cloudflare D1
  async limparTodasAvaliacoes() {
    try {
      const evals = await this.getAvaliacoes();
      if (!Array.isArray(evals) || evals.length === 0) return { ok: true, count: 0 };
      await Promise.all(evals.map(e => this.excluirAvaliacao(e.id)));
      return { ok: true, count: evals.length };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Reset Completo do Torneio no Cloudflare D1 (Equipes + Corridas + Avaliações)
  async resetarTorneioCompleto() {
    try {
      const [resEquipes, resCorridas, resEvals] = await Promise.all([
        this.limparTodasEquipes(),
        this.limparTodasCorridas(),
        this.limparTodasAvaliacoes()
      ]);
      return {
        ok: true,
        equipes: resEquipes,
        corridas: resCorridas,
        avaliacoes: resEvals
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ==========================================================================
  // ESTADO DA ARENA & TRAVA DE CONFLITO COM A PISTA DE TESTE
  // ==========================================================================

  // Consultar Estado Atual da Arena (GET /api/arena/status)
  async getArenaStatus() {
    try {
      const resp = await fetch(this._getNoCacheUrl('/api/arena/status'), {
        method: 'GET'
      });
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      // Fallback gracioso
    }
    return null;
  }

  // Publicar Estado da Arena (POST /api/arena/status)
  async salvarArenaStatus({ equipeAtual, statusAtual, equipeProxima, rodada }) {
    try {
      const payload = {
        equipe_atual: equipeAtual || '',
        status_atual: statusAtual || 'READY',
        equipe_proxima: equipeProxima || '',
        rodada: Number(rodada || 1),
        timestamp: new Date().toISOString()
      };

      const resp = await fetch(`${this.baseUrl}/api/arena/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return { ok: resp.ok, status: resp.status, data: await resp.json().catch(() => ({})) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Rota Unificada de Apuração (GET /api/apuracao)
  async getApuracao() {
    try {
      const resp = await fetch(this._getNoCacheUrl('/api/apuracao'), {
        method: 'GET'
      });
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn('Falha ao obter apuração da nuvem:', e);
    }
    return null;
  }

  // ==========================================================================
  // VOTAÇÃO DO NOME OFICIAL DO TORNEIO (/api/votos-nome)
  // ==========================================================================

  // Obter Votos e Sugestões de Nome do Torneio (GET /api/votos-nome)
  // Retorna { ok: true, total, contagem, sugestoes }
  async getVotosNome() {
    try {
      const resp = await fetch(this._getNoCacheUrl('/api/votos-nome'), {
        method: 'GET'
      });
      const data = await resp.json().catch(() => null);
      if (resp.ok && data && data.ok === true) {
        return data;
      }
      return {
        ok: false,
        error: data?.error || data?.message || `Erro HTTP ${resp.status}`
      };
    } catch (e) {
      console.warn('Falha ao obter votos do nome do torneio:', e);
      return { ok: false, error: e.message || 'Falha de conexão com o Worker.' };
    }
  }

  // Registrar Voto ou Sugestão de Nome do Torneio (POST /api/votos-nome)
  // Contrato estrito: { nome_escolhido: "...", sugestao_nova: "..." }
  async salvarVotoNome({ nome_escolhido = '', sugestao_nova = '' }) {
    try {
      const payload = {
        nome_escolhido: String(nome_escolhido || '').trim(),
        sugestao_nova: String(sugestao_nova || '').trim()
      };

      const resp = await fetch(`${this.baseUrl}/api/votos-nome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json().catch(() => ({}));
      const isSuccess = Boolean(resp.ok && data && data.ok === true);
      return {
        ok: isSuccess,
        status: resp.status,
        data,
        error: isSuccess ? null : (data?.error || data?.message || `Erro ao registrar voto (HTTP ${resp.status}).`)
      };
    } catch (e) {
      return { ok: false, error: e.message || 'Não foi possível conectar ao servidor de votação.' };
    }
  }
}

window.cloudAPI = new CloudflareTorneioAPI();

/**
 * ============================================================================
 * CLOUDFLARE WORKER API (STANDALONE / ZERO-DEPENDENCY BUNDLE)
 * Torneio de Robótica Colégio Anchieta — Edital 08/2026
 * Endpoint: https://torneio-api.gabrielsehna.workers.dev
 * ============================================================================
 * Esta versão já embute o objeto `REGRAS_TORNEIO` internamente, dispensando
 * qualquer arquivo externo. É 100% compatível tanto com o botão "Edit code"
 * no navegador do Cloudflare Dashboard quanto com deploy via Wrangler CLI.
 * ============================================================================
 */

// 1. CONFIGURAÇÃO OFICIAL CENTRALIZADA (SINGLE SOURCE OF TRUTH)
const REGRAS_TORNEIO = {
  edicao: "1º Torneio Escolar de Robótica – Etapa Colégio Anchieta",
  subtituloEdicao: "Edital V5 (CIPARE) • 05/12/2026 (14h às 18h)",
  dataEvento: "05/12/2026",
  horarioEvento: "14h às 18h",
  modalidade: "Seguidor de Linha",
  categoriaUnica: true,
  nomeCategoriaUnica: "Categoria Única",

  regrasPista: {
    tempoMaximoMs: 180000,
    alertaFinalMs: 150000,
    limiteFaltasDNF: 5,
    toleranciaReposicionamentos: 4,
    pesoFaltaDeltaEvolucao: 5.0
  },

  escalaNotas: [
    { nivel: "Básico", rotulo: "Em Desenvolvimento", valor: 1.0, destaqueMaximo: false },
    { nivel: "Atende", rotulo: "Desenvolvido", valor: 2.0, destaqueMaximo: false },
    { nivel: "Destaque", rotulo: "Superado ★", valor: 3.0, destaqueMaximo: true }
  ],

  // Catálogo Oficial de Critérios com flag 'ativo'
  criteriosPaddock: [
    {
      id: "caracterizacao",
      ativo: true,
      colunaLegadaDb: "nota_caracterizacao",
      premio: "Melhor Caracterização do Robô (Carro)",
      nomeExibicao: "🤖 1. Melhor Caracterização do Robô (Carro)",
      icone: "🤖",
      peso: 1.0,
      ordemFormulario: 1,
      ordemCerimonia: 3,
      resumoCurto: "Caracterização visual, estética temática e acabamento criativo do robô (Art. 9º, III).",
      descricao: "O robô apresenta acabamento visual criativo, estética temática bem desenvolvida e cuidado no acabamento do protótipo/carro?"
    },
    {
      id: "caracterizacao_equipe",
      ativo: true,
      colunaLegadaDb: "nota_caracterizacao_equipe",
      premio: "Melhor Caracterização da Equipe",
      nomeExibicao: "🎭 2. Melhor Caracterização da Equipe",
      icone: "🎭",
      peso: 1.0,
      ordemFormulario: 2,
      ordemCerimonia: 4,
      resumoCurto: "Caracterização pessoal, fantasia ou temática criativa dos alunos (Art. 9º, II).",
      descricao: "A equipe apresenta caracterização pessoal, fantasia, uniforme temático ou identidade criativa marcante entre seus integrantes?"
    },
    {
      id: "mecanica",
      ativo: true,
      colunaLegadaDb: "nota_mecanica",
      premio: "Melhor Mecânica",
      nomeExibicao: "⚙️ 3. Melhor Mecânica",
      icone: "⚙️",
      peso: 1.0,
      ordemFormulario: 3,
      ordemCerimonia: 1,
      resumoCurto: "Estrutura robusta, acabamento técnico e eficiência mecânica (Art. 9º, IV).",
      descricao: "A equipe apresenta a melhor estrutura, acabamento técnico de montagem e eficiência no projeto mecânico do robô?"
    },
    {
      id: "superacao",
      ativo: true,
      colunaLegadaDb: "voto_superacao",
      premio: "Prêmio Superação",
      nomeExibicao: "🚀 4. Prêmio Superação",
      icone: "🚀",
      peso: 1.0,
      ordemFormulario: 4,
      ordemCerimonia: 2,
      resumoCurto: "Resiliência e persistência diante de adversidades técnicas (Art. 9º, V).",
      descricao: "A equipe demonstrou grande resiliência e persistência técnica, superando falhas e evoluindo durante a competição?"
    },
    {
      id: "torcida",
      ativo: false, // [2026] Ocultado nesta edição conforme Art. 9º do Edital V5. Altere para true para reativar no futuro.
      colunaLegadaDb: "nota_torcida",
      premio: "Melhor Torcida",
      nomeExibicao: "📣 5. Melhor Torcida",
      icone: "📣",
      peso: 1.0,
      ordemFormulario: 5,
      ordemCerimonia: 5,
      resumoCurto: "Escola com torcida vibrante, barulhenta, com identidade visual própria e respeitosa.",
      descricao: "A escola levou uma torcida vibrante, barulhenta, com identidade visual própria e que respeitou as demais equipes?"
    },
    {
      id: "fair_play",
      ativo: true,
      colunaLegadaDb: "voto_fair_play",
      premio: "Prêmio Fair Play",
      nomeExibicao: "🤝 6. Prêmio Fair Play (Jogo Limpo)",
      icone: "🤝",
      peso: 1.0,
      ordemFormulario: 6,
      ordemCerimonia: 6,
      resumoCurto: "Postura colaborativa auxiliando equipes adversárias (Art. 9º, VI).",
      descricao: "A equipe demonstrou postura colaborativa e espírito esportivo, auxiliando outras equipes na solução de problemas?"
    }
  ],

  // 5. Matriz Oficial de Desempate por Categoria (Padronizada - Edital V5 / Opção A)
  // TODAS as categorias de Paddock agora seguem a regra padronizada:
  // 1º Menor Tempo de Pista ➔ 2º Menor Faltas na Melhor Volta ➔ 3º Voto de Minerva
  regrasDesempate: {
    // Velocidade na Pista Principal
    pista: {
      descricaoRotulo: "1º Menor Tempo Líquido ➔ 2º Menor Faltas ➔ 3º Segunda Volta",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "MENOR_SEGUNDO_TEMPO_PISTA"]
    },
    // Rubricas de Paddock — Regra Única Padronizada
    mecanica: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
      // Histórico de opções anteriores: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
    },
    superacao: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
      // Histórico de opções anteriores: ["MAIOR_DELTA_EVOLUCAO", "MENOR_FALTAS_R2", "VOTO_MINERVA"]
    },
    caracterizacao: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
      // Histórico de opções anteriores: ["MAIOR_CONTAGEM_DESTAQUE", "VOTO_MINERVA"]
    },
    caracterizacao_equipe: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
      // Histórico de opções anteriores: ["MAIOR_CONTAGEM_DESTAQUE", "VOTO_MINERVA"]
    },
    torcida: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
      // Histórico de opções anteriores: ["MAIOR_CONTAGEM_DESTAQUE", "VOTO_MINERVA"]
    },
    fair_play: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
      // Histórico de opções anteriores: ["MENOR_TOTAL_FALTAS", "VOTO_MINERVA"]
    }
  },

  getCriteriosAtivos() {
    return (this.criteriosPaddock || []).filter(c => c.ativo !== false);
  },

  getValorDestaqueMaximo() {
    const dest = this.escalaNotas.find(n => n.destaqueMaximo);
    if (dest) return Number(dest.valor);
    return Math.max(...this.escalaNotas.map(n => Number(n.valor)));
  },

  validarNota(valorBruto) {
    const num = Number(valorBruto);
    if (Number.isNaN(num)) return null;
    const valoresAceitos = this.escalaNotas.map(n => Number(n.valor));
    if (valoresAceitos.includes(num)) return num;
    return null;
  },

  extrairNotaDeRegistro(registro, criterioId) {
    if (!registro) return 0;
    const crit = this.criteriosPaddock.find(c => c.id === criterioId);
    const valDireto = registro[criterioId] ?? (crit ? registro[crit.colunaLegadaDb] : undefined) ?? registro[`nota_${criterioId}`];
    if (valDireto !== undefined && valDireto !== null) {
      return Number(valDireto) || 0;
    }
    if (registro[`voto_${criterioId}`] !== undefined) {
      return registro[`voto_${criterioId}`] ? this.getValorDestaqueMaximo() : 2.0;
    }
    return 0;
  },

  calcularEstatisticaCriterio(avaliacoesEquipe, criterioId) {
    const crit = this.criteriosPaddock.find(c => c.id === criterioId);
    const peso = crit ? Number(crit.peso || 1.0) : 1.0;
    const valorMax = this.getValorDestaqueMaximo();

    const scores = (avaliacoesEquipe || [])
      .map(ev => this.extrairNotaDeRegistro(ev, criterioId))
      .filter(s => s > 0);

    const sum = scores.reduce((a, b) => a + b, 0);
    const mediaSimples = scores.length > 0 ? sum / scores.length : 0;
    const mediaPonderada = Number((mediaSimples * peso).toFixed(2));
    const countMax = scores.filter(s => s === valorMax).length;

    return {
      avg: mediaPonderada,
      rawAvg: Number(mediaSimples.toFixed(2)),
      peso,
      scores,
      count3: countMax,
      countMax
    };
  },

  compararCandidatosPista(a, b) {
    const ordem = this.regrasDesempate.pista?.ordem || [
      "MENOR_TEMPO_PISTA",
      "MENOR_FALTAS_MELHOR_VOLTA",
      "MENOR_SEGUNDO_TEMPO_PISTA"
    ];

    for (const regra of ordem) {
      if (regra === "MENOR_TEMPO_PISTA") {
        if (a.track.bestTimeMs !== b.track.bestTimeMs) {
          return a.track.bestTimeMs - b.track.bestTimeMs;
        }
      } else if (regra === "MENOR_FALTAS_MELHOR_VOLTA") {
        if (a.track.bestTimeFouls !== b.track.bestTimeFouls) {
          return a.track.bestTimeFouls - b.track.bestTimeFouls;
        }
      } else if (regra === "MENOR_SEGUNDO_TEMPO_PISTA") {
        if (a.track.secondTimeMs !== b.track.secondTimeMs) {
          return a.track.secondTimeMs - b.track.secondTimeMs;
        }
      }
    }
    return 0;
  },

  compararCandidatosRubrica(criterioId, a, b) {
    const statA = a.rubrics?.[criterioId] || { avg: 0, count3: 0 };
    const statB = b.rubrics?.[criterioId] || { avg: 0, count3: 0 };

    if (statB.avg !== statA.avg) {
      return statB.avg - statA.avg;
    }

    const configDesempate = this.regrasDesempate[criterioId];
    const ordem = configDesempate?.ordem || [];

    for (const regra of ordem) {
      if (regra === "MENOR_TEMPO_PISTA") {
        if (a.track.bestTimeMs !== b.track.bestTimeMs) {
          return a.track.bestTimeMs - b.track.bestTimeMs;
        }
      } else if (regra === "MENOR_FALTAS_MELHOR_VOLTA") {
        if (a.track.bestTimeFouls !== b.track.bestTimeFouls) {
          return a.track.bestTimeFouls - b.track.bestTimeFouls;
        }
      } else if (regra === "MENOR_SEGUNDO_TEMPO_PISTA") {
        if (a.track.secondTimeMs !== b.track.secondTimeMs) {
          return a.track.secondTimeMs - b.track.secondTimeMs;
        }
      } else if (regra === "MAIOR_DELTA_EVOLUCAO") {
        if (b.track.deltaEvolucao !== a.track.deltaEvolucao) {
          return b.track.deltaEvolucao - a.track.deltaEvolucao;
        }
      } else if (regra === "MENOR_FALTAS_R2") {
        if (a.track.r2Fouls !== b.track.r2Fouls) {
          return a.track.r2Fouls - b.track.r2Fouls;
        }
      } else if (regra === "MAIOR_CONTAGEM_DESTAQUE") {
        const cA = statA.countMax ?? statA.count3 ?? 0;
        const cB = statB.countMax ?? statB.count3 ?? 0;
        if (cB !== cA) {
          return cB - cA;
        }
      } else if (regra === "MENOR_TOTAL_FALTAS") {
        if (a.track.totalFaltas !== b.track.totalFaltas) {
          return a.track.totalFaltas - b.track.totalFaltas;
        }
      } else if (regra === "VOTO_MINERVA") {
        return 0;
      }
    }
    return 0;
  }
};

// 2. CONFIGURAÇÃO DE HEADERS E UTILITÁRIOS HTTP
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Content-Type': 'application/json; charset=utf-8'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS
  });
}

function calcularEstatisticaPistaEquipe(nomeEquipe, corridas) {
  const pesoFaltaDelta = Number(REGRAS_TORNEIO?.regrasPista?.pesoFaltaDeltaEvolucao ?? 5.0);
  const runs = (corridas || []).filter(
    c => (c.equipe || '').trim().toLowerCase() === (nomeEquipe || '').trim().toLowerCase()
  );
  const validRuns = runs
    .filter(c => c.status === 'VALID' && Number(c.tempo_ms) > 0)
    .sort((a, b) => Number(a.tempo_ms) - Number(b.tempo_ms));

  const r1 = runs.find(c => Number(c.rodada) === 1);
  const r2 = runs.find(c => Number(c.rodada) === 2);
  const bestRun = validRuns[0] || null;
  const otherRun = validRuns[1] || null;

  let deltaEvolucao = 0;
  if (r1 && r2 && r1.status === 'VALID' && r2.status === 'VALID') {
    const diffSeg = (Number(r1.tempo_ms) - Number(r2.tempo_ms)) / 1000;
    const diffFaltas = (Number(r1.infracoes || 0) - Number(r2.infracoes || 0)) * pesoFaltaDelta;
    deltaEvolucao = Number((diffSeg + diffFaltas).toFixed(2));
  }

  const totalFaltas = runs.reduce((acc, c) => acc + (Number(c.infracoes) || 0), 0);

  return {
    hasValidRun: validRuns.length > 0,
    bestTimeMs: bestRun ? Number(bestRun.tempo_ms) : Infinity,
    bestTimeFouls: bestRun ? Number(bestRun.infracoes || 0) : 99,
    secondTimeMs: otherRun ? Number(otherRun.tempo_ms) : Infinity,
    deltaEvolucao,
    r2Fouls: r2 ? Number(r2.infracoes || 0) : 99,
    totalFaltas
  };
}

function calcularRankingsOficiais(equipes, corridas, avaliacoes) {
  const candidatos = (equipes || []).map(eq => {
    const nome = eq.equipe || eq.name;
    const eqId = eq.id ? `EQ-${String(eq.id).padStart(2, '0')}` : (eq.equipe_id || 'EQ-01');
    const track = calcularEstatisticaPistaEquipe(nome, corridas);

    const evalsEquipe = (avaliacoes || []).filter(ev => {
      const evName = (ev.equipe || '').trim().toLowerCase();
      const evId = (ev.equipe_id || '').trim().toLowerCase();
      return (evName && evName === nome.trim().toLowerCase()) || (evId && evId === eqId.toLowerCase());
    });

    const rubrics = {};
    for (const crit of (REGRAS_TORNEIO.criteriosPaddock || []).filter(c => c.ativo !== false)) {
      rubrics[crit.id] = REGRAS_TORNEIO.calcularEstatisticaCriterio(evalsEquipe, crit.id);
    }

    return {
      team: { id: eqId, name: nome, school: eq.escola || '', category: eq.categoria || 'LEGO / Educacional' },
      track,
      rubrics
    };
  });

  const rankingPista = [...candidatos]
    .sort((a, b) => REGRAS_TORNEIO.compararCandidatosPista(a, b))
    .map((item, idx) => ({
      posicao: idx + 1,
      equipe: item.team.name,
      escola: item.team.school,
      categoria: item.team.category,
      melhorTempoMs: item.track.hasValidRun ? item.track.bestTimeMs : null,
      faltasMelhorVolta: item.track.hasValidRun ? item.track.bestTimeFouls : null,
      voltaValida: item.track.hasValidRun
    }));

  const rankingsPaddock = {};
  for (const crit of (REGRAS_TORNEIO.criteriosPaddock || []).filter(c => c.ativo !== false)) {
    const ordenados = [...candidatos].sort((a, b) => REGRAS_TORNEIO.compararCandidatosRubrica(crit.id, a, b));
    rankingsPaddock[crit.id] = {
      criterioId: crit.id,
      premio: crit.premio,
      peso: crit.peso,
      regraDesempate: REGRAS_TORNEIO.regrasDesempate[crit.id]?.descricaoRotulo || '',
      classificacao: ordenados.map((item, idx) => ({
        posicao: idx + 1,
        equipe: item.team.name,
        escola: item.team.school,
        mediaPonderada: item.rubrics[crit.id].avg,
        mediaSimples: item.rubrics[crit.id].rawAvg,
        votosDestaque: item.rubrics[crit.id].count3
      }))
    };
  }

  return {
    edicao: REGRAS_TORNEIO.edicao,
    rankingPista,
    rankingsPaddock
  };
}

// 3. HANDLER PRINCIPAL DO WORKER
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/' && request.method === 'GET') {
        return jsonResponse({
          status: 'online',
          edicao: REGRAS_TORNEIO.edicao,
          subtitulo: REGRAS_TORNEIO.subtituloEdicao
        });
      }

      if (path === '/api/regras' && request.method === 'GET') {
        return jsonResponse(REGRAS_TORNEIO);
      }

      // ROTAS DE EQUIPES (/api/equipes)
      if (path === '/api/equipes' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM equipes ORDER BY id ASC').all();
        return jsonResponse(results || []);
      }

      if (path === '/api/equipes' && request.method === 'POST') {
        const body = await request.json();
        const lista = Array.isArray(body) ? body : [body];
        for (const item of lista) {
          const nome = (item.equipe || item.name || '').trim();
          const escola = (item.escola || item.school || '').trim();
          const categoria = (item.categoria || item.category || 'LEGO / Educacional').trim();
          const professor = (item.professor || item.tecnico || '').trim();
          const integrantes = (typeof item.integrantes === 'string' 
            ? item.integrantes 
            : (Array.isArray(item.integrantes) ? item.integrantes.join(', ') : '')).trim();
          const checkin = item.checkin ? 1 : 0;
          const inspecao = item.inspecao ? 1 : 0;
          if (!nome) continue;

          try {
            await env.DB.prepare(
              `INSERT INTO equipes (equipe, escola, categoria, professor, integrantes, checkin, inspecao)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(equipe) DO UPDATE SET
                 escola = excluded.escola,
                 categoria = excluded.categoria,
                 professor = CASE WHEN excluded.professor != '' THEN excluded.professor ELSE equipes.professor END,
                 integrantes = CASE WHEN excluded.integrantes != '' THEN excluded.integrantes ELSE equipes.integrantes END,
                 checkin = excluded.checkin,
                 inspecao = excluded.inspecao`
            ).bind(nome, escola, categoria, professor, integrantes, checkin, inspecao).run();
          } catch (errDb) {
            await env.DB.prepare(
              'INSERT OR REPLACE INTO equipes (equipe, escola, categoria) VALUES (?, ?, ?)'
            ).bind(nome, escola, categoria).run();
          }
        }
        return jsonResponse({ ok: true, count: lista.length });
      }

      // Rota rápida para alternar Check-in e Inspeção Técnica (POST ou PATCH)
      if ((path === '/api/equipes/status' || path.startsWith('/api/equipes/status/')) && (request.method === 'POST' || request.method === 'PATCH')) {
        const body = await request.json();
        const equipe = (body.equipe || body.name || '').trim();
        const id = body.id || null;
        const checkin = body.checkin !== undefined ? (body.checkin ? 1 : 0) : null;
        const inspecao = body.inspecao !== undefined ? (body.inspecao ? 1 : 0) : null;

        try {
          if (checkin !== null && inspecao !== null) {
            await env.DB.prepare(
              'UPDATE equipes SET checkin = ?, inspecao = ? WHERE id = ? OR equipe = ?'
            ).bind(checkin, inspecao, id, equipe).run();
          } else if (checkin !== null) {
            await env.DB.prepare(
              'UPDATE equipes SET checkin = ? WHERE id = ? OR equipe = ?'
            ).bind(checkin, id, equipe).run();
          } else if (inspecao !== null) {
            await env.DB.prepare(
              'UPDATE equipes SET inspecao = ? WHERE id = ? OR equipe = ?'
            ).bind(inspecao, id, equipe).run();
          }
          return jsonResponse({ ok: true, checkin, inspecao });
        } catch (errStatus) {
          return jsonResponse({ ok: false, error: errStatus.message }, 500);
        }
      }

      if (path === '/api/equipes/limpar' && request.method === 'POST') {
        await env.DB.prepare('DELETE FROM equipes').run();
        return jsonResponse({ ok: true });
      }

      if (path.startsWith('/api/equipes/') && request.method === 'DELETE') {
        const param = decodeURIComponent(path.replace('/api/equipes/', ''));
        await env.DB.prepare('DELETE FROM equipes WHERE id = ? OR equipe = ?').bind(param, param).run();
        return jsonResponse({ ok: true });
      }

      // ======================================================================
      // ESTADO DA ARENA & TRAVA DE CONFLITO COM PISTA DE TESTE (/api/arena/status)
      // ======================================================================
      if (path === '/api/arena/status' && request.method === 'GET') {
        try {
          const row = await env.DB.prepare('SELECT * FROM arena_status WHERE id = 1').first();
          if (row) {
            return jsonResponse({
              ok: true,
              equipe_atual: row.equipe_atual || '',
              status_atual: row.status_atual || 'READY',
              equipe_proxima: row.equipe_proxima || '',
              rodada: row.rodada || 1,
              updated_at: row.updated_at
            });
          }
        } catch (_) {}
        return jsonResponse({
          ok: true,
          equipe_atual: '',
          status_atual: 'READY',
          equipe_proxima: '',
          rodada: 1
        });
      }

      if (path === '/api/arena/status' && request.method === 'POST') {
        const body = await request.json();
        const equipeAtual = (body.equipe_atual || body.equipeAtual || '').trim();
        const statusAtual = (body.status_atual || body.statusAtual || 'READY').trim();
        const equipeProxima = (body.equipe_proxima || body.equipeProxima || '').trim();
        const rodada = Number(body.rodada || 1);

        try {
          await env.DB.prepare(
            `INSERT INTO arena_status (id, equipe_atual, status_atual, equipe_proxima, rodada, updated_at)
             VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET
               equipe_atual = excluded.equipe_atual,
               status_atual = excluded.status_atual,
               equipe_proxima = excluded.equipe_proxima,
               rodada = excluded.rodada,
               updated_at = CURRENT_TIMESTAMP`
          ).bind(equipeAtual, statusAtual, equipeProxima, rodada).run();
          return jsonResponse({ ok: true, equipe_atual: equipeAtual, status_atual: statusAtual, equipe_proxima: equipeProxima, rodada });
        } catch (errDb) {
          return jsonResponse({ ok: true, fallback: true, equipe_atual: equipeAtual, status_atual: statusAtual });
        }
      }

      // ROTAS DE CORRIDAS DE PISTA (/api/corridas)
      if (path === '/api/corridas' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM corridas ORDER BY timestamp DESC').all();
        return jsonResponse(results || []);
      }

      if (path === '/api/corridas' && request.method === 'POST') {
        const body = await request.json();
        const lista = Array.isArray(body) ? body : [body];
        for (const c of lista) {
          await env.DB.prepare(
            `INSERT OR REPLACE INTO corridas (uuid, equipe, escola, categoria, rodada, tempo_ms, infracoes, status, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            c.uuid || ('REC-' + Date.now()),
            c.equipe || 'Equipe',
            c.escola || '',
            c.categoria || 'LEGO / Educacional',
            Number(c.rodada || 1),
            Number(c.tempo_ms || 0),
            Number(c.infracoes || 0),
            c.status || 'VALID',
            c.timestamp || new Date().toISOString()
          ).run();
        }
        return jsonResponse({ ok: true, count: lista.length });
      }

      if (path.startsWith('/api/corridas/') && request.method === 'DELETE') {
        const uuid = decodeURIComponent(path.replace('/api/corridas/', ''));
        await env.DB.prepare('DELETE FROM corridas WHERE uuid = ?').bind(uuid).run();
        return jsonResponse({ ok: true });
      }

      // ROTAS DE AVALIAÇÕES DE PADDOCK (/api/avaliacoes)
      if (path === '/api/avaliacoes' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM avaliacoes ORDER BY id DESC').all();
        return jsonResponse(results || []);
      }

      if (path === '/api/avaliacoes' && request.method === 'POST') {
        const body = await request.json();
        const notasValidadas = {};

        for (const crit of REGRAS_TORNEIO.criteriosPaddock) {
          if (crit.ativo === false) {
            notasValidadas[crit.id] = 2.0;
            continue;
          }
          const bruto = REGRAS_TORNEIO.extrairNotaDeRegistro(body, crit.id);
          const validada = REGRAS_TORNEIO.validarNota(bruto);
          if (validada === null) {
            return jsonResponse({
              ok: false,
              error: `Nota inválida (${bruto}) para o critério "${crit.premio}". Valores permitidos em REGRAS_TORNEIO: ${REGRAS_TORNEIO.escalaNotas.map(n => n.valor).join(', ')}`
            }, 400);
          }
          notasValidadas[crit.id] = validada;
        }

        const equipeNome = body.equipe || body.equipe_id || 'Equipe';
        const juizNome = body.juiz_nome || body.juiz || 'Juiz Oficial';
        const obs = body.observacoes || '';
        const ts = body.timestamp || new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO avaliacoes (
            equipe_id, equipe, escola, categoria, juiz_nome, juiz,
            caracterizacao, caracterizacao_equipe, mecanica, superacao, torcida, fair_play,
            nota_caracterizacao, nota_caracterizacao_equipe, nota_mecanica, voto_superacao, nota_torcida, voto_fair_play,
            observacoes, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          body.equipe_id || 'EQ-01',
          equipeNome,
          body.escola || '',
          body.categoria || 'LEGO / Educacional',
          juizNome,
          juizNome,
          notasValidadas.caracterizacao,
          notasValidadas.caracterizacao_equipe || 2.0,
          notasValidadas.mecanica,
          notasValidadas.superacao,
          notasValidadas.torcida,
          notasValidadas.fair_play,
          notasValidadas.caracterizacao,
          notasValidadas.caracterizacao_equipe || 2.0,
          notasValidadas.mecanica,
          notasValidadas.superacao,
          notasValidadas.torcida,
          notasValidadas.fair_play,
          obs,
          ts
        ).run();

        return jsonResponse({ ok: true, notas: notasValidadas });
      }

      if (path.startsWith('/api/avaliacoes/') && request.method === 'DELETE') {
        const id = decodeURIComponent(path.replace('/api/avaliacoes/', ''));
        await env.DB.prepare('DELETE FROM avaliacoes WHERE id = ?').bind(id).run();
        return jsonResponse({ ok: true });
      }

      // ROTA UNIFICADA DE APURAÇÃO (/api/apuracao)
      if (path === '/api/apuracao' && request.method === 'GET') {
        const [eqRes, corRes, avRes] = await Promise.all([
          env.DB.prepare('SELECT * FROM equipes ORDER BY id ASC').all(),
          env.DB.prepare('SELECT * FROM corridas ORDER BY timestamp DESC').all(),
          env.DB.prepare('SELECT * FROM avaliacoes ORDER BY id DESC').all()
        ]);

        const equipes = eqRes.results || [];
        const corridas = corRes.results || [];
        const avaliacoes = avRes.results || [];
        const rankingsOficiais = calcularRankingsOficiais(equipes, corridas, avaliacoes);

        return jsonResponse({
          edicao: REGRAS_TORNEIO.edicao,
          equipes,
          corridas,
          avaliacoes,
          rankingsOficiais
        });
      }

      return jsonResponse({ error: 'Rota não encontrada' }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  }
};

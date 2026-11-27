/**
 * ============================================================================
 * CLOUDFLARE WORKER API (STANDALONE / ZERO-DEPENDENCY BUNDLE)
 * 1º Torneio Escolar de Robótica – Etapa Colégio Anchieta (Edital V7)
 * Endpoint: https://torneio-api.gabrielsehna.workers.dev
 * ============================================================================
 * Compatível 100% com as tabelas reais do Cloudflare D1 (`torneio-db`):
 *   - equipes
 *   - corridas_pista
 *   - avaliacoes_juizes (+ nota_caracterizacao_equipe)
 *   - arena_status (atualizado_em)
 *   - votos_nome (Votação QR Code)
 * ============================================================================
 */

const REGRAS_TORNEIO = {
  edicao: "1º Torneio Escolar de Robótica – Etapa Colégio Anchieta",
  subtituloEdicao: "Edital V7 • 05/12/2026 (14h às 18h)",
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

  criteriosPaddock: [
    {
      id: "caracterizacao",
      ativo: true,
      colunaDb: "nota_caracterizacao",
      premio: "Melhor Caracterização do Robô (Carro)",
      nomeExibicao: "🤖 1. Melhor Caracterização do Robô (Carro)",
      icone: "🤖",
      peso: 1.0,
      ordemFormulario: 1,
      ordemCerimonia: 3
    },
    {
      id: "caracterizacao_equipe",
      ativo: true,
      colunaDb: "nota_caracterizacao_equipe",
      premio: "Melhor Caracterização da Equipe",
      nomeExibicao: "🎭 2. Melhor Caracterização da Equipe",
      icone: "🎭",
      peso: 1.0,
      ordemFormulario: 2,
      ordemCerimonia: 4
    },
    {
      id: "mecanica",
      ativo: true,
      colunaDb: "nota_mecanica",
      premio: "Melhor Mecânica",
      nomeExibicao: "⚙️ 3. Melhor Mecânica",
      icone: "⚙️",
      peso: 1.0,
      ordemFormulario: 3,
      ordemCerimonia: 1
    },
    {
      id: "superacao",
      ativo: true,
      colunaDb: "voto_superacao",
      premio: "Prêmio Superação",
      nomeExibicao: "🚀 4. Prêmio Superação",
      icone: "🚀",
      peso: 1.0,
      ordemFormulario: 4,
      ordemCerimonia: 2
    },
    {
      id: "torcida",
      ativo: false,
      colunaDb: "nota_torcida",
      premio: "Melhor Torcida",
      nomeExibicao: "📣 Melhor Torcida",
      icone: "📣",
      peso: 1.0,
      ordemFormulario: 99,
      ordemCerimonia: 99
    },
    {
      id: "fair_play",
      ativo: true,
      colunaDb: "voto_fair_play",
      premio: "Prêmio Fair Play",
      nomeExibicao: "🤝 5. Prêmio Fair Play (Jogo Limpo)",
      icone: "🤝",
      peso: 1.0,
      ordemFormulario: 5,
      ordemCerimonia: 5
    }
  ],

  regrasDesempate: {
    pista: {
      descricaoRotulo: "1º Menor Tempo Líquido ➔ 2º Menor Faltas ➔ 3º Segunda Volta ➔ 4º Faltas 2ª Volta",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "MENOR_SEGUNDO_TEMPO_PISTA", "MENOR_FALTAS_SEGUNDA_VOLTA"]
    },
    mecanica: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
    },
    superacao: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
    },
    caracterizacao: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
    },
    caracterizacao_equipe: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
    },
    fair_play: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
    }
  },

  getCriteriosAtivos() {
    return (this.criteriosPaddock || []).filter(c => c.ativo !== false);
  },

  extrairNotaDeRegistro(ev, criterioId) {
    if (!ev) return 0;
    const crit = (this.criteriosPaddock || []).find(c => c.id === criterioId);
    const col = crit ? crit.colunaDb : null;
    const raw = ev[criterioId] !== undefined
      ? ev[criterioId]
      : (col && ev[col] !== undefined ? ev[col] : 0);
    return Number(raw || 0);
  },

  validarNota(valor) {
    const num = Number(valor);
    if (!Number.isFinite(num)) return null;
    const permitidos = (this.escalaNotas || []).map(n => Number(n.valor));
    return permitidos.includes(num) ? num : null;
  },

  calcularEstatisticaCriterio(evalsEquipe, criterioId) {
    if (!evalsEquipe || evalsEquipe.length === 0) {
      return { avg: 0, weightedScore: 0, countMax: 0, count: 0 };
    }
    const crit = (this.criteriosPaddock || []).find(c => c.id === criterioId);
    const peso = Number(crit?.peso ?? 1.0);
    const valoresMax = (this.escalaNotas || []).filter(n => n.destaqueMaximo).map(n => Number(n.valor));
    const maxVal = valoresMax.length > 0 ? Math.max(...valoresMax) : 3.0;

    let sum = 0;
    let validCount = 0;
    let countMax = 0;

    for (const ev of evalsEquipe) {
      const val = this.extrairNotaDeRegistro(ev, criterioId);
      if (val > 0) {
        sum += val;
        validCount++;
        if (val >= maxVal) countMax++;
      }
    }

    if (validCount === 0) {
      return { avg: 0, weightedScore: 0, countMax: 0, count: 0 };
    }
    const avg = Number((sum / validCount).toFixed(2));
    return { avg, weightedScore: Number((avg * peso).toFixed(2)), countMax, count: validCount };
  },

  compararCandidatosPista(a, b) {
    const aValid = !!a.track?.hasValidRun;
    const bValid = !!b.track?.hasValidRun;
    if (aValid !== bValid) return aValid ? -1 : 1;
    if (!aValid && !bValid) return 0;

    if (a.track.bestTimeMs !== b.track.bestTimeMs) {
      return a.track.bestTimeMs - b.track.bestTimeMs;
    }
    if (a.track.bestTimeFouls !== b.track.bestTimeFouls) {
      return a.track.bestTimeFouls - b.track.bestTimeFouls;
    }
    const aHasSecond = Number.isFinite(a.track.secondTimeMs);
    const bHasSecond = Number.isFinite(b.track.secondTimeMs);
    if (aHasSecond !== bHasSecond) return aHasSecond ? -1 : 1;
    if (aHasSecond && bHasSecond) {
      if (a.track.secondTimeMs !== b.track.secondTimeMs) {
        return a.track.secondTimeMs - b.track.secondTimeMs;
      }
      if (a.track.secondTimeFouls !== b.track.secondTimeFouls) {
        return a.track.secondTimeFouls - b.track.secondTimeFouls;
      }
    }
    return 0;
  },

  compararCandidatosRubrica(criterioId, a, b) {
    const statA = a.rubrics?.[criterioId] || { avg: 0, countMax: 0 };
    const statB = b.rubrics?.[criterioId] || { avg: 0, countMax: 0 };

    if (statB.avg !== statA.avg) {
      return statB.avg - statA.avg;
    }

    const ordem = this.regrasDesempate[criterioId]?.ordem || ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"];
    for (const regra of ordem) {
      if (regra === "MENOR_TEMPO_PISTA") {
        const aValid = !!a.track?.hasValidRun;
        const bValid = !!b.track?.hasValidRun;
        if (aValid !== bValid) return aValid ? -1 : 1;
        if (aValid && bValid && a.track.bestTimeMs !== b.track.bestTimeMs) {
          return a.track.bestTimeMs - b.track.bestTimeMs;
        }
      } else if (regra === "MENOR_FALTAS_MELHOR_VOLTA") {
        if (a.track?.hasValidRun && b.track?.hasValidRun && a.track.bestTimeFouls !== b.track.bestTimeFouls) {
          return a.track.bestTimeFouls - b.track.bestTimeFouls;
        }
      } else if (regra === "MAIOR_CONTAGEM_DESTAQUE") {
        if ((statB.countMax || 0) !== (statA.countMax || 0)) {
          return (statB.countMax || 0) - (statA.countMax || 0);
        }
      } else if (regra === "VOTO_MINERVA") {
        return 0;
      }
    }
    return 0;
  }
};

const ALLOWED_ORIGINS = [
  'https://darksehna.github.io'
];

function getCorsHeaders(request) {
  const origin = request ? (request.headers.get('Origin') || '') : '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : 'null';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
    'Vary': 'Origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function jsonResponse(data, status = 200, request = null) {
  return new Response(JSON.stringify(data), { status, headers: getCorsHeaders(request) });
}

function checkAdminAuth(request, env) {
  const secret = (env && env.ADMIN_SECRET_KEY) ? String(env.ADMIN_SECRET_KEY).trim() : '';
  if (!secret) return false;
  const token = (request.headers.get('X-Admin-Token') || '').trim();
  return token === secret;
}

function calcularEstatisticaPistaEquipe(nomeEquipe, corridas) {
  const pesoFaltaDelta = Number(REGRAS_TORNEIO.regrasPista.pesoFaltaDeltaEvolucao ?? 5.0);
  const runs = (corridas || []).filter(
    c => (c.equipe || '').trim().toLowerCase() === (nomeEquipe || '').trim().toLowerCase()
  );
  const validRuns = runs
    .filter(c => c.status === 'VALID' && Number(c.tempo_ms) > 0)
    .sort((a, b) => {
      const dt = Number(a.tempo_ms) - Number(b.tempo_ms);
      return dt !== 0 ? dt : Number(a.infracoes || 0) - Number(b.infracoes || 0);
    });

  const r1 = runs.find(c => Number(c.rodada) === 1);
  const r2 = runs.find(c => Number(c.rodada) === 2);
  const bestRun = validRuns[0] || null;
  const secondRun = validRuns[1] || null;

  let deltaEvolucao = 0;
  if (r1 && r2 && r1.status === 'VALID' && r2.status === 'VALID') {
    const diffSeg = (Number(r1.tempo_ms) - Number(r2.tempo_ms)) / 1000;
    const diffFaltas = (Number(r1.infracoes || 0) - Number(r2.infracoes || 0)) * pesoFaltaDelta;
    deltaEvolucao = Number((diffSeg + diffFaltas).toFixed(2));
  }

  const totalFaltas = runs.reduce((acc, c) => acc + (Number(c.infracoes) || 0), 0);

  return {
    hasValidRun: validRuns.length > 0,
    validCount: validRuns.length,
    dnfCount: runs.filter(c => c.status === 'DNF' || c.status === 'TIME_UP').length,
    bestTimeMs: bestRun ? Number(bestRun.tempo_ms) : Infinity,
    bestTimeFouls: bestRun ? Number(bestRun.infracoes || 0) : 99,
    secondTimeMs: secondRun ? Number(secondRun.tempo_ms) : Infinity,
    secondTimeFouls: secondRun ? Number(secondRun.infracoes || 0) : 99,
    deltaEvolucao,
    r2Fouls: r2 ? Number(r2.infracoes || 0) : 99,
    totalFaltas
  };
}

function calcularRankingsOficiais(equipes, corridas, avaliacoes) {
  const candidatos = (equipes || []).map(eq => {
    const nome = eq.equipe || eq.name;
    const eqId = eq.id ? `EQ-${String(eq.id).padStart(2, '0')}` : 'EQ-01';
    const track = calcularEstatisticaPistaEquipe(nome, corridas);

    const evalsEquipe = (avaliacoes || []).filter(ev => {
      const evName = (ev.equipe || '').trim().toLowerCase();
      return evName && evName === nome.trim().toLowerCase();
    });

    const rubrics = {};
    for (const crit of REGRAS_TORNEIO.getCriteriosAtivos()) {
      rubrics[crit.id] = REGRAS_TORNEIO.calcularEstatisticaCriterio(evalsEquipe, crit.id);
    }

    return {
      team: { id: eqId, name: nome, school: eq.escola || '', category: eq.categoria || 'Categoria Única' },
      track,
      rubrics
    };
  });

  // Ranking completo de pista (equipes 2 DNF ficam ao final com voltaValida = false)
  const ordenadosPista = [...candidatos].sort((a, b) => REGRAS_TORNEIO.compararCandidatosPista(a, b));
  const rankingPista = ordenadosPista.map((item, idx) => ({
    posicao: item.track.hasValidRun ? idx + 1 : null,
    equipe: item.team.name,
    escola: item.team.school,
    categoria: item.team.category,
    melhorTempoMs: item.track.hasValidRun ? item.track.bestTimeMs : null,
    faltasMelhorVolta: item.track.hasValidRun ? item.track.bestTimeFouls : null,
    segundaVoltaMs: Number.isFinite(item.track.secondTimeMs) ? item.track.secondTimeMs : null,
    voltaValida: item.track.hasValidRun,
    statusPista: item.track.hasValidRun ? 'VALID' : 'DNF'
  }));

  // Pódio Oficial da Pista (APENAS equipes com voltaValida = true; 2 DNF nunca entram no pódio)
  const podioPista = ordenadosPista.filter(c => c.track.hasValidRun).slice(0, 3);
  const premiosContagem = new Map();
  for (const c of candidatos) premiosContagem.set(c.team.name.toLowerCase(), 0);
  for (const p of podioPista) {
    const key = p.team.name.toLowerCase();
    premiosContagem.set(key, (premiosContagem.get(key) || 0) + 1);
  }

  // Detecta empate técnico residual no Top 3 da pista
  let empateTecnicoPista = false;
  for (let i = 0; i < podioPista.length - 1; i++) {
    if (REGRAS_TORNEIO.compararCandidatosPista(podioPista[i], podioPista[i + 1]) === 0) {
      empateTecnicoPista = true;
      break;
    }
  }

  // Rankings por Rubrica de Paddock (equipes 2 DNF continuam 100% elegíveis!)
  // Inclui Fallback Automático de Exclusividade caso haja menos equipes do que prêmios
  const rankingsPaddock = {};
  const criteriosCerimonia = [...REGRAS_TORNEIO.getCriteriosAtivos()]
    .sort((a, b) => (a.ordemCerimonia || 99) - (b.ordemCerimonia || 99));

  let fallbackExclusividadeAplicado = false;

  for (const crit of criteriosCerimonia) {
    const ordenados = [...candidatos].sort((a, b) => REGRAS_TORNEIO.compararCandidatosRubrica(crit.id, a, b));

    // Escolha do vencedor respeitando exclusividade quando possível;
    // se todas as equipes avaliadas já tiverem ganhado prêmio (ex.: < 8 equipes), faz fallback para quem tem menos prêmios
    const avaliados = ordenados.filter(c => (c.rubrics[crit.id]?.count || 0) > 0);
    let vencedor = avaliados.find(c => (premiosContagem.get(c.team.name.toLowerCase()) || 0) === 0) || null;

    if (!vencedor && avaliados.length > 0) {
      fallbackExclusividadeAplicado = true;
      vencedor = [...avaliados].sort((a, b) => {
        const pA = premiosContagem.get(a.team.name.toLowerCase()) || 0;
        const pB = premiosContagem.get(b.team.name.toLowerCase()) || 0;
        if (pA !== pB) return pA - pB;
        return REGRAS_TORNEIO.compararCandidatosRubrica(crit.id, a, b);
      })[0];
    }

    if (vencedor) {
      const k = vencedor.team.name.toLowerCase();
      premiosContagem.set(k, (premiosContagem.get(k) || 0) + 1);
    }

    rankingsPaddock[crit.id] = {
      criterioId: crit.id,
      premio: crit.premio,
      peso: crit.peso,
      regraDesempate: REGRAS_TORNEIO.regrasDesempate[crit.id]?.descricaoRotulo || '',
      vencedorExclusivo: vencedor ? vencedor.team.name : null,
      classificacao: ordenados.map((item, idx) => ({
        posicao: idx + 1,
        equipe: item.team.name,
        escola: item.team.school,
        categoria: item.team.category,
        media: item.rubrics[crit.id]?.avg || 0,
        notaPonderada: item.rubrics[crit.id]?.weightedScore || 0,
        avaliacoesCount: item.rubrics[crit.id]?.count || 0,
        destaquesCount: item.rubrics[crit.id]?.countMax || 0,
        melhorTempoMs: item.track.hasValidRun ? item.track.bestTimeMs : null
      }))
    };
  }

  return {
    rankingPista,
    podioPista: podioPista.map((p, i) => ({ posicao: i + 1, equipe: p.team.name, melhorTempoMs: p.track.bestTimeMs })),
    empateTecnicoPista,
    fallbackExclusividadeAplicado,
    rankingsPaddock
  };
}

export default {
  async fetch(request, env) {
    const reqOrigin = request.headers.get('Origin') || '';
    if (reqOrigin && !ALLOWED_ORIGINS.includes(reqOrigin)) {
      return new Response(JSON.stringify({ error: 'Origem não autorizada (CORS).' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: getCorsHeaders(request) });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/' && request.method === 'GET') {
        return jsonResponse({
          status: 'online',
          service: 'torneio-api',
          edicao: REGRAS_TORNEIO.edicao,
          subtitulo: REGRAS_TORNEIO.subtituloEdicao,
          timestamp: new Date().toISOString()
        });
      }

      if (path === '/api/regras' && request.method === 'GET') {
        return jsonResponse({ ok: true, regras: REGRAS_TORNEIO });
      }

      // ======================================================================
      // EQUIPES (/api/equipes)
      // ======================================================================
      if (path === '/api/equipes' && request.method === 'GET') {
        const isAdmin = checkAdminAuth(request, env);
        const sql = isAdmin
          ? 'SELECT * FROM equipes ORDER BY id ASC'
          : 'SELECT id, equipe, escola, categoria, professor, checkin, inspecao FROM equipes ORDER BY id ASC';
        const { results } = await env.DB.prepare(sql).all();
        return jsonResponse(results || [], 200, request);
      }

      if (path === '/api/equipes' && request.method === 'POST') {
        if (!checkAdminAuth(request, env)) return jsonResponse({ ok: false, error: 'Acesso não autorizado (X-Admin-Token).' }, 401, request);
        const body = await request.json();
        const lista = Array.isArray(body) ? body : [body];
        let count = 0;

        for (const item of lista) {
          const nome = (item.equipe || item.name || '').trim();
          const escola = (item.escola || item.school || '').trim();
          const categoria = (item.categoria || item.category || 'Categoria Única').trim();
          const professor = (item.professor || item.tecnico || '').trim();
          const integrantes = (typeof item.integrantes === 'string'
            ? item.integrantes
            : (Array.isArray(item.integrantes) ? item.integrantes.join(', ') : '')).trim();
          const checkin = item.checkin ? 1 : 0;
          const inspecao = item.inspecao ? 1 : 0;
          if (!nome) continue;

          const existing = await env.DB.prepare(
            'SELECT id FROM equipes WHERE LOWER(TRIM(equipe)) = LOWER(TRIM(?))'
          ).bind(nome).first();

          if (existing) {
            await env.DB.prepare(
              `UPDATE equipes SET
                 escola = ?,
                 categoria = ?,
                 professor = CASE WHEN ? != '' THEN ? ELSE professor END,
                 integrantes = CASE WHEN ? != '' THEN ? ELSE integrantes END,
                 checkin = MAX(checkin, ?),
                 inspecao = MAX(inspecao, ?)
               WHERE id = ?`
            ).bind(escola, categoria, professor, professor, integrantes, integrantes, checkin, inspecao, existing.id).run();
          } else {
            await env.DB.prepare(
              `INSERT INTO equipes (equipe, escola, categoria, professor, integrantes, checkin, inspecao)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).bind(nome, escola, categoria, professor, integrantes, checkin, inspecao).run();
          }
          count++;
        }
        return jsonResponse({ ok: true, count });
      }

      if ((path === '/api/equipes/status' || path.startsWith('/api/equipes/status/')) && (request.method === 'POST' || request.method === 'PATCH' || request.method === 'PUT')) {
        const body = await request.json();
        const nome = (body.equipe || body.name || '').trim();
        if (!nome) return jsonResponse({ ok: false, error: 'Equipe não informada' }, 400);

        const updates = [];
        const binds = [];
        if (body.checkin !== undefined) { updates.push('checkin = ?'); binds.push(body.checkin ? 1 : 0); }
        if (body.inspecao !== undefined) { updates.push('inspecao = ?'); binds.push(body.inspecao ? 1 : 0); }
        if (updates.length === 0) return jsonResponse({ ok: false, error: 'Nenhum campo de status enviado' }, 400);

        binds.push(nome);
        await env.DB.prepare(`UPDATE equipes SET ${updates.join(', ')} WHERE LOWER(TRIM(equipe)) = LOWER(TRIM(?))`).bind(...binds).run();
        return jsonResponse({ ok: true });
      }

      if (path === '/api/equipes/limpar' && request.method === 'POST') {
        if (!checkAdminAuth(request, env)) return jsonResponse({ ok: false, error: 'Acesso não autorizado (X-Admin-Token).' }, 401, request);
        await env.DB.prepare('DELETE FROM equipes').run();
        return jsonResponse({ ok: true });
      }

      if (path.startsWith('/api/equipes/') && request.method === 'DELETE') {
        if (!checkAdminAuth(request, env)) return jsonResponse({ ok: false, error: 'Acesso não autorizado (X-Admin-Token).' }, 401, request);
        const param = decodeURIComponent(path.replace('/api/equipes/', ''));
        if (/^\d+$/.test(param)) {
          await env.DB.prepare('DELETE FROM equipes WHERE id = ?').bind(Number(param)).run();
        } else {
          await env.DB.prepare('DELETE FROM equipes WHERE LOWER(TRIM(equipe)) = LOWER(TRIM(?))').bind(param).run();
        }
        return jsonResponse({ ok: true });
      }

      // ======================================================================
      // ESTADO DA ARENA (/api/arena/status) -> coluna real: atualizado_em
      // ======================================================================
      if (path === '/api/arena/status' && request.method === 'GET') {
        const row = await env.DB.prepare('SELECT * FROM arena_status WHERE id = 1').first();
        return jsonResponse({
          ok: true,
          equipe_atual: row?.equipe_atual || '',
          status_atual: row?.status_atual || 'READY',
          equipe_proxima: row?.equipe_proxima || '',
          rodada: row?.rodada || 1,
          atualizado_em: row?.atualizado_em || null
        });
      }

      if (path === '/api/arena/status' && request.method === 'POST') {
        const body = await request.json();
        const equipeAtual = (body.equipe_atual || body.equipeAtual || '').trim();
        const statusAtual = (body.status_atual || body.statusAtual || 'READY').trim();
        const equipeProxima = (body.equipe_proxima || body.equipeProxima || '').trim();
        const rodada = Number(body.rodada || 1);

        await env.DB.prepare(
          `INSERT INTO arena_status (id, equipe_atual, status_atual, equipe_proxima, rodada, atualizado_em)
           VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(id) DO UPDATE SET
             equipe_atual = excluded.equipe_atual,
             status_atual = excluded.status_atual,
             equipe_proxima = excluded.equipe_proxima,
             rodada = excluded.rodada,
             atualizado_em = CURRENT_TIMESTAMP`
        ).bind(equipeAtual, statusAtual, equipeProxima, rodada).run();

        return jsonResponse({ ok: true, equipe_atual: equipeAtual, status_atual: statusAtual, equipe_proxima: equipeProxima, rodada });
      }

      // ======================================================================
      // CORRIDAS DE PISTA (/api/corridas) -> tabela real: corridas_pista
      // ======================================================================
      if (path === '/api/corridas' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM corridas_pista ORDER BY timestamp DESC').all();
        return jsonResponse(results || []);
      }

      if (path === '/api/corridas' && request.method === 'POST') {
        const body = await request.json();
        const lista = Array.isArray(body) ? body : [body];
        for (const c of lista) {
          const rodada = parseInt(c.rodada ?? 1, 10);
          const status = String(c.status || 'VALID').toUpperCase();
          const infracoes = parseInt(c.infracoes ?? 0, 10);
          const tempoMs = parseInt(c.tempo_ms ?? 0, 10);

          if (![1, 2].includes(rodada)) {
            return jsonResponse({ ok: false, error: 'Rodada inválida (apenas 1 ou 2).' }, 400, request);
          }
          if (!['VALID', 'DNF', 'TIME_UP'].includes(status)) {
            return jsonResponse({ ok: false, error: 'Status de corrida inválido.' }, 400, request);
          }
          if (!Number.isInteger(infracoes) || infracoes < 0 || infracoes > 5) {
            return jsonResponse({ ok: false, error: 'Infrações devem estar entre 0 e 5.' }, 400, request);
          }
          if (status === 'VALID' && (!Number.isInteger(tempoMs) || tempoMs <= 0 || tempoMs > 180000)) {
            return jsonResponse({ ok: false, error: 'Tempo inválido para volta válida (1 a 180000 ms).' }, 400, request);
          }

          await env.DB.prepare(
            `INSERT OR REPLACE INTO corridas_pista (uuid, equipe, escola, categoria, rodada, tempo_ms, infracoes, status, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            String(c.uuid || ('REC-' + Date.now())).slice(0, 64),
            String(c.equipe || 'Equipe').trim().slice(0, 80),
            String(c.escola || '').trim().slice(0, 80),
            String(c.categoria || 'Categoria Única').trim().slice(0, 60),
            rodada,
            status === 'DNF' ? 0 : Math.min(Math.max(0, tempoMs), 180000),
            infracoes,
            status,
            String(c.timestamp || new Date().toISOString()).slice(0, 40)
          ).run();
        }
        return jsonResponse({ ok: true, count: lista.length }, 200, request);
      }

      if (path.startsWith('/api/corridas/') && request.method === 'DELETE') {
        if (!checkAdminAuth(request, env)) return jsonResponse({ ok: false, error: 'Acesso não autorizado (X-Admin-Token).' }, 401, request);
        const uuid = decodeURIComponent(path.replace('/api/corridas/', ''));
        await env.DB.prepare('DELETE FROM corridas_pista WHERE uuid = ?').bind(uuid).run();
        return jsonResponse({ ok: true });
      }

      // ======================================================================
      // AVALIAÇÕES DE PADDOCK (/api/avaliacoes) -> tabela real: avaliacoes_juizes
      // ======================================================================
      if (path === '/api/avaliacoes' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM avaliacoes_juizes ORDER BY id DESC').all();
        return jsonResponse(results || []);
      }

      if (path === '/api/avaliacoes' && request.method === 'POST') {
        const body = await request.json();
        const notasValidadas = {};

        for (const crit of REGRAS_TORNEIO.criteriosPaddock) {
          if (crit.ativo === false) {
            notasValidadas[crit.id] = 0;
            continue;
          }
          const bruto = REGRAS_TORNEIO.extrairNotaDeRegistro(body, crit.id);
          const validada = REGRAS_TORNEIO.validarNota(bruto);
          if (validada === null) {
            return jsonResponse({
              ok: false,
              error: `Nota inválida (${bruto}) para "${crit.premio}". Permitidos: ${REGRAS_TORNEIO.escalaNotas.map(n => n.valor).join(', ')}`
            }, 400);
          }
          notasValidadas[crit.id] = validada;
        }

        const equipeNome = (body.equipe || body.equipe_id || 'Equipe').trim();
        const juizNome = (body.juiz_nome || body.juiz || 'Juiz Oficial').trim();
        const escola = (body.escola || '').trim();
        const categoria = (body.categoria || 'Categoria Única').trim();
        const obs = (body.observacoes || '').trim();
        const ts = body.timestamp || new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO avaliacoes_juizes (
             juiz, equipe, escola, categoria,
             nota_mecanica, nota_caracterizacao, nota_caracterizacao_equipe,
             voto_superacao, voto_fair_play, nota_torcida,
             observacoes, timestamp
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          juizNome,
          equipeNome,
          escola,
          categoria,
          notasValidadas.mecanica,
          notasValidadas.caracterizacao,
          notasValidadas.caracterizacao_equipe,
          notasValidadas.superacao,
          notasValidadas.fair_play,
          notasValidadas.torcida,
          obs,
          ts
        ).run();

        return jsonResponse({ ok: true, notas: notasValidadas });
      }

      if (path.startsWith('/api/avaliacoes/') && request.method === 'DELETE') {
        if (!checkAdminAuth(request, env)) return jsonResponse({ ok: false, error: 'Acesso não autorizado (X-Admin-Token).' }, 401, request);
        const idNum = parseInt(decodeURIComponent(path.replace('/api/avaliacoes/', '')), 10);
        if (!Number.isInteger(idNum) || idNum <= 0) {
          return jsonResponse({ ok: false, error: 'ID de avaliação inválido.' }, 400, request);
        }
        await env.DB.prepare('DELETE FROM avaliacoes_juizes WHERE id = ?').bind(idNum).run();
        return jsonResponse({ ok: true }, 200, request);
      }

      // ======================================================================
      // VOTAÇÃO DE NOME DO TORNEIO VIA QR CODE (/api/votos-nome)
      // ======================================================================
      if (path === '/api/votos-nome' && request.method === 'GET') {
        try {
          const { results } = await env.DB.prepare('SELECT * FROM votos_nome ORDER BY id DESC').all();
          const votos = results || [];
          const contagem = {};
          const sugestoes = [];
          for (const v of votos) {
            if (v.nome_escolhido) {
              contagem[v.nome_escolhido] = (contagem[v.nome_escolhido] || 0) + 1;
            }
            if (v.sugestao_nova && v.sugestao_nova.trim()) {
              sugestoes.push({ sugestao: v.sugestao_nova.trim(), timestamp: v.timestamp });
            }
          }
          return jsonResponse({ ok: true, total: votos.length, contagem, sugestoes });
        } catch (err) {
          return jsonResponse({ ok: false, error: 'Tabela votos_nome ainda não criada no D1' }, 500);
        }
      }

      if (path === '/api/votos-nome' && request.method === 'POST') {
        const body = await request.json();
        const cleanStr = (s, maxLen) => String(s || '').trim().replace(/[<>&"']/g, '').slice(0, maxLen);
        const nomeEscolhido = cleanStr(body.nome_escolhido, 80);
        const sugestaoNova = cleanStr(body.sugestao_nova, 50);
        if (!nomeEscolhido && !sugestaoNova) {
          return jsonResponse({ ok: false, error: 'Informe um nome candidato ou uma sugestão.' }, 400);
        }
        const ts = new Date().toISOString();
        await env.DB.prepare(
          'INSERT INTO votos_nome (nome_escolhido, sugestao_nova, timestamp) VALUES (?, ?, ?)'
        ).bind(nomeEscolhido, sugestaoNova, ts).run();
        return jsonResponse({ ok: true });
      }

      // ======================================================================
      // APURAÇÃO GERAL UNIFICADA (/api/apuracao)
      // ======================================================================
      if (path === '/api/apuracao' && request.method === 'GET') {
        const [eqRes, corRes, avRes] = await Promise.all([
          env.DB.prepare('SELECT id, equipe, escola, categoria, professor, checkin, inspecao FROM equipes ORDER BY id ASC').all(),
          env.DB.prepare('SELECT * FROM corridas_pista ORDER BY timestamp DESC').all(),
          env.DB.prepare('SELECT * FROM avaliacoes_juizes ORDER BY id DESC').all()
        ]);

        const equipes = eqRes.results || [];
        const corridas = corRes.results || [];
        const avaliacoes = avRes.results || [];
        const rankingsOficiais = calcularRankingsOficiais(equipes, corridas, avaliacoes);

        return jsonResponse({
          edicao: REGRAS_TORNEIO.edicao,
          subtitulo: REGRAS_TORNEIO.subtituloEdicao,
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
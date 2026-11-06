/**
 * ============================================================================
 * CLOUDFLARE WORKER API — TORNEIO DE ROBÓTICA COLÉGIO ANCHIETA
 * Endpoint Oficial: https://torneio-api.gabrielsehna.workers.dev
 * ============================================================================
 * Integra a parametrização centralizada (`REGRAS_TORNEIO` de `config/regrasTorneio.js`)
 * para validar submissões dos juízes em `/api/avaliacoes` e calcular os rankings
 * oficiais ponderados e desempates em `/api/apuracao`, mantendo 100% de
 * compatibilidade com as tabelas existentes do Cloudflare D1 (`env.DB`).
 */

import RegrasModule from '../config/regrasTorneio.js';

const REGRAS_TORNEIO = RegrasModule?.REGRAS_TORNEIO || RegrasModule;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

/**
 * Calcula estatísticas de pista de uma equipe usando `REGRAS_TORNEIO.regrasPista`
 */
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

/**
 * Calcula os rankings oficiais no servidor utilizando `REGRAS_TORNEIO`
 */
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
    for (const crit of REGRAS_TORNEIO.criteriosPaddock) {
      rubrics[crit.id] = REGRAS_TORNEIO.calcularEstatisticaCriterio(evalsEquipe, crit.id);
    }

    return {
      team: { id: eqId, name: nome, school: eq.escola || '', category: eq.categoria || 'LEGO / Educacional' },
      track,
      rubrics
    };
  });

  // Ranking de Pista ordenado via `REGRAS_TORNEIO.compararCandidatosPista`
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

  // Rankings por Rubrica de Paddock via `REGRAS_TORNEIO.compararCandidatosRubrica`
  const rankingsPaddock = {};
  for (const crit of REGRAS_TORNEIO.criteriosPaddock) {
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

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Healthcheck & Metadados da Edição
      if (path === '/' && request.method === 'GET') {
        return jsonResponse({
          status: 'online',
          edicao: REGRAS_TORNEIO.edicao,
          subtitulo: REGRAS_TORNEIO.subtituloEdicao
        });
      }

      // Rota para consultar a parametrização ativa do torneio
      if (path === '/api/regras' && request.method === 'GET') {
        return jsonResponse(REGRAS_TORNEIO);
      }

      // ======================================================================
      // ROTAS DE EQUIPES (/api/equipes)
      // ======================================================================
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
          if (!nome) continue;
          await env.DB.prepare(
            'INSERT OR REPLACE INTO equipes (equipe, escola, categoria) VALUES (?, ?, ?)'
          ).bind(nome, escola, categoria).run();
        }
        return jsonResponse({ ok: true, count: lista.length });
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
      // ROTAS DE CORRIDAS DE PISTA (/api/corridas)
      // ======================================================================
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

      // ======================================================================
      // ROTAS DE AVALIAÇÕES DE PADDOCK (/api/avaliacoes)
      // Validação estrita com `REGRAS_TORNEIO.escalaNotas` e `criteriosPaddock`
      // ======================================================================
      if (path === '/api/avaliacoes' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM avaliacoes ORDER BY id DESC').all();
        return jsonResponse(results || []);
      }

      if (path === '/api/avaliacoes' && request.method === 'POST') {
        const body = await request.json();
        const notasValidadas = {};

        for (const crit of REGRAS_TORNEIO.criteriosPaddock) {
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
            caracterizacao, mecanica, superacao, torcida, fair_play,
            nota_caracterizacao, nota_mecanica, voto_superacao, nota_torcida, voto_fair_play,
            observacoes, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          body.equipe_id || 'EQ-01',
          equipeNome,
          body.escola || '',
          body.categoria || 'LEGO / Educacional',
          juizNome,
          juizNome,
          notasValidadas.caracterizacao,
          notasValidadas.mecanica,
          notasValidadas.superacao,
          notasValidadas.torcida,
          notasValidadas.fair_play,
          notasValidadas.caracterizacao,
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

      // ======================================================================
      // ROTA UNIFICADA DE APURAÇÃO (/api/apuracao)
      // Retorna registros brutos + rankings oficiais calculados via REGRAS_TORNEIO
      // ======================================================================
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


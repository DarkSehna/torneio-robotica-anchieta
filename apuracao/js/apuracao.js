/**
 * Torneio de Robótica Anchieta - Motor de Apuração Geral & Mesa de Cerimônia do Pódio
 * Edital Geral nº 08/2026 - Algoritmo Determinístico de Desempate & Regra de Não-Cumulatividade
 * Projeção HDMI Limpa via BroadcastChannel('torneio_podio')
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elementos do DOM - Header e Status
  const elCloudStatusBadge = document.getElementById('cloudStatusBadge');
  const elCloudStatusText = document.getElementById('cloudStatusText');
  const elPodioTelaoBadge = document.getElementById('podioTelaoBadge');
  const elPodioTelaoText = document.getElementById('podioTelaoText');
  const btnRefreshData = document.getElementById('btnRefreshData');

  // Filtros de Categoria e Regra de Exclusividade
  const categoryTabBtns = document.querySelectorAll('.category-tab-btn');
  let activeCategory = 'LEGO / Educacional';

  const btnToggleExclusivity = document.getElementById('btnToggleExclusivity');
  const exclusivityIcon = document.getElementById('exclusivityIcon');
  const exclusivityLabel = document.getElementById('exclusivityLabel');

  // Por padrão (Coordenação): Cada equipe pode ganhar somente 1 prêmio (Pista > Paddock)
  let exclusivityRuleActive = localStorage.getItem('torneio_exclusivity_rule') !== 'false';

  // Seções de visualização
  const trackRankingBody = document.getElementById('trackRankingBody');
  const awardsGrid = document.getElementById('awardsGrid');
  const tieAlertSection = document.getElementById('tieAlertSection');

  // Elementos da Mesa de Cerimônia (Operador)
  const copLiveMonitorBadge = document.getElementById('copLiveMonitorBadge');
  const copLiveMonitorText = document.getElementById('copLiveMonitorText');
  const copStepBtns = document.querySelectorAll('.cop-step-btn');
  const copPreviewTitle = document.getElementById('copPreviewTitle');
  const copPreviewSubtitle = document.getElementById('copPreviewSubtitle');
  const copBackstageContent = document.getElementById('copBackstageContent');

  const copControlsStandby = document.getElementById('copControlsStandby');
  const copControlsSingle = document.getElementById('copControlsSingle');
  const copControlsTrack = document.getElementById('copControlsTrack');

  const btnSendStandby = document.getElementById('btnSendStandby');
  const btnStartFirstAward = document.getElementById('btnStartFirstAward');
  const btnSingleSuspense = document.getElementById('btnSingleSuspense');
  const btnSingleReveal = document.getElementById('btnSingleReveal');
  const btnSingleConfetti = document.getElementById('btnSingleConfetti');

  const btnTrackResetSuspense = document.getElementById('btnTrackResetSuspense');
  const btnTrackReveal3 = document.getElementById('btnTrackReveal3');
  const btnTrackReveal2 = document.getElementById('btnTrackReveal2');
  const btnTrackReveal1 = document.getElementById('btnTrackReveal1');
  const btnTrackRevealAll = document.getElementById('btnTrackRevealAll');
  const btnTrackConfetti = document.getElementById('btnTrackConfetti');

  const btnCopPrev = document.getElementById('btnCopPrev');
  const btnCopNext = document.getElementById('btnCopNext');
  const selectLoopMode = document.getElementById('selectLoopMode');
  const btnToggleAutoLoop = document.getElementById('btnToggleAutoLoop');

  // Canal de Comunicação com o Telão do Pódio (telao-podio.html)
  const podioChannel = ('BroadcastChannel' in window) ? new BroadcastChannel('torneio_podio') : null;
  let lastTelaoHeartbeat = 0;

  // Estado Geral dos Dados
  let teams = [];
  let corridas = [];
  let avaliacoes = [];
  let minervaVotes = JSON.parse(localStorage.getItem('torneio_minerva_votos') || '{}');

  // Definição das 8 Etapas do Roteiro Completo da Cerimônia
  const CEREMONY_ROUTINE = [
    { step: 0, key: 'STANDBY', type: 'STANDBY', title: '0. Tela de Abertura / Espera', subtitle: 'Boas-vindas no telão antes do início dos anúncios.' },
    { step: 1, key: 'mecanica', type: 'SINGLE_AWARD', title: '1. Troféu: Melhor Mecânica', subtitle: 'Robustez estrutural, chassi firme e eficiência de montagem.' },
    { step: 2, key: 'superacao', type: 'SINGLE_AWARD', title: '2. Troféu: Prêmio Superação', subtitle: 'Resiliência técnica e evolução comprovada entre os rounds.' },
    { step: 3, key: 'caracterizacao', type: 'SINGLE_AWARD', title: '3. Troféu: Melhor Caracterização', subtitle: 'Temática criativa, uniforme, mascote e animação nos boxes.' },
    { step: 4, key: 'torcida', type: 'SINGLE_AWARD', title: '4. Troféu: Melhor Torcida', subtitle: 'Torcida vibrante, organizada e respeitosa no ginásio.' },
    { step: 5, key: 'fair_play', type: 'SINGLE_AWARD', title: '5. Troféu: Prêmio Fair Play', subtitle: 'Cooperação entre equipes, ética e espírito esportivo.' },
    { step: 6, key: 'VELOCIDADE_LEGO', type: 'TRACK_PODIUM', category: 'LEGO / Educacional', title: '6. Pódio Oficial de Pista — Categoria LEGO', subtitle: 'Top 3 de Velocidade (3º Lugar ➔ Vice-Campeão ➔ Grande Campeão).' },
    { step: 7, key: 'VELOCIDADE_MAKER', type: 'TRACK_PODIUM', category: 'Aberta / Maker', title: '7. Pódio Oficial de Pista — Categoria Maker', subtitle: 'Top 3 de Velocidade Aberta / Maker.' }
  ];

  // Estado da Cerimônia Controlada pelo Operador
  let currentStepIdx = 0;
  let singleAwardRevealed = false;
  let trackRevealedState = { pos1: false, pos2: false, pos3: false };
  let autoLoopActive = false;
  let autoLoopTimer = null;

  // Atualiza UI do botão de Regra de Exclusividade
  function updateExclusivityButtonUI() {
    if (!btnToggleExclusivity) return;
    if (exclusivityRuleActive) {
      btnToggleExclusivity.classList.add('active');
      if (exclusivityIcon) exclusivityIcon.textContent = '🔒';
      if (exclusivityLabel) exclusivityLabel.textContent = '1 Prêmio por Equipe (Oficial: Pista exclui Paddock)';
    } else {
      btnToggleExclusivity.classList.remove('active');
      if (exclusivityIcon) exclusivityIcon.textContent = '🔓';
      if (exclusivityLabel) exclusivityLabel.textContent = 'Modo Cumulativo Livre (Sem restrição)';
    }
  }

  if (btnToggleExclusivity) {
    btnToggleExclusivity.addEventListener('click', () => {
      exclusivityRuleActive = !exclusivityRuleActive;
      localStorage.setItem('torneio_exclusivity_rule', String(exclusivityRuleActive));
      updateExclusivityButtonUI();
      renderAll();
      broadcastToPodioTelao(null);
    });
    updateExclusivityButtonUI();
  }

  // ==========================================================================
  // 1. CARREGAMENTO UNIFICADO DOS DADOS (CLOUDFLARE D1 + CONTINGÊNCIA LOCAL)
  // ==========================================================================
  async function loadData() {
    let cloudLoaded = false;
    if (window.cloudAPI) {
      const apuracaoData = await window.cloudAPI.getApuracao();
      if (apuracaoData && apuracaoData.equipes) {
        teams = apuracaoData.equipes.map(t => ({
          id: t.id ? `EQ-${String(t.id).padStart(2, '0')}` : (t.equipe_id || 'EQ-01'),
          name: t.equipe || t.name,
          school: t.escola || t.school || 'Colégio Anchieta',
          category: t.categoria || t.category || 'LEGO / Educacional'
        }));
        corridas = apuracaoData.corridas || [];
        avaliacoes = apuracaoData.avaliacoes || [];
        cloudLoaded = true;
      }
    }

    if (!cloudLoaded) {
      if (window.teamsManager) {
        await window.teamsManager.load();
        teams = window.teamsManager.getAll();
      }
      const rawEvals = localStorage.getItem('paddock_evaluations_cache');
      if (rawEvals) {
        try { avaliacoes = JSON.parse(rawEvals); } catch (e) {}
      }
      const rawCorridas = localStorage.getItem('corridas_pista_cache') || localStorage.getItem('torneio_anchieta_records');
      if (rawCorridas) {
        try { corridas = JSON.parse(rawCorridas); } catch (e) {}
      }
    }

    renderAll();
    updateCloudStatus(cloudLoaded);
    updateOperatorCeremonyUI();
  }

  function updateCloudStatus(online) {
    if (!elCloudStatusBadge) return;
    if (online) {
      elCloudStatusBadge.className = 'badge-status cloud-online';
      if (elCloudStatusText) elCloudStatusText.textContent = '🟢 Cloudflare D1 Sincronizado';
    } else {
      elCloudStatusBadge.className = 'badge-status cloud-offline';
      if (elCloudStatusText) elCloudStatusText.textContent = '🟡 Modo Contingência Local';
    }
  }

  // ==========================================================================
  // 2. CÁLCULOS ESTATÍSTICOS DE PISTA E RUBRICAS (EDITAL 08)
  // ==========================================================================
  function getTrackStatsForTeam(teamName) {
    const teamRuns = corridas.filter(c =>
      (c.equipe || '').trim().toLowerCase() === teamName.trim().toLowerCase()
    );

    const validRuns = teamRuns.filter(c => c.status === 'VALID' && Number(c.tempo_ms) > 0);

    const r1 = teamRuns.find(c => Number(c.rodada) === 1);
    const r2 = teamRuns.find(c => Number(c.rodada) === 2);

    let bestRun = null;
    let otherRun = null;

    if (validRuns.length > 0) {
      validRuns.sort((a, b) => Number(a.tempo_ms) - Number(b.tempo_ms));
      bestRun = validRuns[0];
      if (validRuns.length > 1) {
        otherRun = validRuns[1];
      }
    }

    let deltaEvolucao = 0;
    if (r1 && r2 && r1.status === 'VALID' && r2.status === 'VALID') {
      const diffSeg = (Number(r1.tempo_ms) - Number(r2.tempo_ms)) / 1000;
      const diffFaltas = (Number(r1.infracoes || 0) - Number(r2.infracoes || 0)) * 5.0;
      deltaEvolucao = Number((diffSeg + diffFaltas).toFixed(2));
    }

    const totalFaltas = teamRuns.reduce((acc, c) => acc + (Number(c.infracoes) || 0), 0);

    return {
      r1,
      r2,
      bestRun,
      otherRun,
      bestTimeMs: bestRun ? Number(bestRun.tempo_ms) : Infinity,
      bestTimeFouls: bestRun ? Number(bestRun.infracoes || 0) : 99,
      secondTimeMs: otherRun ? Number(otherRun.tempo_ms) : Infinity,
      totalFaltas,
      deltaEvolucao,
      r2Fouls: r2 ? Number(r2.infracoes || 0) : 99,
      hasValidRun: validRuns.length > 0
    };
  }

  function formatMs(ms) {
    if (!ms || ms === Infinity) return '--:--.--';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  }

  function getRubricStatsForTeam(teamName, teamId) {
    const teamEvals = avaliacoes.filter(ev => {
      const evName = (ev.equipe || '').trim().toLowerCase();
      const evId = (ev.equipe_id || '').trim().toLowerCase();
      const tName = teamName.trim().toLowerCase();
      const tId = (teamId || '').trim().toLowerCase();
      return (evName && evName === tName) || (evId && evId === tId);
    });

    const criteria = ['mecanica', 'superacao', 'caracterizacao', 'torcida', 'fair_play'];
    const result = {
      evalCount: teamEvals.length,
      observations: teamEvals.map(ev => ({ juiz: ev.juiz_nome || ev.juiz, texto: ev.observacoes })).filter(o => o.texto)
    };

    criteria.forEach(crit => {
      const scores = teamEvals.map(ev => {
        return Number(ev[crit] ?? ev[`nota_${crit}`] ?? (ev[`voto_${crit}`] ? 3 : 2)) || 0;
      }).filter(s => s > 0);

      const sum = scores.reduce((a, b) => a + b, 0);
      const avg = scores.length > 0 ? Number((sum / scores.length).toFixed(2)) : 0;
      const count3 = scores.filter(s => s === 3).length;

      result[crit] = { avg, scores, count3 };
    });

    return result;
  }

  const AWARDS_METADATA = [
    {
      id: 'mecanica',
      name: 'Melhor Mecânica',
      icon: '⚙️',
      desc: 'Robô robusto, firme, sem peças soltas, com bom acabamento estético e montagem eficiente.',
      tiebreakName: '1º Menor Tempo de Pista ➔ 2º Faltas',
      evalTiebreak: (a, b) => {
        if (b.rubrics.mecanica.avg !== a.rubrics.mecanica.avg) return b.rubrics.mecanica.avg - a.rubrics.mecanica.avg;
        if (a.track.bestTimeMs !== b.track.bestTimeMs) return a.track.bestTimeMs - b.track.bestTimeMs;
        return a.track.bestTimeFouls - b.track.bestTimeFouls;
      },
      getTiebreakExplain: (item) => item.track.hasValidRun
        ? `Melhor Volta: ${formatMs(item.track.bestTimeMs)} (${item.track.bestTimeFouls} faltas)`
        : 'Avaliação de Bancada'
    },
    {
      id: 'superacao',
      name: 'Prêmio Superação',
      icon: '🚀',
      desc: 'Resiliência técnica comprovada, contornando falhas técnicas com evolução evidente.',
      tiebreakName: '1º Maior Δevolução ➔ 2º Faltas no R2',
      evalTiebreak: (a, b) => {
        if (b.rubrics.superacao.avg !== a.rubrics.superacao.avg) return b.rubrics.superacao.avg - a.rubrics.superacao.avg;
        if (b.track.deltaEvolucao !== a.track.deltaEvolucao) return b.track.deltaEvolucao - a.track.deltaEvolucao;
        return a.track.r2Fouls - b.track.r2Fouls;
      },
      getTiebreakExplain: (item) => `Índice Δevolução: ${item.track.deltaEvolucao > 0 ? '+' : ''}${item.track.deltaEvolucao} pts`
    },
    {
      id: 'caracterizacao',
      name: 'Melhor Caracterização',
      icon: '🎨',
      desc: 'Equipe com temática criativa (fantasia, mascote, uniforme) alinhada ao robô e animação.',
      tiebreakName: '1º Votos "Superado ★" ➔ 2º Voto de Minerva',
      evalTiebreak: (a, b) => {
        if (b.rubrics.caracterizacao.avg !== a.rubrics.caracterizacao.avg) return b.rubrics.caracterizacao.avg - a.rubrics.caracterizacao.avg;
        return b.rubrics.caracterizacao.count3 - a.rubrics.caracterizacao.count3;
      },
      getTiebreakExplain: (item) => `${item.rubrics.caracterizacao.count3} voto(s) Superado ★`
    },
    {
      id: 'torcida',
      name: 'Melhor Torcida',
      icon: '📣',
      desc: 'Escola com torcida vibrante, barulhenta, com identidade visual própria e respeitosa.',
      tiebreakName: '1º Votos "Superado ★" ➔ 2º Voto de Minerva',
      evalTiebreak: (a, b) => {
        if (b.rubrics.torcida.avg !== a.rubrics.torcida.avg) return b.rubrics.torcida.avg - a.rubrics.torcida.avg;
        return b.rubrics.torcida.count3 - a.rubrics.torcida.count3;
      },
      getTiebreakExplain: (item) => `${item.rubrics.torcida.count3} voto(s) Superado ★`
    },
    {
      id: 'fair_play',
      name: 'Prêmio Fair Play',
      icon: '🤝',
      desc: 'Postura colaborativa, auxílio a outras equipes, atitude positiva e respeito às regras.',
      tiebreakName: '1º Menor total acumulado de faltas',
      evalTiebreak: (a, b) => {
        if (b.rubrics.fair_play.avg !== a.rubrics.fair_play.avg) return b.rubrics.fair_play.avg - a.rubrics.fair_play.avg;
        return a.track.totalFaltas - b.track.totalFaltas;
      },
      getTiebreakExplain: (item) => `Faltas totais na pista: ${item.track.totalFaltas}`
    }
  ];

  // Retorna lista ordenada para o Pódio de Pista de uma Categoria
  function getSortedTrackCandidates(categoryFilter = 'LEGO') {
    const filtered = teams.filter(t =>
      t.category.toLowerCase().includes(categoryFilter.toLowerCase().includes('maker') ? 'maker' : 'lego')
    );

    const list = filtered.map(team => ({
      team,
      track: getTrackStatsForTeam(team.name)
    }));

    list.sort((a, b) => {
      if (a.track.bestTimeMs !== b.track.bestTimeMs) return a.track.bestTimeMs - b.track.bestTimeMs;
      if (a.track.bestTimeFouls !== b.track.bestTimeFouls) return a.track.bestTimeFouls - b.track.bestTimeFouls;
      return a.track.secondTimeMs - b.track.secondTimeMs;
    });

    return list;
  }

  // ==========================================================================
  // MOTOR DE DISTRIBUIÇÃO DE TROFÉUS (NÃO-CUMULATIVIDADE + MENÇÃO HONROSA)
  // ==========================================================================
  function resolveOfficialAwards(teamPool = teams) {
    // Mapa de equipes que já conquistaram um troféu oficial (nome_lower -> nome do prêmio)
    const awardedTeamsMap = new Map();

    if (exclusivityRuleActive) {
      // 1. Identifica os vencedores do Top 3 da Pista (LEGO e Maker) que têm volta válida
      ['LEGO', 'Maker'].forEach(cat => {
        const trackList = getSortedTrackCandidates(cat);
        const labels = ['🥇 1º Lugar Pista', '🥈 2º Lugar Pista', '🥉 3º Lugar Pista'];
        for (let i = 0; i < 3; i++) {
          const item = trackList[i];
          if (item && item.track.hasValidRun) {
            awardedTeamsMap.set(item.team.name.trim().toLowerCase(), labels[i]);
          }
        }
      });
    }

    // Prepara candidatos com estatísticas de pista + rubricas
    const allCandidates = teamPool.map(team => ({
      team,
      track: getTrackStatsForTeam(team.name),
      rubrics: getRubricStatsForTeam(team.name, team.id)
    }));

    const resolvedByAward = {};

    AWARDS_METADATA.forEach(meta => {
      // Ordenação técnica pura (Edital 08 + eventual Voto de Minerva)
      const rawSorted = [...allCandidates].sort((a, b) => {
        const minervaWinner = minervaVotes[meta.id];
        if (minervaWinner) {
          if (a.team.name === minervaWinner) return -1;
          if (b.team.name === minervaWinner) return 1;
        }
        return meta.evalTiebreak(a, b);
      });

      let officialWinner = rawSorted[0] || null;
      let secondEligible = rawSorted[1] || null;
      const honorableMentions = [];

      if (exclusivityRuleActive && rawSorted.length > 0) {
        const minervaWinner = minervaVotes[meta.id];

        if (minervaWinner) {
          // Se a comissão deu Voto de Minerva explícito nesta categoria, respeita a decisão
          officialWinner = rawSorted.find(c => c.team.name === minervaWinner) || rawSorted[0];
        } else {
          // Busca a 1ª equipe elegível que ainda NÃO ganhou troféu na Pista nem em outro Paddock
          const eligibleList = [];
          for (const cand of rawSorted) {
            const key = cand.team.name.trim().toLowerCase();
            if (awardedTeamsMap.has(key)) {
              // Se ainda não escolhemos o vencedor oficial, esta equipe superou na nota mas já tem troféu -> Menção Honrosa!
              if (eligibleList.length === 0 && cand.rubrics[meta.id].avg > 0) {
                honorableMentions.push({
                  candidate: cand,
                  previousAward: awardedTeamsMap.get(key)
                });
              }
            } else {
              eligibleList.push(cand);
            }
          }

          if (eligibleList.length > 0) {
            officialWinner = eligibleList[0];
            secondEligible = eligibleList[1] || null;
          }
        }

        // Registra o vencedor oficial deste troféu para não acumular um segundo troféu de Paddock
        if (officialWinner && officialWinner.rubrics[meta.id].avg > 0) {
          const winKey = officialWinner.team.name.trim().toLowerCase();
          if (!awardedTeamsMap.has(winKey)) {
            awardedTeamsMap.set(winKey, `${meta.icon} ${meta.name}`);
          }
        }
      }

      resolvedByAward[meta.id] = {
        meta,
        officialWinner,
        secondEligible,
        rawSorted,
        honorableMentions,
        awardedSnapshot: new Map(awardedTeamsMap)
      };
    });

    return {
      resolvedByAward,
      awardedTeamsMap
    };
  }

  // ==========================================================================
  // 3. TABELAS DE AUDITORIA E VOTO DE MINERVA
  // ==========================================================================
  function renderTrackRanking() {
    if (!trackRankingBody) return;
    trackRankingBody.innerHTML = '';

    let filteredTeams = teams;
    if (activeCategory !== 'TODAS') {
      filteredTeams = teams.filter(t => t.category.includes(activeCategory.includes('LEGO') ? 'LEGO' : 'Maker'));
    }

    const rankingList = filteredTeams.map(team => ({
      team,
      track: getTrackStatsForTeam(team.name)
    }));

    rankingList.sort((a, b) => {
      if (a.track.bestTimeMs !== b.track.bestTimeMs) return a.track.bestTimeMs - b.track.bestTimeMs;
      if (a.track.bestTimeFouls !== b.track.bestTimeFouls) return a.track.bestTimeFouls - b.track.bestTimeFouls;
      return a.track.secondTimeMs - b.track.secondTimeMs;
    });

    if (rankingList.length === 0) {
      trackRankingBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">Nenhuma equipe cadastrada nesta categoria.</td></tr>`;
      return;
    }

    rankingList.forEach((item, index) => {
      const rank = index + 1;
      let badgeClass = 'rank-other';
      let trophy = rank;
      if (item.track.hasValidRun) {
        if (rank === 1) { badgeClass = 'rank-1'; trophy = '🥇 1º'; }
        else if (rank === 2) { badgeClass = 'rank-2'; trophy = '🥈 2º'; }
        else if (rank === 3) { badgeClass = 'rank-3'; trophy = '🥉 3º'; }
      } else {
        trophy = '—';
      }

      const r1Str = item.track.r1
        ? `${formatMs(item.track.r1.tempo_ms)} <small style="color: var(--text-muted)">(${item.track.r1.infracoes || 0}F)</small>`
        : '<span style="color: var(--text-muted)">--</span>';

      const r2Str = item.track.r2
        ? `${formatMs(item.track.r2.tempo_ms)} <small style="color: var(--text-muted)">(${item.track.r2.infracoes || 0}F)</small>`
        : '<span style="color: var(--text-muted)">--</span>';

      const bestTimeStr = item.track.hasValidRun ? formatMs(item.track.bestTimeMs) : '<span style="color: var(--color-danger); font-weight: 800;">SEM TEMPO</span>';
      const foulsStr = item.track.hasValidRun ? `${item.track.bestTimeFouls} falta(s)` : '--';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="podium-rank-badge ${badgeClass}">${trophy}</span></td>
        <td>
          <strong style="color: var(--color-primary); font-size: 0.95rem;">${item.team.name}</strong>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${item.team.school}</div>
        </td>
        <td><span class="badge-pill-light" style="font-size: 0.75rem;">${item.team.category.includes('LEGO') ? 'LEGO' : 'MAKER'}</span></td>
        <td style="font-family: var(--font-timer);">${r1Str}</td>
        <td style="font-family: var(--font-timer);">${r2Str}</td>
        <td><span class="best-time-pill ${rank === 1 && item.track.hasValidRun ? 'first-place' : ''}">${bestTimeStr}</span></td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${foulsStr}</td>
        <td>
          <span style="font-weight: 800; font-size: 0.75rem; color: ${item.track.hasValidRun ? '#16A34A' : '#DC2626'};">
            ${item.track.hasValidRun ? '● VÁLIDO' : '○ PENDENTE'}
          </span>
        </td>
      `;
      trackRankingBody.appendChild(tr);
    });
  }

  function renderSpecialAwards() {
    if (!awardsGrid) return;
    awardsGrid.innerHTML = '';
    if (tieAlertSection) tieAlertSection.innerHTML = '';

    let filteredTeams = teams;
    if (activeCategory !== 'TODAS') {
      filteredTeams = teams.filter(t => t.category.includes(activeCategory.includes('LEGO') ? 'LEGO' : 'Maker'));
    }

    if (filteredTeams.length === 0) {
      awardsGrid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center; padding: 24px;">Nenhuma equipe nesta categoria.</p>`;
      return;
    }

    const { resolvedByAward } = resolveOfficialAwards(filteredTeams);

    AWARDS_METADATA.forEach((meta, idx) => {
      const awardResult = resolvedByAward[meta.id];
      const winner = awardResult.officialWinner;
      const second = awardResult.secondEligible;
      const rawSorted = awardResult.rawSorted;
      const honorableMentions = awardResult.honorableMentions;

      // Checa empate técnico residual entre os dois primeiros ELEGÍVEIS ao troféu
      if (winner && second && !minervaVotes[meta.id]) {
        const topScore = winner.rubrics[meta.id].avg;
        const secondScore = second.rubrics[meta.id].avg;
        if (topScore > 0 && topScore === secondScore && meta.evalTiebreak(winner, second) === 0) {
          renderTieAlert(meta, winner, second);
        }
      }

      const scoreNum = winner ? winner.rubrics[meta.id].avg : 0;
      const tieExplain = winner ? meta.getTiebreakExplain(winner) : '--';

      // Bloco HTML de Menção Honrosa (se houver equipe que tirou nota maior mas já levou outro prêmio)
      let honorableHtml = '';
      if (honorableMentions.length > 0) {
        const hmItems = honorableMentions.map(hm =>
          `<strong>${hm.candidate.team.name}</strong> (${hm.candidate.rubrics[meta.id].avg.toFixed(2)} ★ — Já premiada em: <em>${hm.previousAward}</em>)`
        ).join('<br>');
        honorableHtml = `
          <div class="honorable-mention-box">
            <div style="font-weight: 900; text-transform: uppercase; font-size: 0.70rem; letter-spacing: 0.04em; margin-bottom: 2px;">
              ⭐ Menção Honrosa na Auditoria (Maior Nota Bruta):
            </div>
            ${hmItems}
          </div>
        `;
      }

      const card = document.createElement('div');
      card.className = 'award-card';
      card.innerHTML = `
        <div class="award-card-header">
          <div class="award-name">
            <span>${meta.icon}</span>
            <span>${meta.name}</span>
          </div>
          <button type="button" class="badge-pill-light" style="cursor: pointer; border: 1px solid var(--color-primary); color: var(--color-primary); font-weight: 800; font-size: 0.72rem;" onclick="window.selectCeremonyStep(${idx + 1}, true)" title="Preparar este prêmio em suspense no Telão">
            📽️ Levar p/ Mesa (${idx + 1})
          </button>
        </div>

        ${honorableHtml}

        <div class="award-winner-box">
          <div class="award-winner-badge">🏆 Vencedor Oficial do Troféu</div>
          <div class="award-winner-title">${winner ? winner.team.name : '--'}</div>
          <div class="award-winner-school">${winner ? `${winner.team.school} &bull; ${winner.team.category.includes('LEGO') ? 'LEGO' : 'MAKER'}` : '--'}</div>

          <div class="award-score-row">
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted);">Média da Rubrica:</span>
            <span class="award-score-number">${scoreNum.toFixed(2)} ★</span>
          </div>

          <div class="award-tiebreak-note">
            <strong>Critério:</strong> ${tieExplain}
            ${exclusivityRuleActive && honorableMentions.length > 0 ? '<br><span style="color: #059669; font-weight: 800;">✓ 1ª Equipe Elegível (Regra 1 Troféu/Equipe)</span>' : ''}
            ${minervaVotes[meta.id] ? '<br><span style="color: #F26522; font-weight: 800;">⚖️ Decidido por Voto de Minerva</span>' : ''}
          </div>
        </div>

        <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">
          Ranking Bruto da Rubrica (Auditoria):
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${rawSorted.slice(0, 4).map((item, i) => {
            const isOfficialWin = winner && item.team.name === winner.team.name;
            const hmMatch = honorableMentions.find(h => h.candidate.team.name === item.team.name);
            const tag = isOfficialWin
              ? '<span style="background:#DCFCE7; color:#15803D; font-size:0.68rem; padding:1px 6px; border-radius:4px; font-weight:800; margin-left:4px;">🏆 Troféu</span>'
              : (hmMatch ? `<span style="background:#FEF3C7; color:#B45309; font-size:0.68rem; padding:1px 6px; border-radius:4px; font-weight:800; margin-left:4px;">⭐ ${hmMatch.previousAward}</span>` : '');
            return `
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; padding: 4px 0; border-bottom: 1px dotted var(--border-light);">
                <span>${i + 1}º ${item.team.name} ${tag}</span>
                <strong style="color: var(--color-primary);">${item.rubrics[meta.id].avg.toFixed(2)} ★</strong>
              </div>
            `;
          }).join('')}
        </div>
      `;
      awardsGrid.appendChild(card);
    });
  }

  function renderTieAlert(meta, teamA, teamB) {
    if (!tieAlertSection) return;
    const box = document.createElement('div');
    box.className = 'tie-alert-card';
    box.innerHTML = `
      <div class="tie-alert-header">
        <div class="tie-alert-title">
          <span>⚖️</span>
          <span>EMPATE TÉCNICO - DELIBERAÇÃO ABERTA: ${meta.name}</span>
        </div>
        <span style="background: #F59E0B; color: #fff; font-weight: 900; font-size: 0.72rem; padding: 3px 8px; border-radius: var(--radius-full); text-transform: uppercase;">
          Voto de Minerva Necessário
        </span>
      </div>
      <p style="font-size: 0.88rem; color: #78350F; line-height: 1.45;">
        As equipes elegíveis <strong>${teamA.team.name}</strong> e <strong>${teamB.team.name}</strong> obtiveram a mesma pontuação exata (${teamA.rubrics[meta.id].avg.toFixed(2)} ★) e empataram em todos os critérios automáticos do Edital. A Comissão Julgadora deve deliberar com base nas justificativas abaixo:
      </p>

      <div class="tie-teams-comparison">
        <div class="tie-team-box">
          <strong style="font-size: 1.05rem; color: var(--color-primary);">${teamA.team.name}</strong>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${teamA.team.school}</div>
          <div class="tie-obs-box">
            ${teamA.rubrics.observations.length > 0
              ? teamA.rubrics.observations.map(o => `"${o.texto}" — <em>${o.juiz}</em>`).join('<br>')
              : 'Sem observações registradas.'}
          </div>
          <button type="button" class="btn-minerva" onclick="window.castMinervaVote('${meta.id}', '${teamA.team.name}')">
            Declarar ${teamA.team.name} Vencedora ➔
          </button>
        </div>

        <div class="tie-team-box">
          <strong style="font-size: 1.05rem; color: var(--color-primary);">${teamB.team.name}</strong>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${teamB.team.school}</div>
          <div class="tie-obs-box">
            ${teamB.rubrics.observations.length > 0
              ? teamB.rubrics.observations.map(o => `"${o.texto}" — <em>${o.juiz}</em>`).join('<br>')
              : 'Sem observações registradas.'}
          </div>
          <button type="button" class="btn-minerva" onclick="window.castMinervaVote('${meta.id}', '${teamB.team.name}')">
            Declarar ${teamB.team.name} Vencedora ➔
          </button>
        </div>
      </div>
    `;
    tieAlertSection.appendChild(box);
  }

  window.castMinervaVote = function(awardId, teamName) {
    if (confirm(`Confirma declarar a equipe "${teamName}" como vencedora oficial do prêmio por Voto de Minerva da Comissão?`)) {
      minervaVotes[awardId] = teamName;
      localStorage.setItem('torneio_minerva_votos', JSON.stringify(minervaVotes));
      renderAll();
      updateOperatorCeremonyUI();
    }
  };

  // ==========================================================================
  // 4. MESA DE CERIMÔNIA DO OPERADOR & SINCRONIA COM O TELÃO DO PÓDIO
  // ==========================================================================
  function buildTelaoPayloadForCurrentStep() {
    const routine = CEREMONY_ROUTINE[currentStepIdx];

    // MODO 0: TELA DE ESPERA
    if (routine.type === 'STANDBY') {
      return {
        mode: 'STANDBY',
        stepKey: 'STANDBY',
        headerBadge: '🏆 Cerimônia Oficial',
        subtitleTag: 'COLÉGIO ANCHIETA • EDITAL Nº 08/2026',
        mainTitle: 'CERIMÔNIA DE PREMIAÇÃO',
        criteriaDesc: 'Premiações de Bancada (Paddock) & Pódio Oficial de Velocidade'
      };
    }

    // MODO 1..5: TROFÉU DE BANCADA / BOX (Respeitando a Regra de Não-Cumulatividade)
    if (routine.type === 'SINGLE_AWARD') {
      const meta = AWARDS_METADATA.find(m => m.id === routine.key);
      const { resolvedByAward } = resolveOfficialAwards(teams);
      const awardResult = resolvedByAward[routine.key];
      const winner = awardResult ? awardResult.officialWinner : null;
      const hasScore = winner && winner.rubrics[routine.key].avg > 0;

      return {
        mode: 'SINGLE_AWARD',
        stepKey: routine.key,
        headerBadge: `${meta.icon} Troféu Oficial de Bancada`,
        subtitleTag: `PRÊMIO OFICIAL #${routine.step} • EDITAL 08`,
        mainTitle: `TROFÉU: ${meta.name.toUpperCase()}`,
        criteriaDesc: meta.desc,
        icon: meta.icon,
        singleRevealed: singleAwardRevealed,
        winner: {
          name: winner ? winner.team.name : 'Sem Equipe',
          school: winner ? `${winner.team.school} • ${winner.team.category}` : '--',
          scoreText: hasScore ? `${winner.rubrics[routine.key].avg.toFixed(2)} ★` : 'Destaque Oficial ★',
          detailText: winner ? meta.getTiebreakExplain(winner) : '--'
        }
      };
    }

    // MODO 6..7: PÓDIO TRIPLO DE VELOCIDADE
    const isMaker = routine.key === 'VELOCIDADE_MAKER';
    const candidates = getSortedTrackCandidates(isMaker ? 'Maker' : 'LEGO');

    const formatCandidate = (cand) => {
      if (!cand) {
        return { name: '—', school: 'Sem equipe', time: '--:--.--', foulsText: '' };
      }
      if (!cand.track.hasValidRun) {
        return { name: cand.team.name, school: cand.team.school, time: 'SEM TEMPO', foulsText: 'Volta pendente / DNF' };
      }
      const f = cand.track.bestTimeFouls;
      return {
        name: cand.team.name,
        school: cand.team.school,
        time: formatMs(cand.track.bestTimeMs),
        foulsText: f === 0 ? '✓ Volta Limpa (0 Faltas)' : `⚠ ${f} ${f === 1 ? 'falta' : 'faltas'} na volta`
      };
    };

    return {
      mode: 'TRACK_PODIUM',
      stepKey: routine.key,
      headerBadge: isMaker ? '🟠 Categoria Aberta / Maker' : '🔵 Categoria LEGO / Educacional',
      subtitleTag: 'GRANDE FINAL DE VELOCIDADE NA PISTA',
      mainTitle: isMaker ? 'PÓDIO DE PISTA — ABERTA / MAKER' : 'PÓDIO OFICIAL DE PISTA — LEGO',
      criteriaDesc: 'Classificação Oficial: Menor Tempo Líquido (Art. 7º e Art. 8º)',
      trackRevealed: { ...trackRevealedState },
      podium: {
        pos1: formatCandidate(candidates[0]),
        pos2: formatCandidate(candidates[1]),
        pos3: formatCandidate(candidates[2])
      }
    };
  }

  function broadcastToPodioTelao(effect = null) {
    const state = buildTelaoPayloadForCurrentStep();
    const packet = {
      state,
      effect,
      updatedAt: Date.now()
    };

    try {
      localStorage.setItem('torneio_podio_live_state', JSON.stringify(packet));
    } catch (e) {}

    if (podioChannel) {
      try {
        podioChannel.postMessage({
          type: 'PODIO_SYNC_STATE',
          payload: packet
        });
      } catch (e) {}
    }

    updateOperatorCeremonyUI();
  }

  // Atualiza a interface da Mesa de Cerimônia (Operador)
  function updateOperatorCeremonyUI() {
    const routine = CEREMONY_ROUTINE[currentStepIdx];

    // 1. Destaca botão ativo no Roteiro
    copStepBtns.forEach(btn => {
      const stepNum = Number(btn.dataset.step);
      btn.classList.toggle('active', stepNum === currentStepIdx);
    });

    // 2. Atualiza Títulos de Bastidor
    if (copPreviewTitle) copPreviewTitle.textContent = routine.title;
    if (copPreviewSubtitle) copPreviewSubtitle.textContent = routine.subtitle;

    // 3. Alterna grupos de botões da direita
    copControlsStandby.style.display = routine.type === 'STANDBY' ? 'flex' : 'none';
    copControlsSingle.style.display = routine.type === 'SINGLE_AWARD' ? 'flex' : 'none';
    copControlsTrack.style.display = routine.type === 'TRACK_PODIUM' ? 'flex' : 'none';

    // 4. Botões Anterior / Próximo
    if (btnCopPrev) btnCopPrev.disabled = currentStepIdx === 0;
    if (btnCopNext) btnCopNext.disabled = currentStepIdx === CEREMONY_ROUTINE.length - 1;

    // 5. Atualiza Badge do Monitor ao Vivo e Cola Confidencial de Bastidor
    if (routine.type === 'STANDBY') {
      copLiveMonitorBadge.className = 'cop-monitor-pill standby';
      copLiveMonitorText.textContent = 'NO TELÃO: Tela de Espera';
      copBackstageContent.innerHTML = `
        <div style="color: #CBD5E1; font-size: 0.88rem; line-height: 1.5;">
          <strong>Status do Telão:</strong> Exibindo tela institucional de abertura.<br>
          <span style="color: #94A3B8; font-size: 0.8rem;">Dica: Abra o <strong>Telão do Pódio ↗</strong>, arraste para o projetor HDMI em tela cheia (F11) e clique no prêmio 1 para começar.</span>
        </div>
      `;
    } else if (routine.type === 'SINGLE_AWARD') {
      const meta = AWARDS_METADATA.find(m => m.id === routine.key);
      const { resolvedByAward } = resolveOfficialAwards(teams);
      const awardResult = resolvedByAward[routine.key];
      const winner = awardResult ? awardResult.officialWinner : null;
      const runnerUp = awardResult ? awardResult.secondEligible : null;
      const honorableMentions = awardResult ? awardResult.honorableMentions : [];

      if (singleAwardRevealed) {
        copLiveMonitorBadge.className = 'cop-monitor-pill revealed';
        copLiveMonitorText.textContent = `🎉 NO TELÃO: ${winner ? winner.team.name : 'Revelado'} (${meta.name})`;
      } else {
        copLiveMonitorBadge.className = 'cop-monitor-pill suspense';
        copLiveMonitorText.textContent = `🥁 NO TELÃO: ${meta.name} EM SUSPENSE (Oculto)`;
      }

      if (winner) {
        const avg = winner.rubrics[routine.key].avg.toFixed(2);
        const hmNote = honorableMentions.length > 0
          ? `<div style="margin-top: 6px; padding: 6px 10px; background: rgba(245, 158, 11, 0.16); border-left: 3px solid #FDE047; border-radius: 4px; font-size: 0.76rem; color: #FEF08A;">
               ⭐ <strong>Menção Honrosa (Maior Nota):</strong> ${honorableMentions.map(h => `${h.candidate.team.name} (${h.candidate.rubrics[routine.key].avg.toFixed(2)}★ — já levou ${h.previousAward})`).join(', ')}
             </div>`
          : '';

        copBackstageContent.innerHTML = `
          <div class="backstage-winner-row">
            <div>
              <span style="font-size: 0.72rem; font-weight: 900; color: #FDE047; text-transform: uppercase;">🏆 Vencedor Oficial do Troféu (Cola p/ Locutor):</span>
              <div style="font-size: 1.35rem; font-weight: 900; color: #FFFFFF;">${winner.team.name}</div>
              <div style="font-size: 0.82rem; color: #94A3B8;">${winner.team.school} &bull; ${winner.team.category}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1.25rem; font-weight: 900; color: #FDE047;">${avg} ★</div>
              <div style="font-size: 0.75rem; color: #CBD5E1;">${meta.getTiebreakExplain(winner)}</div>
            </div>
          </div>
          ${hmNote}
          ${runnerUp ? `
            <div style="font-size: 0.76rem; color: #94A3B8; padding-top: 6px;">
              Próxima equipe elegível: <strong>${runnerUp.team.name}</strong> (${runnerUp.rubrics[routine.key].avg.toFixed(2)} ★)
            </div>
          ` : ''}
        `;
      }
    } else if (routine.type === 'TRACK_PODIUM') {
      const isMaker = routine.key === 'VELOCIDADE_MAKER';
      const candidates = getSortedTrackCandidates(isMaker ? 'Maker' : 'LEGO');
      const p1 = candidates[0];
      const p2 = candidates[1];
      const p3 = candidates[2];

      const anyRev = trackRevealedState.pos1 || trackRevealedState.pos2 || trackRevealedState.pos3;
      const allRev = trackRevealedState.pos1 && trackRevealedState.pos2 && trackRevealedState.pos3;

      if (allRev) {
        copLiveMonitorBadge.className = 'cop-monitor-pill revealed';
        copLiveMonitorText.textContent = '🎉 NO TELÃO: Pódio Top 3 Completo Revelado!';
      } else if (anyRev) {
        copLiveMonitorBadge.className = 'cop-monitor-pill suspense';
        copLiveMonitorText.textContent = `🥁 NO TELÃO: Pódio Parcial (${trackRevealedState.pos3 ? '3º ' : ''}${trackRevealedState.pos2 ? '2º ' : ''}${trackRevealedState.pos1 ? '1º' : ''})`;
      } else {
        copLiveMonitorBadge.className = 'cop-monitor-pill suspense';
        copLiveMonitorText.textContent = '🥁 NO TELÃO: Pódio em Suspense (3 Degraus Ocultos)';
      }

      const renderRow = (medal, label, cand, isRevealed) => {
        const statusChip = isRevealed
          ? '<span style="color: #6EE7B7; font-weight: 800; font-size: 0.74rem;">● NO AR</span>'
          : '<span style="color: #FDE047; font-weight: 800; font-size: 0.74rem;">○ OCULTO</span>';
        if (!cand) {
          return `<div class="backstage-winner-row"><span>${medal} ${label}: <em>Sem equipe</em></span>${statusChip}</div>`;
        }
        const timeStr = cand.track.hasValidRun ? `${formatMs(cand.track.bestTimeMs)} (${cand.track.bestTimeFouls}F)` : 'SEM TEMPO';
        return `
          <div class="backstage-winner-row">
            <div>
              <strong style="color: #FFFFFF; font-size: 0.92rem;">${medal} ${label}: ${cand.team.name}</strong>
              <span style="color: #94A3B8; font-size: 0.78rem; margin-left: 6px;">(${cand.team.school})</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <strong style="font-family: var(--font-timer); color: #38BDF8; font-size: 0.9rem;">${timeStr}</strong>
              ${statusChip}
            </div>
          </div>
        `;
      };

      copBackstageContent.innerHTML = `
        ${renderRow('🥇', '1º Campeão', p1, trackRevealedState.pos1)}
        ${renderRow('🥈', '2º Vice', p2, trackRevealedState.pos2)}
        ${renderRow('🥉', '3º Lugar', p3, trackRevealedState.pos3)}
      `;
    }
  }

  // Selecionar uma Etapa da Cerimônia (Modo Manual)
  window.selectCeremonyStep = function(stepIndex, scrollToPanel = false) {
    if (stepIndex < 0 || stepIndex >= CEREMONY_ROUTINE.length) return;
    stopAutoLoop();

    currentStepIdx = stepIndex;
    const routine = CEREMONY_ROUTINE[currentStepIdx];

    singleAwardRevealed = false;
    trackRevealedState = { pos1: false, pos2: false, pos3: false };

    const effect = routine.type === 'STANDBY' ? null : 'DRUMROLL';
    broadcastToPodioTelao(effect);

    if (scrollToPanel) {
      const panel = document.getElementById('operatorCeremonyPanel');
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ==========================================================================
  // 5. CICLO AUTOMÁTICO NO TELÃO (GIRO CONTÍNUO PÓS-PREMIAÇÃO OU SHOW)
  // ==========================================================================
  function stopAutoLoop() {
    if (!autoLoopActive) return;
    autoLoopActive = false;
    clearTimeout(autoLoopTimer);
    if (btnToggleAutoLoop) {
      btnToggleAutoLoop.classList.remove('active');
      btnToggleAutoLoop.innerHTML = '🔄 Iniciar Ciclo Automático';
    }
  }

  function startAutoLoop() {
    autoLoopActive = true;
    if (btnToggleAutoLoop) {
      btnToggleAutoLoop.classList.add('active');
      btnToggleAutoLoop.innerHTML = '⏹️ Parar Ciclo Automático';
    }

    const mode = selectLoopMode ? selectLoopMode.value : 'LOOP_REVEALED_8S';

    const makerCandidates = getSortedTrackCandidates('Maker');
    const hasMakerValid = makerCandidates.some(c => c.track.hasValidRun);
    const maxStep = hasMakerValid ? 7 : 6;

    if (currentStepIdx === 0 || currentStepIdx > maxStep) {
      currentStepIdx = 1;
    }

    if (mode === 'SHOW_SUSPENSE_ONCE') {
      runSuspenseShowStep(maxStep);
    } else {
      const intervalMs = mode === 'LOOP_REVEALED_12S' ? 12000 : 8000;
      runContinuousRevealedLoop(intervalMs, maxStep);
    }
  }

  function runContinuousRevealedLoop(intervalMs, maxStep) {
    if (!autoLoopActive) return;

    const routine = CEREMONY_ROUTINE[currentStepIdx];
    if (routine.type === 'SINGLE_AWARD') {
      singleAwardRevealed = true;
      broadcastToPodioTelao('CONFETTI_ONLY');
    } else if (routine.type === 'TRACK_PODIUM') {
      trackRevealedState = { pos1: true, pos2: true, pos3: true };
      broadcastToPodioTelao('CONFETTI_ONLY');
    }

    autoLoopTimer = setTimeout(() => {
      if (!autoLoopActive) return;
      currentStepIdx++;
      if (currentStepIdx > maxStep) {
        currentStepIdx = 1;
      }
      runContinuousRevealedLoop(intervalMs, maxStep);
    }, intervalMs);
  }

  function runSuspenseShowStep(maxStep) {
    if (!autoLoopActive) return;
    const routine = CEREMONY_ROUTINE[currentStepIdx];

    if (routine.type === 'SINGLE_AWARD') {
      singleAwardRevealed = false;
      broadcastToPodioTelao('DRUMROLL');

      autoLoopTimer = setTimeout(() => {
        if (!autoLoopActive) return;
        singleAwardRevealed = true;
        broadcastToPodioTelao('REVEAL_CHAMPION');

        autoLoopTimer = setTimeout(() => {
          if (!autoLoopActive) return;
          if (currentStepIdx < maxStep) {
            currentStepIdx++;
            runSuspenseShowStep(maxStep);
          } else {
            stopAutoLoop();
          }
        }, 6500);
      }, 2800);
    } else if (routine.type === 'TRACK_PODIUM') {
      trackRevealedState = { pos1: false, pos2: false, pos3: false };
      broadcastToPodioTelao('DRUMROLL');

      autoLoopTimer = setTimeout(() => {
        if (!autoLoopActive) return;
        trackRevealedState.pos3 = true;
        broadcastToPodioTelao('REVEAL_MINOR');

        autoLoopTimer = setTimeout(() => {
          if (!autoLoopActive) return;
          trackRevealedState.pos2 = true;
          broadcastToPodioTelao('REVEAL_MINOR');

          autoLoopTimer = setTimeout(() => {
            if (!autoLoopActive) return;
            trackRevealedState.pos1 = true;
            broadcastToPodioTelao('REVEAL_CHAMPION');

            autoLoopTimer = setTimeout(() => {
              if (!autoLoopActive) return;
              if (currentStepIdx < maxStep) {
                currentStepIdx++;
                runSuspenseShowStep(maxStep);
              } else {
                stopAutoLoop();
              }
            }, 8000);
          }, 3500);
        }, 3500);
      }, 2500);
    }
  }

  // ==========================================================================
  // 6. EVENT LISTENERS DOS CONTROLES DO OPERADOR
  // ==========================================================================
  copStepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.step);
      window.selectCeremonyStep(idx, false);
    });
  });

  if (btnSendStandby) {
    btnSendStandby.addEventListener('click', () => {
      stopAutoLoop();
      currentStepIdx = 0;
      broadcastToPodioTelao(null);
    });
  }

  if (btnStartFirstAward) {
    btnStartFirstAward.addEventListener('click', () => {
      window.selectCeremonyStep(1, false);
    });
  }

  if (btnSingleSuspense) {
    btnSingleSuspense.addEventListener('click', () => {
      stopAutoLoop();
      singleAwardRevealed = false;
      broadcastToPodioTelao('DRUMROLL');
    });
  }

  if (btnSingleReveal) {
    btnSingleReveal.addEventListener('click', () => {
      stopAutoLoop();
      singleAwardRevealed = true;
      broadcastToPodioTelao('REVEAL_CHAMPION');
    });
  }

  if (btnSingleConfetti) {
    btnSingleConfetti.addEventListener('click', () => {
      broadcastToPodioTelao('CONFETTI_ONLY');
    });
  }

  if (btnTrackResetSuspense) {
    btnTrackResetSuspense.addEventListener('click', () => {
      stopAutoLoop();
      trackRevealedState = { pos1: false, pos2: false, pos3: false };
      broadcastToPodioTelao('DRUMROLL');
    });
  }

  if (btnTrackReveal3) {
    btnTrackReveal3.addEventListener('click', () => {
      stopAutoLoop();
      trackRevealedState.pos3 = true;
      broadcastToPodioTelao('REVEAL_MINOR');
    });
  }

  if (btnTrackReveal2) {
    btnTrackReveal2.addEventListener('click', () => {
      stopAutoLoop();
      trackRevealedState.pos2 = true;
      broadcastToPodioTelao('REVEAL_MINOR');
    });
  }

  if (btnTrackReveal1) {
    btnTrackReveal1.addEventListener('click', () => {
      stopAutoLoop();
      trackRevealedState.pos1 = true;
      broadcastToPodioTelao('REVEAL_CHAMPION');
    });
  }

  if (btnTrackRevealAll) {
    btnTrackRevealAll.addEventListener('click', () => {
      stopAutoLoop();
      trackRevealedState = { pos1: true, pos2: true, pos3: true };
      broadcastToPodioTelao('REVEAL_CHAMPION');
    });
  }

  if (btnTrackConfetti) {
    btnTrackConfetti.addEventListener('click', () => {
      broadcastToPodioTelao('CONFETTI_ONLY');
    });
  }

  if (btnCopPrev) {
    btnCopPrev.addEventListener('click', () => {
      if (currentStepIdx > 0) {
        window.selectCeremonyStep(currentStepIdx - 1, false);
      }
    });
  }

  if (btnCopNext) {
    btnCopNext.addEventListener('click', () => {
      if (currentStepIdx < CEREMONY_ROUTINE.length - 1) {
        window.selectCeremonyStep(currentStepIdx + 1, false);
      }
    });
  }

  if (btnToggleAutoLoop) {
    btnToggleAutoLoop.addEventListener('click', () => {
      if (autoLoopActive) {
        stopAutoLoop();
      } else {
        startAutoLoop();
      }
    });
  }

  // Atalhos de Teclado para o Operador na Tela de Apuração
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

    const routine = CEREMONY_ROUTINE[currentStepIdx];
    if (e.code === 'Space') {
      e.preventDefault();
      stopAutoLoop();
      if (routine.type === 'STANDBY') {
        window.selectCeremonyStep(1, false);
      } else if (routine.type === 'SINGLE_AWARD') {
        if (!singleAwardRevealed) {
          singleAwardRevealed = true;
          broadcastToPodioTelao('REVEAL_CHAMPION');
        }
      } else if (routine.type === 'TRACK_PODIUM') {
        if (!trackRevealedState.pos3) {
          trackRevealedState.pos3 = true;
          broadcastToPodioTelao('REVEAL_MINOR');
        } else if (!trackRevealedState.pos2) {
          trackRevealedState.pos2 = true;
          broadcastToPodioTelao('REVEAL_MINOR');
        } else if (!trackRevealedState.pos1) {
          trackRevealedState.pos1 = true;
          broadcastToPodioTelao('REVEAL_CHAMPION');
        }
      }
    } else if (e.key === 'ArrowRight') {
      if (currentStepIdx < CEREMONY_ROUTINE.length - 1) {
        window.selectCeremonyStep(currentStepIdx + 1, false);
      }
    } else if (e.key === 'ArrowLeft') {
      if (currentStepIdx > 0) {
        window.selectCeremonyStep(currentStepIdx - 1, false);
      }
    }
  });

  // Monitoramento de Conexão com a Janela do Telão do Pódio
  function updateTelaoBadgeStatus() {
    const isConnected = (Date.now() - lastTelaoHeartbeat) < 5000;
    if (!elPodioTelaoBadge || !elPodioTelaoText) return;
    if (isConnected) {
      elPodioTelaoBadge.className = 'badge-status cloud-online';
      elPodioTelaoText.textContent = '🟢 Telão do Pódio Conectado';
    } else {
      elPodioTelaoBadge.className = 'badge-status cloud-offline';
      elPodioTelaoText.textContent = '⚪ Aguardando Telão do Pódio';
    }
  }

  if (podioChannel) {
    podioChannel.onmessage = (event) => {
      const msg = event.data;
      if (msg && msg.type === 'PODIO_TELAO_ONLINE') {
        const wasOffline = (Date.now() - lastTelaoHeartbeat) >= 5000;
        lastTelaoHeartbeat = Date.now();
        updateTelaoBadgeStatus();
        if (wasOffline) {
          broadcastToPodioTelao(null);
        }
      }
    };
    podioChannel.postMessage({ type: 'PODIO_PING' });
    setInterval(updateTelaoBadgeStatus, 2500);
  }

  // Filtros de Categoria da Tabela
  categoryTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      renderAll();
    });
  });

  if (btnRefreshData) {
    btnRefreshData.addEventListener('click', async () => {
      btnRefreshData.textContent = '⏳ Atualizando...';
      await loadData();
      btnRefreshData.textContent = '🔄 Atualizar Dados';
    });
  }

  function renderAll() {
    renderTrackRanking();
    renderSpecialAwards();
  }

  // Inicialização
  await loadData();
  broadcastToPodioTelao(null);
});

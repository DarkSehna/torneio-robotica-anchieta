/**
 * Torneio de Robótica Anchieta - Motor de Pontuação do Circuito Intercolegial Anual
 * Escala Oficial de 100 Pontos por Etapa:
 * - Pista (Velocidade): até 50 pts (escala F1)
 * - Paddock (Soma das 5 médias de rubrica x 3): até 45 pts (conta para TODAS as equipes)
 * - Bônus de Troféu Oficial na Etapa: +5 pts
 */

document.addEventListener('DOMContentLoaded', async () => {
  const elCloudStatusBadge = document.getElementById('cloudStatusBadge');
  const elCloudStatusText = document.getElementById('cloudStatusText');
  const btnRefreshCircuit = document.getElementById('btnRefreshCircuit');

  const btnSaveStageSnapshot = document.getElementById('btnSaveStageSnapshot');
  const btnExportCircuitCSV = document.getElementById('btnExportCircuitCSV');
  const btnExportCircuitJSON = document.getElementById('btnExportCircuitJSON');
  const inputImportCircuitJSON = document.getElementById('inputImportCircuitJSON');

  const savedStagesBanner = document.getElementById('savedStagesBanner');
  const savedStagesChips = document.getElementById('savedStagesChips');
  const chkIncludeLiveStage = document.getElementById('chkIncludeLiveStage');
  const btnClearSavedStages = document.getElementById('btnClearSavedStages');

  const schoolsGrid = document.getElementById('schoolsGrid');
  const circuitTableHead = document.getElementById('circuitTableHead');
  const circuitTableBody = document.getElementById('circuitTableBody');

  // Escala F1 de Pontos de Pista (1º ao 10º lugar, 11º+ = 10 pts)
  const TRACK_POINTS_SCALE = [50, 42, 36, 31, 27, 24, 21, 18, 15, 12];

  let teams = [];
  let corridas = [];
  let avaliacoes = [];
  let minervaVotes = JSON.parse(localStorage.getItem('torneio_minerva_votos') || '{}');
  let savedStages = getSavedStages();

  function getSavedStages() {
    try {
      const raw = localStorage.getItem('torneio_circuito_etapas');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveStagesToStorage(list) {
    savedStages = list;
    localStorage.setItem('torneio_circuito_etapas', JSON.stringify(list));
  }

  // 1. Carrega Dados da Etapa Atual (Cloudflare D1 ou Cache Local)
  async function loadLiveStageData() {
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

    updateCloudBadge(cloudLoaded);
    renderCircuitAll();
  }

  function updateCloudBadge(online) {
    if (!elCloudStatusBadge) return;
    if (online) {
      elCloudStatusBadge.className = 'badge-status cloud-online';
      if (elCloudStatusText) elCloudStatusText.textContent = '🟢 Cloudflare D1 Online';
    } else {
      elCloudStatusBadge.className = 'badge-status cloud-offline';
      if (elCloudStatusText) elCloudStatusText.textContent = '🟡 Dados Locais';
    }
  }

  // 2. Estatísticas de Pista e Rubricas por Equipe
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
      if (validRuns.length > 1) otherRun = validRuns[1];
    }

    let deltaEvolucao = 0;
    if (r1 && r2 && r1.status === 'VALID' && r2.status === 'VALID') {
      const diffSeg = (Number(r1.tempo_ms) - Number(r2.tempo_ms)) / 1000;
      const diffFaltas = (Number(r1.infracoes || 0) - Number(r2.infracoes || 0)) * 5.0;
      deltaEvolucao = Number((diffSeg + diffFaltas).toFixed(2));
    }

    const totalFaltas = teamRuns.reduce((acc, c) => acc + (Number(c.infracoes) || 0), 0);

    return {
      attempted: teamRuns.length > 0,
      hasValidRun: validRuns.length > 0,
      bestTimeMs: bestRun ? Number(bestRun.tempo_ms) : Infinity,
      bestTimeFouls: bestRun ? Number(bestRun.infracoes || 0) : 99,
      secondTimeMs: otherRun ? Number(otherRun.tempo_ms) : Infinity,
      deltaEvolucao,
      r2Fouls: r2 ? Number(r2.infracoes || 0) : 99,
      totalFaltas
    };
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
    const result = { evalCount: teamEvals.length, sumAvgs: 0 };

    criteria.forEach(crit => {
      const scores = teamEvals.map(ev =>
        Number(ev[crit] ?? ev[`nota_${crit}`] ?? (ev[`voto_${crit}`] ? 3 : 2)) || 0
      ).filter(s => s > 0);

      const sum = scores.reduce((a, b) => a + b, 0);
      const avg = scores.length > 0 ? Number((sum / scores.length).toFixed(2)) : 0;
      const count3 = scores.filter(s => s === 3).length;

      result[crit] = { avg, count3 };
      result.sumAvgs += avg;
    });

    result.sumAvgs = Number(result.sumAvgs.toFixed(2));
    // Multiplicador Oficial: Soma das 5 médias (máx 15.0) * 3 = até 45.0 pontos!
    result.paddockPoints = Number((result.sumAvgs * 3).toFixed(1));
    return result;
  }

  // 3. Calcula Pontuação Completa da Etapa Atual (0 a 100 pts por equipe)
  function computeCurrentStagePoints() {
    const exclusivityActive = localStorage.getItem('torneio_exclusivity_rule') !== 'false';

    // 3.1 Ranking de Pista e atribuição dos pontos de velocidade (50 pts máx)
    const enriched = teams.map(team => ({
      team,
      track: getTrackStatsForTeam(team.name),
      rubrics: getRubricStatsForTeam(team.name, team.id),
      trackRank: null,
      trackPoints: 0,
      paddockPoints: 0,
      trophyBonus: 0,
      trophyName: null,
      stageTotal: 0
    }));

    // Ordena por velocidade para definir posição de pista
    const trackSorted = [...enriched].sort((a, b) => {
      if (a.track.bestTimeMs !== b.track.bestTimeMs) return a.track.bestTimeMs - b.track.bestTimeMs;
      if (a.track.bestTimeFouls !== b.track.bestTimeFouls) return a.track.bestTimeFouls - b.track.bestTimeFouls;
      return a.track.secondTimeMs - b.track.secondTimeMs;
    });

    const awardedTrophiesMap = new Map(); // teamName_lower -> Nome do Troféu

    trackSorted.forEach((item, idx) => {
      if (item.track.hasValidRun) {
        item.trackRank = idx + 1;
        item.trackPoints = idx < TRACK_POINTS_SCALE.length ? TRACK_POINTS_SCALE[idx] : 10;
        if (idx === 0) awardedTrophiesMap.set(item.team.name.toLowerCase(), '🥇 1º Pista');
        else if (idx === 1) awardedTrophiesMap.set(item.team.name.toLowerCase(), '🥈 2º Pista');
        else if (idx === 2) awardedTrophiesMap.set(item.team.name.toLowerCase(), '🥉 3º Pista');
      } else if (item.track.attempted) {
        item.trackPoints = 5; // Pontos de participação na pista (tentou, mas teve DNF/TimeUp)
      } else {
        item.trackPoints = 0;
      }
    });

    // 3.2 Identifica vencedores dos 5 Troféus de Paddock (para o Bônus de +5 pts)
    const awardRules = [
      {
        id: 'mecanica', label: '⚙️ Mecânica',
        cmp: (a, b) => (b.rubrics.mecanica.avg - a.rubrics.mecanica.avg) || (a.track.bestTimeMs - b.track.bestTimeMs) || (a.track.bestTimeFouls - b.track.bestTimeFouls)
      },
      {
        id: 'superacao', label: '🚀 Superação',
        cmp: (a, b) => (b.rubrics.superacao.avg - a.rubrics.superacao.avg) || (b.track.deltaEvolucao - a.track.deltaEvolucao) || (a.track.r2Fouls - b.track.r2Fouls)
      },
      {
        id: 'caracterizacao', label: '🎨 Caracterização',
        cmp: (a, b) => (b.rubrics.caracterizacao.avg - a.rubrics.caracterizacao.avg) || (b.rubrics.caracterizacao.count3 - a.rubrics.caracterizacao.count3)
      },
      {
        id: 'torcida', label: '📣 Torcida',
        cmp: (a, b) => (b.rubrics.torcida.avg - a.rubrics.torcida.avg) || (b.rubrics.torcida.count3 - a.rubrics.torcida.count3)
      },
      {
        id: 'fair_play', label: '🤝 Fair Play',
        cmp: (a, b) => (b.rubrics.fair_play.avg - a.rubrics.fair_play.avg) || (a.track.totalFaltas - b.track.totalFaltas)
      }
    ];

    awardRules.forEach(rule => {
      const sorted = [...enriched].sort((a, b) => {
        const mv = minervaVotes[rule.id];
        if (mv) {
          if (a.team.name === mv) return -1;
          if (b.team.name === mv) return 1;
        }
        return rule.cmp(a, b);
      });

      let chosen = sorted[0];
      if (exclusivityActive && !minervaVotes[rule.id]) {
        const eligible = sorted.find(c => !awardedTrophiesMap.has(c.team.name.toLowerCase()));
        if (eligible) chosen = eligible;
      }

      if (chosen && chosen.rubrics[rule.id].avg > 0) {
        const k = chosen.team.name.toLowerCase();
        if (!awardedTrophiesMap.has(k)) {
          awardedTrophiesMap.set(k, rule.label);
        }
      }
    });

    // 3.3 Consolida Pontos da Etapa (Pista + Paddock + Bônus de Troféu)
    enriched.forEach(item => {
      item.paddockPoints = item.rubrics.paddockPoints;
      const trophy = awardedTrophiesMap.get(item.team.name.toLowerCase());
      if (trophy) {
        item.trophyName = trophy;
        item.trophyBonus = 5;
      }
      item.stageTotal = Number((item.trackPoints + item.paddockPoints + item.trophyBonus).toFixed(1));
    });

    return enriched;
  }

  // 4. Renderiza Tudo (Etapas Salvas + Copa das Escolas + Tabela Geral de Equipes)
  function renderCircuitAll() {
    const liveData = computeCurrentStagePoints();
    const includeLive = !chkIncludeLiveStage || chkIncludeLiveStage.checked || savedStages.length === 0;

    // 4.1 Barra de Etapas Gravadas
    if (savedStages.length > 0) {
      savedStagesBanner.style.display = 'flex';
      savedStagesChips.innerHTML = '';
      savedStages.forEach((st, idx) => {
        const chip = document.createElement('span');
        chip.className = 'stage-chip';
        chip.innerHTML = `
          <span>#${idx + 1} ${st.name}</span>
          <button type="button" title="Remover esta etapa" data-idx="${idx}">&times;</button>
        `;
        chip.querySelector('button').addEventListener('click', () => {
          if (confirm(`Remover a etapa "${st.name}" do histórico da temporada?`)) {
            savedStages.splice(idx, 1);
            saveStagesToStorage(savedStages);
            renderCircuitAll();
          }
        });
        savedStagesChips.appendChild(chip);
      });
    } else {
      savedStagesBanner.style.display = 'none';
    }

    // 4.2 Consolida Pontos da Temporada por Equipe
    const seasonRows = liveData.map(item => {
      const stageScores = savedStages.map(st => {
        const found = (st.scores || []).find(s => s.teamName.toLowerCase() === item.team.name.toLowerCase());
        return found ? Number(found.totalPoints || 0) : 0;
      });

      const savedSum = stageScores.reduce((a, b) => a + b, 0);
      const seasonTotal = Number((savedSum + (includeLive ? item.stageTotal : 0)).toFixed(1));

      return {
        ...item,
        stageScores,
        seasonTotal
      };
    });

    // Ordena Equipes pelo Total da Temporada -> Pontos Pista -> Pontos Paddock -> Menor Tempo
    seasonRows.sort((a, b) => {
      if (b.seasonTotal !== a.seasonTotal) return b.seasonTotal - a.seasonTotal;
      if (b.trackPoints !== a.trackPoints) return b.trackPoints - a.trackPoints;
      if (b.paddockPoints !== a.paddockPoints) return b.paddockPoints - a.paddockPoints;
      return a.track.bestTimeMs - b.track.bestTimeMs;
    });

    renderSchoolsCup(seasonRows);
    renderCircuitTable(seasonRows, includeLive);
  }

  // Renderiza a Copa Intercolegial das Escolas
  function renderSchoolsCup(seasonRows) {
    if (!schoolsGrid) return;
    schoolsGrid.innerHTML = '';

    const bySchool = new Map();
    seasonRows.forEach(r => {
      const schoolName = r.team.school || 'Colégio Anchieta';
      if (!bySchool.has(schoolName)) {
        bySchool.set(schoolName, {
          school: schoolName,
          teamCount: 0,
          totalPoints: 0,
          bestTeamName: r.team.name,
          bestTeamPts: r.seasonTotal
        });
      }
      const entry = bySchool.get(schoolName);
      entry.teamCount++;
      entry.totalPoints = Number((entry.totalPoints + r.seasonTotal).toFixed(1));
      if (r.seasonTotal > entry.bestTeamPts) {
        entry.bestTeamPts = r.seasonTotal;
        entry.bestTeamName = r.team.name;
      }
    });

    const schoolsList = Array.from(bySchool.values()).map(s => ({
      ...s,
      avgPoints: s.teamCount > 0 ? Number((s.totalPoints / s.teamCount).toFixed(1)) : 0
    }));

    // Ordena pela Média por Equipe (justo para escolas com quantidades diferentes de equipes) e depois pelo Total
    schoolsList.sort((a, b) => (b.avgPoints - a.avgPoints) || (b.totalPoints - a.totalPoints));

    schoolsList.forEach((sc, idx) => {
      const rank = idx + 1;
      const medal = rank === 1 ? '🥇 1º Lugar' : (rank === 2 ? '🥈 2º Lugar' : (rank === 3 ? '🥉 3º Lugar' : `${rank}º Lugar`));
      const card = document.createElement('div');
      card.className = `school-card ${rank === 1 && sc.totalPoints > 0 ? 'rank-1-school' : ''}`;
      card.innerHTML = `
        <div class="school-card-top">
          <span class="school-rank-pill">${medal}</span>
          <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">${sc.teamCount} equipe(s) inscrita(s)</span>
        </div>
        <div class="school-name-title">${sc.school}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">
          Equipe Destaque: <strong style="color: var(--color-primary);">${sc.bestTeamName}</strong> (${sc.bestTeamPts} pts)
        </div>
        <div class="school-metrics-row">
          <div>
            <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Média por Equipe</div>
            <div class="school-avg-pts">${sc.avgPoints.toFixed(1)} <small style="font-size: 0.85rem;">pts</small></div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Soma Total da Escola</div>
            <strong style="font-size: 1.15rem; color: var(--color-primary); font-family: var(--font-timer);">${sc.totalPoints.toFixed(1)} pts</strong>
          </div>
        </div>
      `;
      schoolsGrid.appendChild(card);
    });
  }

  // Renderiza a Tabela Geral do Circuito Anual
  function renderCircuitTable(seasonRows, includeLive) {
    if (!circuitTableHead || !circuitTableBody) return;

    const stageHeadersHtml = savedStages.map((st, idx) =>
      `<th style="text-align: center;">Etapa ${idx + 1}<br><small style="font-weight:600; text-transform:none;">${st.name}</small></th>`
    ).join('');

    circuitTableHead.innerHTML = `
      <tr>
        <th style="width: 68px;">Pos.</th>
        <th>Equipe / Escola</th>
        ${stageHeadersHtml}
        ${includeLive ? `
          <th style="text-align: center;">🏎️ Pista<br><small style="font-weight:600;">(Máx 50)</small></th>
          <th style="text-align: center;">📋 Paddock<br><small style="font-weight:600;">(Máx 45)</small></th>
          <th style="text-align: center;">🏅 Troféu<br><small style="font-weight:600;">(+5 Bônus)</small></th>
        ` : ''}
        <th style="text-align: right; width: 150px;">🏆 Total Circuito</th>
      </tr>
    `;

    circuitTableBody.innerHTML = '';

    if (seasonRows.length === 0) {
      circuitTableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 24px;">Nenhuma equipe encontrada.</td></tr>`;
      return;
    }

    seasonRows.forEach((row, index) => {
      const pos = index + 1;
      const hasPts = row.seasonTotal > 0;
      let posClass = 'pos-other';
      let posLabel = `${pos}º`;
      if (hasPts) {
        if (pos === 1) { posClass = 'pos-1'; posLabel = '🥇 1º'; }
        else if (pos === 2) { posClass = 'pos-2'; posLabel = '🥈 2º'; }
        else if (pos === 3) { posClass = 'pos-3'; posLabel = '🥉 3º'; }
      }

      const savedColsHtml = row.stageScores.map(pts =>
        `<td style="text-align: center; font-family: var(--font-timer); font-weight: 800;">${pts.toFixed(1)}</td>`
      ).join('');

      const trackRankNote = row.trackRank ? `<div style="font-size:0.70rem; color:var(--text-muted);">${row.trackRank}º na pista</div>` : '';
      const paddockStarsNote = `<div style="font-size:0.70rem; color:var(--text-muted);">${row.rubrics.sumAvgs.toFixed(1)} / 15★</div>`;
      const bonusHtml = row.trophyBonus > 0
        ? `<span class="pts-chip bonus">+${row.trophyBonus}</span><div style="font-size:0.68rem; color:#92400E; font-weight:700; margin-top:2px;">${row.trophyName}</div>`
        : `<span style="color: var(--text-muted); font-size: 0.8rem;">—</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="rank-badge ${posClass}">${posLabel}</span></td>
        <td>
          <strong style="color: var(--color-primary); font-size: 0.96rem;">${row.team.name}</strong>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${row.team.school} &bull; ${row.team.id}</div>
        </td>
        ${savedColsHtml}
        ${includeLive ? `
          <td style="text-align: center;">
            <span class="pts-chip track">${row.trackPoints} pts</span>
            ${trackRankNote}
          </td>
          <td style="text-align: center;">
            <span class="pts-chip paddock">${row.paddockPoints.toFixed(1)} pts</span>
            ${paddockStarsNote}
          </td>
          <td style="text-align: center;">
            ${bonusHtml}
          </td>
        ` : ''}
        <td style="text-align: right;">
          <span class="total-season-pill ${pos === 1 && hasPts ? 'leader' : ''}">${row.seasonTotal.toFixed(1)} pts</span>
        </td>
      `;
      circuitTableBody.appendChild(tr);
    });
  }

  // 5. Salvar / Congelar Etapa Atual na Temporada
  if (btnSaveStageSnapshot) {
    btnSaveStageSnapshot.addEventListener('click', () => {
      const defaultName = `Torneio ${savedStages.length + 1} (${new Date().toLocaleDateString('pt-BR')})`;
      const stageName = prompt('Digite o nome desta Etapa para gravar na Temporada do Circuito:', defaultName);
      if (!stageName || !stageName.trim()) return;

      const liveData = computeCurrentStagePoints();
      const stageEntry = {
        id: 'STG-' + Date.now(),
        name: stageName.trim(),
        savedAt: new Date().toISOString(),
        scores: liveData.map(item => ({
          teamId: item.team.id,
          teamName: item.team.name,
          school: item.team.school,
          trackPoints: item.trackPoints,
          paddockPoints: item.paddockPoints,
          trophyBonus: item.trophyBonus,
          trophyName: item.trophyName,
          totalPoints: item.stageTotal
        }))
      };

      savedStages.push(stageEntry);
      saveStagesToStorage(savedStages);
      if (chkIncludeLiveStage) chkIncludeLiveStage.checked = false;
      renderCircuitAll();
      alert(`Etapa "${stageEntry.name}" gravada na Temporada! Quando ocorrer o próximo torneio do ano, as pontuações serão somadas automaticamente.`);
    });
  }

  if (chkIncludeLiveStage) {
    chkIncludeLiveStage.addEventListener('change', renderCircuitAll);
  }

  if (btnClearSavedStages) {
    btnClearSavedStages.addEventListener('click', () => {
      if (confirm('Deseja limpar todas as etapas gravadas no histórico da temporada local?')) {
        saveStagesToStorage([]);
        if (chkIncludeLiveStage) chkIncludeLiveStage.checked = true;
        renderCircuitAll();
      }
    });
  }

  // 6. Exportar CSV / JSON e Importar Temporada
  if (btnExportCircuitCSV) {
    btnExportCircuitCSV.addEventListener('click', () => {
      const liveData = computeCurrentStagePoints();
      let csv = 'Posicao;Equipe;Escola;Pontos_Pista;Pontos_Paddock;Bonus_Trofeu;Trofeu_Conquistado;Total_Etapa\n';
      liveData.sort((a, b) => b.stageTotal - a.stageTotal).forEach((r, i) => {
        csv += `${i + 1};${r.team.name};${r.team.school};${r.trackPoints};${r.paddockPoints};${r.trophyBonus};${r.trophyName || 'Nenhum'};${r.stageTotal}\n`;
      });
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Ranking_Circuito_Anchieta_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    });
  }

  if (btnExportCircuitJSON) {
    btnExportCircuitJSON.addEventListener('click', () => {
      const payload = {
        exportedAt: new Date().toISOString(),
        savedStages,
        currentLiveStage: computeCurrentStagePoints()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Temporada_Circuito_Robotica_${Date.now()}.json`;
      a.click();
    });
  }

  if (inputImportCircuitJSON) {
    inputImportCircuitJSON.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data && Array.isArray(data.savedStages)) {
            saveStagesToStorage(data.savedStages);
            renderCircuitAll();
            alert(`${data.savedStages.length} etapa(s) da temporada importada(s) com sucesso!`);
          } else {
            alert('Arquivo JSON de temporada inválido.');
          }
        } catch (err) {
          alert('Erro ao ler arquivo JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  if (btnRefreshCircuit) {
    btnRefreshCircuit.addEventListener('click', async () => {
      btnRefreshCircuit.textContent = '⏳ Atualizando...';
      await loadLiveStageData();
      btnRefreshCircuit.textContent = '🔄 Atualizar Pontos';
    });
  }

  await loadLiveStageData();
});


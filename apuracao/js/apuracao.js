/**
 * Torneio de Robótica Anchieta - Motor de Apuração Geral & Cerimônia de Pódio
 * Edital Geral nº 08/2026 - Algoritmo Determinístico de Desempate
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elementos do DOM
  const elCloudStatusBadge = document.getElementById('cloudStatusBadge');
  const elCloudStatusText = document.getElementById('cloudStatusText');
  const btnRefreshData = document.getElementById('btnRefreshData');
  const btnOpenCeremony = document.getElementById('btnOpenCeremony');

  // Filtros de Categoria
  const categoryTabBtns = document.querySelectorAll('.category-tab-btn');
  let activeCategory = 'LEGO / Educacional'; // Padrão oficial: torneio com robôs LEGO

  // Seções de visualização
  const trackRankingBody = document.getElementById('trackRankingBody');
  const awardsGrid = document.getElementById('awardsGrid');
  const tieAlertSection = document.getElementById('tieAlertSection');

  // Modal da Cerimônia
  const ceremonyModal = document.getElementById('ceremonyModal');
  const btnCloseCeremony = document.getElementById('btnCloseCeremony');
  const ceremonySelectAward = document.getElementById('ceremonySelectAward');
  const btnReveal3 = document.getElementById('btnReveal3');
  const btnReveal2 = document.getElementById('btnReveal2');
  const btnReveal1 = document.getElementById('btnReveal1');

  // Estado Geral
  let teams = [];
  let corridas = [];
  let avaliacoes = [];
  let minervaVotes = JSON.parse(localStorage.getItem('torneio_minerva_votos') || '{}');

  // 1. Carregamento Unificado dos Dados
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

    // Fallback Local Resiliente (se nuvem estiver offline ou sem dados)
    if (!cloudLoaded || teams.length === 0) {
      if (window.teamsManager) {
        await window.teamsManager.load();
        teams = window.teamsManager.getAll();
      }
      const rawEvals = localStorage.getItem('paddock_evaluations_cache');
      if (rawEvals) {
        try { avaliacoes = JSON.parse(rawEvals); } catch(e) {}
      }
      const rawCorridas = localStorage.getItem('corridas_pista_cache');
      if (rawCorridas) {
        try { corridas = JSON.parse(rawCorridas); } catch(e) {}
      }
    }

    renderAll();
    updateCloudStatus(cloudLoaded);
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

  // 2. Processamento Estatístico de Pista por Equipe
  function getTrackStatsForTeam(teamName) {
    const teamRuns = corridas.filter(c => 
      (c.equipe || '').trim().toLowerCase() === teamName.trim().toLowerCase()
    );

    const validRuns = teamRuns.filter(c => c.status === 'VALID' && Number(c.tempo_ms) > 0);

    let r1 = teamRuns.find(c => Number(c.rodada) === 1);
    let r2 = teamRuns.find(c => Number(c.rodada) === 2);

    let bestRun = null;
    let otherRun = null;

    if (validRuns.length > 0) {
      validRuns.sort((a, b) => Number(a.tempo_ms) - Number(b.tempo_ms));
      bestRun = validRuns[0];
      if (validRuns.length > 1) {
        otherRun = validRuns[1];
      }
    }

    // Cálculo do Delta de Evolução (Prêmio Superação)
    // Δevolução = (Tempo R1 - Tempo R2) + (Faltas R1 - Faltas R2) * 5.0
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

  // Formatação de Tempo mm:ss.cc
  function formatMs(ms) {
    if (!ms || ms === Infinity) return '--:--.--';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  }

  // 3. Processamento das Rubricas dos Juízes de Paddock
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

      result[crit] = {
        avg,
        scores,
        count3
      };
    });

    return result;
  }

  // 4. Renderizar Classificação da Pista (Velocidade)
  function renderTrackRanking() {
    if (!trackRankingBody) return;
    trackRankingBody.innerHTML = '';

    // Filtra equipes por categoria
    let filteredTeams = teams;
    if (activeCategory !== 'TODAS') {
      filteredTeams = teams.filter(t => t.category.includes(activeCategory.includes('LEGO') ? 'LEGO' : 'Maker'));
    }

    // Calcula dados de pista
    const rankingList = filteredTeams.map(team => {
      const track = getTrackStatsForTeam(team.name);
      return { team, track };
    });

    // Ordenação Oficial da Pista:
    // 1. Menor tempo líquido oficial (Infinity vai pro fim)
    // 2. Menor número de faltas na melhor volta
    // 3. Menor tempo na outra volta válida
    rankingList.sort((a, b) => {
      if (a.track.bestTimeMs !== b.track.bestTimeMs) {
        return a.track.bestTimeMs - b.track.bestTimeMs;
      }
      if (a.track.bestTimeFouls !== b.track.bestTimeFouls) {
        return a.track.bestTimeFouls - b.track.bestTimeFouls;
      }
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
        <td>
          <span class="podium-rank-badge ${badgeClass}">${trophy}</span>
        </td>
        <td>
          <strong style="color: var(--color-primary); font-size: 0.95rem;">${item.team.name}</strong>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${item.team.school}</div>
        </td>
        <td>
          <span class="badge-pill-light" style="font-size: 0.75rem;">${item.team.category.includes('LEGO') ? 'LEGO' : 'MAKER'}</span>
        </td>
        <td style="font-family: var(--font-timer);">${r1Str}</td>
        <td style="font-family: var(--font-timer);">${r2Str}</td>
        <td>
          <span class="best-time-pill ${rank === 1 && item.track.hasValidRun ? 'first-place' : ''}">${bestTimeStr}</span>
        </td>
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

  // 5. Motor de Decisão dos 5 Prêmios Oficiais (Edital 08)
  const AWARDS_METADATA = [
    {
      id: 'mecanica',
      name: 'Melhor Mecânica',
      icon: '⚙️',
      desc: 'Robustez estrutural, chassi e eficiência.',
      tiebreakName: '1º Menor Tempo de Pista ➔ 2º Faltas',
      evalTiebreak: (a, b) => {
        // 1. Maior média na rubrica
        if (b.rubrics.mecanica.avg !== a.rubrics.mecanica.avg) {
          return b.rubrics.mecanica.avg - a.rubrics.mecanica.avg;
        }
        // 2. 1º Desempate: Menor tempo de pista
        if (a.track.bestTimeMs !== b.track.bestTimeMs) {
          return a.track.bestTimeMs - b.track.bestTimeMs;
        }
        // 3. 2º Desempate: Menor número de faltas na melhor volta
        return a.track.bestTimeFouls - b.track.bestTimeFouls;
      },
      getTiebreakExplain: (item) => {
        return `Melhor Volta: ${formatMs(item.track.bestTimeMs)} (${item.track.bestTimeFouls} faltas)`;
      }
    },
    {
      id: 'superacao',
      name: 'Prêmio Superação',
      icon: '🚀',
      desc: 'Resiliência e recuperação técnica visível.',
      tiebreakName: '1º Maior Δevolução ➔ 2º Faltas no R2',
      evalTiebreak: (a, b) => {
        // 1. Maior média na rubrica
        if (b.rubrics.superacao.avg !== a.rubrics.superacao.avg) {
          return b.rubrics.superacao.avg - a.rubrics.superacao.avg;
        }
        // 2. 1º Desempate: Maior delta de evolução
        if (b.track.deltaEvolucao !== a.track.deltaEvolucao) {
          return b.track.deltaEvolucao - a.track.deltaEvolucao;
        }
        // 3. 2º Desempate: Menor faltas no R2
        return a.track.r2Fouls - b.track.r2Fouls;
      },
      getTiebreakExplain: (item) => {
        return `Índice Δevolução: ${item.track.deltaEvolucao > 0 ? '+' : ''}${item.track.deltaEvolucao} pts`;
      }
    },
    {
      id: 'caracterizacao',
      name: 'Melhor Caracterização',
      icon: '🎨',
      desc: 'Tema criativo, uniforme, mascote e animação.',
      tiebreakName: '1º Votos "Superado ★" ➔ 2º Voto de Minerva',
      evalTiebreak: (a, b) => {
        // 1. Maior média
        if (b.rubrics.caracterizacao.avg !== a.rubrics.caracterizacao.avg) {
          return b.rubrics.caracterizacao.avg - a.rubrics.caracterizacao.avg;
        }
        // 2. Contagem de 3★
        return b.rubrics.caracterizacao.count3 - a.rubrics.caracterizacao.count3;
      },
      getTiebreakExplain: (item) => {
        return `${item.rubrics.caracterizacao.count3} voto(s) Superado ★`;
      }
    },
    {
      id: 'torcida',
      name: 'Melhor Torcida',
      icon: '📣',
      desc: 'Animação vibrante, gritos e respeito às equipes.',
      tiebreakName: '1º Votos "Superado ★" ➔ 2º Voto de Minerva',
      evalTiebreak: (a, b) => {
        if (b.rubrics.torcida.avg !== a.rubrics.torcida.avg) {
          return b.rubrics.torcida.avg - a.rubrics.torcida.avg;
        }
        return b.rubrics.torcida.count3 - a.rubrics.torcida.count3;
      },
      getTiebreakExplain: (item) => {
        return `${item.rubrics.torcida.count3} voto(s) Superado ★`;
      }
    },
    {
      id: 'fair_play',
      name: 'Prêmio Fair Play',
      icon: '🤝',
      desc: 'Cooperação, atitude positiva e espírito esportivo.',
      tiebreakName: '1º Menor total acumulado de faltas',
      evalTiebreak: (a, b) => {
        if (b.rubrics.fair_play.avg !== a.rubrics.fair_play.avg) {
          return b.rubrics.fair_play.avg - a.rubrics.fair_play.avg;
        }
        return a.track.totalFaltas - b.track.totalFaltas;
      },
      getTiebreakExplain: (item) => {
        return `Faltas totais na pista: ${item.track.totalFaltas}`;
      }
    }
  ];

  // Renderiza os 5 Prêmios Especiais
  function renderSpecialAwards() {
    if (!awardsGrid) return;
    awardsGrid.innerHTML = '';
    if (tieAlertSection) tieAlertSection.innerHTML = '';

    // Filtra equipes da categoria ativa
    let filteredTeams = teams;
    if (activeCategory !== 'TODAS') {
      filteredTeams = teams.filter(t => t.category.includes(activeCategory.includes('LEGO') ? 'LEGO' : 'Maker'));
    }

    if (filteredTeams.length === 0) {
      awardsGrid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center; padding: 24px;">Nenhuma equipe nesta categoria.</p>`;
      return;
    }

    // Para cada equipe, calcula track + rubrics
    const candidates = filteredTeams.map(team => {
      const track = getTrackStatsForTeam(team.name);
      const rubrics = getRubricStatsForTeam(team.name, team.id);
      return { team, track, rubrics };
    });

    AWARDS_METADATA.forEach(meta => {
      // Ordena os candidatos para este prêmio específico
      const list = [...candidates].sort((a, b) => {
        // Se houver Voto de Minerva registrado manualmente para este prêmio, ele tem prioridade máxima
        const minervaWinner = minervaVotes[meta.id];
        if (minervaWinner) {
          if (a.team.name === minervaWinner) return -1;
          if (b.team.name === minervaWinner) return 1;
        }
        return meta.evalTiebreak(a, b);
      });

      const winner = list[0];
      const second = list[1];

      // Checa se há EMPATE TÉCNICO RESIDUAL no 1º lugar (mesma média e mesmos critérios)
      let isResidualTie = false;
      if (second && !minervaVotes[meta.id]) {
        const topScore = winner.rubrics[meta.id].avg;
        const secondScore = second.rubrics[meta.id].avg;
        if (topScore > 0 && topScore === secondScore) {
          // Compara os critérios de desempate
          if (meta.evalTiebreak(winner, second) === 0) {
            isResidualTie = true;
            renderTieAlert(meta, winner, second);
          }
        }
      }

      const scoreNum = winner.rubrics[meta.id].avg;
      const tieExplain = meta.getTiebreakExplain(winner);

      const card = document.createElement('div');
      card.className = 'award-card';
      card.innerHTML = `
        <div class="award-card-header">
          <div class="award-name">
            <span>${meta.icon}</span>
            <span>${meta.name}</span>
          </div>
          <span class="badge-pill-light" style="font-size: 0.75rem;">${meta.tiebreakName}</span>
        </div>

        <div class="award-winner-box">
          <div class="award-winner-badge">🏆 Líder Oficial</div>
          <div class="award-winner-title">${winner.team.name}</div>
          <div class="award-winner-school">${winner.team.school} &bull; ${winner.team.category.includes('LEGO') ? 'LEGO' : 'MAKER'}</div>

          <div class="award-score-row">
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted);">Média da Rubrica:</span>
            <span class="award-score-number">${scoreNum.toFixed(2)} ★</span>
          </div>

          <div class="award-tiebreak-note">
            <strong>Critério:</strong> ${tieExplain}
            ${minervaVotes[meta.id] ? '<br><span style="color: #F26522; font-weight: 800;">⚖️ Decidido por Voto de Minerva</span>' : ''}
          </div>
        </div>

        <!-- Ranking Rápido deste Prêmio -->
        <div style="font-size: 0.78rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">
          Top Concorrentes:
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${list.slice(0, 3).map((item, idx) => `
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; padding: 4px 0; border-bottom: 1px dotted var(--border-light);">
              <span>${idx + 1}º ${item.team.name}</span>
              <strong style="color: var(--color-primary);">${item.rubrics[meta.id].avg.toFixed(2)} ★</strong>
            </div>
          `).join('')}
        </div>
      `;
      awardsGrid.appendChild(card);
    });
  }

  // Renderiza o Alerta de Deliberação / Voto de Minerva
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
        As equipes <strong>${teamA.team.name}</strong> e <strong>${teamB.team.name}</strong> obtiveram a mesma pontuação exata (${teamA.rubrics[meta.id].avg.toFixed(2)} ★) e empataram em todos os critérios automáticos do Edital. A Comissão Julgadora deve deliberar com base nas justificativas abaixo:
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

  // Ação global de Voto de Minerva
  window.castMinervaVote = function(awardId, teamName) {
    if (confirm(`Confirma declarar a equipe "${teamName}" como vencedora oficial do prêmio por Voto de Minerva da Comissão?`)) {
      minervaVotes[awardId] = teamName;
      localStorage.setItem('torneio_minerva_votos', JSON.stringify(minervaVotes));
      renderAll();
    }
  };

  // 6. Cerimônia de Premiação no Telão
  function setupCeremony() {
    btnOpenCeremony.addEventListener('click', () => {
      ceremonyModal.classList.add('active');
      resetPodium();
      updateCeremonyView();
    });

    btnCloseCeremony.addEventListener('click', () => {
      ceremonyModal.classList.remove('active');
    });

    ceremonySelectAward.addEventListener('change', () => {
      resetPodium();
      updateCeremonyView();
    });

    btnReveal3.addEventListener('click', () => {
      document.getElementById('podiumPillar3').classList.add('revealed');
      btnReveal3.disabled = true;
      btnReveal2.disabled = false;
      playBeep();
    });

    btnReveal2.addEventListener('click', () => {
      document.getElementById('podiumPillar2').classList.add('revealed');
      btnReveal2.disabled = true;
      btnReveal1.disabled = false;
      playBeep();
    });

    btnReveal1.addEventListener('click', () => {
      document.getElementById('podiumPillar1').classList.add('revealed');
      btnReveal1.disabled = true;
      triggerFanfare();
    });
  }

  function resetPodium() {
    ['podiumPillar1', 'podiumPillar2', 'podiumPillar3'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('revealed');
    });
    btnReveal3.disabled = false;
    btnReveal2.disabled = true;
    btnReveal1.disabled = true;
  }

  function updateCeremonyView() {
    const selectedMode = ceremonySelectAward.value;
    const cat = selectedMode.includes('MAKER') ? 'Aberta / Maker' : 'LEGO / Educacional';
    
    const filteredTeams = teams.filter(t => t.category.includes(cat.includes('LEGO') ? 'LEGO' : 'Maker'));
    const candidates = filteredTeams.map(team => {
      const track = getTrackStatsForTeam(team.name);
      return { team, track };
    });

    candidates.sort((a, b) => {
      if (a.track.bestTimeMs !== b.track.bestTimeMs) return a.track.bestTimeMs - b.track.bestTimeMs;
      if (a.track.bestTimeFouls !== b.track.bestTimeFouls) return a.track.bestTimeFouls - b.track.bestTimeFouls;
      return a.track.secondTimeMs - b.track.secondTimeMs;
    });

    const p1 = candidates[0];
    const p2 = candidates[1];
    const p3 = candidates[2];

    setPodiumTeamUI(1, p1);
    setPodiumTeamUI(2, p2);
    setPodiumTeamUI(3, p3);
  }

  function setPodiumTeamUI(pos, candidate) {
    const nameEl = document.getElementById(`podiumTeamName${pos}`);
    const schoolEl = document.getElementById(`podiumTeamSchool${pos}`);
    const timeEl = document.getElementById(`podiumTeamTime${pos}`);

    if (!nameEl) return;
    if (candidate) {
      nameEl.textContent = candidate.team.name;
      schoolEl.textContent = candidate.team.school;
      timeEl.textContent = candidate.track.hasValidRun ? formatMs(candidate.track.bestTimeMs) : 'SEM TEMPO';
    } else {
      nameEl.textContent = 'Aguardando...';
      schoolEl.textContent = '--';
      timeEl.textContent = '--:--.--';
    }
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch(e) {}
  }

  function triggerFanfare() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.8);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.8);
      });
    } catch(e) {}
  }

  // 7. Eventos dos Filtros
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
  setupCeremony();
  await loadData();
});

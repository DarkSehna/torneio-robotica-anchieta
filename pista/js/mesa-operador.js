/**
 * Torneio de Robótica Anchieta - Controlador da Mesa do Operador (Tela 1)
 * Regras Oficiais: Art. 7º (Trava aos 180s) e Art. 8º (Desclassificação na 5ª falta)
 */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializa equipes
  await window.teamsManager.load();

  // Elementos do DOM - Cabeçalho e Conexão
  const elTelaoStatusBadge = document.getElementById('telaoStatusBadge');
  const elCloudStatusBadge = document.getElementById('cloudStatusBadge');
  const elCloudStatusText = document.getElementById('cloudStatusText');
  const elSyncBadge = document.getElementById('syncBadge');
  const elPendingCount = document.getElementById('pendingCount');

  // Elementos do DOM - Seleção de Partida
  const lockedIndicatorBanner = document.getElementById('lockedIndicatorBanner');
  const teamSearchInput = document.getElementById('teamSearchInput');
  const teamSelectList = document.getElementById('teamSelectList');
  const catBtnLego = document.getElementById('catBtnLego');
  const catBtnMaker = document.getElementById('catBtnMaker');
  const roundBtn1 = document.getElementById('roundBtn1');
  const roundBtn2 = document.getElementById('roundBtn2');
  
  const elActiveTeamName = document.getElementById('activeTeamName');
  const elActiveSchoolName = document.getElementById('activeSchoolName');
  const elActiveCatBadge = document.getElementById('activeCatBadge');
  const elActiveRoundBadge = document.getElementById('activeRoundBadge');
  const elActiveTeamProfessor = document.getElementById('activeTeamProfessor');
  const elActiveTeamMembers = document.getElementById('activeTeamMembers');

  // Elementos da Fila Oficial da Arena
  const btnGenerateQueue = document.getElementById('btnGenerateQueue');
  const btnNextInQueue = document.getElementById('btnNextInQueue');
  const queueCurrentTeamText = document.getElementById('queueCurrentTeamText');
  const queueNextTeamText = document.getElementById('queueNextTeamText');
  const queueListContainer = document.getElementById('queueListContainer');
  const queueAptitudeWarning = document.getElementById('queueAptitudeWarning');

  // Canal de Sincronização da Arena em Tempo Real (Pista de Teste & Trava de Conflito)
  const arenaStatusBus = ('BroadcastChannel' in window) ? new BroadcastChannel('torneio_arena_status') : null;

  // Elementos do DOM - Cronômetro
  const elOpStatusBanner = document.getElementById('opStatusBanner');
  const elOpStatusText = document.getElementById('opStatusText');
  const elOpTimerDigits = document.getElementById('opTimerDigits');
  const btnStartPause = document.getElementById('btnStartPause');
  const btnStartPauseText = document.getElementById('btnStartPauseText');
  const btnFinish = document.getElementById('btnFinish');
  const btnReset = document.getElementById('btnReset');

  // Elementos do DOM - Infrações
  const elFoulSlots = document.querySelectorAll('.foul-slot');
  const btnAddFoul = document.getElementById('btnAddFoul');
  const btnUndoFoul = document.getElementById('btnUndoFoul');

  // Elementos do DOM - Gravação e Histórico
  const btnSaveRound = document.getElementById('btnSaveRound');
  const historyTableBody = document.getElementById('historyTableBody');
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnExportJSON = document.getElementById('btnExportJSON');
  const btnClearHistory = document.getElementById('btnClearHistory');

  // Estado Geral da Bateria Atual
  const sessionState = {
    teamId: 'EQ-01',
    teamName: 'Anchieta1',
    schoolName: 'Colégio Anchieta',
    category: (window.REGRAS_TORNEIO?.categoriaUnica ? (window.REGRAS_TORNEIO.nomeCategoriaUnica || 'Categoria Única') : 'LEGO / Educacional'),
    round: 'Round 1',
    fouls: 0,
    status: 'READY', // 'READY' | 'RUNNING' | 'PAUSED' | 'FINISHED' | 'TIME_UP' | 'DNF'
    timeMs: 0,
    timeFormatted: '00:00.000'
  };

  let telaoConnected = false;
  let lastBroadcastTick = 0;

  // Motor do Cronômetro (parametrizado via config/regrasTorneio.js)
  const MAX_TRACK_TIME_MS = Number(window.REGRAS_TORNEIO?.regrasPista?.tempoMaximoMs ?? 180000);
  const timer = new window.PrecisionTimer({
    maxTimeMs: MAX_TRACK_TIME_MS,
    onTick: (ms, formatted) => {
      sessionState.timeMs = ms;
      sessionState.timeFormatted = formatted;
      elOpTimerDigits.textContent = formatted;

      // Envia tick para o telão com throttle de 40ms para máxima fluidez e eficiência
      const now = performance.now();
      if (now - lastBroadcastTick > 40 || sessionState.status !== 'RUNNING') {
        lastBroadcastTick = now;
        window.pistaBus.send('TIMER_TICK', { timeMs: ms, timeFormatted: formatted });
      }
    },
    onWarning30s: () => {
      window.audioCues.playWarning30s();
    },
    onTimeUp: () => {
      sessionState.status = 'TIME_UP';
      sessionState.timeMs = MAX_TRACK_TIME_MS;
      sessionState.timeFormatted = '03:00.000';
      window.audioCues.playFinishAlarm(false);
      window.pistaBus.send('TIMER_TIME_UP', { timeMs: 180000, timeFormatted: '03:00.000' });
      updateUI();
    }
  });

  // Atualiza Sincronização Geral com o Telão
  function broadcastFullSync() {
    window.pistaBus.send('STATE_SYNC', {
      teamName: sessionState.teamName,
      schoolName: sessionState.schoolName,
      category: sessionState.category,
      round: sessionState.round,
      fouls: sessionState.fouls,
      status: sessionState.status,
      timeMs: sessionState.timeMs,
      timeFormatted: sessionState.timeFormatted
    });
  }

  // Atualização Visual da Mesa
  function updateUI() {
    // Painel Preview da Equipe
    elActiveTeamName.textContent = sessionState.teamName;
    elActiveSchoolName.textContent = sessionState.schoolName;
    elActiveCatBadge.textContent = sessionState.category;
    elActiveRoundBadge.textContent = sessionState.round;

    // Linha de Apoio (Professor e Integrantes - Discreto na Mesa do Operador)
    const activeTeamObj = window.teamsManager.getById(sessionState.teamId) || 
      window.teamsManager.getAll().find(t => (t.name || '').toLowerCase() === (sessionState.teamName || '').toLowerCase());

    if (elActiveTeamProfessor && elActiveTeamMembers) {
      if (activeTeamObj && (activeTeamObj.professor || activeTeamObj.integrantes)) {
        elActiveTeamProfessor.innerHTML = activeTeamObj.professor 
          ? `👨‍🏫 <strong>Prof:</strong> ${escapeHtml(activeTeamObj.professor)} ` 
          : '';
        elActiveTeamMembers.innerHTML = activeTeamObj.integrantes 
          ? `${activeTeamObj.professor ? '&bull; ' : ''}👥 <strong>Alunos:</strong> ${escapeHtml(activeTeamObj.integrantes)}` 
          : '';
      } else {
        elActiveTeamProfessor.innerHTML = '<span style="color: #94a3b8; font-style: italic;">(Professor / integrantes não vinculados)</span>';
        elActiveTeamMembers.textContent = '';
      }
    }

    // Status Banner
    elOpStatusBanner.className = 'status-banner ' + sessionState.status.toLowerCase();
    switch (sessionState.status) {
      case 'RUNNING':
        elOpStatusText.textContent = '⚡ EM PISTA — CRONÔMETRO ATIVO';
        btnStartPause.className = 'btn-action btn-pause';
        btnStartPauseText.textContent = '⏸ PAUSAR VOLTA [ESPAÇO]';
        break;
      case 'PAUSED':
        elOpStatusText.textContent = '⏸ BATERIA PAUSADA';
        btnStartPause.className = 'btn-action btn-start';
        btnStartPauseText.textContent = '▶ RETOMAR VOLTA [ESPAÇO]';
        break;
      case 'FINISHED':
        elOpStatusText.textContent = '🏁 VOLTA CONCLUÍDA';
        btnStartPause.className = 'btn-action btn-start';
        btnStartPauseText.textContent = '▶ INICIAR VOLTA [ESPAÇO]';
        break;
      case 'TIME_UP':
        elOpStatusText.textContent = '⌛ TEMPO ESGOTADO (3 MIN - ART. 7º)';
        btnStartPause.className = 'btn-action btn-start';
        btnStartPauseText.textContent = '▶ INICIAR VOLTA [ESPAÇO]';
        break;
      case 'DNF':
        elOpStatusText.textContent = '❌ DESCLASSIFICADO POR INFRAÇÕES (DNF - ART. 8º)';
        btnStartPause.className = 'btn-action btn-start';
        btnStartPauseText.textContent = '▶ INICIAR VOLTA [ESPAÇO]';
        break;
      case 'READY':
      default:
        elOpStatusText.textContent = '🟢 PRONTO PARA LARGADA';
        btnStartPause.className = 'btn-action btn-start';
        btnStartPauseText.textContent = '▶ INICIAR VOLTA [ESPAÇO]';
        break;
    }

    // Indicadores Visuais de Falta
    elFoulSlots.forEach((slot, index) => {
      const num = index + 1;
      slot.classList.remove('active', 'danger-final');
      if (num <= sessionState.fouls) {
        slot.classList.add('active');
        if (num === 5) {
          slot.classList.add('danger-final');
        }
      }
    });

    // Seletor de Categoria Pills
    const isCatUnica = !!window.REGRAS_TORNEIO?.categoriaUnica;
    if (isCatUnica) {
      if (catBtnLego && catBtnMaker) {
        catBtnLego.textContent = window.REGRAS_TORNEIO?.nomeCategoriaUnica || 'Categoria Única';
        catBtnLego.classList.add('active');
        catBtnLego.disabled = true;
        catBtnMaker.style.display = 'none';
        catBtnLego.style.width = '100%';
      }
      if (elActiveCatBadge) elActiveCatBadge.textContent = window.REGRAS_TORNEIO?.nomeCategoriaUnica || 'Categoria Única';
    } else {
      if (catBtnLego && catBtnMaker) {
        catBtnLego.textContent = 'LEGO';
        catBtnMaker.style.display = '';
        catBtnLego.style.width = '';
        if (sessionState.category.includes('LEGO')) {
          catBtnLego.classList.add('active');
          catBtnMaker.classList.remove('active');
        } else {
          catBtnMaker.classList.add('active');
          catBtnLego.classList.remove('active');
        }
      }
    }

    // Seletor de Rodada Pills
    if (sessionState.round === 'Round 1') {
      roundBtn1.classList.add('active');
      roundBtn2.classList.remove('active');
    } else {
      roundBtn2.classList.add('active');
      roundBtn1.classList.remove('active');
    }

    // Trava Operacional: Bloqueia seleção de equipe/categoria/rodada se o cronômetro estiver rodando ou em pausa de volta
    const isBatteryActive = sessionState.status === 'RUNNING' || (sessionState.status === 'PAUSED' && sessionState.timeMs > 0);
    if (isBatteryActive) {
      teamSearchInput.disabled = true;
      teamSelectList.classList.add('controls-locked');
      catBtnLego.disabled = true;
      catBtnMaker.disabled = true;
      roundBtn1.disabled = true;
      roundBtn2.disabled = true;
      if (lockedIndicatorBanner) lockedIndicatorBanner.classList.add('visible');
    } else {
      teamSearchInput.disabled = false;
      teamSelectList.classList.remove('controls-locked');
      catBtnLego.disabled = false;
      catBtnMaker.disabled = false;
      roundBtn1.disabled = false;
      roundBtn2.disabled = false;
      if (lockedIndicatorBanner) lockedIndicatorBanner.classList.remove('visible');
    }

    // Atualiza badges de conexão do Telão
    if (telaoConnected) {
      elTelaoStatusBadge.classList.add('connected');
      elTelaoStatusBadge.querySelector('span:last-child').textContent = 'Telão Conectado';
    } else {
      elTelaoStatusBadge.classList.remove('connected');
      elTelaoStatusBadge.querySelector('span:last-child').textContent = 'Aguardando Telão';
    }

    updateStorageBadges();
  }

  // Renderizar Lista de Seleção de Equipes
  function renderTeamList() {
    const query = teamSearchInput.value;
    const teams = window.teamsManager.filter(query, sessionState.category);
    teamSelectList.innerHTML = '';

    if (teams.length === 0) {
      teamSelectList.innerHTML = '<div style="padding: 12px; color: #888; font-size: 0.85rem; text-align: center;">Nenhuma equipe encontrada</div>';
      return;
    }

    teams.forEach(team => {
      const item = document.createElement('div');
      item.className = 'team-option-item' + (team.id === sessionState.teamId ? ' selected' : '');
      item.innerHTML = `
        <div class="team-opt-name">${team.name}</div>
        <div class="team-opt-school">${team.school} &bull; ${team.id}</div>
      `;
      item.addEventListener('click', () => {
        selectTeam(team);
      });
      teamSelectList.appendChild(item);
    });
  }

  function selectTeam(team) {
    sessionState.teamId = team.id;
    sessionState.teamName = team.name;
    sessionState.schoolName = team.school;
    sessionState.category = (window.REGRAS_TORNEIO?.categoriaUnica ? (window.REGRAS_TORNEIO.nomeCategoriaUnica || 'Categoria Única') : team.category);
    renderTeamList();
    renderArenaQueueUI();
    updateUI();
    broadcastFullSync();
    publishArenaStatus();
  }

  // ==========================================================================
  // FILA OFICIAL DA ARENA (ROUNDS 1 & 2) & TRAVA DE CONFLITO
  // ==========================================================================
  let arenaQueueData = { round1: [], round2: [] };
  try {
    const savedQ = localStorage.getItem('torneio_arena_queue');
    if (savedQ) arenaQueueData = JSON.parse(savedQ);
  } catch (_) {}

  function getActiveQueue() {
    const isR2 = sessionState.round === 'Round 2';
    return isR2 ? (arenaQueueData.round2 || []) : (arenaQueueData.round1 || []);
  }

  function saveArenaQueue() {
    localStorage.setItem('torneio_arena_queue', JSON.stringify(arenaQueueData));
    renderArenaQueueUI();
    publishArenaStatus();
  }

  function generateOfficialQueue() {
    const allTeams = window.teamsManager.getAll();
    if (!allTeams || allTeams.length === 0) {
      if (queueAptitudeWarning) {
        queueAptitudeWarning.innerHTML = '❌ Nenhuma equipe cadastrada no sistema!';
        queueAptitudeWarning.style.display = 'block';
      }
      return;
    }

    // Filtra equipes da categoria atual da mesa (ex: LEGO ou Maker), ou todas se for Categoria Única
    const isCatUnica = !!window.REGRAS_TORNEIO?.categoriaUnica;
    const teamsInCat = isCatUnica ? allTeams : allTeams.filter(t => !sessionState.category || t.category === sessionState.category);
    const pool = teamsInCat.length > 0 ? teamsInCat : allTeams;

    // Filtra as que estão com Check-in E Inspeção OK
    const aptas = pool.filter(t => t.checkin && t.inspecao);
    const isR2 = sessionState.round === 'Round 2';

    let baseList = aptas;
    let isProvisory = false;

    if (aptas.length === 0) {
      // Se nenhuma equipe da categoria tiver credenciamento completo, gera provisória para testes
      baseList = pool;
      isProvisory = true;
      if (queueAptitudeWarning) {
        queueAptitudeWarning.innerHTML = `⚠️ <strong>Fila de Teste Gerada:</strong> Nenhuma equipe com Check-in + Inspeção OK. Incluídas todas as ${pool.length} equipes de <em>${sessionState.category}</em>.`;
        queueAptitudeWarning.style.display = 'block';
        queueAptitudeWarning.style.background = '#FFFBEB';
        queueAptitudeWarning.style.borderColor = '#FCD34D';
        queueAptitudeWarning.style.color = '#B45309';
      }
    } else {
      if (queueAptitudeWarning) {
        queueAptitudeWarning.innerHTML = `✅ <strong>Fila Oficial Gerada:</strong> ${aptas.length} equipe(s) aptas (Check-in + Inspeção OK) para <em>${sessionState.category}</em>.`;
        queueAptitudeWarning.style.display = 'block';
        queueAptitudeWarning.style.background = '#F0FDF4';
        queueAptitudeWarning.style.borderColor = '#86EFAC';
        queueAptitudeWarning.style.color = '#166534';
      }
    }

    if (!isR2) {
      // Round 1: Embaralha com shuffle justo
      const shuffled = [...baseList].sort(() => Math.random() - 0.5);
      arenaQueueData.round1 = shuffled.map((t, idx) => ({
        pos: idx + 1,
        id: t.id,
        name: t.name,
        school: t.school,
        category: t.category,
        completed: false
      }));
    } else {
      // Round 2: Ordem Invertida (Reverse Grid) do Round 1 para descanso uniforme
      if (arenaQueueData.round1 && arenaQueueData.round1.length > 0) {
        arenaQueueData.round2 = [...arenaQueueData.round1].reverse().map((t, idx) => ({
          pos: idx + 1,
          id: t.id,
          name: t.name,
          school: t.school,
          category: t.category,
          completed: false
        }));
      } else {
        const shuffled = [...baseList].sort(() => Math.random() - 0.5);
        arenaQueueData.round2 = shuffled.map((t, idx) => ({
          pos: idx + 1,
          id: t.id,
          name: t.name,
          school: t.school,
          category: t.category,
          completed: false
        }));
      }
    }

    saveArenaQueue();

    // Seleciona automaticamente a primeira da fila para começar
    const q = getActiveQueue();
    if (q.length > 0) {
      loadTeamFromQueue(q[0]);
    }
  }

  function loadTeamFromQueue(teamItem) {
    if (!teamItem) return;
    const fullTeam = window.teamsManager.getAll().find(t => (t.name || '').toLowerCase() === (teamItem.name || '').toLowerCase()) || teamItem;
    selectTeam(fullTeam);
  }

  function loadNextInQueue() {
    const q = getActiveQueue();
    if (!q || q.length === 0) {
      generateOfficialQueue();
      return;
    }

    const curName = (sessionState.teamName || '').toLowerCase();
    const curIdx = q.findIndex(t => (t.name || '').toLowerCase() === curName);

    // Marca a equipe atual como completada se já concluiu ou correu
    if (curIdx !== -1 && (sessionState.status === 'FINISHED' || sessionState.status === 'TIME_UP' || sessionState.status === 'DNF')) {
      q[curIdx].completed = true;
      saveArenaQueue();
    }

    let next = null;
    if (curIdx !== -1 && curIdx + 1 < q.length) {
      next = q.slice(curIdx + 1).find(t => !t.completed);
    }
    if (!next) {
      next = q.find(t => !t.completed && (t.name || '').toLowerCase() !== curName);
    }

    if (!next) {
      if (queueAptitudeWarning) {
        queueAptitudeWarning.innerHTML = `🏁 <strong>Fim da Fila:</strong> Todas as equipes de <em>${sessionState.round}</em> já correram!`;
        queueAptitudeWarning.style.display = 'block';
        queueAptitudeWarning.style.background = '#EFF6FF';
        queueAptitudeWarning.style.borderColor = '#93C5FD';
        queueAptitudeWarning.style.color = '#1D4ED8';
      }
      return;
    }

    loadTeamFromQueue(next);
  }

  function renderArenaQueueUI() {
    if (!queueListContainer) return;
    let q = getActiveQueue();
    queueListContainer.innerHTML = '';

    // Se a fila ainda não tiver sido gerada para esta rodada, gera uma inicial automática com as equipes cadastradas
    if (!q || q.length === 0) {
      generateOfficialQueue();
      q = getActiveQueue();
    }

    if (!q || q.length === 0) {
      queueListContainer.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 16px; line-height: 1.4;">
          Nenhuma equipe encontrada para <strong>${escapeHtml(sessionState.category)}</strong>.<br>
          <span style="font-size: 0.74rem;">Cadastre equipes no Admin ou realize o Credenciamento.</span>
        </div>
      `;
      return;
    }

    const searchQuery = (teamSearchInput ? teamSearchInput.value : '').toLowerCase().trim();
    let displayList = q;
    if (searchQuery) {
      displayList = q.filter(t => 
        (t.name || '').toLowerCase().includes(searchQuery) || 
        (t.school || '').toLowerCase().includes(searchQuery)
      );
    }

    const curName = (sessionState.teamName || '').toLowerCase().trim();

    if (displayList.length === 0) {
      queueListContainer.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 12px;">
          Nenhuma equipe corresponde à busca <em>"${escapeHtml(searchQuery)}"</em>
        </div>
      `;
      return;
    }

    displayList.forEach((item, idx) => {
      const itemName = (item.name || item.equipe || '').trim();
      const isCurrent = itemName.toLowerCase() === curName;
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px;
        border-radius: var(--radius-sm);
        font-size: 0.82rem;
        cursor: pointer;
        background: ${isCurrent ? '#DCFCE7' : (item.completed ? '#F8FAFC' : '#FFFFFF')};
        border: 1.5px solid ${isCurrent ? '#22C55E' : (item.completed ? '#CBD5E1' : 'var(--border-medium)')};
        font-weight: ${isCurrent ? '800' : '600'};
        transition: transform 0.1s, box-shadow 0.1s;
      `;

      const statusTag = isCurrent
        ? '<span style="background: #16A34A; color: #fff; font-size: 0.65rem; padding: 2px 7px; border-radius: 3px; font-weight: 800;">EM PISTA</span>'
        : (item.completed
            ? '<span style="color: #64748B; font-size: 0.72rem; font-weight: 700;">✅ Feito</span>'
            : `<span style="color: var(--color-primary); font-size: 0.74rem; font-weight: 800;">#${item.pos || idx + 1}</span>`);

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <span style="font-weight: 900; color: var(--color-primary); font-size: 0.78rem;">#${item.pos || idx + 1}</span>
          <span style="color: var(--text-main); font-weight: 700;">${escapeHtml(itemName)}</span>
          <span style="color: var(--text-muted); font-size: 0.72rem;">(${escapeHtml(item.school || '')})</span>
        </div>
        <div>${statusTag}</div>
      `;

      row.addEventListener('click', () => {
        loadTeamFromQueue(item);
      });

      queueListContainer.appendChild(row);
    });
  }

  function publishArenaStatus() {
    const q = getActiveQueue();
    const curName = (sessionState.teamName || '').trim();
    const curIdx = q.findIndex(t => (t?.name || '').toLowerCase() === curName.toLowerCase());

    let nextTeam = null;
    if (curIdx !== -1 && curIdx + 1 < q.length) {
      nextTeam = q.slice(curIdx + 1).find(t => !t.completed);
    } else if (q.length > 0) {
      nextTeam = q.find(t => !t.completed && (t?.name || '').toLowerCase() !== curName.toLowerCase());
    }

    const payload = {
      equipe_atual: curName,
      status_atual: sessionState.status || 'READY',
      equipe_proxima: nextTeam ? nextTeam.name : '',
      rodada: sessionState.round === 'Round 2' ? 2 : 1,
      timestamp: Date.now()
    };

    if (queueCurrentTeamText) queueCurrentTeamText.textContent = payload.equipe_atual || '--';
    if (queueNextTeamText) queueNextTeamText.textContent = payload.equipe_proxima || 'Fim da fila';

    if (arenaStatusBus) {
      arenaStatusBus.postMessage(payload);
    }

    if (window.cloudAPI) {
      window.cloudAPI.salvarArenaStatus({
        equipeAtual: payload.equipe_atual,
        statusAtual: payload.status_atual,
        equipeProxima: payload.equipe_proxima,
        rodada: payload.rodada
      }).catch(() => {});
    }
  }

  // Listener para atualizações externas da Fila (ex: quando o Credenciamento gera a fila oficial)
  if (arenaStatusBus) {
    arenaStatusBus.onmessage = (e) => {
      try {
        const savedQ = localStorage.getItem('torneio_arena_queue');
        if (savedQ) {
          arenaQueueData = JSON.parse(savedQ);
          renderArenaQueueUI();
          const q = getActiveQueue();
          if (q.length > 0 && sessionState.status === 'READY' && sessionState.timeMs === 0) {
            loadTeamFromQueue(q[0]);
          }
        }
      } catch (_) {}
    };
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'torneio_arena_queue' && e.newValue) {
      try {
        arenaQueueData = JSON.parse(e.newValue);
        renderArenaQueueUI();
        const q = getActiveQueue();
        if (q.length > 0 && sessionState.status === 'READY' && sessionState.timeMs === 0) {
          loadTeamFromQueue(q[0]);
        }
      } catch (_) {}
    }
  });

  if (btnGenerateQueue) {
    btnGenerateQueue.addEventListener('click', (ev) => {
      ev.preventDefault();
      generateOfficialQueue();
    });
  }
  if (btnNextInQueue) {
    btnNextInQueue.addEventListener('click', (ev) => {
      ev.preventDefault();
      loadNextInQueue();
    });
  }

  // Alternar Categoria
  catBtnLego.addEventListener('click', () => {
    sessionState.category = 'LEGO / Educacional';
    renderTeamList();
    renderArenaQueueUI();
    updateUI();
    broadcastFullSync();
  });

  catBtnMaker.addEventListener('click', () => {
    sessionState.category = 'Aberta / Maker';
    renderTeamList();
    renderArenaQueueUI();
    updateUI();
    broadcastFullSync();
  });

  // Alternar Rodada
  roundBtn1.addEventListener('click', () => {
    sessionState.round = 'Round 1';
    renderArenaQueueUI();
    updateUI();
    broadcastFullSync();
    publishArenaStatus();
  });

  roundBtn2.addEventListener('click', () => {
    sessionState.round = 'Round 2';
    renderArenaQueueUI();
    updateUI();
    broadcastFullSync();
    publishArenaStatus();
  });

  // Filtro de Busca de Equipes
  teamSearchInput.addEventListener('input', () => {
    renderTeamList();
    renderArenaQueueUI();
  });

  // Controles do Cronômetro
  function handleStartPause() {
    if (sessionState.status === 'RUNNING') {
      timer.pause();
      sessionState.status = 'PAUSED';
      window.audioCues.playPause();
      window.pistaBus.send('TIMER_PAUSE', {});
    } else {
      if (sessionState.fouls >= 5) {
        alert('Esta bateria foi encerrada por 5 infrações (DNF). Zere o cronômetro para uma nova volta.');
        return;
      }
      timer.start();
      sessionState.status = 'RUNNING';
      window.audioCues.playStart();
      window.pistaBus.send('TIMER_START', {});
    }
    updateUI();
    publishArenaStatus();
  }

  function handleFinish() {
    if (sessionState.status === 'STOPPED' && sessionState.timeMs === 0) return;
    timer.pause();
    sessionState.status = 'FINISHED';
    window.audioCues.playFinishAlarm(false);
    window.pistaBus.send('TIMER_FINISH', {
      timeMs: sessionState.timeMs,
      timeFormatted: sessionState.timeFormatted
    });
    updateUI();
    publishArenaStatus();
  }

  function handleReset() {
    if (sessionState.status === 'RUNNING') {
      if (!confirm('A corrida está em andamento! Tem certeza de que deseja zerar o cronômetro?')) {
        return;
      }
    }
    timer.reset();
    sessionState.status = 'READY';
    sessionState.fouls = 0;
    sessionState.timeMs = 0;
    sessionState.timeFormatted = '00:00.000';
    elOpTimerDigits.textContent = '00:00.000';
    window.pistaBus.send('TIMER_RESET', { timeFormatted: '00:00.000' });
    updateUI();
    publishArenaStatus();
  }

  btnStartPause.addEventListener('click', handleStartPause);
  btnFinish.addEventListener('click', handleFinish);
  btnReset.addEventListener('click', handleReset);

  // Gestão de Infrações (Art. 8º)
  function addFoul() {
    if (sessionState.fouls >= 5) return;

    sessionState.fouls++;
    const isDNF = sessionState.fouls >= 5;

    if (isDNF) {
      timer.pause();
      sessionState.status = 'DNF';
      window.audioCues.playFinishAlarm(true);
      window.pistaBus.send('FOUL_UPDATE', { fouls: sessionState.fouls, isDNF: true });
    } else {
      window.audioCues.playFoul();
      window.pistaBus.send('FOUL_UPDATE', { fouls: sessionState.fouls, isDNF: false });
    }
    updateUI();
  }

  function undoFoul() {
    if (sessionState.fouls <= 0) return;
    sessionState.fouls--;
    if (sessionState.status === 'DNF' && sessionState.fouls < 5) {
      sessionState.status = 'PAUSED';
    }
    window.pistaBus.send('FOUL_UPDATE', { fouls: sessionState.fouls, isDNF: false });
    updateUI();
  }

  btnAddFoul.addEventListener('click', addFoul);
  btnUndoFoul.addEventListener('click', undoFoul);

  // Atalhos de Teclado
  window.addEventListener('keydown', (e) => {
    // Evita atalhos se o foco estiver no campo de pesquisa
    if (document.activeElement === teamSearchInput) return;

    if (e.code === 'Space') {
      e.preventDefault();
      handleStartPause();
    } else if (e.code === 'KeyF' || e.key === '+') {
      e.preventDefault();
      addFoul();
    } else if (e.code === 'KeyU' || e.key === '-') {
      e.preventDefault();
      undoFoul();
    } else if (e.code === 'KeyR') {
      if (e.shiftKey) {
        e.preventDefault();
        handleReset();
      }
    }
  });

  // Gravação no LocalStorage e Sync
  function getRecords() {
    const raw = localStorage.getItem('torneio_anchieta_records');
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveRecords(records) {
    localStorage.setItem('torneio_anchieta_records', JSON.stringify(records));
    updateStorageBadges();
    renderHistoryTable();
  }

  function updateStorageBadges() {
    const records = getRecords();
    const pending = records.filter(r => !r.synced).length;
    elPendingCount.textContent = pending;
  }

  function registerOfficialRound() {
    if (sessionState.timeMs === 0 && sessionState.status !== 'DNF') {
      alert('Nenhum tempo foi cronometrado para registrar!');
      return;
    }

    const records = getRecords();
    const record = {
      id: 'REC-' + Date.now().toString(36).toUpperCase(),
      teamId: sessionState.teamId,
      teamName: sessionState.teamName,
      schoolName: sessionState.schoolName,
      category: sessionState.category,
      round: sessionState.round,
      timeMs: sessionState.timeMs,
      timeFormatted: sessionState.timeFormatted,
      fouls: sessionState.fouls,
      status: sessionState.status === 'DNF' ? 'DNF' : (sessionState.status === 'TIME_UP' ? 'TIME_UP' : 'VALID'),
      recordedAt: new Date().toLocaleTimeString('pt-BR'),
      timestamp: Date.now(),
      synced: false // Pronto para a Fase 2 (Cloudflare D1)
    };

    records.unshift(record);
    saveRecords(records);

    // Marca como concluída na fila da Arena oficial
    const q = getActiveQueue();
    const curItem = q.find(t => t.name.toLowerCase() === sessionState.teamName.toLowerCase());
    if (curItem) {
      curItem.completed = true;
      saveArenaQueue();
    }

    // Tenta sincronizar imediatamente em segundo plano
    syncSingleRecordToCloud(record);

    // Feedback visual
    const originalText = btnSaveRound.innerHTML;
    btnSaveRound.innerHTML = '✅ VOLTA REGISTRADA COM SUCESSO!';
    btnSaveRound.style.background = 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)';
    setTimeout(() => {
      btnSaveRound.innerHTML = originalText;
      btnSaveRound.style.background = '';
    }, 1800);
  }

  btnSaveRound.addEventListener('click', registerOfficialRound);

  // Sincronização com Cloudflare Workers
  async function syncSingleRecordToCloud(rec) {
    if (!window.cloudAPI) return;
    try {
      const res = await window.cloudAPI.salvarCorridas(rec);
      if (res && res.ok) {
        rec.synced = true;
        const all = getRecords();
        const found = all.find(r => r.id === rec.id);
        if (found) found.synced = true;
        localStorage.setItem('torneio_anchieta_records', JSON.stringify(all));
        updateStorageBadges();
        renderHistoryTable();
      }
    } catch (e) {
      console.warn('Sync em background pendente:', e);
    }
  }

  async function syncAllPendingToCloud() {
    const records = getRecords();
    const pending = records.filter(r => !r.synced);
    if (pending.length === 0) {
      alert('Todas as voltas já estão sincronizadas com a nuvem!');
      return;
    }

    const originalText = btnSyncCloud.innerHTML;
    btnSyncCloud.innerHTML = '⏳ Sincronizando...';
    btnSyncCloud.disabled = true;

    try {
      // O Worker suporta lote (batch) diretamente!
      const res = await window.cloudAPI.salvarCorridas(pending);
      if (res && res.ok) {
        pending.forEach(r => r.synced = true);
        saveRecords(records);
        alert(`Sucesso! ${pending.length} volta(s) sincronizada(s) com o Cloudflare D1.`);
      } else {
        alert('Erro ao sincronizar com a nuvem: ' + (res?.error || res?.data?.error || 'Verifique a conexão'));
      }
    } catch (err) {
      alert('Falha na conexão com a nuvem: ' + err.message);
    } finally {
      btnSyncCloud.innerHTML = originalText;
      btnSyncCloud.disabled = false;
      updateStorageBadges();
      renderHistoryTable();
    }
  }

  const btnSyncCloud = document.getElementById('btnSyncCloud');
  if (btnSyncCloud) {
    btnSyncCloud.addEventListener('click', syncAllPendingToCloud);
  }

  // Garante formatação em milésimos (.000) mesmo para registros antigos do cache local
  function formatRecordMillis(rec) {
    if (typeof rec.timeMs === 'number' && Number.isFinite(rec.timeMs)) {
      return timer.format(rec.timeMs);
    }
    if (rec.timeFormatted && /^\d{2}:\d{2}\.\d{2}$/.test(rec.timeFormatted)) {
      return rec.timeFormatted + '0';
    }
    return rec.timeFormatted || '00:00.000';
  }

  // Renderizar Tabela de Histórico
  function renderHistoryTable() {
    const records = getRecords();
    historyTableBody.innerHTML = '';

    if (records.length === 0) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">
            Nenhuma volta registrada nesta sessão. As voltas salvas aparecerão aqui.
          </td>
        </tr>
      `;
      return;
    }

    records.forEach(rec => {
      const tr = document.createElement('tr');
      let statusBadge = '<span class="status-badge-table valid">Válida</span>';
      if (rec.status === 'DNF') {
        statusBadge = '<span class="status-badge-table dnf">DNF (5 Faltas)</span>';
      } else if (rec.status === 'TIME_UP') {
        statusBadge = '<span class="status-badge-table timeup">Tempo Esgotado</span>';
      }

      const syncBadge = rec.synced 
        ? '<span style="color: #16A34A; font-weight: 800;">🟢 Nuvem</span>'
        : '<span style="color: #F26522; font-weight: 800;">🟡 Local</span>';

      const formattedTime = formatRecordMillis(rec);

      tr.innerHTML = `
        <td><strong>${rec.recordedAt}</strong></td>
        <td><strong>${rec.teamName}</strong></td>
        <td>${rec.schoolName}</td>
        <td>${rec.category}</td>
        <td><strong>${rec.round}</strong></td>
        <td class="tabular-nums" style="font-weight: 800; font-size: 1rem; color: var(--color-primary);">${formattedTime}</td>
        <td style="font-weight: 700; color: ${rec.fouls >= 5 ? 'var(--color-danger)' : 'inherit'};">${rec.fouls}</td>
        <td>${statusBadge}</td>
        <td>${syncBadge}</td>
      `;
      historyTableBody.appendChild(tr);
    });
  }

  // Exportar CSV
  btnExportCSV.addEventListener('click', () => {
    const records = getRecords();
    if (records.length === 0) return alert('Nenhum dado para exportar.');
    
    let csv = 'ID;Horário;Equipe;Escola;Categoria;Rodada;Tempo_Formatado;Tempo_MS;Infrações;Status;Sincronizado\n';
    records.forEach(r => {
      const formattedTime = formatRecordMillis(r);
      csv += `${r.id};${r.recordedAt};${r.teamName};${r.schoolName};${r.category};${r.round};${formattedTime};${r.timeMs};${r.fouls};${r.status};${r.synced ? 'SIM' : 'NÃO'}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Torneio_Anchieta_Voltas_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  });

  // Exportar JSON
  btnExportJSON.addEventListener('click', () => {
    const records = getRecords();
    if (records.length === 0) return alert('Nenhum dado para exportar.');
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Torneio_Anchieta_Backup_${Date.now()}.json`;
    a.click();
  });

  // Limpar Histórico
  btnClearHistory.addEventListener('click', () => {
    if (confirm('Tem certeza de que deseja limpar o histórico local desta sessão? Essa ação não pode ser desfeita.')) {
      saveRecords([]);
    }
  });

  // Escuta Mensagens do Telão
  window.pistaBus.on('TELAO_READY', () => {
    telaoConnected = true;
    updateUI();
    broadcastFullSync();
  });

  // Verificação de Status da Nuvem Cloudflare Workers
  async function checkCloudStatus() {
    if (!window.cloudAPI || !elCloudStatusBadge) return;
    const res = await window.cloudAPI.checkHealth();
    if (res.online) {
      elCloudStatusBadge.className = 'badge-status cloud-online';
      if (elCloudStatusText) elCloudStatusText.textContent = '🟢 Nuvem Online';
    } else {
      elCloudStatusBadge.className = 'badge-status cloud-offline';
      if (elCloudStatusText) elCloudStatusText.textContent = '🔴 Nuvem Offline';
    }
  }

  // Inicialização Assíncrona Resiliente
  async function initOperator() {
    await window.teamsManager.load();
    
    // Tenta carregar fila oficial salva
    try {
      const savedQ = localStorage.getItem('torneio_arena_queue');
      if (savedQ) {
        const parsed = JSON.parse(savedQ);
        if (parsed && (parsed.round1 || parsed.round2)) {
          arenaQueueData = parsed;
        }
      }
    } catch (_) {}

    const q = getActiveQueue();
    const allTeams = window.teamsManager.getAll();

    if (q.length > 0) {
      loadTeamFromQueue(q[0]);
    } else if (allTeams.length > 0) {
      selectTeam(allTeams[0]);
    }

    renderTeamList();
    renderArenaQueueUI();
    renderHistoryTable();
    updateUI();
    broadcastFullSync();
    publishArenaStatus();
    checkCloudStatus();
  }

  initOperator();

  // Heartbeat do telão: a cada 4 segundos envia ping leve
  setInterval(() => {
    broadcastFullSync();
  }, 4000);

  // Monitora conexão com a nuvem a cada 15 segundos
  setInterval(() => {
    checkCloudStatus();
  }, 15000);
});

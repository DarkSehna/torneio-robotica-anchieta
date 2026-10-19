/**
 * Torneio de Robótica Anchieta - Controlador da Mesa do Operador (Tela 1)
 * Regras Oficiais: Art. 7º (Trava aos 180s) e Art. 8º (Desclassificação na 5ª falta)
 */

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
    teamName: 'RoboStorm',
    schoolName: 'Colégio Anchieta',
    category: 'LEGO / Educacional',
    round: 'Round 1',
    fouls: 0,
    status: 'READY', // 'READY' | 'RUNNING' | 'PAUSED' | 'FINISHED' | 'TIME_UP' | 'DNF'
    timeMs: 0,
    timeFormatted: '00:00.00'
  };

  let telaoConnected = false;
  let lastBroadcastTick = 0;

  // Motor do Cronômetro
  const timer = new window.PrecisionTimer({
    maxTimeMs: 180000, // 3 minutos
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
      sessionState.timeMs = 180000;
      sessionState.timeFormatted = '03:00.00';
      window.audioCues.playFinishAlarm(false);
      window.pistaBus.send('TIMER_TIME_UP', { timeMs: 180000, timeFormatted: '03:00.00' });
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
    if (sessionState.category.includes('LEGO')) {
      catBtnLego.classList.add('active');
      catBtnMaker.classList.remove('active');
    } else {
      catBtnMaker.classList.add('active');
      catBtnLego.classList.remove('active');
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
    sessionState.category = team.category;
    renderTeamList();
    updateUI();
    broadcastFullSync();
  }

  // Alternar Categoria
  catBtnLego.addEventListener('click', () => {
    sessionState.category = 'LEGO / Educacional';
    renderTeamList();
    updateUI();
    broadcastFullSync();
  });

  catBtnMaker.addEventListener('click', () => {
    sessionState.category = 'Aberta / Maker';
    renderTeamList();
    updateUI();
    broadcastFullSync();
  });

  // Alternar Rodada
  roundBtn1.addEventListener('click', () => {
    sessionState.round = 'Round 1';
    updateUI();
    broadcastFullSync();
  });

  roundBtn2.addEventListener('click', () => {
    sessionState.round = 'Round 2';
    updateUI();
    broadcastFullSync();
  });

  // Filtro de Busca de Equipes
  teamSearchInput.addEventListener('input', () => {
    renderTeamList();
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
    sessionState.timeFormatted = '00:00.00';
    elOpTimerDigits.textContent = '00:00.00';
    window.pistaBus.send('TIMER_RESET', { timeFormatted: '00:00.00' });
    updateUI();
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

      tr.innerHTML = `
        <td><strong>${rec.recordedAt}</strong></td>
        <td><strong>${rec.teamName}</strong></td>
        <td>${rec.schoolName}</td>
        <td>${rec.category}</td>
        <td><strong>${rec.round}</strong></td>
        <td class="tabular-nums" style="font-weight: 800; font-size: 1rem; color: var(--color-primary);">${rec.timeFormatted}</td>
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
      csv += `${r.id};${r.recordedAt};${r.teamName};${r.schoolName};${r.category};${r.round};${r.timeFormatted};${r.timeMs};${r.fouls};${r.status};${r.synced ? 'SIM' : 'NÃO'}\n`;
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

  // Inicialização
  renderTeamList();
  renderHistoryTable();
  updateUI();
  broadcastFullSync();
  checkCloudStatus();

  // Heartbeat do telão: a cada 4 segundos envia ping leve
  setInterval(() => {
    broadcastFullSync();
  }, 4000);

  // Monitora conexão com a nuvem a cada 15 segundos
  setInterval(() => {
    checkCloudStatus();
  }, 15000);
});

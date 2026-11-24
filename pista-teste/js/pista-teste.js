/**
 * Torneio de Robótica Anchieta - Controlador da Pista de Teste & Calibração
 * Monitoramento em Tempo Real com Trava de Conflito da Arena Principal
 */

document.addEventListener('DOMContentLoaded', async () => {
  await window.teamsManager.load();

  // Elementos do DOM - Status e Arena
  const elCloudStatusBadge = document.getElementById('cloudStatusBadge');
  const elCloudStatusText = document.getElementById('cloudStatusText');
  const liveArenaCurrentTeam = document.getElementById('liveArenaCurrentTeam');
  const liveArenaStatusBadge = document.getElementById('liveArenaStatusBadge');
  const liveArenaNextTeam = document.getElementById('liveArenaNextTeam');

  // Trava de Conflito
  const conflictDangerBanner = document.getElementById('conflictDangerBanner');
  const dangerTeamName = document.getElementById('dangerTeamName');
  const conflictWarningBanner = document.getElementById('conflictWarningBanner');
  const warningTeamName = document.getElementById('warningTeamName');

  // Seleção e Timer
  const slotDurationBtns = document.querySelectorAll('.slot-duration-btn');
  const testTeamSearch = document.getElementById('testTeamSearch');
  const testTeamSelectList = document.getElementById('testTeamSelectList');
  const testTimerStatusText = document.getElementById('testTimerStatusText');
  const testTimerDigits = document.getElementById('testTimerDigits');
  const activeTestTeamInfo = document.getElementById('activeTestTeamInfo');

  // Botões de Ação
  const btnTestStart = document.getElementById('btnTestStart');
  const btnTestPause = document.getElementById('btnTestPause');
  const btnTestReset = document.getElementById('btnTestReset');
  const btnTestRelease = document.getElementById('btnTestRelease');

  // Tabela de Histórico
  const testSessionCount = document.getElementById('testSessionCount');
  const testHistoryTableBody = document.getElementById('testHistoryTableBody');
  const btnClearTestHistory = document.getElementById('btnClearTestHistory');

  // Estado da Pista de Teste
  let selectedTeam = null;
  let slotDurationSeconds = 180; // 3 min padrão
  let remainingMs = 180 * 1000;
  let elapsedMs = 0;
  let timerState = 'READY'; // 'READY' | 'RUNNING' | 'PAUSED' | 'TIME_UP'
  let timerInterval = null;
  let lastTimestamp = null;
  let warning30sPlayed = false;

  // Estado da Arena Principal (Sincronizado)
  let arenaState = {
    equipe_atual: '',
    status_atual: 'READY',
    equipe_proxima: '',
    rodada: 1
  };

  // Canal Broadcast Local para comunicação instantânea entre abas
  const arenaBus = ('BroadcastChannel' in window) ? new BroadcastChannel('torneio_arena_status') : null;
  if (arenaBus) {
    arenaBus.onmessage = (e) => {
      if (e.data) {
        updateArenaState(e.data);
      }
    };
  }

  // ==========================================================================
  // 1. MONITORAMENTO DA ARENA & POLLING LEVE (~10s)
  // ==========================================================================
  function updateArenaState(data) {
    arenaState = {
      equipe_atual: data.equipe_atual || data.equipeAtual || '',
      status_atual: data.status_atual || data.statusAtual || 'READY',
      equipe_proxima: data.equipe_proxima || data.equipeProxima || '',
      rodada: Number(data.rodada || 1)
    };

    // Atualiza Painel do Topo
    if (liveArenaCurrentTeam) {
      liveArenaCurrentTeam.textContent = arenaState.equipe_atual || 'Nenhuma (Pista Livre)';
    }

    if (liveArenaStatusBadge) {
      if (arenaState.status_atual === 'RUNNING') {
        liveArenaStatusBadge.className = 'arena-tag-badge tag-running';
        liveArenaStatusBadge.textContent = '⚡ EM PISTA AGORA';
      } else if (arenaState.equipe_atual) {
        liveArenaStatusBadge.className = 'arena-tag-badge tag-next';
        liveArenaStatusBadge.textContent = 'PRONTA P/ LARGADA';
      } else {
        liveArenaStatusBadge.className = 'arena-tag-badge tag-free';
        liveArenaStatusBadge.textContent = 'LIVRE';
      }
    }

    if (liveArenaNextTeam) {
      liveArenaNextTeam.textContent = arenaState.equipe_proxima || 'Nenhuma definida';
    }

    // Reavalia a trava de conflito imediatamente
    evaluateConflictLock();
  }

  async function fetchArenaStatusFromCloud() {
    if (!window.cloudAPI) return;
    try {
      const data = await window.cloudAPI.getArenaStatus();
      if (data && data.ok) {
        updateArenaState(data);
      }
    } catch (_) {}
  }

  // ==========================================================================
  // 2. MOTOR DA TRAVA DE CONFLITO (CONFLICT LOCK)
  // ==========================================================================
  function evaluateConflictLock() {
    if (!selectedTeam) {
      conflictDangerBanner.style.display = 'none';
      conflictWarningBanner.style.display = 'none';
      btnTestStart.disabled = false;
      return;
    }

    const selName = selectedTeam.name.trim().toLowerCase();
    const arenaCurName = (arenaState.equipe_atual || '').trim().toLowerCase();
    const arenaNextName = (arenaState.equipe_proxima || '').trim().toLowerCase();

    // 1. BLOQUEIO CRÍTICO: Equipe está em pista na Arena Principal
    const isRunningInArena = (arenaCurName && selName === arenaCurName && (arenaState.status_atual === 'RUNNING' || arenaState.status_atual === 'PAUSED'));

    if (isRunningInArena) {
      dangerTeamName.textContent = selectedTeam.name;
      conflictDangerBanner.style.display = 'block';
      conflictWarningBanner.style.display = 'none';
      btnTestStart.disabled = true;

      // Se o teste já estiver rodando, interrompe imediatamente
      if (timerState === 'RUNNING') {
        pauseTestTimer();
        alert(`⛔ ATENÇÃO: A equipe "${selectedTeam.name}" entrou em pista na Arena Principal! O teste de bancada foi pausado imediatamente.`);
      }
      return;
    } else {
      conflictDangerBanner.style.display = 'none';
    }

    // 2. ALERTA SEVERO: Equipe é a próxima da fila da Arena
    const isNextInArena = (arenaNextName && selName === arenaNextName);
    if (isNextInArena) {
      warningTeamName.textContent = selectedTeam.name;
      conflictWarningBanner.style.display = 'block';
      btnTestStart.disabled = false; // Permite iniciar sob ciência do juiz
    } else {
      conflictWarningBanner.style.display = 'none';
      btnTestStart.disabled = false;
    }
  }

  // ==========================================================================
  // 3. SELEÇÃO DE EQUIPES
  // ==========================================================================
  function renderTeamList() {
    const query = (testTeamSearch?.value || '').trim().toLowerCase();
    const teams = window.teamsManager.getAll().filter(t => {
      return !query || t.name.toLowerCase().includes(query) || t.school.toLowerCase().includes(query);
    });

    testTeamSelectList.innerHTML = '';

    if (teams.length === 0) {
      testTeamSelectList.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.85rem; text-align: center;">Nenhuma equipe encontrada</div>';
      return;
    }

    teams.forEach(t => {
      const isSel = selectedTeam && selectedTeam.id === t.id;
      const item = document.createElement('div');
      item.className = 'team-option-item' + (isSel ? ' selected' : '');

      const isApta = t.checkin && t.inspecao;
      const aptaBadge = isApta 
        ? '<span style="font-size: 0.7rem; color: #16A34A; font-weight: 800;">✅ Apta</span>' 
        : '<span style="font-size: 0.7rem; color: #D97706; font-weight: 700;">⚠️ Credenciando</span>';

      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="team-opt-name">${t.name}</div>
          ${aptaBadge}
        </div>
        <div class="team-opt-school">${t.school} &bull; ${t.category}</div>
      `;

      item.addEventListener('click', () => {
        selectTeamForTest(t);
      });

      testTeamSelectList.appendChild(item);
    });
  }

  function selectTeamForTest(team) {
    if (timerState === 'RUNNING') {
      if (!confirm('Há um teste em andamento na pista. Deseja encerrar o teste atual e selecionar uma nova equipe?')) {
        return;
      }
      resetTestTimer();
    }

    selectedTeam = team;
    activeTestTeamInfo.innerHTML = `🤖 <strong>${team.name}</strong> (${team.school} &bull; ${team.category})`;
    testTimerStatusText.textContent = 'ROBÔ POSICIONADO NO BOX DE TESTE';

    renderTeamList();

    // Consulta pontual instantânea da Arena para garantir dados frescos
    fetchArenaStatusFromCloud();
    evaluateConflictLock();
  }

  // ==========================================================================
  // 4. CRONÔMETRO REGRESSIVO DA PISTA DE TESTE
  // ==========================================================================
  function formatTime(ms) {
    const totalSec = Math.floor(Math.max(0, ms) / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const centis = Math.floor((Math.max(0, ms) % 1000) / 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  }

  function updateTimerDisplay() {
    testTimerDigits.textContent = formatTime(slotDurationSeconds === 0 ? elapsedMs : remainingMs);

    if (slotDurationSeconds > 0) {
      if (remainingMs <= 0) {
        testTimerDigits.className = 'test-timer-digits time-up';
      } else if (remainingMs <= 30000) {
        testTimerDigits.className = 'test-timer-digits warning';
      } else {
        testTimerDigits.className = 'test-timer-digits';
      }
    } else {
      testTimerDigits.className = 'test-timer-digits';
    }
  }

  function startTestTimer() {
    if (!selectedTeam) {
      alert('Por favor, selecione uma equipe antes de iniciar o teste de pista!');
      return;
    }

    // Re-checa trava de conflito
    evaluateConflictLock();
    if (btnTestStart.disabled) {
      alert(`⛔ Bloqueio de Conflito: A equipe ${selectedTeam.name} está em pista na Arena Principal!`);
      return;
    }

    timerState = 'RUNNING';
    lastTimestamp = performance.now();
    testTimerStatusText.textContent = '⚡ TESTE EM ANDAMENTO — PISTA OCUPADA';
    btnTestStart.style.display = 'none';
    btnTestPause.style.display = 'flex';

    if (window.audioCues) window.audioCues.playStart();

    timerInterval = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTimestamp;
      lastTimestamp = now;

      elapsedMs += delta;

      if (slotDurationSeconds > 0) {
        remainingMs -= delta;

        // Alerta sonoro nos últimos 30 segundos
        if (remainingMs <= 30000 && !warning30sPlayed) {
          warning30sPlayed = true;
          if (window.audioCues) window.audioCues.playWarning30s();
        }

        // Fim do tempo do slot
        if (remainingMs <= 0) {
          remainingMs = 0;
          timerState = 'TIME_UP';
          clearInterval(timerInterval);
          testTimerStatusText.textContent = '⌛ TEMPO DE TESTE ESGOTADO — LIBERAR PISTA';
          if (window.audioCues) window.audioCues.playFinishAlarm(false);
        }
      }

      updateTimerDisplay();
    }, 50);
  }

  function pauseTestTimer() {
    if (timerState !== 'RUNNING') return;
    timerState = 'PAUSED';
    clearInterval(timerInterval);
    testTimerStatusText.textContent = '⏸ TESTE PAUSADO';
    btnTestStart.style.display = 'flex';
    btnTestStart.textContent = '▶ RETOMAR TESTE';
    btnTestPause.style.display = 'none';

    if (window.audioCues) window.audioCues.playPause();
  }

  function resetTestTimer() {
    clearInterval(timerInterval);
    timerState = 'READY';
    elapsedMs = 0;
    warning30sPlayed = false;
    remainingMs = slotDurationSeconds * 1000;
    testTimerStatusText.textContent = selectedTeam ? 'ROBÔ PRONTO NO BOX' : 'PISTA LIVRE — AGUARDANDO ROBÔ';
    btnTestStart.style.display = 'flex';
    btnTestStart.textContent = '▶ INICIAR TESTE';
    btnTestPause.style.display = 'none';
    updateTimerDisplay();
  }

  function releaseTestTrack() {
    if (!selectedTeam) {
      alert('Nenhuma equipe está na pista de teste para liberar.');
      return;
    }

    // Registra a sessão no histórico
    const durationFormatted = formatTime(elapsedMs);
    const session = {
      id: 'TEST-' + Date.now().toString(36).toUpperCase(),
      teamName: selectedTeam.name,
      schoolName: selectedTeam.school,
      category: selectedTeam.category,
      duration: durationFormatted,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    saveSession(session);

    alert(`Pista de teste liberada com sucesso!\nEquipe "${selectedTeam.name}" utilizou a pista por ${durationFormatted}.`);

    selectedTeam = null;
    activeTestTeamInfo.textContent = 'Nenhuma equipe na pista de teste';
    resetTestTimer();
    renderTeamList();
    evaluateConflictLock();
  }

  // ==========================================================================
  // 5. HISTÓRICO DE SESSÕES DE TESTE
  // ==========================================================================
  function getSessions() {
    try {
      const raw = localStorage.getItem('torneio_pista_teste_sessions');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveSession(session) {
    const sessions = getSessions();
    sessions.unshift(session);
    localStorage.setItem('torneio_pista_teste_sessions', JSON.stringify(sessions));
    renderHistoryTable();
  }

  function renderHistoryTable() {
    const sessions = getSessions();
    if (testSessionCount) testSessionCount.textContent = sessions.length;
    if (!testHistoryTableBody) return;

    testHistoryTableBody.innerHTML = '';

    if (sessions.length === 0) {
      testHistoryTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">
            Nenhuma sessão de teste registrada nesta data.
          </td>
        </tr>
      `;
      return;
    }

    sessions.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: var(--font-mono); font-size: 0.82rem;">${s.time}</td>
        <td><strong>${s.teamName}</strong></td>
        <td style="font-size: 0.85rem;">${s.schoolName}</td>
        <td><span style="font-size: 0.75rem; font-weight: 800; color: var(--color-primary);">${s.category}</span></td>
        <td><strong style="color: #16A34A; font-family: var(--font-mono);">${s.duration}</strong></td>
      `;
      testHistoryTableBody.appendChild(tr);
    });
  }

  if (btnClearTestHistory) {
    btnClearTestHistory.addEventListener('click', () => {
      if (confirm('Deseja limpar todo o histórico de sessões da pista de teste?')) {
        localStorage.removeItem('torneio_pista_teste_sessions');
        renderHistoryTable();
      }
    });
  }

  // Eventos de Duração de Slot
  slotDurationBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      slotDurationBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      slotDurationSeconds = Number(btn.dataset.duration || 180);
      resetTestTimer();
    });
  });

  btnTestStart.addEventListener('click', startTestTimer);
  btnTestPause.addEventListener('click', pauseTestTimer);
  btnTestReset.addEventListener('click', resetTestTimer);
  btnTestRelease.addEventListener('click', releaseTestTrack);

  if (testTeamSearch) {
    testTeamSearch.addEventListener('input', renderTeamList);
  }

  // Healthcheck da Nuvem
  async function checkCloud() {
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
  btnTestPause.style.display = 'none';
  renderTeamList();
  renderHistoryTable();
  updateTimerDisplay();
  checkCloud();
  fetchArenaStatusFromCloud();

  // Polling leve a cada 10 segundos para economizar leituras do Cloudflare D1
  setInterval(fetchArenaStatusFromCloud, 10000);
  setInterval(checkCloud, 20000);
});

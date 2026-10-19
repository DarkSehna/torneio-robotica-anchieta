/**
 * Torneio de Robótica Anchieta - Controlador do Telão do Ginásio (Tela 2)
 * Sincronização via BroadcastChannel ('torneio_pista') com latência zero
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elementos do DOM
  const elTeamName = document.getElementById('telaoTeamName');
  const elSchoolName = document.getElementById('telaoSchoolName');
  const elCategoryBadge = document.getElementById('telaoCategoryBadge');
  const elRoundBadge = document.getElementById('telaoRoundBadge');
  const elTimerDisplay = document.getElementById('telaoTimerDisplay');
  const elStatusBanner = document.getElementById('telaoStatusBanner');
  const elStatusText = document.getElementById('telaoStatusText');
  const elFoulCircles = document.querySelectorAll('.telao-foul-circle');
  const btnFullscreen = document.getElementById('btnFullscreen');

  // Estado local do telão
  const state = {
    teamName: 'Aguardando Equipe',
    schoolName: 'Colégio Anchieta',
    category: 'LEGO / Educacional',
    round: 'Round 1',
    timeFormatted: '00:00.00',
    timeMs: 0,
    status: 'READY', // 'READY' | 'RUNNING' | 'PAUSED' | 'FINISHED' | 'TIME_UP' | 'DNF'
    fouls: 0
  };

  // Atualização Visual Completa
  function render() {
    elTeamName.textContent = state.teamName;
    elSchoolName.textContent = state.schoolName;
    elCategoryBadge.textContent = state.category;
    elRoundBadge.textContent = state.round;
    elTimerDisplay.textContent = state.timeFormatted;

    // Atualiza classes do timer
    elTimerDisplay.className = 'telao-timer-display tabular-nums ' + state.status.toLowerCase();

    // Atualiza status banner
    elStatusBanner.className = 'telao-status-banner ' + state.status.toLowerCase();
    switch (state.status) {
      case 'RUNNING':
        elStatusText.textContent = '⚡ EM PISTA — CRONÔMETRO ATIVO';
        break;
      case 'PAUSED':
        elStatusText.textContent = '⏸ BATERIA PAUSADA';
        break;
      case 'FINISHED':
        elStatusText.textContent = '🏁 VOLTA CONCLUÍDA';
        break;
      case 'TIME_UP':
        elStatusText.textContent = '⌛ TEMPO ESGOTADO (3 MIN - ART. 7º)';
        break;
      case 'DNF':
        elStatusText.textContent = '❌ DESCLASSIFICADO POR INFRAÇÕES (DNF - ART. 8º)';
        break;
      case 'READY':
      default:
        elStatusText.textContent = '🟢 PISTA LIBERADA — AGUARDANDO LARGADA';
        break;
    }

    // Atualiza círculos de falta
    elFoulCircles.forEach((circle, index) => {
      const foulNumber = index + 1;
      circle.classList.remove('active', 'final-dnf');

      if (foulNumber <= state.fouls) {
        circle.classList.add('active');
        if (foulNumber === 5) {
          circle.classList.add('final-dnf');
        }
      }
    });
  }

  // Registra Listeners no BroadcastChannel
  window.pistaBus.on('STATE_SYNC', (payload) => {
    Object.assign(state, payload);
    render();
  });

  window.pistaBus.on('TIMER_TICK', (payload) => {
    state.timeMs = payload.timeMs;
    state.timeFormatted = payload.timeFormatted;
    elTimerDisplay.textContent = state.timeFormatted;
  });

  window.pistaBus.on('TIMER_START', () => {
    state.status = 'RUNNING';
    window.audioCues.playStart();
    render();
  });

  window.pistaBus.on('TIMER_PAUSE', () => {
    state.status = 'PAUSED';
    window.audioCues.playPause();
    render();
  });

  window.pistaBus.on('TIMER_RESET', (payload) => {
    state.status = 'READY';
    state.timeMs = 0;
    state.timeFormatted = payload?.timeFormatted || '00:00.00';
    render();
  });

  window.pistaBus.on('TIMER_FINISH', (payload) => {
    state.status = 'FINISHED';
    if (payload?.timeFormatted) state.timeFormatted = payload.timeFormatted;
    window.audioCues.playFinishAlarm(false);
    render();
  });

  window.pistaBus.on('TIMER_TIME_UP', () => {
    state.status = 'TIME_UP';
    state.timeFormatted = '03:00.00';
    window.audioCues.playFinishAlarm(false);
    render();
  });

  window.pistaBus.on('FOUL_UPDATE', (payload) => {
    state.fouls = payload.fouls;
    if (payload.isDNF) {
      state.status = 'DNF';
      window.audioCues.playFinishAlarm(true);
    } else {
      window.audioCues.playFoul();
    }
    render();
  });

  window.pistaBus.on('TEAM_UPDATE', (payload) => {
    state.teamName = payload.name;
    state.schoolName = payload.school;
    state.category = payload.category;
    state.round = payload.round;
    render();
  });

  // Notifica a mesa que o telão está aberto e pronto
  window.pistaBus.send('TELAO_READY', { timestamp: Date.now() });

  // Alternar tela cheia (Fullscreen)
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
      } else {
        document.exitFullscreen().catch(err => console.log(err));
      }
    });
  }

  // Render inicial
  render();
});

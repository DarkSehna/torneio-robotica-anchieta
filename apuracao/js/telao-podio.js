/**
 * Torneio de Robótica Anchieta - Controlador do Telão do Pódio (Projeção HDMI Limpa)
 * Sincronização instantânea via BroadcastChannel('torneio_podio') + Fallback LocalStorage
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elementos do DOM
  const tpHeaderBadge = document.getElementById('tpHeaderBadge');
  const tpSubtitleTag = document.getElementById('tpSubtitleTag');
  const tpMainTitle = document.getElementById('tpMainTitle');
  const tpCriteriaDesc = document.getElementById('tpCriteriaDesc');

  const stageStandby = document.getElementById('stageStandby');
  const stageSingleAward = document.getElementById('stageSingleAward');
  const stageTrackPodium = document.getElementById('stageTrackPodium');

  // Elementos Modo Troféu Único (Bancada)
  const singleSuspenseBox = document.getElementById('singleSuspenseBox');
  const singleSuspenseIcon = document.getElementById('singleSuspenseIcon');
  const singleWinnerBox = document.getElementById('singleWinnerBox');
  const singleWinnerIcon = document.getElementById('singleWinnerIcon');
  const singleWinnerName = document.getElementById('singleWinnerName');
  const singleWinnerSchool = document.getElementById('singleWinnerSchool');
  const singleWinnerScore = document.getElementById('singleWinnerScore');
  const singleWinnerDetail = document.getElementById('singleWinnerDetail');

  // Elementos Modo Pódio Triplo (Pista)
  const tpPillar1 = document.getElementById('tpPillar1');
  const tpPillar2 = document.getElementById('tpPillar2');
  const tpPillar3 = document.getElementById('tpPillar3');

  const btnFullscreenPodio = document.getElementById('btnFullscreenPodio');
  const confettiStage = document.getElementById('confettiStage');

  // Canal de Comunicação com a Mesa de Apuração
  const channel = ('BroadcastChannel' in window) ? new BroadcastChannel('torneio_podio') : null;

  // Estado Atual do Telão
  let currentState = {
    mode: 'STANDBY', // 'STANDBY' | 'SINGLE_AWARD' | 'TRACK_PODIUM'
    stepKey: 'STANDBY',
    headerBadge: '🏆 Premiação Oficial',
    subtitleTag: 'EDITAL GERAL Nº 08/2026',
    mainTitle: 'CERIMÔNIA DE PREMIAÇÃO',
    criteriaDesc: 'Colégio Anchieta • 05 de Dezembro de 2026',
    icon: '🏆',
    // Para Troféu Único de Box:
    singleRevealed: false,
    winner: {
      name: '--',
      school: '--',
      scoreText: '-- ★',
      detailText: '--'
    },
    // Para Pódio Triplo de Pista:
    trackRevealed: {
      pos1: false,
      pos2: false,
      pos3: false
    },
    podium: {
      pos1: { name: '--', school: '--', time: '--:--.--', foulsText: '--' },
      pos2: { name: '--', school: '--', time: '--:--.--', foulsText: '--' },
      pos3: { name: '--', school: '--', time: '--:--.--', foulsText: '--' }
    }
  };

  // Renderiza o Estado Completo no Telão
  function renderState(state, effect = null) {
    currentState = { ...currentState, ...state };

    if (tpHeaderBadge) tpHeaderBadge.textContent = currentState.headerBadge || '🏆 Premiação Oficial';
    if (tpSubtitleTag) tpSubtitleTag.textContent = currentState.subtitleTag || 'EDITAL GERAL Nº 08/2026';
    if (tpMainTitle) tpMainTitle.textContent = currentState.mainTitle || 'CERIMÔNIA DE PREMIAÇÃO';
    if (tpCriteriaDesc) tpCriteriaDesc.textContent = currentState.criteriaDesc || '';

    // Alterna os 3 Palcos Principais
    stageStandby.classList.toggle('active', currentState.mode === 'STANDBY');
    stageSingleAward.classList.toggle('active', currentState.mode === 'SINGLE_AWARD');
    stageTrackPodium.classList.toggle('active', currentState.mode === 'TRACK_PODIUM');

    // Renderiza Troféu de Box (Modo 2)
    if (currentState.mode === 'SINGLE_AWARD') {
      if (singleSuspenseIcon) singleSuspenseIcon.textContent = currentState.icon || '🏆';
      if (singleWinnerIcon) singleWinnerIcon.textContent = currentState.icon || '🏆';

      const w = currentState.winner || {};
      if (singleWinnerName) singleWinnerName.textContent = w.name || '--';
      if (singleWinnerSchool) singleWinnerSchool.textContent = w.school || '--';
      if (singleWinnerScore) singleWinnerScore.textContent = w.scoreText || '-- ★';
      if (singleWinnerDetail) singleWinnerDetail.textContent = w.detailText || '--';

      if (currentState.singleRevealed) {
        singleSuspenseBox.style.display = 'none';
        singleWinnerBox.style.display = 'block';
      } else {
        singleSuspenseBox.style.display = 'block';
        singleWinnerBox.style.display = 'none';
      }
    }

    // Renderiza Pódio de Pista Top 3 (Modo 3)
    if (currentState.mode === 'TRACK_PODIUM') {
      const p = currentState.podium || {};
      const rev = currentState.trackRevealed || {};

      fillPillarData(1, p.pos1);
      fillPillarData(2, p.pos2);
      fillPillarData(3, p.pos3);

      tpPillar1.classList.toggle('revealed', !!rev.pos1);
      tpPillar2.classList.toggle('revealed', !!rev.pos2);
      tpPillar3.classList.toggle('revealed', !!rev.pos3);
    }

    // Efeitos Sonoros e Visuais de Revelação
    if (effect === 'DRUMROLL') {
      playDrumCue();
    } else if (effect === 'REVEAL_MINOR') {
      playStepRevealSound();
    } else if (effect === 'REVEAL_CHAMPION') {
      playChampionFanfare();
      launchConfetti(60);
    } else if (effect === 'CONFETTI_ONLY') {
      launchConfetti(50);
    }
  }

  function fillPillarData(pos, data = {}) {
    const nameEl = document.getElementById(`tpName${pos}`);
    const schoolEl = document.getElementById(`tpSchool${pos}`);
    const timeEl = document.getElementById(`tpTime${pos}`);
    const foulsEl = document.getElementById(`tpFouls${pos}`);

    if (nameEl) nameEl.textContent = data.name || 'Aguardando...';
    if (schoolEl) schoolEl.textContent = data.school || '--';
    if (timeEl) timeEl.textContent = data.time || '--:--.--';
    if (foulsEl) foulsEl.textContent = data.foulsText || '';
  }

  // Efeitos Sonoros Sintetizados via Web Audio API (100% Offline)
  function playDrumCue() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [220, 277.18].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.35);
      });
    } catch (e) {}
  }

  function playStepRevealSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [440, 554.37, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
        gain.gain.setValueAtTime(0.28, ctx.currentTime + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.55);
        osc.start(ctx.currentTime + idx * 0.09);
        osc.stop(ctx.currentTime + idx * 0.09 + 0.55);
      });
    } catch (e) {}
  }

  function playChampionFanfare() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
      const times = [0, 0.12, 0.24, 0.38, 0.56, 0.70];
      const durations = [0.12, 0.12, 0.14, 0.18, 0.14, 0.9];

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + times[idx]);
        gain.gain.setValueAtTime(0.22, ctx.currentTime + times[idx]);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + times[idx] + durations[idx]);
        osc.start(ctx.currentTime + times[idx]);
        osc.stop(ctx.currentTime + times[idx] + durations[idx]);
      });
    } catch (e) {}
  }

  function launchConfetti(count = 55) {
    if (!confettiStage) return;
    const colors = ['#FDE047', '#F26522', '#10B981', '#38BDF8', '#EC4899', '#A855F7', '#FFFFFF'];
    for (let i = 0; i < count; i++) {
      const flake = document.createElement('div');
      const sizeW = Math.floor(Math.random() * 10 + 7);
      const sizeH = Math.floor(Math.random() * 16 + 8);
      flake.style.position = 'absolute';
      flake.style.width = `${sizeW}px`;
      flake.style.height = `${sizeH}px`;
      flake.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      flake.style.left = `${Math.random() * 100}%`;
      flake.style.top = '-24px';
      flake.style.borderRadius = '3px';
      flake.style.opacity = '1';
      flake.style.transition = `all ${Math.random() * 2.2 + 2.2}s cubic-bezier(0.22, 0.61, 0.36, 1)`;
      confettiStage.appendChild(flake);

      setTimeout(() => {
        flake.style.top = `${Math.random() * 85 + 20}%`;
        flake.style.transform = `rotate(${Math.random() * 900 - 450}deg) translateX(${Math.random() * 160 - 80}px)`;
        flake.style.opacity = '0';
      }, 40);

      setTimeout(() => flake.remove(), 4600);
    }
  }

  // Escuta comandos via BroadcastChannel
  if (channel) {
    channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg || !msg.type) return;

      if (msg.type === 'PODIO_SYNC_STATE') {
        renderState(msg.payload.state, msg.payload.effect || null);
      } else if (msg.type === 'PODIO_PING') {
        channel.postMessage({ type: 'PODIO_TELAO_ONLINE', timestamp: Date.now() });
      }
    };

    // Avisa a Mesa de Apuração que o Telão do Pódio abriu
    channel.postMessage({ type: 'PODIO_TELAO_ONLINE', timestamp: Date.now() });
    setInterval(() => {
      channel.postMessage({ type: 'PODIO_TELAO_ONLINE', timestamp: Date.now() });
    }, 3000);
  }

  // Fallback / Inicialização via localStorage caso a Mesa já tenha definido um estado antes de abrir a janela
  try {
    const savedRaw = localStorage.getItem('torneio_podio_live_state');
    if (savedRaw) {
      const parsed = JSON.parse(savedRaw);
      if (parsed && parsed.state) {
        renderState(parsed.state, null);
      }
    }
  } catch (e) {}

  window.addEventListener('storage', (e) => {
    if (e.key === 'torneio_podio_live_state' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.state) {
          renderState(parsed.state, parsed.effect || null);
        }
      } catch (err) {}
    }
  });

  // Controle de Tela Cheia (F11 / Duplo Clique / Botão)
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  if (btnFullscreenPodio) {
    btnFullscreenPodio.addEventListener('click', toggleFullscreen);
  }

  document.addEventListener('dblclick', toggleFullscreen);
});


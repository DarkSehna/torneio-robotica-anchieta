/**
 * Torneio de Robótica Anchieta - Controlador da Mesa de Credenciamento & Inspeção
 * Operação tátil de recepção de equipes com proteção contra exclusões acidentais
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elementos do DOM
  const searchInput = document.getElementById('credSearchInput');
  const tableBody = document.getElementById('credTableBody');
  const emptyState = document.getElementById('credEmptyState');
  
  // Contadores
  const statTotal = document.getElementById('statTotal');
  const statCheckin = document.getElementById('statCheckin');
  const statInspecao = document.getElementById('statInspecao');
  const statAptas = document.getElementById('statAptas');

  // Filtros de Categoria
  const filterPills = document.querySelectorAll('.cred-pill-btn');
  let currentCategoryFilter = 'ALL';

  // Status da Nuvem
  const cloudBadge = document.getElementById('cloudStatusBadge');
  const cloudText = document.getElementById('cloudStatusText');
  const btnSyncCloud = document.getElementById('btnSyncCloud');

  // Inicializa equipes
  await window.teamsManager.load();

  // Verifica conectividade com D1
  checkCloudStatus();

  // Event Listeners de Filtro
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategoryFilter = pill.getAttribute('data-cat');
      renderTeams();
    });
  });

  // Busca em tempo real
  searchInput.addEventListener('input', () => {
    renderTeams();
  });

  // Botão Sincronizar
  if (btnSyncCloud) {
    btnSyncCloud.addEventListener('click', async () => {
      btnSyncCloud.disabled = true;
      btnSyncCloud.textContent = '⏳ Sincronizando...';
      try {
        await window.teamsManager.load();
        showToast('Equipes sincronizadas com a Nuvem!');
      } catch (e) {
        showToast('Erro ao sincronizar. Operando offline.');
      } finally {
        btnSyncCloud.disabled = false;
        btnSyncCloud.textContent = '🔄 Atualizar';
        renderTeams();
        updateStats();
      }
    });
  }

  // Renderização da Tabela de Equipes
  function renderTeams() {
    const query = (searchInput.value || '').trim().toLowerCase();
    const all = window.teamsManager.getAll();

    const filtered = all.filter(t => {
      // Filtro de Categoria
      if (currentCategoryFilter === 'LEGO' && !t.category.includes('LEGO')) return false;
      if (currentCategoryFilter === 'MAKER' && !t.category.includes('Maker')) return false;

      // Filtro de Busca (Nome, Escola, ID, Professor, Integrantes)
      if (!query) return true;
      const matchName = (t.name || '').toLowerCase().includes(query);
      const matchSchool = (t.school || '').toLowerCase().includes(query);
      const matchId = (t.id || '').toLowerCase().includes(query);
      const matchProf = (t.professor || '').toLowerCase().includes(query);
      const matchMembers = (t.integrantes || '').toLowerCase().includes(query);

      return matchName || matchSchool || matchId || matchProf || matchMembers;
    });

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    filtered.forEach(t => {
      const isLego = t.category.includes('LEGO');
      const catBadge = isLego 
        ? '<span style="background: var(--color-accent-subtle); color: var(--color-accent); padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 800;">LEGO</span>'
        : '<span style="background: rgba(0,43,73,0.1); color: var(--color-primary); padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 800;">MAKER</span>';

      const isApta = t.checkin && t.inspecao;
      const aptaBadge = isApta
        ? '<span class="status-apto-badge status-apto">✅ Apta para Arena</span>'
        : '<span class="status-apto-badge status-inapto">⏳ Pendente</span>';

      const checkinClass = t.checkin ? 'toggle-checkin-ok' : 'toggle-checkin-pending';
      const checkinLabel = t.checkin ? '✅ Presente' : '⏳ Ausente';

      const inspecaoClass = t.inspecao ? 'toggle-inspecao-ok' : 'toggle-inspecao-pending';
      const inspecaoLabel = t.inspecao ? '🤖 OK (25x25)' : '⚠️ Pendente (≤2kg)';

      // Meta: Professor e Integrantes destacados com clareza
      const metaParts = [];
      if (t.professor) {
        metaParts.push(`👨‍🏫 <strong>Prof:</strong> ${escapeHtml(t.professor)}`);
      } else {
        metaParts.push(`👨‍🏫 <em>Sem prof. vinculado</em>`);
      }

      if (t.integrantes) {
        metaParts.push(`👥 <strong>Integrantes:</strong> ${escapeHtml(t.integrantes)}`);
      } else {
        metaParts.push(`👥 <em>Sem alunos vinculados</em>`);
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: center;">
          <span class="team-badge-id">${escapeHtml(t.id)}</span>
        </td>
        <td>
          <div class="team-name-title">${escapeHtml(t.name)}</div>
          <div class="team-meta-info">${metaParts.join(' &bull; ')}</div>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--text-main); font-size: 0.9rem;">${escapeHtml(t.school)}</div>
          <div style="margin-top: 4px;">${catBadge}</div>
        </td>
        <td style="text-align: center;">
          <button type="button" class="tactile-toggle-btn ${checkinClass}" data-team-id="${t.id}" data-action="toggle-checkin" title="Clique para alternar presença">
            ${checkinLabel}
          </button>
        </td>
        <td style="text-align: center;">
          <button type="button" class="tactile-toggle-btn ${inspecaoClass}" data-team-id="${t.id}" data-action="toggle-inspecao" title="Gabarito 25x25cm e peso <= 2,0 kg">
            ${inspecaoLabel}
          </button>
        </td>
        <td style="text-align: center;">
          ${aptaBadge}
        </td>
      `;

      // Evento Tátil: Check-in
      const btnCheckin = tr.querySelector('[data-action="toggle-checkin"]');
      btnCheckin.addEventListener('click', async () => {
        if (navigator.vibrate) navigator.vibrate(25);
        const updated = window.teamsManager.toggleCheckin(t.id);
        if (updated) {
          renderTeams();
          updateStats();
          showToast(`Check-in de "${t.name}": ${updated.checkin ? 'Confirmado ✅' : 'Removido ⏳'}`);
          if (window.cloudAPI) {
            window.cloudAPI.atualizarStatusEquipe(updated.name, { checkin: updated.checkin })
              .catch(e => console.warn('Sync de checkin pendente:', e));
          }
        }
      });

      // Evento Tátil: Inspeção Técnica
      const btnInspecao = tr.querySelector('[data-action="toggle-inspecao"]');
      btnInspecao.addEventListener('click', async () => {
        if (navigator.vibrate) navigator.vibrate(25);
        const updated = window.teamsManager.toggleInspecao(t.id);
        if (updated) {
          renderTeams();
          updateStats();
          showToast(`Inspeção de "${t.name}": ${updated.inspecao ? 'Aprovada 🤖' : 'Pendente ⚠️'}`);
          if (window.cloudAPI) {
            window.cloudAPI.atualizarStatusEquipe(updated.name, { inspecao: updated.inspecao })
              .catch(e => console.warn('Sync de inspeção pendente:', e));
          }
        }
      });

      tableBody.appendChild(tr);
    });
  }

  // Atualização dos Contadores
  function updateStats() {
    const all = window.teamsManager.getAll();
    const total = all.length;
    const checkinCount = all.filter(t => t.checkin).length;
    const inspecaoCount = all.filter(t => t.inspecao).length;
    const aptasCount = all.filter(t => t.checkin && t.inspecao).length;

    statTotal.textContent = total;
    statCheckin.textContent = `${checkinCount}/${total}`;
    statInspecao.textContent = `${inspecaoCount}/${total}`;
    statAptas.textContent = `${aptasCount}/${total}`;
  }

  // Verificação de Nuvem D1
  async function checkCloudStatus() {
    if (!window.cloudAPI || !cloudBadge) return;
    try {
      const res = await window.cloudAPI.checkHealth();
      if (res && res.online) {
        cloudBadge.className = 'badge-status cloud-online';
        if (cloudText) cloudText.textContent = 'D1 Nuvem Sincronizada';
      } else {
        setCloudOffline('Operando Offline (Cache Local)');
      }
    } catch (_) {
      setCloudOffline('Operando Offline (Cache Local)');
    }
  }

  function setCloudOffline(label) {
    if (cloudBadge) cloudBadge.className = 'badge-status cloud-offline';
    if (cloudText) cloudText.textContent = label;
  }

  // ==========================================================================
  // FILA OFICIAL DA ARENA (GERADA NO CREDENCIAMENTO)
  // ==========================================================================
  const btnCredGenerateQueue = document.getElementById('btnCredGenerateQueue');
  const modalQueuePreview = document.getElementById('modalQueuePreview');
  const btnModalCloseQueue = document.getElementById('btnModalCloseQueue');
  const btnModalConfirmQueue = document.getElementById('btnModalConfirmQueue');
  const modalTabRound1 = document.getElementById('modalTabRound1');
  const modalTabRound2 = document.getElementById('modalTabRound2');
  const modalQueueList = document.getElementById('modalQueueList');
  const queueModalNotice = document.getElementById('queueModalNotice');

  let activeModalRound = 1;
  let generatedQueueData = { round1: [], round2: [] };

  // Canal de Broadcast da Arena
  const arenaStatusBus = ('BroadcastChannel' in window) ? new BroadcastChannel('torneio_arena_status') : null;

  function generateOfficialQueueFromCred() {
    const all = window.teamsManager.getAll();
    if (!all || all.length === 0) {
      showToast('❌ Nenhuma equipe encontrada!');
      return;
    }

    const aptas = all.filter(t => t.checkin && t.inspecao);
    let baseList = aptas;
    let isProvisory = false;

    if (aptas.length === 0) {
      baseList = all;
      isProvisory = true;
      if (queueModalNotice) {
        queueModalNotice.innerHTML = `⚠️ <strong>Fila Provisória de Teste:</strong> Nenhuma equipe com Check-in + Inspeção OK. Fila gerada com todas as ${all.length} equipes.`;
        queueModalNotice.style.background = '#FFFBEB';
        queueModalNotice.style.borderColor = '#FCD34D';
        queueModalNotice.style.color = '#B45309';
      }
    } else {
      if (queueModalNotice) {
        queueModalNotice.innerHTML = `✅ <strong>Fila Oficial Gerada:</strong> ${aptas.length} equipe(s) aptas (Check-in + Inspeção OK) ordenadas para a largada!`;
        queueModalNotice.style.background = '#F0FDF4';
        queueModalNotice.style.borderColor = '#86EFAC';
        queueModalNotice.style.color = '#166534';
      }
    }

    // Round 1: Embaralhamento justo
    const shuffled = [...baseList].sort(() => Math.random() - 0.5);
    generatedQueueData.round1 = shuffled.map((t, idx) => ({
      pos: idx + 1,
      id: t.id,
      name: t.name,
      school: t.school,
      category: t.category,
      completed: false
    }));

    // Round 2: Ordem Invertida (Reverse Grid)
    generatedQueueData.round2 = [...generatedQueueData.round1].reverse().map((t, idx) => ({
      pos: idx + 1,
      id: t.id,
      name: t.name,
      school: t.school,
      category: t.category,
      completed: false
    }));

    // Salva no localStorage compartilhado da Arena
    try {
      localStorage.setItem('torneio_arena_queue', JSON.stringify(generatedQueueData));
    } catch (_) {}

    // Transmite instantaneamente para a Mesa do Operador
    const payload = {
      equipe_atual: generatedQueueData.round1[0] ? generatedQueueData.round1[0].name : '',
      status_atual: 'READY',
      equipe_proxima: generatedQueueData.round1[1] ? generatedQueueData.round1[1].name : '',
      rodada: 1,
      timestamp: Date.now()
    };

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

    // Renderiza e abre o modal
    renderModalQueueList();
    renderConferenceCard();
    if (modalQueuePreview) modalQueuePreview.style.display = 'flex';
    showToast(`🏁 Fila da Arena gerada com ${baseList.length} equipe(s)!`);
  }

  // ==========================================================================
  // CONFERÊNCIA FIXA DA ORDEM DE LARGADA (MURAL DO GINÁSIO / IMPRESSÃO)
  // ==========================================================================
  const credQueueConferenceSection = document.getElementById('credQueueConferenceSection');
  const confTabRound1 = document.getElementById('confTabRound1');
  const confTabRound2 = document.getElementById('confTabRound2');
  const confQueueGrid = document.getElementById('confQueueGrid');
  const btnPrintQueue = document.getElementById('btnPrintQueue');
  let activeConfRound = 1;

  function renderConferenceCard() {
    if (!credQueueConferenceSection || !confQueueGrid) return;
    let qData = generatedQueueData;
    if (!qData || (!qData.round1?.length && !qData.round2?.length)) {
      try {
        const raw = localStorage.getItem('torneio_arena_queue');
        if (raw) qData = JSON.parse(raw);
      } catch (_) {}
    }

    const list = activeConfRound === 2 ? (qData?.round2 || []) : (qData?.round1 || []);
    if (!list || list.length === 0) {
      credQueueConferenceSection.style.display = 'none';
      return;
    }

    credQueueConferenceSection.style.display = 'block';
    confQueueGrid.innerHTML = '';

    list.forEach(item => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: #FFFFFF;
        border: 1.5px solid var(--border-medium);
        border-radius: var(--radius-md);
        padding: 10px 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      `;
      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.15rem; font-weight: 900; color: var(--color-primary); min-width: 32px;">#${item.pos}</span>
          <div>
            <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main);">${escapeHtml(item.name || item.equipe || '')}</div>
            <div style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(item.school || '')}</div>
          </div>
        </div>
        <span style="font-size: 0.72rem; background: var(--bg-muted); padding: 3px 8px; border-radius: 4px; font-weight: 800;">
          ${escapeHtml(item.category || '')}
        </span>
      `;
      confQueueGrid.appendChild(card);
    });
  }

  if (confTabRound1) {
    confTabRound1.addEventListener('click', () => {
      activeConfRound = 1;
      confTabRound1.classList.add('active');
      confTabRound2.classList.remove('active');
      renderConferenceCard();
    });
  }

  if (confTabRound2) {
    confTabRound2.addEventListener('click', () => {
      activeConfRound = 2;
      confTabRound2.classList.add('active');
      confTabRound1.classList.remove('active');
      renderConferenceCard();
    });
  }

  if (btnPrintQueue) {
    btnPrintQueue.addEventListener('click', () => {
      window.print();
    });
  }



  function renderModalQueueList() {
    if (!modalQueueList) return;
    modalQueueList.innerHTML = '';

    const list = activeModalRound === 2 ? (generatedQueueData.round2 || []) : (generatedQueueData.round1 || []);
    if (list.length === 0) {
      modalQueueList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhuma equipe na fila.</div>';
      return;
    }

    list.forEach(item => {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #FFFFFF;
        border: 1px solid var(--border-light);
        border-radius: var(--radius-sm);
        font-size: 0.85rem;
      `;
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 800; color: var(--color-primary); min-width: 28px;">#${item.pos}</span>
          <strong style="color: var(--text-main);">${escapeHtml(item.name)}</strong>
          <span style="color: var(--text-muted); font-size: 0.78rem;">(${escapeHtml(item.school)})</span>
        </div>
        <span style="font-size: 0.75rem; background: var(--bg-muted); padding: 3px 8px; border-radius: 4px; font-weight: 700;">
          ${escapeHtml(item.category)}
        </span>
      `;
      modalQueueList.appendChild(row);
    });
  }

  if (btnCredGenerateQueue) {
    btnCredGenerateQueue.addEventListener('click', generateOfficialQueueFromCred);
  }

  if (modalTabRound1) {
    modalTabRound1.addEventListener('click', () => {
      activeModalRound = 1;
      modalTabRound1.classList.add('active');
      modalTabRound2.classList.remove('active');
      renderModalQueueList();
    });
  }

  if (modalTabRound2) {
    modalTabRound2.addEventListener('click', () => {
      activeModalRound = 2;
      modalTabRound2.classList.add('active');
      modalTabRound1.classList.remove('active');
      renderModalQueueList();
    });
  }

  if (btnModalCloseQueue) {
    btnModalCloseQueue.addEventListener('click', () => {
      if (modalQueuePreview) modalQueuePreview.style.display = 'none';
    });
  }

  if (btnModalConfirmQueue) {
    btnModalConfirmQueue.addEventListener('click', () => {
      if (modalQueuePreview) modalQueuePreview.style.display = 'none';
    });
  }

  // Toast Helper
  let toastTimer = null;
  function showToast(message) {
    let toast = document.getElementById('credToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'credToast';
      toast.className = 'cred-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Render inicial e HealthCheck a cada 15s
  renderTeams();
  updateStats();
  renderConferenceCard();
  setInterval(checkCloudStatus, 15000);
});

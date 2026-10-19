/**
 * Torneio de Robótica Anchieta - Controlador dos Juízes de Paddock (Tela 3)
 * Ficha Oficial de Rubricas de 3 Níveis (Edital 08)
 * Mobile First - Touchscreen, 4G/Wi-Fi e Sincronização Cloudflare Workers
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elementos do DOM
  const elCloudStatusBadge = document.getElementById('cloudStatusBadge');
  const elCloudStatusText = document.getElementById('cloudStatusText');
  const activeJudgeName = document.getElementById('activeJudgeName');
  const btnChangeJudge = document.getElementById('btnChangeJudge');

  const selectTeamPaddock = document.getElementById('selectTeamPaddock');
  const paddockTeamName = document.getElementById('paddockTeamName');
  const paddockTeamSchool = document.getElementById('paddockTeamSchool');
  const paddockTeamCat = document.getElementById('paddockTeamCat');
  const evaluatedStatusBadge = document.getElementById('evaluatedStatusBadge');

  const inputObservacoes = document.getElementById('inputObservacoes');
  const formPaddockEval = document.getElementById('formPaddockEval');
  const btnSubmitEval = document.getElementById('btnSubmitEval');

  const btnToggleHistory = document.getElementById('btnToggleHistory');
  const myEvalsContainer = document.getElementById('myEvalsContainer');
  const myEvalsCount = document.getElementById('myEvalsCount');
  const accordionArrow = document.getElementById('accordionArrow');

  // Os 5 Prêmios Oficiais (Edital 08)
  const CRITERIA_KEYS = ['caracterizacao', 'mecanica', 'superacao', 'torcida', 'fair_play'];

  // Estado das Notas Atuais (Iniciam como null para exigir seleção ativa)
  const currentScores = {
    caracterizacao: null,
    mecanica: null,
    superacao: null,
    torcida: null,
    fair_play: null
  };

  // 1. Gestão do Nome do Juiz
  function initJudgeName() {
    let name = localStorage.getItem('paddock_judge_name');
    if (!name || name.trim() === '') {
      name = prompt('Bem-vindo, Juiz! Digite seu nome oficial para assinar as avaliações:', 'Juiz Convidado');
      if (!name || name.trim() === '') name = 'Juiz Oficial ' + Math.floor(Math.random() * 90 + 10);
      localStorage.setItem('paddock_judge_name', name.trim());
    }
    activeJudgeName.textContent = name;
    return name;
  }

  btnChangeJudge.addEventListener('click', () => {
    const current = localStorage.getItem('paddock_judge_name') || '';
    const newName = prompt('Alterar identificação do Juiz:', current);
    if (newName && newName.trim() !== '') {
      localStorage.setItem('paddock_judge_name', newName.trim());
      activeJudgeName.textContent = newName.trim();
      renderMyEvals();
      updateSelectedTeamUI();
    }
  });

  initJudgeName();

  // 2. Histórico Local de Avaliações (Fila Local Resiliente)
  function getMyEvals() {
    const raw = localStorage.getItem('paddock_evaluations_cache');
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveMyEval(evalData) {
    const evals = getMyEvals();
    const judge = evalData.juiz_nome || evalData.juiz;
    const teamId = evalData.equipe_id || evalData.equipe;

    const index = evals.findIndex(e => 
      (e.equipe_id === teamId || e.equipe === evalData.equipe) && 
      (e.juiz_nome === judge || e.juiz === judge)
    );

    if (index >= 0) {
      evals[index] = evalData;
    } else {
      evals.unshift(evalData);
    }

    localStorage.setItem('paddock_evaluations_cache', JSON.stringify(evals));
    renderMyEvals();
  }

  // 3. Atualizar Estado Visual de cada Critério de Rubrica
  function updateCriterionUI(criterion, val) {
    const container = document.querySelector(`.rubric-segmented-grid[data-criterion="${criterion}"]`);
    const badge = document.getElementById(`badgeStatus-${criterion}`);
    const card = document.getElementById(`card-${criterion}`);

    if (card) {
      card.style.borderColor = '';
    }

    if (container) {
      container.querySelectorAll('.rubric-chip-btn').forEach(btn => {
        const btnVal = Number(btn.dataset.value);
        btn.classList.toggle('active', val !== null && btnVal === Number(val));
      });
    }

    if (badge) {
      badge.className = 'rubric-badge-status';
      if (val === 1) {
        badge.classList.add('status-1');
        badge.textContent = 'Em Desenv. (1)';
      } else if (val === 2) {
        badge.classList.add('status-2');
        badge.textContent = 'Desenvolvido (2)';
      } else if (val === 3) {
        badge.classList.add('status-3');
        badge.textContent = 'Superado ★ (3)';
      } else {
        badge.textContent = '⏳ Pendente';
      }
    }
  }

  // Configura os cliques dos botões segmentados
  CRITERIA_KEYS.forEach(criterion => {
    const container = document.querySelector(`.rubric-segmented-grid[data-criterion="${criterion}"]`);
    if (!container) return;

    container.querySelectorAll('.rubric-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = Number(btn.dataset.value);
        currentScores[criterion] = val;
        updateCriterionUI(criterion, val);
        if (navigator.vibrate) navigator.vibrate(18);
      });
    });

    updateCriterionUI(criterion, null);
  });

  // 4. Carregamento de Equipes
  await window.teamsManager.load();
  const teams = window.teamsManager.getAll();

  function populateTeamsDropdown() {
    selectTeamPaddock.innerHTML = '<option value="">-- Escolha a Equipe do Box --</option>';
    const currentJudge = localStorage.getItem('paddock_judge_name');
    const myEvals = getMyEvals().filter(e => (e.juiz_nome || e.juiz) === currentJudge);
    const evaluatedIds = new Set(myEvals.map(e => (e.equipe_id || e.equipe).toLowerCase()));

    teams.forEach(t => {
      const isEval = evaluatedIds.has((t.id || '').toLowerCase()) || evaluatedIds.has((t.name || '').toLowerCase());
      const opt = document.createElement('option');
      opt.value = t.id || t.name;
      opt.textContent = `${isEval ? '✅ ' : '⏳ '}[${t.id || 'EQ'}] ${t.name} (${t.category.includes('LEGO') ? 'LEGO' : 'MAKER'})`;
      selectTeamPaddock.appendChild(opt);
    });

    if (teams.length > 0) {
      selectTeamPaddock.value = teams[0].id || teams[0].name;
      updateSelectedTeamUI();
    }
  }

  function updateSelectedTeamUI() {
    const selectedVal = selectTeamPaddock.value;
    const team = teams.find(t => (t.id === selectedVal) || (t.name === selectedVal));
    if (!team) {
      paddockTeamName.textContent = '--';
      paddockTeamSchool.textContent = '--';
      return;
    }

    paddockTeamName.textContent = team.name;
    paddockTeamSchool.textContent = team.school;
    paddockTeamCat.textContent = team.category;

    // Verifica se já foi avaliada por este juiz
    const currentJudge = localStorage.getItem('paddock_judge_name');
    const existing = getMyEvals().find(e => 
      ((e.equipe_id && e.equipe_id.toLowerCase() === (team.id || '').toLowerCase()) ||
       (e.equipe && e.equipe.toLowerCase() === team.name.toLowerCase())) &&
      ((e.juiz_nome || e.juiz) === currentJudge)
    );

    if (existing) {
      evaluatedStatusBadge.className = 'evaluated-badge done';
      evaluatedStatusBadge.textContent = '✅ Já Avaliada por Você';

      CRITERIA_KEYS.forEach(key => {
        const val = existing[key] ?? existing[`nota_${key}`] ?? (existing[`voto_${key}`] ? 3 : 2);
        currentScores[key] = val !== undefined ? Number(val) : null;
        updateCriterionUI(key, currentScores[key]);
      });

      inputObservacoes.value = existing.observacoes || '';
    } else {
      evaluatedStatusBadge.className = 'evaluated-badge pending';
      evaluatedStatusBadge.textContent = '⏳ Aguardando Avaliação';

      // Reseta para null (força toque ativo)
      CRITERIA_KEYS.forEach(key => {
        currentScores[key] = null;
        updateCriterionUI(key, null);
      });

      inputObservacoes.value = '';
    }
  }

  selectTeamPaddock.addEventListener('change', updateSelectedTeamUI);

  // 5. Envio Oficial da Avaliação
  formPaddockEval.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedVal = selectTeamPaddock.value;
    const team = teams.find(t => (t.id === selectedVal) || (t.name === selectedVal));
    if (!team) {
      alert('Selecione uma equipe válida para avaliar!');
      return;
    }

    // Validação Obrigatória dos 5 Critérios de Rubrica
    const missing = CRITERIA_KEYS.filter(k => currentScores[k] === null);
    if (missing.length > 0) {
      missing.forEach(k => {
        const card = document.getElementById(`card-${k}`);
        if (card) {
          card.style.borderColor = 'var(--color-danger)';
        }
      });
      alert('⚠️ Atenção: Por favor, selecione os 5 critérios oficiais (Em Desenvolvimento, Desenvolvido ou Superado ★) antes de enviar!');
      const firstMissing = document.getElementById(`card-${missing[0]}`);
      if (firstMissing) firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const currentJudge = localStorage.getItem('paddock_judge_name') || 'Juiz Oficial';

    // Formato Canônico Exato do Edital 08
    const payload = {
      equipe_id: team.id || 'EQ-01',
      juiz_nome: currentJudge,
      caracterizacao: currentScores.caracterizacao,
      mecanica: currentScores.mecanica,
      superacao: currentScores.superacao,
      torcida: currentScores.torcida,
      fair_play: currentScores.fair_play,
      observacoes: inputObservacoes.value.trim(),
      timestamp: new Date().toISOString(),
      // Metadados auxiliares para cache local
      equipe: team.name,
      escola: team.school,
      categoria: team.category,
      synced: false
    };

    // Feedback tátil
    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);

    // Animação de envio no botão
    const originalText = btnSubmitEval.innerHTML;
    btnSubmitEval.innerHTML = '<span>⏳ ENVIANDO AVALIAÇÃO...</span>';
    btnSubmitEval.disabled = true;

    try {
      if (window.cloudAPI) {
        const res = await window.cloudAPI.salvarAvaliacao(payload);
        if (res && res.ok) {
          payload.synced = true;
        }
      }
    } catch (err) {
      console.warn('Envio em background / contingência offline:', err);
    }

    // Salva cópia local resiliente
    saveMyEval(payload);

    // Feedback de sucesso
    btnSubmitEval.innerHTML = '<span>✅ AVALIAÇÃO REGISTRADA COM SUCESSO!</span>';
    btnSubmitEval.style.background = 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)';

    setTimeout(() => {
      btnSubmitEval.innerHTML = originalText;
      btnSubmitEval.style.background = '';
      btnSubmitEval.disabled = false;
      populateTeamsDropdown();
      selectTeamPaddock.value = team.id || team.name;
      updateSelectedTeamUI();
    }, 1600);
  });

  // 6. Accordion e Lista de Minhas Avaliações
  function formatRubricChip(score) {
    if (score === 3) return '<span style="color: #F26522; font-weight: 800;">3★</span>';
    if (score === 2) return '<span style="color: #002B49; font-weight: 800;">2</span>';
    if (score === 1) return '<span style="color: #92400E; font-weight: 800;">1</span>';
    return '-';
  }

  function renderMyEvals() {
    const currentJudge = localStorage.getItem('paddock_judge_name');
    const myEvals = getMyEvals().filter(e => (e.juiz_nome || e.juiz) === currentJudge);
    myEvalsCount.textContent = myEvals.length;
    myEvalsContainer.innerHTML = '';

    if (myEvals.length === 0) {
      myEvalsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.82rem; text-align: center; padding: 12px;">Nenhuma avaliação enviada por você ainda.</p>';
      return;
    }

    myEvals.forEach(ev => {
      const div = document.createElement('div');
      div.className = 'eval-history-card';
      const syncBadge = ev.synced !== false 
        ? '<span style="color: #16A34A; font-weight: 800; font-size: 0.75rem;">🟢 Nuvem</span>' 
        : '<span style="color: #F26522; font-weight: 800; font-size: 0.75rem;">🟡 Celular</span>';

      const teamLabel = ev.equipe || ev.equipe_id;

      div.innerHTML = `
        <div>
          <div class="eval-history-team">${teamLabel}</div>
          <div class="eval-history-scores" style="font-size: 0.76rem; color: var(--text-muted); line-height: 1.4;">
            Caract: ${formatRubricChip(ev.caracterizacao)} &bull; 
            Mec: ${formatRubricChip(ev.mecanica)} &bull; 
            Super: ${formatRubricChip(ev.superacao)} &bull; 
            Torc: ${formatRubricChip(ev.torcida)} &bull; 
            Fair: ${formatRubricChip(ev.fair_play)}
          </div>
        </div>
        <div>${syncBadge}</div>
      `;
      myEvalsContainer.appendChild(div);
    });
  }

  btnToggleHistory.addEventListener('click', () => {
    const isOpen = myEvalsContainer.style.display !== 'none';
    myEvalsContainer.style.display = isOpen ? 'none' : 'block';
    accordionArrow.textContent = isOpen ? '▼' : '▲';
  });

  // 7. Status da Nuvem
  async function checkCloud() {
    if (!window.cloudAPI || !elCloudStatusBadge) return;
    const res = await window.cloudAPI.checkHealth();
    if (res.online) {
      elCloudStatusBadge.className = 'badge-status cloud-online';
      if (elCloudStatusText) elCloudStatusText.textContent = '🟢 Online';
    } else {
      elCloudStatusBadge.className = 'badge-status cloud-offline';
      if (elCloudStatusText) elCloudStatusText.textContent = '🟡 Offline';
    }
  }

  // Inicialização
  populateTeamsDropdown();
  renderMyEvals();
  checkCloud();
  setInterval(checkCloud, 15000);
});

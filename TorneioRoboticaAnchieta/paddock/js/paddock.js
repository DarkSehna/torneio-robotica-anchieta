/**
 * Torneio de Robótica Anchieta - Controlador dos Juízes de Paddock (Tela 3)
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

  const displayScoreMecanica = document.getElementById('displayScoreMecanica');
  const displayScoreCaracterizacao = document.getElementById('displayScoreCaracterizacao');
  const displayScoreTorcida = document.getElementById('displayScoreTorcida');

  const toggleSuperacao = document.getElementById('toggleSuperacao');
  const toggleFairPlay = document.getElementById('toggleFairPlay');
  const inputObservacoes = document.getElementById('inputObservacoes');
  const formPaddockEval = document.getElementById('formPaddockEval');
  const btnSubmitEval = document.getElementById('btnSubmitEval');

  const btnToggleHistory = document.getElementById('btnToggleHistory');
  const myEvalsContainer = document.getElementById('myEvalsContainer');
  const myEvalsCount = document.getElementById('myEvalsCount');
  const accordionArrow = document.getElementById('accordionArrow');

  // Estado das Notas Atuais (Iniciam vazias / null para forçar o juiz a avaliar ativamente)
  const currentScores = {
    mecanica: null,
    caracterizacao: null,
    torcida: null
  };

  // 1. Gestão do Nome do Juiz
  function initJudgeName() {
    let name = localStorage.getItem('paddock_judge_name');
    if (!name || name.trim() === '') {
      name = prompt('Bem-vindo, Juiz! Digite seu nome completo para assinar as avaliações:', 'Juiz Convidado');
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

  const judgeName = initJudgeName();

  // 2. Histórico Local de Avaliações
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
    // Substitui se já avaliou a mesma equipe
    const index = evals.findIndex(e => e.equipe === evalData.equipe && e.juiz === evalData.juiz);
    if (index >= 0) {
      evals[index] = evalData;
    } else {
      evals.unshift(evalData);
    }
    localStorage.setItem('paddock_evaluations_cache', JSON.stringify(evals));
    renderMyEvals();
  }

  // 3. Renderizar Botões Numéricos Táteis (0 a 10)
  function setupScorePills(criterion, displayEl, initialValue) {
    const container = document.querySelector(`.score-pill-grid[data-criterion="${criterion}"]`);
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i <= 10; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'score-btn' + (initialValue !== null && i === initialValue ? ' active' : '') + (i >= 9 ? ' high-score' : '');
      btn.textContent = i;
      btn.dataset.val = i;

      btn.addEventListener('click', () => {
        currentScores[criterion] = i;
        displayEl.textContent = i;
        container.querySelectorAll('.score-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (navigator.vibrate) navigator.vibrate(15);
      });

      container.appendChild(btn);
    }

    displayEl.textContent = initialValue !== null ? initialValue : '--';
  }

  setupScorePills('mecanica', displayScoreMecanica, null);
  setupScorePills('caracterizacao', displayScoreCaracterizacao, null);
  setupScorePills('torcida', displayScoreTorcida, null);

  // 4. Carregamento de Equipes
  await window.teamsManager.load();
  const teams = window.teamsManager.getAll();

  function populateTeamsDropdown() {
    selectTeamPaddock.innerHTML = '<option value="">-- Escolha a Equipe do Box --</option>';
    const myEvals = getMyEvals().filter(e => e.juiz === localStorage.getItem('paddock_judge_name'));
    const evaluatedNames = new Set(myEvals.map(e => e.equipe.toLowerCase()));

    teams.forEach(t => {
      const isEval = evaluatedNames.has(t.name.toLowerCase());
      const opt = document.createElement('option');
      opt.value = t.name;
      opt.textContent = `${isEval ? '✅ ' : '⏳ '}${t.name} (${t.category.includes('LEGO') ? 'LEGO' : 'MAKER'})`;
      selectTeamPaddock.appendChild(opt);
    });

    if (teams.length > 0) {
      selectTeamPaddock.value = teams[0].name;
      updateSelectedTeamUI();
    }
  }

  function updateSelectedTeamUI() {
    const selectedName = selectTeamPaddock.value;
    const team = teams.find(t => t.name === selectedName);
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
    const existing = getMyEvals().find(e => e.equipe.toLowerCase() === team.name.toLowerCase() && e.juiz === currentJudge);

    if (existing) {
      evaluatedStatusBadge.className = 'evaluated-badge done';
      evaluatedStatusBadge.textContent = '✅ Já Avaliada por Você';

      // Preenche com as notas salvas
      currentScores.mecanica = existing.nota_mecanica;
      displayScoreMecanica.textContent = existing.nota_mecanica;
      updateActivePill('mecanica', existing.nota_mecanica);

      currentScores.caracterizacao = existing.nota_caracterizacao;
      displayScoreCaracterizacao.textContent = existing.nota_caracterizacao;
      updateActivePill('caracterizacao', existing.nota_caracterizacao);

      currentScores.torcida = existing.nota_torcida;
      displayScoreTorcida.textContent = existing.nota_torcida;
      updateActivePill('torcida', existing.nota_torcida);

      toggleSuperacao.checked = !!existing.voto_superacao;
      toggleFairPlay.checked = !!existing.voto_fair_play;
      inputObservacoes.value = existing.observacoes || '';
    } else {
      evaluatedStatusBadge.className = 'evaluated-badge pending';
      evaluatedStatusBadge.textContent = '⏳ Aguardando Avaliação';

      // Reseta para vazio (obriga o juiz a tocar na nota desejada)
      currentScores.mecanica = null;
      displayScoreMecanica.textContent = '--';
      updateActivePill('mecanica', null);

      currentScores.caracterizacao = null;
      displayScoreCaracterizacao.textContent = '--';
      updateActivePill('caracterizacao', null);

      currentScores.torcida = null;
      displayScoreTorcida.textContent = '--';
      updateActivePill('torcida', null);

      toggleSuperacao.checked = false;
      toggleFairPlay.checked = false;
      inputObservacoes.value = '';
    }
  }

  function updateActivePill(criterion, val) {
    const container = document.querySelector(`.score-pill-grid[data-criterion="${criterion}"]`);
    if (!container) return;
    container.querySelectorAll('.score-btn').forEach(btn => {
      btn.classList.toggle('active', val !== null && Number(btn.dataset.val) === Number(val));
    });
  }

  selectTeamPaddock.addEventListener('change', updateSelectedTeamUI);

  // 5. Envio Oficial da Avaliação
  formPaddockEval.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedName = selectTeamPaddock.value;
    const team = teams.find(t => t.name === selectedName);
    if (!team) {
      alert('Selecione uma equipe válida para avaliar!');
      return;
    }

    // Validação Obrigatória das 3 Notas
    if (currentScores.mecanica === null || currentScores.caracterizacao === null || currentScores.torcida === null) {
      alert('⚠️ Atenção: Por favor, selecione as 3 notas (Mecânica, Caracterização e Torcida de 0 a 10) antes de enviar a avaliação!');
      return;
    }

    const currentJudge = localStorage.getItem('paddock_judge_name') || 'Juiz Oficial';

    const payload = {
      juiz: currentJudge,
      equipe: team.name,
      escola: team.school,
      categoria: team.category,
      nota_mecanica: currentScores.mecanica,
      nota_caracterizacao: currentScores.caracterizacao,
      voto_superacao: toggleSuperacao.checked ? 1 : 0,
      voto_fair_play: toggleFairPlay.checked ? 1 : 0,
      nota_torcida: currentScores.torcida,
      observacoes: inputObservacoes.value.trim(),
      timestamp: new Date().toISOString(),
      synced: false
    };

    // Feedback tátil
    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);

    // Animação de envio no botão
    const originalText = btnSubmitEval.innerHTML;
    btnSubmitEval.innerHTML = '<span>⏳ ENVIANDO PARA A NUVEM...</span>';
    btnSubmitEval.disabled = true;

    try {
      if (window.cloudAPI) {
        const res = await window.cloudAPI.salvarAvaliacao(payload);
        if (res && res.ok) {
          payload.synced = true;
        }
      }
    } catch (err) {
      console.warn('Envio em background offline:', err);
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
      selectTeamPaddock.value = team.name;
      updateSelectedTeamUI();
    }, 1800);
  });

  // 6. Accordion e Lista de Minhas Avaliações
  function renderMyEvals() {
    const currentJudge = localStorage.getItem('paddock_judge_name');
    const myEvals = getMyEvals().filter(e => e.juiz === currentJudge);
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

      div.innerHTML = `
        <div>
          <div class="eval-history-team">${ev.equipe}</div>
          <div class="eval-history-scores">
            Mec: <strong>${ev.nota_mecanica}</strong> &bull; 
            Caract: <strong>${ev.nota_caracterizacao}</strong> &bull; 
            Torc: <strong>${ev.nota_torcida}</strong>
            ${ev.voto_superacao ? ' &bull; 🚀 Superação' : ''}
            ${ev.voto_fair_play ? ' &bull; 🤝 Fair Play' : ''}
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

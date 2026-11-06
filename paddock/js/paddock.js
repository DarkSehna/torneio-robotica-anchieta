/**
 * Torneio de Robótica Anchieta - Controlador dos Juízes de Paddock (Mobile / Tablet)
 * Renderização e Validação 100% Dinâmicas a partir de `config/regrasTorneio.js` (Single Source of Truth)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const REGRAS = window.REGRAS_TORNEIO;

  // Elementos do DOM
  const elCloudStatusBadge = document.getElementById('cloudStatusBadge');
  const elCloudStatusText = document.getElementById('cloudStatusText');
  const paddockSubtitleEdition = document.getElementById('paddockSubtitleEdition');
  const activeJudgeName = document.getElementById('activeJudgeName');
  const btnChangeJudge = document.getElementById('btnChangeJudge');

  const selectTeamPaddock = document.getElementById('selectTeamPaddock');
  const paddockTeamName = document.getElementById('paddockTeamName');
  const paddockTeamSchool = document.getElementById('paddockTeamSchool');
  const paddockTeamCat = document.getElementById('paddockTeamCat');
  const evaluatedStatusBadge = document.getElementById('evaluatedStatusBadge');

  const dynamicRubricsContainer = document.getElementById('dynamicRubricsContainer');
  const labelObservacoesGerais = document.getElementById('labelObservacoesGerais');
  const inputObservacoes = document.getElementById('inputObservacoes');
  const formPaddockEval = document.getElementById('formPaddockEval');
  const btnSubmitEval = document.getElementById('btnSubmitEval');

  const btnToggleHistory = document.getElementById('btnToggleHistory');
  const myEvalsContainer = document.getElementById('myEvalsContainer');
  const myEvalsCount = document.getElementById('myEvalsCount');
  const accordionArrow = document.getElementById('accordionArrow');

  // Atualiza subtítulo da edição dinamicamente
  if (REGRAS && paddockSubtitleEdition) {
    paddockSubtitleEdition.innerHTML = `Avaliação de Boxes &amp; Bancadas &bull; ${REGRAS.edicao} (${REGRAS.dataEvento})`;
  }

  // Lista ordenada dos critérios do formulário a partir da configuração central
  const CRITERIOS_CONFIG = [...(REGRAS?.criteriosPaddock || [])].sort(
    (a, b) => (a.ordemFormulario || 0) - (b.ordemFormulario || 0)
  );
  const ESCALA_NOTAS = REGRAS?.escalaNotas || [];
  const CRITERIA_KEYS = CRITERIOS_CONFIG.map(c => c.id);

  if (labelObservacoesGerais) {
    labelObservacoesGerais.textContent = `📝 ${CRITERIOS_CONFIG.length + 1}. Observações Gerais`;
  }

  // Estado das Notas Atuais (Iniciam como null para exigir seleção ativa)
  const currentScores = {};
  CRITERIA_KEYS.forEach(k => {
    currentScores[k] = null;
  });

  // 1. Renderiza Dinamicamente os Cards de Critérios e Botões de Escala
  function buildDynamicRubricCards() {
    if (!dynamicRubricsContainer) return;
    dynamicRubricsContainer.innerHTML = '';

    CRITERIOS_CONFIG.forEach(crit => {
      const section = document.createElement('section');
      section.className = 'mobile-card';
      section.id = `card-${crit.id}`;

      const pesoTag = crit.peso && Number(crit.peso) !== 1.0
        ? `<small style="font-size: 0.7rem; color: var(--color-accent); font-weight: 800; margin-left: 6px;">(Peso ${crit.peso}x)</small>`
        : '';

      const buttonsHtml = ESCALA_NOTAS.map(escala => `
        <button type="button" class="rubric-chip-btn" data-value="${escala.valor}">
          <span class="rubric-chip-title">${escala.rotulo}</span>
          <span class="rubric-chip-sub">${escala.subtitulo || `${escala.nivel} (${escala.valor})`}</span>
        </button>
      `).join('');

      section.innerHTML = `
        <div class="rubric-header">
          <div class="rubric-title">
            <span>${crit.nomeExibicao || `${crit.icone} ${crit.premio}`}${pesoTag}</span>
          </div>
          <span id="badgeStatus-${crit.id}" class="rubric-badge-status">⏳ Pendente</span>
        </div>
        <p class="rubric-desc">${crit.descricao}</p>
        <div class="rubric-segmented-grid" data-criterion="${crit.id}" style="grid-template-columns: repeat(${ESCALA_NOTAS.length}, 1fr);">
          ${buttonsHtml}
        </div>
      `;

      // Registra eventos de toque nos botões da escala para este critério
      const grid = section.querySelector('.rubric-segmented-grid');
      grid.querySelectorAll('.rubric-chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = Number(btn.dataset.value);
          currentScores[crit.id] = val;
          updateCriterionUI(crit.id, val);
          if (navigator.vibrate) navigator.vibrate(18);
        });
      });

      dynamicRubricsContainer.appendChild(section);
    });
  }

  buildDynamicRubricCards();

  // 2. Gestão do Nome do Juiz
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

  // 3. Histórico Local de Avaliações (Fila Local Resiliente)
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

  // 4. Atualizar Estado Visual de cada Critério de Rubrica consumindo `escalaNotas`
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
      const nivelEncontrado = ESCALA_NOTAS.find(n => Number(n.valor) === Number(val));
      if (val !== null && nivelEncontrado) {
        if (nivelEncontrado.classeCss) {
          badge.classList.add(nivelEncontrado.classeCss);
        }
        badge.textContent = nivelEncontrado.badgeTexto || `${nivelEncontrado.nivel} (${nivelEncontrado.valor})`;
      } else {
        badge.textContent = '⏳ Pendente';
      }
    }
  }

  const btnRefreshTeams = document.getElementById('btnRefreshTeams');
  let teams = [];

  async function reloadTeamsFromCloud(animateBtn = false) {
    if (animateBtn && btnRefreshTeams) {
      btnRefreshTeams.style.transform = 'rotate(360deg)';
      btnRefreshTeams.style.transition = 'transform 0.5s ease';
      setTimeout(() => {
        btnRefreshTeams.style.transform = 'none';
        btnRefreshTeams.style.transition = 'none';
      }, 500);
    }

    try {
      await window.teamsManager.load(true);
      teams = window.teamsManager.getAll();
      populateTeamsDropdown();
    } catch (e) {
      console.warn('Erro ao atualizar equipes:', e);
    }
  }

  if (btnRefreshTeams) {
    btnRefreshTeams.addEventListener('click', () => {
      reloadTeamsFromCloud(true);
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) reloadTeamsFromCloud(false);
  });
  window.addEventListener('focus', () => {
    reloadTeamsFromCloud(false);
  });

  await window.teamsManager.load();
  teams = window.teamsManager.getAll();

  function populateTeamsDropdown() {
    const prevSelected = selectTeamPaddock.value;
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
      if (prevSelected && teams.some(t => (t.id === prevSelected) || (t.name === prevSelected))) {
        selectTeamPaddock.value = prevSelected;
      } else {
        selectTeamPaddock.value = teams[0].id || teams[0].name;
      }
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
        const val = REGRAS ? REGRAS.extrairNotaDeRegistro(existing, key) : Number(existing[key]);
        currentScores[key] = val > 0 ? Number(val) : null;
        updateCriterionUI(key, currentScores[key]);
      });

      inputObservacoes.value = existing.observacoes || '';
    } else {
      evaluatedStatusBadge.className = 'evaluated-badge pending';
      evaluatedStatusBadge.textContent = '⏳ Aguardando Avaliação';

      CRITERIA_KEYS.forEach(key => {
        currentScores[key] = null;
        updateCriterionUI(key, null);
      });

      inputObservacoes.value = '';
    }
  }

  selectTeamPaddock.addEventListener('change', updateSelectedTeamUI);

  // 5. Envio Oficial da Avaliação Validado contra REGRAS_TORNEIO
  formPaddockEval.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedVal = selectTeamPaddock.value;
    const team = teams.find(t => (t.id === selectedVal) || (t.name === selectedVal));
    if (!team) {
      alert('Selecione uma equipe válida para avaliar!');
      return;
    }

    // Validação Obrigatória de todos os critérios configurados em `REGRAS_TORNEIO.criteriosPaddock`
    const missing = CRITERIA_KEYS.filter(k => {
      const val = currentScores[k];
      if (val === null || val === undefined) return true;
      return REGRAS ? REGRAS.validarNota(val) === null : false;
    });

    if (missing.length > 0) {
      missing.forEach(k => {
        const card = document.getElementById(`card-${k}`);
        if (card) card.style.borderColor = 'var(--color-danger)';
      });
      const nomesNiveis = ESCALA_NOTAS.map(n => n.rotulo).join(', ');
      alert(`⚠️ Atenção: Por favor, avalie todos os ${CRITERIA_KEYS.length} critérios oficiais (${nomesNiveis}) antes de enviar!`);
      const firstMissing = document.getElementById(`card-${missing[0]}`);
      if (firstMissing) firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const currentJudge = localStorage.getItem('paddock_judge_name') || 'Juiz Oficial';

    // Monta payload dinamicamente para todos os critérios configurados + metadados
    const payload = {
      equipe_id: team.id || 'EQ-01',
      juiz_nome: currentJudge,
      observacoes: inputObservacoes.value.trim(),
      timestamp: new Date().toISOString(),
      equipe: team.name,
      escola: team.school,
      categoria: team.category,
      synced: false
    };

    CRITERIOS_CONFIG.forEach(crit => {
      const notaValidada = REGRAS.validarNota(currentScores[crit.id]);
      payload[crit.id] = notaValidada;
      if (crit.colunaLegadaDb) {
        payload[crit.colunaLegadaDb] = notaValidada;
      }
    });

    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);

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

    saveMyEval(payload);

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

  // 6. Accordion e Lista de Minhas Avaliações (Dinâmica conforme escalaNotas)
  function formatRubricChip(score) {
    const nivel = ESCALA_NOTAS.find(n => Number(n.valor) === Number(score));
    if (nivel) {
      return `<span style="color: ${nivel.corHex || '#002B49'}; font-weight: 800;">${nivel.chipResumo || nivel.valor}</span>`;
    }
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
      const summaryParts = CRITERIOS_CONFIG.map(crit => {
        const nota = REGRAS ? REGRAS.extrairNotaDeRegistro(ev, crit.id) : ev[crit.id];
        return `${crit.icone} ${formatRubricChip(nota)}`;
      }).join(' &bull; ');

      div.innerHTML = `
        <div>
          <div class="eval-history-team">${teamLabel}</div>
          <div class="eval-history-scores" style="font-size: 0.76rem; color: var(--text-muted); line-height: 1.4;">
            ${summaryParts}
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

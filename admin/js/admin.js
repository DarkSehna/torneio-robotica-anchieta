/**
 * Torneio de Robótica Anchieta - Painel Administrativo, Gestão de Equipes & Credenciamento
 * Suporta Importação CSV (Forms com Sanitização LGPD), Toggles Táteis de Check-in e Inspeção Técnica (25x25cm / <=2kg)
 */

document.addEventListener('DOMContentLoaded', async () => {
  await window.teamsManager.load();

  // Elementos do DOM - Header e Status
  const elCloudStatusBadge = document.getElementById('cloudStatusBadge');
  const elCloudStatusText = document.getElementById('cloudStatusText');

  // Indicadores de Resumo no Topo
  const statTotalTeams = document.getElementById('statTotalTeams');
  const statLegoCount = document.getElementById('statLegoCount');
  const statMakerCount = document.getElementById('statMakerCount');
  const statTotalRounds = document.getElementById('statTotalRounds');
  const teamCountBadge = document.getElementById('teamCountBadge');

  // Formulário de Cadastro Manual
  const formAddTeam = document.getElementById('formAddTeam');
  const inputTeamId = document.getElementById('inputTeamId');
  const inputTeamName = document.getElementById('inputTeamName');
  const inputTeamSchool = document.getElementById('inputTeamSchool');
  const selectTeamCategory = document.getElementById('selectTeamCategory');
  const inputTeamProfessor = document.getElementById('inputTeamProfessor');
  const inputTeamMembers = document.getElementById('inputTeamMembers');

  // Busca e Tabela
  const adminTeamSearch = document.getElementById('adminTeamSearch');
  const adminTeamsTableBody = document.getElementById('adminTeamsTableBody');

  // Botões de Nuvem e JSON
  const btnFetchCloudTeams = document.getElementById('btnFetchCloudTeams');
  const btnPushCloudTeams = document.getElementById('btnPushCloudTeams');
  const btnExportTeamsJSON = document.getElementById('btnExportTeamsJSON');
  const inputFileImportTeams = document.getElementById('inputFileImportTeams');

  // Importação CSV & Modal
  const inputFileImportCSV = document.getElementById('inputFileImportCSV');
  const modalCsvPreview = document.getElementById('modalCsvPreview');
  const btnModalCloseCsv = document.getElementById('btnModalCloseCsv');
  const btnModalCancelCsv = document.getElementById('btnModalCancelCsv');
  const btnModalConfirmCsv = document.getElementById('btnModalConfirmCsv');
  const csvTotalFoundCount = document.getElementById('csvTotalFoundCount');
  const csvPreviewTableBody = document.getElementById('csvPreviewTableBody');

  // Zonas de Limpeza
  const btnResetRoundsOnly = document.getElementById('btnResetRoundsOnly');
  const btnResetEvalsOnly = document.getElementById('btnResetEvalsOnly');
  const btnResetTeamsOnly = document.getElementById('btnResetTeamsOnly');
  const btnResetAllDefaults = document.getElementById('btnResetAllDefaults');

  let pendingCsvTeams = [];

  // ==========================================================================
  // 1. ATUALIZAÇÃO DE ESTATÍSTICAS E RESUMO NO TOPO
  // ==========================================================================
  function updateStats() {
    const isCatUnica = !!window.REGRAS_TORNEIO?.categoriaUnica;
    const teams = window.teamsManager.getAll();
    const total = teams.length;
    const legoCount = teams.filter(t => t.category.includes('LEGO')).length;
    const makerCount = teams.filter(t => !t.category.includes('LEGO')).length;

    if (statTotalTeams) statTotalTeams.textContent = total;
    if (teamCountBadge) teamCountBadge.textContent = total;

    if (isCatUnica) {
      if (statLegoCount) statLegoCount.textContent = total;
      const statLegoCard = statLegoCount?.closest('.stat-card');
      if (statLegoCard) {
        const lbl = statLegoCard.querySelector('.stat-label');
        if (lbl) lbl.textContent = window.REGRAS_TORNEIO?.nomeCategoriaUnica || 'Categoria Única';
      }
      const statMakerCard = statMakerCount?.closest('.stat-card');
      if (statMakerCard) {
        statMakerCard.style.display = 'none';
      }
    } else {
      if (statLegoCount) statLegoCount.textContent = legoCount;
      if (statMakerCount) statMakerCount.textContent = makerCount;
      const statLegoCard = statLegoCount?.closest('.stat-card');
      if (statLegoCard) {
        const lbl = statLegoCard.querySelector('.stat-label');
        if (lbl) lbl.textContent = 'LEGO / Educacional';
      }
      const statMakerCard = statMakerCount?.closest('.stat-card');
      if (statMakerCard) {
        statMakerCard.style.display = '';
      }
    }

    const rawRecords = localStorage.getItem('torneio_anchieta_records');
    let records = [];
    try {
      records = rawRecords ? JSON.parse(rawRecords) : [];
    } catch {
      records = [];
    }

    if (statTotalRounds) statTotalRounds.textContent = records.length;
  }

  // ==========================================================================
  // 2. RENDERIZAÇÃO DA TABELA DE EQUIPES COM TOGGLES TÁTEIS
  // ==========================================================================
  function renderTeamsTable() {
    const query = (adminTeamSearch?.value || '').trim().toLowerCase();
    const teams = window.teamsManager.getAll().filter(t => {
      const matchQuery = !query ||
        t.name.toLowerCase().includes(query) ||
        t.school.toLowerCase().includes(query) ||
        (t.id && t.id.toLowerCase().includes(query)) ||
        (t.professor && t.professor.toLowerCase().includes(query)) ||
        (t.integrantes && t.integrantes.toLowerCase().includes(query));
      return matchQuery;
    });

    adminTeamsTableBody.innerHTML = '';

    if (teams.length === 0) {
      adminTeamsTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px 16px;">
            Nenhuma equipe encontrada com os filtros atuais.
          </td>
        </tr>
      `;
      return;
    }

    const isCatUnica = !!window.REGRAS_TORNEIO?.categoriaUnica;

    teams.forEach(t => {
      const tr = document.createElement('tr');
      const isLego = t.category.includes('LEGO');
      const catBadge = isCatUnica
        ? `<span style="background: rgba(0,43,73,0.1); color: var(--color-primary); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 800;">${window.REGRAS_TORNEIO?.nomeCategoriaUnica || 'Categoria Única'}</span>`
        : (isLego 
            ? '<span style="background: var(--color-accent-subtle); color: var(--color-accent); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 800;">LEGO</span>'
            : '<span style="background: rgba(0,43,73,0.1); color: var(--color-primary); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 800;">MAKER</span>');

      const metaParts = [];
      if (t.professor) metaParts.push(`👨‍🏫 <strong>Prof:</strong> ${escapeHtml(t.professor)}`);
      if (t.integrantes) metaParts.push(`👥 <strong>Integrantes:</strong> ${escapeHtml(t.integrantes)}`);
      const metaHtml = metaParts.length > 0 
        ? `<div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 3px; line-height: 1.35;">${metaParts.join(' &bull; ')}</div>`
        : `<div style="font-size: 0.72rem; color: #94a3b8; margin-top: 3px; font-style: italic;">(Professor / integrantes não vinculados)</div>`;

      tr.innerHTML = `
        <td><strong style="font-size: 0.85rem; color: var(--color-primary);">${t.id}</strong></td>
        <td>
          <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main);">${escapeHtml(t.name)}</div>
          ${metaHtml}
        </td>
        <td style="font-size: 0.88rem; color: var(--text-main);">${escapeHtml(t.school)}</td>
        <td>${catBadge}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button type="button" class="btn-action btn-admin-edit-team" data-team-id="${t.id}" style="padding: 5px 12px; font-size: 0.78rem; background: var(--bg-muted); border: 1.5px solid var(--border-medium); border-radius: var(--radius-sm); font-weight: 700; color: var(--color-primary); cursor: pointer; margin-right: 6px;" title="Editar cadastro da equipe">
            ✏️ Editar
          </button>
          <button type="button" class="btn-del-team" data-team-id="${t.id}" style="padding: 5px 10px;">
            🗑️ Excluir
          </button>
        </td>
      `;

      // Evento: Editar Equipe
      const btnEdit = tr.querySelector('.btn-admin-edit-team');
      btnEdit.addEventListener('click', () => {
        openAdminEditModal(t);
      });

      // Evento: Excluir Equipe
      tr.querySelector('.btn-del-team').addEventListener('click', () => {
        deleteTeam(t.id, t.name);
      });

      adminTeamsTableBody.appendChild(tr);
    });
  }

  // ==========================================================================
  // 3. PARSER INTELIGENTE DE CSV (GOOGLE / MICROSOFT FORMS) COM SANITIZAÇÃO LGPD
  // ==========================================================================
  function parseFormsCSV(csvText) {
    if (!csvText || !csvText.trim()) return [];

    // Remove BOM (Byte Order Mark) se presente (comum em exports do Excel/Forms)
    let cleanText = csvText.replace(/^\uFEFF/, '');

    // 1. Detecta delimitador (, ou ; ou \t)
    const firstLine = cleanText.split(/\r\n|\n|\r/)[0] || '';
    let delimiter = ',';
    const countSemi = (firstLine.match(/;/g) || []).length;
    const countComma = (firstLine.match(/,/g) || []).length;
    const countTab = (firstLine.match(/\t/g) || []).length;

    if (countSemi > countComma && countSemi > countTab) delimiter = ';';
    else if (countTab > countComma && countTab > countSemi) delimiter = '\t';

    // 2. Parser respeitando aspas duplas
    const rows = parseCSVRows(cleanText, delimiter);
    if (rows.length < 2) return [];

    const headers = rows[0].map(h => h.trim());

    // 3. Identifica e descarta colunas de dados sensíveis (LGPD / Proteção de Menores)
    const SENSITIVE_REGEX = /(cpf|rg|documento|doc|nascimento|certid|celular|telefone|email|contato|whatsapp|endere[cç]o|bairro|cidade|cep)/i;

    const columnMap = {
      name: -1,
      school: -1,
      category: -1,
      professor: -1,
      memberCols: []
    };

    headers.forEach((header, idx) => {
      // REGRA DE OURO LGPD: Coluna sensível é sumariamente ignorada
      if (SENSITIVE_REGEX.test(header)) {
        return;
      }

      if (columnMap.name === -1 && /(nome.*equipe|nome.*time|^equipe$|^time$)/i.test(header)) {
        columnMap.name = idx;
      } else if (columnMap.school === -1 && /(escola|institui|col[eé]gio)/i.test(header)) {
        columnMap.school = idx;
      } else if (columnMap.category === -1 && /(categoria|modalidade)/i.test(header)) {
        columnMap.category = idx;
      } else if (columnMap.professor === -1 && /(professor|t[eé]cnico|orientador|respons[aá]vel|tutor)/i.test(header)) {
        columnMap.professor = idx;
      } else if (/(aluno|integrante|estudante|membro)/i.test(header)) {
        columnMap.memberCols.push(idx);
      }
    });

    // Fallback se não encontrou cabeçalho com regex estrita: procura por índices comuns
    if (columnMap.name === -1 && headers.length > 1) {
      // Primeira coluna que não seja carimbo de data/hora
      const nonTimestamp = headers.findIndex(h => !/(carimbo|hora|data|timestamp|id)/i.test(h) && !SENSITIVE_REGEX.test(h));
      if (nonTimestamp !== -1) columnMap.name = nonTimestamp;
    }

    const parsedTeams = [];
    const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || row.every(c => !c.trim())) continue;

      const teamName = (columnMap.name !== -1 && row[columnMap.name] ? row[columnMap.name] : '').trim();
      if (!teamName || teamName.length < 2) continue;

      const school = (columnMap.school !== -1 && row[columnMap.school] ? row[columnMap.school] : 'Colégio Anchieta').trim();

      // Categoria: normalização inteligente
      let category = 'LEGO / Educacional';
      if (columnMap.category !== -1 && row[columnMap.category]) {
        const catRaw = row[columnMap.category].toLowerCase();
        if (catRaw.includes('maker') || catRaw.includes('aberta') || catRaw.includes('livre')) {
          category = 'Aberta / Maker';
        }
      }

      const professor = (columnMap.professor !== -1 && row[columnMap.professor] ? row[columnMap.professor] : '').trim();

      // Integrantes: agrupa valores das colunas de alunos, expurgando números de documento
      const membersList = [];
      columnMap.memberCols.forEach(cIdx => {
        const val = (row[cIdx] || '').trim();
        if (val && !CPF_PATTERN.test(val)) {
          // Se o valor já for uma lista com vírgulas
          val.split(/,|\n/).forEach(p => {
            const trimmed = p.trim();
            if (trimmed && !CPF_PATTERN.test(trimmed)) {
              membersList.push(trimmed);
            }
          });
        }
      });

      parsedTeams.push({
        id: `EQ-${String(parsedTeams.length + 1).padStart(2, '0')}`,
        name: teamName,
        school: school || 'Colégio Anchieta',
        category,
        professor: CPF_PATTERN.test(professor) ? '' : professor,
        integrantes: membersList.slice(0, 4).join(', '),
        checkin: false,
        inspecao: false
      });
    }

    return parsedTeams;
  }

  // Divisor de linhas e células com respeito a aspas CSV RFC 4180
  function parseCSVRows(text, delimiter = ',') {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // Pula aspas escapadas
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') i++; // Pula CRLF
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
    }

    return rows;
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

  // ==========================================================================
  // 4. EVENTOS DE IMPORTAÇÃO CSV & MODAL DE PRÉVIA
  // ==========================================================================
  if (inputFileImportCSV) {
    inputFileImportCSV.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          pendingCsvTeams = parseFormsCSV(content);

          if (!pendingCsvTeams || pendingCsvTeams.length === 0) {
            alert('Nenhuma equipe válida foi identificada no arquivo CSV. Verifique o formato das colunas do formulário.');
            return;
          }

          // Preenche a tabela de prévia no modal
          csvTotalFoundCount.textContent = pendingCsvTeams.length;
          csvPreviewTableBody.innerHTML = '';

          pendingCsvTeams.slice(0, 15).forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><strong>${escapeHtml(t.name)}</strong></td>
              <td>${escapeHtml(t.school)}</td>
              <td><span style="font-weight: 700; color: ${t.category.includes('LEGO') ? 'var(--color-accent)' : 'var(--color-primary)'};">${escapeHtml(t.category)}</span></td>
              <td>${escapeHtml(t.professor || '--')}</td>
              <td>${escapeHtml(t.integrantes || '--')}</td>
            `;
            csvPreviewTableBody.appendChild(tr);
          });

          if (pendingCsvTeams.length > 15) {
            const trMore = document.createElement('tr');
            trMore.innerHTML = `
              <td colspan="5" style="text-align: center; color: var(--text-muted); font-style: italic; padding: 10px;">
                ... e mais ${pendingCsvTeams.length - 15} equipe(s).
              </td>
            `;
            csvPreviewTableBody.appendChild(trMore);
          }

          modalCsvPreview.style.display = 'flex';
        } catch (err) {
          alert('Erro ao processar arquivo CSV: ' + err.message);
        } finally {
          inputFileImportCSV.value = '';
        }
      };

      reader.readAsText(file, 'UTF-8');
    });
  }

  function closeModalCsv() {
    modalCsvPreview.style.display = 'none';
    pendingCsvTeams = [];
  }

  if (btnModalCloseCsv) btnModalCloseCsv.addEventListener('click', closeModalCsv);
  if (btnModalCancelCsv) btnModalCancelCsv.addEventListener('click', closeModalCsv);

  if (btnModalConfirmCsv) {
    btnModalConfirmCsv.addEventListener('click', async () => {
      if (!pendingCsvTeams || pendingCsvTeams.length === 0) return closeModalCsv();

      const mode = document.querySelector('input[name="csvImportMode"]:checked')?.value || 'merge';

      btnModalConfirmCsv.disabled = true;
      btnModalConfirmCsv.textContent = '⏳ Gravando Equipes...';

      let finalList = [];
      if (mode === 'replace') {
        finalList = window.teamsManager.deduplicate(pendingCsvTeams);
      } else {
        // Modo Merge: combina com as equipes existentes
        const current = window.teamsManager.getAll();
        finalList = window.teamsManager.deduplicate([...current, ...pendingCsvTeams]);
      }

      window.teamsManager.teams = finalList;
      window.teamsManager.saveCache();

      // Sincroniza com a nuvem Cloudflare D1
      if (window.cloudAPI) {
        try {
          if (mode === 'replace') {
            await window.cloudAPI.limparTodasEquipes();
          }
          await window.cloudAPI.salvarEquipes(finalList);
        } catch (err) {
          console.warn('Erro ao sincronizar equipes importadas na nuvem:', err);
        }
      }

      renderTeamsTable();
      updateStats();
      btnModalConfirmCsv.disabled = false;
      btnModalConfirmCsv.textContent = '✅ Confirmar e Importar Equipes';
      closeModalCsv();

      alert(`Sucesso! ${pendingCsvTeams.length} equipes foram importadas do formulário. Dados de CPF/documentos descartados pela política LGPD.`);
    });
  }

  // ==========================================================================
  // 5. CADASTRO MANUAL DE NOVA EQUIPE
  // ==========================================================================
  formAddTeam.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = inputTeamName.value.trim();
    const school = inputTeamSchool.value.trim();
    const category = window.REGRAS_TORNEIO?.categoriaUnica
      ? (window.REGRAS_TORNEIO.nomeCategoriaUnica || 'Categoria Única')
      : selectTeamCategory.value;
    const customId = inputTeamId.value.trim();
    const professor = inputTeamProfessor?.value?.trim() || '';
    const integrantes = inputTeamMembers?.value?.trim() || '';

    if (!name || !school) return;

    const newTeam = window.teamsManager.addTeam({
      id: customId || undefined,
      name,
      school,
      category,
      professor,
      integrantes,
      checkin: false,
      inspecao: false
    });

    // Envia para a API Cloudflare D1
    if (window.cloudAPI) {
      window.cloudAPI.salvarEquipes(newTeam).then(res => {
        if (res && res.ok) {
          console.log('Equipe sincronizada com o Cloudflare D1!');
        }
      }).catch(err => console.warn('Sync de equipe na nuvem pendente:', err));
    }

    formAddTeam.reset();
    renderTeamsTable();
    updateStats();

    alert(`Equipe "${newTeam.name}" cadastrada com sucesso!`);
  });

  // ==========================================================================
  // 6. PUXAR & SUBIR EQUIPES DA NUVEM (CLOUDFLARE D1)
  // ==========================================================================
  if (btnFetchCloudTeams) {
    btnFetchCloudTeams.addEventListener('click', async () => {
      btnFetchCloudTeams.innerHTML = '⏳ Buscando...';
      btnFetchCloudTeams.disabled = true;

      try {
        const cloudTeams = await window.cloudAPI.getEquipes();
        if (Array.isArray(cloudTeams)) {
          if (cloudTeams.length === 0) {
            alert('Nenhuma equipe cadastrada ainda no Cloudflare D1.');
          } else {
            const mapped = cloudTeams.map((t, idx) => ({
              id: t.id ? `EQ-${String(t.id).padStart(2, '0')}` : `EQ-${String(idx + 1).padStart(2, '0')}`,
              name: t.equipe || t.name,
              school: t.escola || t.school || "Colégio Anchieta",
              category: t.categoria || t.category || "LEGO / Educacional",
              professor: t.professor || "",
              integrantes: t.integrantes || "",
              checkin: t.checkin === 1 || t.checkin === true || t.checkin === '1',
              inspecao: t.inspecao === 1 || t.inspecao === true || t.inspecao === '1'
            }));
            const deduplicated = window.teamsManager.deduplicate(mapped);
            window.teamsManager.teams = deduplicated;
            window.teamsManager.saveCache();
            renderTeamsTable();
            updateStats();
            alert(`Sucesso! ${deduplicated.length} equipes sincronizadas da nuvem com status de credenciamento.`);
          }
        } else {
          alert('Não foi possível obter equipes da nuvem no momento.');
        }
      } catch (err) {
        alert('Erro ao buscar equipes da nuvem: ' + err.message);
      } finally {
        btnFetchCloudTeams.innerHTML = '🔄 Puxar da Nuvem';
        btnFetchCloudTeams.disabled = false;
      }
    });
  }

  // ==========================================================================
  // MODAL DE EDIÇÃO COMPLETA DA EQUIPE (ADMIN)
  // ==========================================================================
  const modalAdminEditTeam = document.getElementById('modalAdminEditTeam');
  const formAdminEditTeam = document.getElementById('formAdminEditTeam');
  const btnModalCloseAdminEdit = document.getElementById('btnModalCloseAdminEdit');
  const btnModalCancelAdminEdit = document.getElementById('btnModalCancelAdminEdit');
  const adminEditTeamId = document.getElementById('adminEditTeamId');
  const adminEditTeamName = document.getElementById('adminEditTeamName');
  const adminEditTeamSchool = document.getElementById('adminEditTeamSchool');
  const adminEditTeamCategory = document.getElementById('adminEditTeamCategory');
  const adminEditTeamProfessor = document.getElementById('adminEditTeamProfessor');
  const adminEditStudent1 = document.getElementById('adminEditStudent1');
  const adminEditStudent2 = document.getElementById('adminEditStudent2');
  const adminEditStudent3 = document.getElementById('adminEditStudent3');
  const adminEditStudent4 = document.getElementById('adminEditStudent4');

  function openAdminEditModal(team) {
    if (!modalAdminEditTeam || !team) return;
    adminEditTeamId.value = team.id;
    adminEditTeamName.value = team.name || '';
    adminEditTeamSchool.value = team.school || '';
    adminEditTeamCategory.value = team.category || 'LEGO / Educacional';
    adminEditTeamProfessor.value = team.professor || '';
    
    // Distribui integrantes nos 4 campos individuais de alunos
    const rawMembers = (team.integrantes || '').split(/,\s*|\n|;/).map(m => m.trim()).filter(Boolean);
    if (adminEditStudent1) adminEditStudent1.value = rawMembers[0] || '';
    if (adminEditStudent2) adminEditStudent2.value = rawMembers[1] || '';
    if (adminEditStudent3) adminEditStudent3.value = rawMembers[2] || '';
    if (adminEditStudent4) adminEditStudent4.value = rawMembers[3] || '';

    modalAdminEditTeam.style.display = 'flex';
  }

  if (btnModalCloseAdminEdit) {
    btnModalCloseAdminEdit.addEventListener('click', () => {
      modalAdminEditTeam.style.display = 'none';
    });
  }
  if (btnModalCancelAdminEdit) {
    btnModalCancelAdminEdit.addEventListener('click', () => {
      modalAdminEditTeam.style.display = 'none';
    });
  }

  if (formAdminEditTeam) {
    formAdminEditTeam.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = adminEditTeamId.value;
      const team = window.teamsManager.getById(id);
      if (team) {
        const s1 = (adminEditStudent1?.value || '').trim();
        const s2 = (adminEditStudent2?.value || '').trim();
        const s3 = (adminEditStudent3?.value || '').trim();
        const s4 = (adminEditStudent4?.value || '').trim();

        const activeStudents = [s1, s2, s3, s4].filter(Boolean);
        if (activeStudents.length < 2) {
          alert('Atenção (Regulamento Art. 2º, § 2º): A equipe precisa conter no mínimo 2 alunos integrantes.');
          return;
        }

        team.name = adminEditTeamName.value.trim();
        team.school = adminEditTeamSchool.value.trim();
        team.category = window.REGRAS_TORNEIO?.categoriaUnica
          ? (window.REGRAS_TORNEIO.nomeCategoriaUnica || 'Categoria Única')
          : adminEditTeamCategory.value;
        team.professor = adminEditTeamProfessor.value.trim();
        team.integrantes = activeStudents.join(', ');

        window.teamsManager.saveCache();
        renderTeamsTable();
        updateStats();
        modalAdminEditTeam.style.display = 'none';
        alert(`Equipe "${team.name}" atualizada com sucesso!`);
        if (window.cloudAPI) {
          window.cloudAPI.salvarEquipes([team]).catch(err => console.warn('Erro ao salvar no D1:', err));
        }
      }
    });
  }

  if (btnPushCloudTeams) {
    btnPushCloudTeams.addEventListener('click', async () => {
      const teams = window.teamsManager.getAll();
      if (teams.length === 0) return alert('Nenhuma equipe local para enviar.');

      btnPushCloudTeams.innerHTML = '⏳ Enviando...';
      btnPushCloudTeams.disabled = true;

      try {
        const res = await window.cloudAPI.salvarEquipes(teams);
        if (res && res.ok) {
          alert(`Sucesso! ${teams.length} equipes foram sincronizadas no Cloudflare D1.`);
        } else {
          alert('Erro ao sincronizar com o Cloudflare D1: ' + (res?.error || res?.data?.error || 'Erro desconhecido'));
        }
      } catch (err) {
        alert('Erro de rede: ' + err.message);
      } finally {
        btnPushCloudTeams.innerHTML = '☁️ Subir para Nuvem';
        btnPushCloudTeams.disabled = false;
      }
    });
  }

  // ==========================================================================
  // 7. EXCLUIR EQUIPE
  // ==========================================================================
  async function deleteTeam(id, name) {
    if (!confirm(`Tem certeza de que deseja remover a equipe "${name}" (${id}) do torneio?`)) {
      return;
    }

    window.teamsManager.removeTeam(id);
    window.teamsManager.removeTeam(name);
    renderTeamsTable();
    updateStats();

    if (window.cloudAPI) {
      try {
        await window.cloudAPI.excluirEquipe(name);
      } catch (err) {
        console.warn('Erro ao excluir no Cloudflare D1:', err);
      }
    }
  }

  // Filtro de Busca
  if (adminTeamSearch) {
    adminTeamSearch.addEventListener('input', () => {
      renderTeamsTable();
    });
  }

  // Exportar Equipes em JSON
  btnExportTeamsJSON.addEventListener('click', () => {
    const teams = window.teamsManager.getAll();
    const blob = new Blob([JSON.stringify(teams, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Equipes_Torneio_Anchieta_${Date.now()}.json`;
    a.click();
  });

  // Importar Equipes de JSON
  inputFileImportTeams.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          window.teamsManager.teams = window.teamsManager.deduplicate(imported);
          window.teamsManager.saveCache();
          renderTeamsTable();
          updateStats();
          alert(`Sucesso! ${window.teamsManager.teams.length} equipes foram importadas.`);
        } else {
          alert('Arquivo JSON inválido. O formato deve ser uma lista de equipes.');
        }
      } catch (err) {
        alert('Erro ao ler arquivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  // ==========================================================================
  // 8. BOTÕES DA ZONA DE LIMPEZA
  // ==========================================================================
  btnResetRoundsOnly.addEventListener('click', async () => {
    if (!confirm('Atenção: Isso apagará todas as voltas registradas na pista física tanto no navegador quanto na nuvem Cloudflare D1. As equipes permanecerão salvas. Deseja continuar?')) {
      return;
    }

    localStorage.removeItem('torneio_anchieta_records');
    localStorage.removeItem('corridas_pista_cache');

    if (window.cloudAPI) {
      btnResetRoundsOnly.disabled = true;
      btnResetRoundsOnly.textContent = '⏳ Limpando na Nuvem...';
      try {
        const res = await window.cloudAPI.limparTodasCorridas();
        alert(`Sucesso! Histórico de voltas limpo na nuvem (${res.count || 0} corridas removidas) e no navegador.`);
      } catch (e) {
        alert('Voltas locais limpas. Erro ao limpar na nuvem: ' + e.message);
      } finally {
        btnResetRoundsOnly.disabled = false;
        btnResetRoundsOnly.textContent = '⏱️ Limpar Voltas da Pista (Nuvem & Local)';
      }
    } else {
      alert('Histórico de voltas local limpo com sucesso.');
    }
    updateStats();
  });

  if (btnResetEvalsOnly) {
    btnResetEvalsOnly.addEventListener('click', async () => {
      if (!confirm('Atenção: Isso apagará todas as notas e avaliações dos juízes de Paddock tanto no celular quanto na nuvem Cloudflare D1. As equipes e tempos de pista permanecerão salvos. Deseja continuar?')) {
        return;
      }

      localStorage.removeItem('paddock_evaluations_cache');
      localStorage.removeItem('torneio_minerva_votos');

      if (window.cloudAPI) {
        btnResetEvalsOnly.disabled = true;
        btnResetEvalsOnly.textContent = '⏳ Limpando Avaliações...';
        try {
          const res = await window.cloudAPI.limparTodasAvaliacoes();
          alert(`Sucesso! Todas as avaliações de Paddock foram apagadas da nuvem (${res.count || 0} avaliações removidas) e do cache local.`);
        } catch (e) {
          alert('Avaliações locais limpas. Erro ao limpar na nuvem: ' + e.message);
        } finally {
          btnResetEvalsOnly.disabled = false;
          btnResetEvalsOnly.textContent = '📋 Limpar Avaliações do Paddock (Nuvem & Local)';
        }
      } else {
        alert('Avaliações locais limpas com sucesso.');
      }
      updateStats();
    });
  }

  if (btnResetTeamsOnly) {
    btnResetTeamsOnly.addEventListener('click', async () => {
      if (!confirm('Atenção: Isso removerá TODAS as equipes cadastradas tanto localmente quanto na nuvem Cloudflare D1, deixando a lista 100% vazia para novos cadastros. Deseja continuar?')) {
        return;
      }

      window.teamsManager.teams = [];
      window.teamsManager.saveCache();

      if (window.cloudAPI) {
        btnResetTeamsOnly.disabled = true;
        btnResetTeamsOnly.textContent = '⏳ Limpando Equipes...';
        try {
          await window.cloudAPI.limparTodasEquipes();
          alert('Sucesso! Todas as equipes foram removidas da nuvem e a lista está 100% vazia.');
        } catch (e) {
          alert('Equipes locais limpas. Erro ao limpar na nuvem: ' + e.message);
        } finally {
          btnResetTeamsOnly.disabled = false;
          btnResetTeamsOnly.textContent = '👥 Limpar Todas as Equipes (Nuvem & Local)';
        }
      } else {
        alert('Lista de equipes limpa com sucesso.');
      }

      renderTeamsTable();
      updateStats();
    });
  }

  btnResetAllDefaults.addEventListener('click', async () => {
    const code = prompt('⚠️ AÇÃO DESTRUTIVA: DIGITE "RESET" EM MAIÚSCULAS PARA CONFIRMAR O RESET TOTAL (ZERA EQUIPES, CORRIDAS E AVALIAÇÕES NA NUVEM E LOCAL):');
    if (code === 'RESET') {
      localStorage.removeItem('torneio_anchieta_records');
      localStorage.removeItem('corridas_pista_cache');
      localStorage.removeItem('paddock_evaluations_cache');
      localStorage.removeItem('torneio_minerva_votos');

      window.teamsManager.teams = [];
      window.teamsManager.saveCache();

      if (window.cloudAPI) {
        btnResetAllDefaults.disabled = true;
        btnResetAllDefaults.textContent = '⏳ Executando Reset Total na Nuvem...';
        try {
          await window.cloudAPI.resetarTorneioCompleto();
          alert('Sucesso absoluto! Todo o banco de dados na nuvem (equipes, corridas e avaliações) foi zerado para o início oficial do torneio.');
        } catch (e) {
          alert('Dados locais limpos. Erro no reset da nuvem: ' + e.message);
        } finally {
          btnResetAllDefaults.disabled = false;
          btnResetAllDefaults.textContent = '⚡ Zerar Torneio Completo (Reset Total)';
        }
      } else {
        alert('Dados locais zerados com sucesso.');
      }

      renderTeamsTable();
      updateStats();
    }
  });

  // Health Check da Nuvem Cloudflare
  async function checkCloud() {
    if (!window.cloudAPI || !elCloudStatusBadge) return;
    const res = await window.cloudAPI.checkHealth();
    if (res.online) {
      elCloudStatusBadge.className = 'badge-status cloud-online';
      if (elCloudStatusText) elCloudStatusText.textContent = '🟢 Nuvem Conectada';
    } else {
      elCloudStatusBadge.className = 'badge-status cloud-offline';
      if (elCloudStatusText) elCloudStatusText.textContent = '🔴 Nuvem Offline';
    }
  }

  // Trava de Categoria Única (Edital V7)
  function applyCategoryLock() {
    const isCatUnica = !!window.REGRAS_TORNEIO?.categoriaUnica;
    const nomeCat = window.REGRAS_TORNEIO?.nomeCategoriaUnica || 'Categoria Única';
    if (isCatUnica) {
      if (selectTeamCategory) {
        selectTeamCategory.innerHTML = `<option value="${nomeCat}" selected>🏆 ${nomeCat} (Edital V7)</option>`;
        selectTeamCategory.disabled = true;
        selectTeamCategory.title = 'Categoria Única bloqueada pelo Edital V7';
      }
      if (adminEditTeamCategory) {
        adminEditTeamCategory.innerHTML = `<option value="${nomeCat}" selected>🏆 ${nomeCat} (Edital V7)</option>`;
        adminEditTeamCategory.disabled = true;
        adminEditTeamCategory.title = 'Categoria Única bloqueada pelo Edital V7';
      }
    }
  }

  // Inicialização
  applyCategoryLock();
  renderTeamsTable();
  updateStats();
  checkCloud();
  setInterval(checkCloud, 15000);
});

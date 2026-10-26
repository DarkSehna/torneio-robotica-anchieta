/**
 * Torneio de Robótica Anchieta - Painel Administrativo e Gestão de Dados
 */

document.addEventListener('DOMContentLoaded', async () => {
  await window.teamsManager.load();

  // Elementos do DOM
  const elCloudStatusBadge = document.getElementById('cloudStatusBadge');
  const elCloudStatusText = document.getElementById('cloudStatusText');

  const statTotalTeams = document.getElementById('statTotalTeams');
  const statTotalRounds = document.getElementById('statTotalRounds');
  const statSyncedRounds = document.getElementById('statSyncedRounds');
  const teamCountBadge = document.getElementById('teamCountBadge');

  const formAddTeam = document.getElementById('formAddTeam');
  const inputTeamId = document.getElementById('inputTeamId');
  const inputTeamName = document.getElementById('inputTeamName');
  const inputTeamSchool = document.getElementById('inputTeamSchool');
  const selectTeamCategory = document.getElementById('selectTeamCategory');

  const adminTeamSearch = document.getElementById('adminTeamSearch');
  const adminTeamsTableBody = document.getElementById('adminTeamsTableBody');

  const btnExportTeamsJSON = document.getElementById('btnExportTeamsJSON');
  const inputFileImportTeams = document.getElementById('inputFileImportTeams');

  const btnResetRoundsOnly = document.getElementById('btnResetRoundsOnly');
  const btnResetAllDefaults = document.getElementById('btnResetAllDefaults');

  // Atualizar Estatísticas do Torneio
  function updateStats() {
    const teams = window.teamsManager.getAll();
    statTotalTeams.textContent = teams.length;
    teamCountBadge.textContent = teams.length;

    const rawRecords = localStorage.getItem('torneio_anchieta_records');
    let records = [];
    try {
      records = rawRecords ? JSON.parse(rawRecords) : [];
    } catch {
      records = [];
    }

    statTotalRounds.textContent = records.length;
    const synced = records.filter(r => r.synced).length;
    statSyncedRounds.textContent = synced;
  }

  // Renderizar Tabela de Equipes
  function renderTeamsTable() {
    const query = adminTeamSearch.value.trim().toLowerCase();
    const teams = window.teamsManager.getAll().filter(t => {
      return !query || t.name.toLowerCase().includes(query) || t.school.toLowerCase().includes(query) || t.id.toLowerCase().includes(query);
    });

    adminTeamsTableBody.innerHTML = '';

    if (teams.length === 0) {
      adminTeamsTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">
            Nenhuma equipe encontrada com os filtros atuais.
          </td>
        </tr>
      `;
      return;
    }

    teams.forEach(t => {
      const tr = document.createElement('tr');
      const isLego = t.category.includes('LEGO');
      const catBadge = isLego 
        ? '<span style="background: var(--color-accent-subtle); color: var(--color-accent); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 800;">LEGO</span>'
        : '<span style="background: rgba(0,43,73,0.1); color: var(--color-primary); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 800;">MAKER</span>';

      tr.innerHTML = `
        <td><strong>${t.id}</strong></td>
        <td><strong>${t.name}</strong></td>
        <td>${t.school}</td>
        <td>${catBadge}</td>
        <td style="text-align: right;">
          <button type="button" class="btn-del-team" data-id="${t.id}">
            🗑️ Excluir
          </button>
        </td>
      `;

      tr.querySelector('.btn-del-team').addEventListener('click', () => {
        deleteTeam(t.id, t.name);
      });

      adminTeamsTableBody.appendChild(tr);
    });
  }

  // Cadastrar Nova Equipe
  formAddTeam.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = inputTeamName.value.trim();
    const school = inputTeamSchool.value.trim();
    const category = selectTeamCategory.value;
    const customId = inputTeamId.value.trim();

    if (!name || !school) return;

    const newTeam = window.teamsManager.addTeam({
      id: customId || undefined,
      name,
      school,
      category
    });

    // Envia para a API Cloudflare D1
    if (window.cloudAPI) {
      window.cloudAPI.salvarEquipes({
        equipe: newTeam.name,
        escola: newTeam.school,
        categoria: newTeam.category
      }).then(res => {
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

  // Puxar Equipes do Cloudflare D1
  const btnFetchCloudTeams = document.getElementById('btnFetchCloudTeams');
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
            // Deduplica estritamente as equipes da nuvem
            const mapped = cloudTeams.map((t, idx) => ({
              id: t.id ? `EQ-${String(t.id).padStart(2, '0')}` : `EQ-${String(idx + 1).padStart(2, '0')}`,
              name: t.equipe || t.name,
              school: t.escola || t.school || "Colégio Anchieta",
              category: t.categoria || t.category || "LEGO / Educacional"
            }));
            const deduplicated = window.teamsManager.deduplicate(mapped);
            window.teamsManager.teams = deduplicated;
            window.teamsManager.saveCache();
            renderTeamsTable();
            updateStats();
            alert(`Sucesso! ${deduplicated.length} equipes foram sincronizadas da nuvem (duplicatas filtradas).`);
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

  // Subir Equipes Locais para o Cloudflare D1 (Evita duplicatas no banco SQL)
  const btnPushCloudTeams = document.getElementById('btnPushCloudTeams');
  if (btnPushCloudTeams) {
    btnPushCloudTeams.addEventListener('click', async () => {
      const teams = window.teamsManager.getAll();
      if (teams.length === 0) return alert('Nenhuma equipe local para enviar.');

      btnPushCloudTeams.innerHTML = '⏳ Enviando...';
      btnPushCloudTeams.disabled = true;

      try {
        // Consulta equipes já existentes no Cloudflare D1 para não reenviar as mesmas
        const cloudTeams = await window.cloudAPI.getEquipes();
        const existingNames = new Set((cloudTeams || []).map(t => (t.equipe || t.name || '').trim().toLowerCase()));

        // Filtra apenas as equipes novas que ainda não estão no D1
        const novidades = teams.filter(t => !existingNames.has(t.name.trim().toLowerCase()));

        if (novidades.length === 0) {
          alert('Todas as equipes locais já estão cadastradas no Cloudflare D1. Nenhuma duplicata foi gerada.');
        } else {
          const res = await window.cloudAPI.salvarEquipes(novidades);
          if (res && res.ok) {
            alert(`Sucesso! ${novidades.length} nova(s) equipe(s) foram inserida(s) no Cloudflare D1.`);
          } else {
            alert('Erro ao enviar equipes para o Cloudflare D1: ' + (res?.error || res?.data?.error || 'Erro desconhecido'));
          }
        }
      } catch (err) {
        alert('Erro de rede: ' + err.message);
      } finally {
        btnPushCloudTeams.innerHTML = '☁️ Subir para Nuvem';
        btnPushCloudTeams.disabled = false;
      }
    });
  }

  // Excluir Equipe
  async function deleteTeam(id, name) {
    if (!confirm(`Tem certeza de que deseja remover a equipe "${name}" (${id}) do torneio?`)) {
      return;
    }

    // 1. Remove do cache local
    window.teamsManager.removeTeam(id);
    window.teamsManager.removeTeam(name);
    renderTeamsTable();
    updateStats();

    // 2. Remove do Cloudflare D1
    if (window.cloudAPI) {
      try {
        const res = await window.cloudAPI.excluirEquipe(name);
        if (res && res.ok) {
          console.log(`Equipe ${name} excluída também no Cloudflare D1.`);
        }
      } catch (err) {
        console.warn('Erro ao excluir no Cloudflare D1:', err);
      }
    }
  }

  // Filtro de Busca
  adminTeamSearch.addEventListener('input', () => {
    renderTeamsTable();
  });

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

  // Importar Equipes de Arquivo JSON
  inputFileImportTeams.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          window.teamsManager.teams = imported;
          window.teamsManager.saveCache();
          renderTeamsTable();
          updateStats();
          alert(`Sucesso! ${imported.length} equipes foram importadas.`);
        } else {
          alert('Arquivo JSON inválido. O formato deve ser uma lista de equipes.');
        }
      } catch (err) {
        alert('Erro ao ler arquivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  const btnResetEvalsOnly = document.getElementById('btnResetEvalsOnly');
  const btnResetTeamsOnly = document.getElementById('btnResetTeamsOnly');

  // 1. Limpar Apenas Voltas da Pista (Local & Nuvem D1)
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

  // 2. Limpar Apenas Avaliações de Paddock (Local & Nuvem D1)
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

  // 3. Limpar Todas as Equipes (Local & Nuvem D1)
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

  // 4. Reset Geral do Torneio (Zerar Tudo: Pista + Paddock + Equipes)
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

  // Inicialização
  renderTeamsTable();
  updateStats();
  checkCloud();
  setInterval(checkCloud, 15000);
});

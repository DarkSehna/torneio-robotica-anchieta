/**
 * ============================================================================
 * ARQUIVO CENTRAL DE CONFIGURAÇÃO DE REGRAS E RUBRICAS (SINGLE SOURCE OF TRUTH)
 * Torneio de Robótica — Colégio Anchieta
 * ============================================================================
 *
 * COMO ALTERAR PARA EDIÇÕES FUTURAS DO TORNEIO:
 * ----------------------------------------------------------------------------
 * 1. `edicao`: Altere o nome, data ou número do Edital para atualizar os
 *    títulos e cabeçalhos exibidos no sistema.
 *
 * 2. `escalaNotas`: Define os botões que aparecem no celular dos Juízes de
 *    Paddock (paddock/index.html) e os valores numéricos salvos no banco D1.
 *    - Você pode alterar os textos (`nivel`, `rotulo`, `subtitulo`) ou os
 *      pesos numéricos (`valor`: ex. 1.0, 2.0, 3.0 ou 1, 3, 5).
 *    - O item marcado com `destaqueMaximo: true` (ou o de maior `valor`) será
 *      contabilizado automaticamente no critério de desempate "MAIOR_CONTAGEM_DESTAQUE".
 *
 * 3. `criteriosPaddock`: Lista dos prêmios/rubricas avaliados nos boxes.
 *    - `id`: Identificador único (mantém compatibilidade com as colunas do Cloudflare D1).
 *    - `peso`: Multiplicador de peso da rubrica no cálculo da média ponderada
 *      (padrão: 1.0 para peso igual entre juízes/critérios; ex: 1.5 para dar 50% mais peso).
 *    - `ordemCerimonia`: Define a ordem em que o troféu aparece no roteiro da
 *      Mesa de Cerimônia do Pódio (1º ao 5º troféu).
 *
 * 4. `regrasDesempate`: Define a sequência exata de critérios automáticos que
 *    o motor de apuração executa caso duas equipes empatem na nota da rubrica.
 *    Opções suportadas no array `ordem`:
 *      - "MENOR_TEMPO_PISTA"          -> Menor tempo líquido na melhor volta válida
 *      - "MENOR_FALTAS_MELHOR_VOLTA"  -> Menor nº de infrações na melhor volta
 *      - "MAIOR_DELTA_EVOLUCAO"       -> Maior evolução do Round 1 para o Round 2
 *      - "MENOR_FALTAS_R2"            -> Menor nº de infrações no Round 2
 *      - "MAIOR_CONTAGEM_DESTAQUE"    -> Maior quantidade de notas máximas (Superado ★)
 *      - "MENOR_TOTAL_FALTAS"         -> Menor soma de faltas acumuladas (R1 + R2)
 *      - "VOTO_MINERVA"               -> Sinaliza deliberação manual da comissão se persistir empate
 * ============================================================================
 */

const REGRAS_TORNEIO = {
  // 1. Identificação da Edição Atual (Edital V5 - CIPARE)
  edicao: "1º Torneio Escolar de Robótica – Etapa Colégio Anchieta",
  subtituloEdicao: "Edital V5 (CIPARE) • 05/12/2026 (14h às 18h)",
  dataEvento: "05/12/2026",
  horarioEvento: "14h às 18h",
  modalidade: "Seguidor de Linha",
  categoriaUnica: true,          // [Edital V5] Quando true, unifica premiação/pódio e bloqueia divisão LEGO vs Maker
  nomeCategoriaUnica: "Categoria Única",

  // 2. Regras Físicas de Pista (Art. 7º e Art. 8º)
  regrasPista: {
    tempoMaximoMs: 180000,         // 180 segundos (3 minutos)
    alertaFinalMs: 150000,         // Alerta sonoro aos 2m30s (faltando 30s)
    limiteFaltasDNF: 5,            // 5ª falta = Desclassificação da volta (DNF)
    toleranciaReposicionamentos: 4,
    pesoFaltaDeltaEvolucao: 5.0    // Cada falta reduzida no R2 equivale a +5.0 pts no Δevolução
  },

  // 3. Escala Qualitativa e Numérica de Notas dos Juízes de Paddock
  escalaNotas: [
    {
      nivel: "Básico",
      rotulo: "Em Desenvolvimento",
      subtitulo: "Básico (1)",
      badgeTexto: "Em Desenv. (1)",
      classeCss: "status-1",
      corHex: "#92400E",
      chipResumo: "1",
      valor: 1.0,
      destaqueMaximo: false
    },
    {
      nivel: "Atende",
      rotulo: "Desenvolvido",
      subtitulo: "Atende (2)",
      badgeTexto: "Desenvolvido (2)",
      classeCss: "status-2",
      corHex: "#002B49",
      chipResumo: "2",
      valor: 2.0,
      destaqueMaximo: false
    },
    {
      nivel: "Destaque",
      rotulo: "Superado ★",
      subtitulo: "Destaque! (3)",
      badgeTexto: "Superado ★ (3)",
      classeCss: "status-3",
      corHex: "#F26522",
      chipResumo: "3★",
      valor: 3.0,
      destaqueMaximo: true
    }
  ],

  // 4. Critérios Oficiais de Avaliação de Bancada (Paddock - Art. 9º)
  // Nota: `id` e `colunaLegadaDb` preservam 100% de compatibilidade com o Cloudflare D1 existente.
  criteriosPaddock: [
    {
      id: "caracterizacao",
      ativo: true,
      colunaLegadaDb: "nota_caracterizacao",
      premio: "Melhor Caracterização do Robô (Carro)",
      nomeExibicao: "🤖 1. Melhor Caracterização do Robô (Carro)",
      icone: "🤖",
      peso: 1.0,
      ordemFormulario: 1,
      ordemCerimonia: 3,
      resumoCurto: "Caracterização visual, estética temática e acabamento criativo do robô (Art. 9º, III).",
      descricao: "O robô apresenta acabamento visual criativo, estética temática bem desenvolvida e cuidado no acabamento do protótipo/carro?"
    },
    {
      id: "caracterizacao_equipe",
      ativo: true,
      colunaLegadaDb: "nota_caracterizacao_equipe",
      premio: "Melhor Caracterização da Equipe",
      nomeExibicao: "🎭 2. Melhor Caracterização da Equipe",
      icone: "🎭",
      peso: 1.0,
      ordemFormulario: 2,
      ordemCerimonia: 4,
      resumoCurto: "Caracterização pessoal, fantasia ou temática criativa dos alunos (Art. 9º, II).",
      descricao: "A equipe apresenta caracterização pessoal, fantasia, uniforme temático ou identidade criativa marcante entre seus integrantes?"
    },
    {
      id: "mecanica",
      ativo: true,
      colunaLegadaDb: "nota_mecanica",
      premio: "Melhor Mecânica",
      nomeExibicao: "⚙️ 3. Melhor Mecânica",
      icone: "⚙️",
      peso: 1.0,
      ordemFormulario: 3,
      ordemCerimonia: 1,
      resumoCurto: "Estrutura robusta, acabamento técnico e eficiência mecânica (Art. 9º, IV).",
      descricao: "A equipe apresenta a melhor estrutura, acabamento técnico de montagem e eficiência no projeto mecânico do robô?"
    },
    {
      id: "superacao",
      ativo: true,
      colunaLegadaDb: "voto_superacao",
      premio: "Prêmio Superação",
      nomeExibicao: "🚀 4. Prêmio Superação",
      icone: "🚀",
      peso: 1.0,
      ordemFormulario: 4,
      ordemCerimonia: 2,
      resumoCurto: "Resiliência e persistência diante de adversidades técnicas (Art. 9º, V).",
      descricao: "A equipe demonstrou grande resiliência e persistência técnica, superando falhas e evoluindo durante a competição?"
    },
    {
      id: "torcida",
      ativo: false, // [2026] Ocultado nesta edição conforme Art. 9º do Edital V5. Altere para true para reativar no futuro.
      colunaLegadaDb: "nota_torcida",
      premio: "Melhor Torcida",
      nomeExibicao: "📣 5. Melhor Torcida",
      icone: "📣",
      peso: 1.0,
      ordemFormulario: 5,
      ordemCerimonia: 5,
      resumoCurto: "Escola com torcida vibrante, barulhenta, com identidade visual própria e respeitosa.",
      descricao: "A escola levou uma torcida vibrante, barulhenta, com identidade visual própria e que respeitou as demais equipes?"
    },
    {
      id: "fair_play",
      ativo: true,
      colunaLegadaDb: "voto_fair_play",
      premio: "Prêmio Fair Play",
      nomeExibicao: "🤝 6. Prêmio Fair Play (Jogo Limpo)",
      icone: "🤝",
      peso: 1.0,
      ordemFormulario: 6,
      ordemCerimonia: 6,
      resumoCurto: "Postura colaborativa auxiliando equipes adversárias (Art. 9º, VI).",
      descricao: "A equipe demonstrou postura colaborativa e espírito esportivo, auxiliando outras equipes na solução de problemas?"
    }
  ],

  // 5. Matriz Oficial de Desempate por Categoria (Padronizada - Edital V5 / Opção A)
  // TODAS as categorias de Paddock agora seguem a regra padronizada:
  // 1º Menor Tempo de Pista ➔ 2º Menor Faltas na Melhor Volta ➔ 3º Voto de Minerva
  regrasDesempate: {
    // Velocidade na Pista Principal
    pista: {
      descricaoRotulo: "1º Menor Tempo Líquido ➔ 2º Menor Faltas ➔ 3º Segunda Volta",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "MENOR_SEGUNDO_TEMPO_PISTA"]
    },
    // Rubricas de Paddock — Regra Única Padronizada
    mecanica: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
      // Histórico de opções anteriores: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
    },
    superacao: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
      // Histórico de opções anteriores: ["MAIOR_DELTA_EVOLUCAO", "MENOR_FALTAS_R2", "VOTO_MINERVA"]
    },
    caracterizacao: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
      // Histórico de opções anteriores: ["MAIOR_CONTAGEM_DESTAQUE", "VOTO_MINERVA"]
    },
    caracterizacao_equipe: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
      // Histórico de opções anteriores: ["MAIOR_CONTAGEM_DESTAQUE", "VOTO_MINERVA"]
    },
    torcida: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
      // Histórico de opções anteriores: ["MAIOR_CONTAGEM_DESTAQUE", "VOTO_MINERVA"]
    },
    fair_play: {
      descricaoRotulo: "1º Menor Tempo de Pista ➔ 2º Menor Faltas ➔ 3º Voto de Minerva",
      ordem: ["MENOR_TEMPO_PISTA", "MENOR_FALTAS_MELHOR_VOLTA", "VOTO_MINERVA"]
      // Histórico de opções anteriores: ["MENOR_TOTAL_FALTAS", "VOTO_MINERVA"]
    }
  },

  // 6. Parametrização do Circuito Intercolegial Anual (Escala 100 Pontos/Etapa)
  circuitoAnual: {
    escalaPontosPista: [50, 42, 36, 31, 27, 24, 21, 18, 15, 12],
    pontosPistaDemaisValidos: 10,
    pontosPistaParticipacaoDNF: 5,
    multiplicadorSomaRubricasPaddock: 3.0, // Soma das 5 médias (máx 15.0) * 3.0 = 45.0 pts
    bonusTrofeuEtapa: 5.0
  },

  // ==========================================================================
  // FUNÇÕES UTILITÁRIAS COMPARTILHADAS (FRONTEND & BACKEND WORKER)
  // ==========================================================================

  /**
   * Retorna apenas os critérios oficiais que estão ativos na edição atual
   */
  getCriteriosAtivos() {
    return (this.criteriosPaddock || []).filter(c => c.ativo !== false);
  },

  /**
   * Retorna o maior valor numérico configurado na escala de notas (ex: 3.0)
   */
  getValorDestaqueMaximo() {
    const dest = this.escalaNotas.find(n => n.destaqueMaximo);
    if (dest) return Number(dest.valor);
    return Math.max(...this.escalaNotas.map(n => Number(n.valor)));
  },

  /**
   * Valida se uma nota submetida pertence à escala oficial (ou retorna o valor válido mais próximo)
   */
  validarNota(valorBruto) {
    const num = Number(valorBruto);
    if (Number.isNaN(num)) return null;
    const valoresAceitos = this.escalaNotas.map(n => Number(n.valor));
    if (valoresAceitos.includes(num)) return num;
    return null;
  },

  /**
   * Extrai a nota de um registro de avaliação (compatível com formato canônico e colunas legadas do D1)
   */
  extrairNotaDeRegistro(registro, criterioId) {
    if (!registro) return 0;
    const crit = this.criteriosPaddock.find(c => c.id === criterioId);
    const valDireto = registro[criterioId] ?? (crit ? registro[crit.colunaLegadaDb] : undefined) ?? registro[`nota_${criterioId}`];
    if (valDireto !== undefined && valDireto !== null) {
      return Number(valDireto) || 0;
    }
    // Compatibilidade com votos booleanos antigos (voto_superacao / voto_fair_play)
    if (registro[`voto_${criterioId}`] !== undefined) {
      return registro[`voto_${criterioId}`] ? this.getValorDestaqueMaximo() : this.escalaNotas[1]?.valor || 2.0;
    }
    return 0;
  },

  /**
   * Calcula a média ponderada e estatísticas de um critério para uma equipe
   */
  calcularEstatisticaCriterio(avaliacoesEquipe, criterioId) {
    const crit = this.criteriosPaddock.find(c => c.id === criterioId);
    const peso = crit ? Number(crit.peso || 1.0) : 1.0;
    const valorMax = this.getValorDestaqueMaximo();

    const scores = (avaliacoesEquipe || [])
      .map(ev => this.extrairNotaDeRegistro(ev, criterioId))
      .filter(s => s > 0);

    const sum = scores.reduce((a, b) => a + b, 0);
    const mediaSimples = scores.length > 0 ? sum / scores.length : 0;
    const mediaPonderada = Number((mediaSimples * peso).toFixed(2));
    const countMax = scores.filter(s => s === valorMax).length;

    return {
      avg: mediaPonderada,
      rawAvg: Number(mediaSimples.toFixed(2)),
      peso,
      scores,
      count3: countMax,
      countMax
    };
  },

  /**
   * Executa a comparação determinística entre dois candidatos de Pista (`a` e `b`)
   * consumindo a sequência parametrizada em `regrasDesempate.pista.ordem`.
   */
  compararCandidatosPista(a, b) {
    const ordem = this.regrasDesempate.pista?.ordem || [
      "MENOR_TEMPO_PISTA",
      "MENOR_FALTAS_MELHOR_VOLTA",
      "MENOR_SEGUNDO_TEMPO_PISTA"
    ];

    for (const regra of ordem) {
      if (regra === "MENOR_TEMPO_PISTA") {
        if (a.track.bestTimeMs !== b.track.bestTimeMs) {
          return a.track.bestTimeMs - b.track.bestTimeMs;
        }
      } else if (regra === "MENOR_FALTAS_MELHOR_VOLTA") {
        if (a.track.bestTimeFouls !== b.track.bestTimeFouls) {
          return a.track.bestTimeFouls - b.track.bestTimeFouls;
        }
      } else if (regra === "MENOR_SEGUNDO_TEMPO_PISTA") {
        if (a.track.secondTimeMs !== b.track.secondTimeMs) {
          return a.track.secondTimeMs - b.track.secondTimeMs;
        }
      }
    }
    return 0;
  },

  /**
   * Executa a comparação determinística entre dois candidatos (`a` e `b`) para um critério de Paddock
   * Retorna < 0 se `a` vence, > 0 se `b` vence, ou 0 se houver empate técnico residual (Voto de Minerva)
   */
  compararCandidatosRubrica(criterioId, a, b) {
    const statA = a.rubrics?.[criterioId] || { avg: 0, count3: 0 };
    const statB = b.rubrics?.[criterioId] || { avg: 0, count3: 0 };

    // 1. Critério Primário: Maior média ponderada na rubrica
    if (statB.avg !== statA.avg) {
      return statB.avg - statA.avg;
    }

    // 2. Sequência de Desempate parametrizada em `regrasDesempate`
    const configDesempate = this.regrasDesempate[criterioId];
    const ordem = configDesempate?.ordem || [];

    for (const regra of ordem) {
      if (regra === "MENOR_TEMPO_PISTA") {
        if (a.track.bestTimeMs !== b.track.bestTimeMs) {
          return a.track.bestTimeMs - b.track.bestTimeMs;
        }
      } else if (regra === "MENOR_FALTAS_MELHOR_VOLTA") {
        if (a.track.bestTimeFouls !== b.track.bestTimeFouls) {
          return a.track.bestTimeFouls - b.track.bestTimeFouls;
        }
      } else if (regra === "MENOR_SEGUNDO_TEMPO_PISTA") {
        if (a.track.secondTimeMs !== b.track.secondTimeMs) {
          return a.track.secondTimeMs - b.track.secondTimeMs;
        }
      } else if (regra === "MAIOR_DELTA_EVOLUCAO") {
        if (b.track.deltaEvolucao !== a.track.deltaEvolucao) {
          return b.track.deltaEvolucao - a.track.deltaEvolucao;
        }
      } else if (regra === "MENOR_FALTAS_R2") {
        if (a.track.r2Fouls !== b.track.r2Fouls) {
          return a.track.r2Fouls - b.track.r2Fouls;
        }
      } else if (regra === "MAIOR_CONTAGEM_DESTAQUE") {
        const cA = statA.countMax ?? statA.count3 ?? 0;
        const cB = statB.countMax ?? statB.count3 ?? 0;
        if (cB !== cA) {
          return cB - cA;
        }
      } else if (regra === "MENOR_TOTAL_FALTAS") {
        if (a.track.totalFaltas !== b.track.totalFaltas) {
          return a.track.totalFaltas - b.track.totalFaltas;
        }
      } else if (regra === "VOTO_MINERVA") {
        return 0;
      }
    }

    return 0;
  },

  /**
   * Gera texto explicativo do critério de desempate para exibição nos cards de auditoria e no telão
   */
  explicarDesempateRubrica(criterioId, item, formatMsFn) {
    const configDesempate = this.regrasDesempate[criterioId];
    const primeiraRegra = configDesempate?.ordem?.[0];
    const fmt = typeof formatMsFn === "function" ? formatMsFn : (ms => `${ms}ms`);

    if (primeiraRegra === "MENOR_TEMPO_PISTA") {
      return item.track?.hasValidRun
        ? `Melhor Volta: ${fmt(item.track.bestTimeMs)} (${item.track.bestTimeFouls} faltas)`
        : "Avaliação de Bancada";
    }
    if (primeiraRegra === "MAIOR_DELTA_EVOLUCAO") {
      const delta = item.track?.deltaEvolucao || 0;
      return `Índice Δevolução: ${delta > 0 ? "+" : ""}${delta} pts`;
    }
    if (primeiraRegra === "MAIOR_CONTAGEM_DESTAQUE") {
      const rotuloMax = this.escalaNotas.find(n => n.destaqueMaximo)?.rotulo || "Destaque ★";
      const qtd = item.rubrics?.[criterioId]?.count3 || 0;
      return `${qtd} voto(s) ${rotuloMax}`;
    }
    if (primeiraRegra === "MENOR_TOTAL_FALTAS") {
      return `Faltas totais na pista: ${item.track?.totalFaltas ?? 0}`;
    }
    return "Média Ponderada Oficial";
  }
};

// Exportação Universal: Navegador (window.REGRAS_TORNEIO) e CommonJS / Node / Bundlers
if (typeof window !== "undefined") {
  window.REGRAS_TORNEIO = REGRAS_TORNEIO;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { REGRAS_TORNEIO };
}

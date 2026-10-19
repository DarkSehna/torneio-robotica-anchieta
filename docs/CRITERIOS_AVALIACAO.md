Critérios Oficiais de Avaliação, Rubricas e Algoritmo de Desempate

Torneio de Robótica Anchieta 2026 • Modalidade Seguidor de Linha



1. Apresentação e Justificativa da Metodologia

O presente documento normatiza os critérios técnicos, a modelagem matemática das rubricas avaliativas e as regras automáticas de desempate para as Premiações Especiais da etapa inaugural do Torneio de Robótica do Colégio Anchieta (05 de dezembro de 2026), em consonância com o Edital Geral nº 08/2026 e a Ficha Única de Rubricas de Avaliação dos Juízes de Paddock.



A adoção de uma escala qualitativa de 3 níveis (Em Desenvolvimento, Desenvolvido e Superado) atende a um propósito pedagógico e operacional indispensável: permitir que os juízes de bancada realizem avaliações ágeis, focadas e objetivas nos boxes durante o curto intervalo entre os rounds de pista. Para superar a inevitável limitação matemática de múltiplos empates inerente a uma escala de 3 pontos, o sistema de apuração incorpora regras determinísticas de desempate vinculadas à performance física dos robôs na pista e à deliberação colegiada da comissão organizadora.





2. Modelagem Matemática das Rubricas

No banco de dados Cloudflare D1 e no backend da API (torneio-api), os níveis qualitativos assinalados pelos juízes no aplicativo mobile (juizes.html) são convertidos imediatamente em valores numéricos discretos:



Nível Avaliado

Classificação Pedagógica

Peso Numérico

Descrição Operacional

Em Desenvolvimento

Básico

1.0

Atende de forma inicial ou parcial ao critério central estabelecido.

Desenvolvido

Atende

2.0

Atende com solidez, boa execução e conformidade ao critério central.

Superado ★

Destaque!

3.0

Demonstra excelência superior, criatividade marcante ou refinamento exemplar.

Fórmula da Nota Base

A pontuação base de cada equipe $E$ para determinada premiação $P$ é calculada pela média aritmética simples das notas individuais atribuídas por todos os juízes que avaliaram aquela equipe:



$$N_{base}(E, P) = \frac{\sum_{j=1}^{n} Nota_j(E, P)}{n}$$



Exemplo: Com 2 juízes avaliando, se o Juiz A atribuir Superado (3.0) e o Juiz B atribuir Desenvolvido (2.0), a nota consolidada será 2.50.





3. Tabela Geral de Critérios Centrais e Regras de Desempate

Caso duas ou mais equipes alcancem a mesma pontuação média máxima em qualquer categoria de premiação especial, o motor de apuração automatizado executa sequencialmente a seguinte matriz oficial de decisão:



Prêmio Oficial

Critério Central Avaliado na Bancada

Critério Primário

1º Critério de Desempate (Pista / Objetivo)

2º Critério de Desempate (Pista / Conselho)

Melhor Mecânica

Robô robusto, firme, sem peças soltas, com bom acabamento estético e montagem eficiente.

Maior média na rubrica

Menor tempo oficial de pista (Melhor volta entre Round 1 e Round 2)

Menor número de faltas / reposicionamentos na melhor volta

Prêmio Superação

Resiliência técnica comprovada, contornando falhas técnicas (código/mecânica) com evolução evidente.

Maior média na rubrica

Maior delta de evolução na pista ($\Delta_{evolução}$ entre Round 1 e Round 2)

Menor número de faltas no Round 2 oficial

Melhor Caracterização

Equipe com temática criativa (fantasia, mascote, uniforme) alinhada ao robô e demonstrando animação.

Maior média na rubrica

Maior contagem de votos "Superado" (3.0) entre os juízes

Deliberação do Juiz-Chefe (baseado nas Observações registradas)

Melhor Torcida

Escola com torcida vibrante, barulhenta, com identidade visual própria e respeitosa com os adversários.

Maior média na rubrica

Maior contagem de votos "Superado" (3.0) entre os juízes

Voto de Minerva da Comissão Organizadora

Prêmio Fair Play

Postura colaborativa, auxílio a outras equipes (peças/dicas), atitude positiva e respeito às regras.

Maior média na rubrica

Menor número total acumulado de faltas na pista (Rounds 1 + 2)

Deliberação da Comissão (baseado nas Observações dos juízes)





4. Detalhamento Algorítmico do Motor de Apuração (apuracao.html)

A tela de Apuração e Auditoria consumirá o endpoint GET /api/apuracao executando o seguinte pipeline de processamento:



Agrupamento & Consolidação: Agrupa todas as submissões válidas vinculadas ao equipe_id registradas na tabela avaliacoes_juizes.

Cálculo da Média Ponderada: Gera o score $N_{base}$ com precisão de 2 casas decimais.

Aplicação dos Critérios Automáticos de Pista:

Para Melhor Mecânica: Consulta a tabela corridas_pista, extrai a melhor volta válida de cada equipe empatada e concede a liderança à de menor tempo em milissegundos.

Para Prêmio Superação: Calcula o índice $\Delta_{evolução} = (\text{Tempo}{R1} - \text{Tempo}{R2}) + (\text{Faltas}{R1} - \text{Faltas}{R2}) \times 5.0$. A equipe com maior índice positivo (maior recuperação) assume a liderança.

Para Fair Play: Bonifica a equipe que menos cometeu infrações operacionais na pista de velocidade.

Sinalização de Empate Residual (Voto de Minerva): Se mesmo após a aplicação de todos os critérios automáticos houver empate matemático exato, o sistema exibirá o badge EMPATE TÉCNICO - DELIBERAÇÃO ABERTA, abrindo na interface os comentários do campo de texto livre observacoes de cada juiz para a decisão final da comissão organizadora.





5. Dicionário de Dados do Payload (POST /api/avaliacoes)

{



  "equipe_id": "EQ-01",



  "juiz_nome": "Juiz Oficial 65",



  "caracterizacao": 3,



  "mecanica": 3,



  "superacao": 2,



  "torcida": 1,



  "fair_play": 3,



  "observacoes": "Robô com montagem exemplar e excelente postura de bancada.",



  "timestamp": "2026-12-05T10:45:00.000Z"



}
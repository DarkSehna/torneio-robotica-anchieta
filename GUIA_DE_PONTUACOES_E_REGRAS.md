# Guia Oficial de Pontuações, Paddock, Circuito e Desempates
### 1º Torneio Escolar de Robótica – Etapa Colégio Anchieta (Edital V7)

> **Para quem é este guia?**  
> Este manual foi escrito para professores, alunos, juízes, pais e operadores da mesa. Ele explica em português simples como funcionam as pontuações do sistema (arquivo `regrasTorneio.js`), como os robôs pontuam na pista de corrida, como os juízes avaliam nos boxes (Paddock), como funciona o ranking geral de 100 pontos e como desempatamos as equipes.

---

## 1. Pista de Corrida (Mesa da Arena)

A pista oficial avalia a capacidade do robô seguidor de linha de percorrer o circuito no menor tempo possível, com precisão.

### 1.1 Duas Baterias Oficiais (Rounds 1 e 2)
* Cada equipe tem direito a **duas voltas oficiais** na arena (Round 1 e Round 2).
* **Tempo limite:** O robô tem no máximo **3 minutos (180 segundos)** para completar o circuito. Se passar desse tempo, a volta é encerrada como *Tempo Esgotado*.
* **Qual tempo vale para o pódio de velocidade?**  
  Vale a **melhor volta válida** da equipe (*Best Run*).  
  *Exemplo:* Se no Round 1 a equipe fez 45 segundos e no Round 2 fez 38 segundos, o tempo oficial considerado para o pódio será **38 segundos**.

### 1.2 Infrações/Faltas e Desclassificação (DNF)
* **As faltas NÃO adicionam segundos extras no cronômetro:** Se o robô escapar da linha preta ou sair do traçado, o operador ou juiz aplica **1 Falta** e reposiciona manualmente o robô no último ponto válido da pista. Enquanto o robô é reposicionado, o cronômetro **continua correndo normalmente** (não há penalidade de +X segundos na pontuação, o próprio tempo perdido com o carrinho parado já é a punição natural).
* **Limite de reposicionamentos:** A equipe pode ter até **4 reposicionamentos** na mesma volta.
* **A 5ª falta desclassifica a volta (DNF - *Did Not Finish*):** Se o robô cometer a 5ª falta, a volta atual é imediatamente encerrada e invalidada.
* **Importante:** Ter um DNF em uma das voltas **não elimina a equipe do torneio**. Se ela tiver completado a outra volta com sucesso, ela continua concorrendo normalmente ao pódio com o tempo da volta que foi válida!

---

## 2. Avaliação nos Boxes (Paddock)

Enquanto as baterias acontecem na pista, os juízes de Paddock circulam pelos boxes entrevistando os alunos, examinando os robôs e avaliando a postura do time.

### 2.1 A Escala de Notas dos Juízes
Em cada categoria avaliada, o juiz clica em uma das 3 opções no celular ou tablet:

* **Básico (Nota 1.0) - "Em Desenvolvimento":** A equipe apresentou um trabalho inicial ou básico, com bastante espaço para evoluir.
* **Atende (Nota 2.0) - "Desenvolvido":** A equipe atendeu a todos os requisitos esperados para a idade e nível da competição.
* **Destaque! (Nota 3.0) - "Superado ★":** Trabalho fora de série! A equipe surpreendeu os juízes pela criatividade, técnica ou postura.

### 2.2 Os 5 Prêmios Oficiais de Paddock (Art. 9º do Edital V7)

1. 🤖 **Melhor Caracterização do Robô (Carro):**  
   Avalia exclusivamente o acabamento visual do carrinho, pintura, carenagem temática, criatividade na estrutura mecânica externa e cuidado nos detalhes estéticos do protótipo.
2. 🎭 **Melhor Caracterização da Equipe:**  
   Avalia a identidade visual e animação dos alunos integrantes (uniformes personalizados, camisetas temáticas, adereços, fantasias, maquiagem temática e engajamento coletivo).
3. ⚙️ **Melhor Mecânica:**  
   Avalia a montagem do robô, robustez do chassi, fixação de motores, sistema de tração, alinhamento dos sensores e organização da fiação.
4. 🚀 **Prêmio Superação:**  
   Reconhece a equipe que enfrentou problemas técnicos graves (robô quebrado, falha em sensor, perda de código) e demonstrou persistência, resiliência e foco para consertar e voltar a competir com garra.
5. 🤝 **Prêmio Fair Play (Jogo Limpo):**  
   Reconhece a postura esportiva, honestidade e espírito colaborativo nos boxes — especialmente alunos que ajudaram outras equipes emprestando ferramentas, peças ou dando apoio técnico solidário.

*(Nota: a rubrica de "Melhor Torcida" está cadastrada no sistema com status inativo, atendendo à estrutura do Edital V7).*

### 2.3 Como Chegamos na Nota Final de Cada Troféu?
Se mais de um juiz avaliar a mesma equipe, o sistema calcula a **média aritmética** das notas atribuídas. A maior nota possível em cada critério é **3.0 pontos**.

---

## 3. Regra Padronizada e Única de Desempate (Edital V7)

Para garantir máxima transparência, rapidez na cerimônia e critérios objetivos de fácil conferência pelos professores, o sistema utiliza uma **regra padrão unificada para TODOS os prêmios do torneio**:

### 3.1 Desempate no Pódio de Pista (Velocidade em Milésimos `.000`)
Se duas ou mais equipes registrarem o mesmo tempo na melhor volta:
1. **1º Critério:** Menor tempo líquido na melhor volta válida (com precisão de milésimos de segundo `.000`).
2. **2º Critério:** Menor número de faltas (infrações) nessa melhor volta.
3. **3º Critério:** Menor tempo líquido na segunda volta oficial.
4. **4º Critério:** Menor número de faltas na segunda volta oficial.
*(Caso persista empate exato após os 4 critérios no Top 3, o painel exibe um alerta de Empate Técnico na Pista para deliberação da Comissão).*

---

### 3.2 Desempate Padronizado nas Rubricas de Paddock
Se duas equipes empatarem com a mesma média de notas em qualquer uma das categorias dos boxes (**Mecânica, Superação, Caracterização do Robô, Caracterização da Equipe ou Fair Play**), o sistema segue rigorosamente a mesma ordem:

1. 🏎️ **1º Desempate — Menor Tempo de Pista:** Vence a equipe que tiver o menor tempo oficial líquido na sua melhor volta válida na arena física.
2. 🚩 **2º Desempate — Menor Número de Faltas:** Se persistir o empate de tempo até os centésimos, vence a equipe que tiver cometido o menor número de infrações na sua melhor volta.
3. ⚖️ **3º Desempate — Voto de Minerva:** Se ainda assim houver empate exato absoluto, a decisão final cabe à Comissão Técnica de Juízes, que delibera e registra o vencedor por consenso.

> **Por que essa padronização é vantajosa?**  
> Todos os participantes compreendem a regra de forma imediata: quem teve desempenho superior na pista de corrida ganha preferência no desempate de bancada, valorizando o robô que efetivamente funciona bem na prática.

---

## 4. Pontuação Geral do Circuito (Escala de 100 Pontos)

Para o campeonato anual das escolas (o Circuito Intercolegial), cada equipe acumula até **100 pontos por etapa**, divididos em 3 pilares:

```
Pontuação Total da Etapa (até 100 pontos)
├── 1. Pista de Corrida: até 50 pontos
├── 2. Avaliação de Paddock: até 45 pontos
└── 3. Bônus por Troféu Conquistado: +5 pontos
```

### 4.1 Pontos de Pista (Máximo: 50 pontos)
Quanto mais rápido o robô na melhor volta, mais pontos ele soma:

| Posição da Equipe na Pista | Pontos Conquistados |
| :--- | :---: |
| 🥇 1º Lugar | **50 pontos** |
| 🥈 2º Lugar | **42 pontos** |
| 🥉 3º Lugar | **36 pontos** |
| 4º Lugar | **31 pontos** |
| 5º Lugar | **27 pontos** |
| 6º Lugar | **24 pontos** |
| 7º Lugar | **21 pontos** |
| 8º Lugar | **18 pontos** |
| 9º Lugar | **15 pontos** |
| 10º Lugar | **12 pontos** |
| 11º lugar em diante (com volta válida) | **10 pontos** |
| Tentou correr, mas teve DNF ou Tempo Esgotado | **5 pontos** |

### 4.2 Pontos de Paddock nos Boxes (Máximo: 45 pontos)
Como são 5 critérios ativos e a nota máxima de cada um é 3.0, a soma das 5 médias pode chegar no máximo a **15.0 pontos**.  
Para equilibrar a pontuação com a pista física, o sistema multiplica essa soma por **3.0**:

> **Pontos de Paddock = (Soma das 5 médias de notas) × 3.0**

* *Exemplo nota máxima:* 3.0 em todos os 5 critérios = 15.0 × 3 = **45.0 pontos**.
* *Exemplo nota média:* 2.0 em todos os 5 critérios = 10.0 × 3 = **30.0 pontos**.

### 4.3 Bônus de Troféu da Etapa (+5 pontos extras)
Toda equipe que subir ao pódio e conquistar um troféu oficial (seja 1º, 2º ou 3º lugar na corrida, ou um dos 5 troféus dos boxes) ganha um **bônus de mérito de +5.0 pontos** na classificação geral daquela etapa.

---

## 5. Regra de Exclusividade de Troféus (1 Troféu por Equipe)

No painel de apuração do evento, há um seletor chamado **"Regra de Exclusividade"**:
* **Ligada (Padrão formativo/escolar):** Garante que uma equipe que já conquistou um troféu na corrida (1º, 2º ou 3º lugar de pista) não acumule também troféus dos boxes. O troféu de Paddock é repassado automaticamente para a próxima equipe mais bem avaliada. Assim, mais crianças, jovens e escolas são premiados e têm a oportunidade de subir ao palco!
* **Desligada (Modo puramente competitivo):** Se uma mesma equipe foi a mais veloz na pista e também a melhor avaliada nos boxes, ela pode levar múltiplos troféus para casa.

---

## 📋 Resumo Rápido

```
[MESA DA ARENA]
• 2 voltas oficiais por equipe (tempo máximo de 3 minutos).
• Até 4 reposicionamentos permitidos; na 5ª falta, volta desclassificada (DNF).
• Infrações NÃO somam segundos extras: o relógio não para durante o reposicionamento.
• Vale a melhor volta válida da equipe.

[BOXES (PADDOCK)]
• Notas: 1.0 (Em Desenvolvimento), 2.0 (Desenvolvido) e 3.0 (Superado ★).
• 5 Troféus:
  1. Melhor Caracterização do Robô (Carro)
  2. Melhor Caracterização da Equipe
  3. Melhor Mecânica
  4. Prêmio Superação
  5. Prêmio Fair Play

[DESEMPATE PADRONIZADO EM TODAS AS RUBRICAS]
• 1º Menor Tempo de Pista na melhor volta válida
• 2º Menor Número de Faltas na melhor volta válida
• 3º Voto de Minerva da Comissão Técnica

[CIRCUITO GERAL (100 PONTOS POR ETAPA)]
• Pista: vale até 50 pontos.
• Boxes: soma das 5 médias multiplicada por 3 (vale até 45 pontos).
• Campeões de troféu na etapa: +5 pontos de bônus.
```

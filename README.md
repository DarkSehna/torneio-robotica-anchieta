# Torneio de Robótica Anchieta 2026 🤖⏱️

Sistema oficial de cronometragem, penalidades e projeção de pista para o Torneio de Robótica do Colégio Anchieta (05/12/2026).

---

## 🚀 Como Executar no Notebook da Pista

Por utilizar a API nativa **BroadcastChannel**, o sistema opera **100% offline, com latência zero e sem necessidade de servidores locais instalados**:

1. Abra o arquivo `mesa-operador.html` no seu navegador (Google Chrome, Edge ou Firefox).
2. Na barra superior da mesa, clique no botão **`🖥️ Abrir Telão do Ginásio ↗`** (ou abra `telao-ginasio.html`).
3. Arraste a janela do Telão para o monitor secundário (cabo HDMI conectado ao projetor do ginásio).
4. No Telão, aperte a tecla **`F11`** (ou clique no botão **`⛶ Tela Cheia`** no canto inferior direito) para ocupar 100% da projeção sem barras do navegador.
5. Pronto! Qualquer clique ou atalho na Mesa refletirá instantaneamente no Telão.

---

## ⌨️ Atalhos Rápidos do Operador

Para agilidade sob a pressão da competição:
* **`ESPAÇO`**: Iniciar ou Pausar o cronômetro da bateria.
* **`F`** ou **`+`**: Aplicar **+1 Infração (Reposicionamento)**.
* **`U`** ou **`-`**: **Desfazer Falta (-1)** caso tenha sido computada por engano.
* **`Shift + R`**: Zerar o cronômetro com proteção contra acidentes.

---

## 📜 Regras do Edital Implementadas

* **Art. 7º (Tempo Máximo)**: Trava automática obrigatória aos **180 segundos (3 minutos)**. Ao atingir o limite, o cronômetro para e toca o sinal de tempo esgotado.
* **Art. 8º (Infrações / Reposicionamentos)**: O robô pode ter até 4 reposicionamentos. Ao atingir a **5ª infração**, o sistema encerra a volta automaticamente como **Desclassificado por Infrações (DNF)**.
* **Segurança Emocional**: O telão projeta exclusivamente a equipe que está na pista e seu desempenho atual, sem rankings ou notas de outras equipes durante a bateria.

---

## 🧱 Arquitetura e Fases do Projeto

1. **Módulo 1 (Concluído)**: Mesa do Operador (`mesa-operador.html`) e Telão do Ginásio (`telao-ginasio.html`) sincronizados via `BroadcastChannel('torneio_pista')`.
2. **Módulo 2 (Em andamento)**: Sincronização em nuvem via **Cloudflare D1** (`cloudflare/schema.sql`) para envio dos registros oficiais.
3. **Módulo 3 (Próximo)**: Interface mobile para os Juízes de Paddock (votação via 4G/Wi-Fi) e Painel de Apuração e Auditoria Geral.

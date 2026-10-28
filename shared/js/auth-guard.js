/**
 * Torneio de Robótica Anchieta 2026 — Guardião de Acesso (Proteção por Senha)
 * Protege os módulos sensíveis: Administração (/admin) e Apuração Geral (/apuracao)
 * Verificação criptográfica via Hash SHA-256 (Funciona em HTTPS, Localhost, IP Local e file://)
 */

(function () {
  const STORAGE_KEY = 'torneio_anchieta_auth_token';
  // Hash SHA-256 oficial (Padrão: "anchieta2026")
  const OFFICIAL_HASH = 'bc5b51ee053c021a926725f7f8c3ed53e5b273889899cddc0f2e6659990e4d37';

  // Implementação compacta de SHA-256 puro em JS (garante funcionamento mesmo fora de HTTPS/localhost)
  function sha256Pure(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = 'length';
    let i, j;
    let result = '';
    const words = [];
    const asciiBitLength = ascii[lengthProperty] * 8;
    let hash = sha256Pure.h = sha256Pure.h || [];
    const k = sha256Pure.k = sha256Pure.k || [];
    let primeCounter = k[lengthProperty];
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
    words[words[lengthProperty]] = asciiBitLength;
    for (j = 0; j < words[lengthProperty]; ) {
      const w = words.slice(j, (j += 16));
      const oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        const i2 = i + j;
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 =
          hash[7] +
          (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
          ((e & hash[5]) ^ (~e & hash[6])) +
          k[i] +
          (w[i] =
            i < 16
              ? w[i]
              : (w[i - 16] +
                  (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                  w[i - 7] +
                  (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                0);
        const temp2 =
          (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? 0 : '') + b.toString(16);
      }
    }
    return result;
  }

  async function computeHash(text) {
    const clean = (text || '').trim().toLowerCase();
    if (window.crypto && window.crypto.subtle) {
      try {
        const msgBuffer = new TextEncoder().encode(clean);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {}
    }
    return sha256Pure(clean);
  }

  function isAuthenticated() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === OFFICIAL_HASH;
    } catch (e) {
      return false;
    }
  }

  // Injeta CSS imediato para evitar qualquer flash de conteúdo protegido antes da senha
  const styleEl = document.createElement('style');
  styleEl.id = 'anchieta-auth-guard-styles';
  styleEl.textContent = `
    body.auth-locked > main,
    body.auth-locked > header {
      filter: blur(10px);
      pointer-events: none;
      user-select: none;
      opacity: 0.25;
      transition: filter 0.25s ease, opacity 0.25s ease;
    }
    body.auth-locked {
      overflow: hidden !important;
    }
    .auth-guard-overlay {
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at 50% 30%, rgba(0, 43, 73, 0.94) 0%, rgba(0, 18, 32, 0.98) 100%);
      backdrop-filter: blur(12px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .auth-guard-card {
      background: #FFFFFF;
      border-radius: 20px;
      padding: 36px 32px;
      max-width: 430px;
      width: 100%;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.45);
      border-top: 6px solid #F26522;
      text-align: center;
      animation: authCardPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes authCardPop {
      from { opacity: 0; transform: scale(0.94) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes authShake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-8px); }
      40%, 80% { transform: translateX(8px); }
    }
    .auth-guard-card.shake {
      animation: authShake 0.35s ease;
    }
    .auth-badge {
      display: inline-block;
      background: rgba(242, 101, 34, 0.12);
      color: #F26522;
      font-weight: 800;
      font-size: 0.74rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 5px 14px;
      border-radius: 999px;
      margin-bottom: 14px;
    }
    .auth-icon-circle {
      width: 64px;
      height: 64px;
      background: #F1F5F9;
      border: 2px solid #CBD5E1;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.85rem;
      margin: 0 auto 14px;
    }
    .auth-title {
      font-size: 1.4rem;
      font-weight: 900;
      color: #002B49;
      margin-bottom: 6px;
      line-height: 1.2;
    }
    .auth-desc {
      font-size: 0.88rem;
      color: #64748B;
      line-height: 1.45;
      margin-bottom: 22px;
    }
    .auth-input-wrap {
      position: relative;
      margin-bottom: 12px;
    }
    .auth-input {
      width: 100%;
      padding: 13px 44px 13px 16px;
      border: 2px solid #CBD5E1;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 700;
      color: #0F172A;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      font-family: inherit;
    }
    .auth-input:focus {
      border-color: #002B49;
      box-shadow: 0 0 0 3px rgba(0, 43, 73, 0.12);
    }
    .auth-input.error {
      border-color: #DC2626;
      background: #FEF2F2;
    }
    .auth-toggle-eye {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      font-size: 1.1rem;
      cursor: pointer;
      padding: 4px 6px;
      opacity: 0.65;
    }
    .auth-toggle-eye:hover {
      opacity: 1;
    }
    .auth-error-msg {
      color: #DC2626;
      font-size: 0.8rem;
      font-weight: 700;
      margin-bottom: 12px;
      min-height: 18px;
      display: none;
    }
    .auth-error-msg.visible {
      display: block;
    }
    .auth-btn-submit {
      width: 100%;
      background: #002B49;
      color: #FFFFFF;
      border: none;
      border-radius: 10px;
      padding: 14px;
      font-size: 0.95rem;
      font-weight: 800;
      cursor: pointer;
      transition: background 0.2s, transform 0.15s;
      margin-bottom: 14px;
    }
    .auth-btn-submit:hover {
      background: #0A436D;
      transform: translateY(-1px);
    }
    .auth-back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #64748B;
      font-size: 0.84rem;
      font-weight: 700;
      text-decoration: none;
      transition: color 0.2s;
    }
    .auth-back-link:hover {
      color: #002B49;
    }
    .btn-lock-session {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(239, 68, 68, 0.16);
      border: 1px solid rgba(252, 165, 165, 0.4);
      color: #FECACA;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-lock-session:hover {
      background: #DC2626;
      color: #FFFFFF;
      border-color: #DC2626;
    }
  `;
  document.head.appendChild(styleEl);

  function addLockButtonToHeader() {
    const actionsContainer = document.querySelector('.op-header-actions, .apuracao-actions');
    if (!actionsContainer || document.getElementById('btnLockSession')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnLockSession';
    btn.className = 'btn-lock-session';
    btn.title = 'Trancar painel com senha novamente';
    btn.innerHTML = '🔒 Trancar';
    btn.addEventListener('click', () => {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      window.location.reload();
    });
    actionsContainer.appendChild(btn);
  }

  function mountLockOverlay() {
    document.body.classList.add('auth-locked');

    const isApuracao = window.location.pathname.includes('apuracao');
    const moduleLabel = isApuracao ? 'Apuração Geral & Cerimônia' : 'Administração & Banco de Dados';

    const overlay = document.createElement('div');
    overlay.className = 'auth-guard-overlay';
    overlay.id = 'authGuardOverlay';
    overlay.innerHTML = `
      <div class="auth-guard-card" id="authGuardCard">
        <div class="auth-badge">Colégio Anchieta &bull; Comissão Organizadora</div>
        <div class="auth-icon-circle">🔒</div>
        <h2 class="auth-title">Acesso Restrito</h2>
        <p class="auth-desc">
          Digite a senha oficial da organização para acessar o módulo de <strong>${moduleLabel}</strong>.
        </p>

        <form id="authGuardForm" autocomplete="off">
          <div class="auth-input-wrap">
            <input
              type="password"
              id="authGuardInput"
              class="auth-input"
              placeholder="Senha da organização..."
              required
              autofocus
            />
            <button type="button" id="authToggleEye" class="auth-toggle-eye" title="Mostrar/Ocultar Senha">
              👁️
            </button>
          </div>
          <div id="authErrorMsg" class="auth-error-msg">
            ❌ Senha incorreta. Tente novamente.
          </div>
          <button type="submit" class="auth-btn-submit">
            🔓 Desbloquear Painel Oficial
          </button>
        </form>

        <a href="../index.html" class="auth-back-link">
          ← Voltar à Central do Torneio
        </a>
      </div>
    `;

    document.body.appendChild(overlay);

    const form = document.getElementById('authGuardForm');
    const input = document.getElementById('authGuardInput');
    const eyeBtn = document.getElementById('authToggleEye');
    const errorMsg = document.getElementById('authErrorMsg');
    const card = document.getElementById('authGuardCard');

    setTimeout(() => input && input.focus(), 80);

    eyeBtn.addEventListener('click', () => {
      if (input.type === 'password') {
        input.type = 'text';
        eyeBtn.textContent = '🙈';
      } else {
        input.type = 'password';
        eyeBtn.textContent = '👁️';
      }
      input.focus();
    });

    input.addEventListener('input', () => {
      input.classList.remove('error');
      errorMsg.classList.remove('visible');
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const typed = input.value;
      const hash = await computeHash(typed);

      if (hash === OFFICIAL_HASH) {
        try {
          sessionStorage.setItem(STORAGE_KEY, OFFICIAL_HASH);
        } catch (err) {}
        document.body.classList.remove('auth-locked');
        overlay.remove();
        addLockButtonToHeader();
      } else {
        input.classList.add('error');
        errorMsg.classList.add('visible');
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
        input.select();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (isAuthenticated()) {
      addLockButtonToHeader();
    } else {
      mountLockOverlay();
    }
  });
})();


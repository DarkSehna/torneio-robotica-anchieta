/**
 * Torneio de Robótica Anchieta - Motor de Cronômetro de Alta Precisão (Anti-Drift)
 * Regras do Edital: Trava obrigatória aos 180 segundos (3 minutos) - Art. 7º
 */

class PrecisionTimer {
  constructor(options = {}) {
    this.maxTimeMs = options.maxTimeMs || 180000; // 3 minutos (180s)
    this.elapsedMs = 0;
    this.status = 'STOPPED'; // 'STOPPED' | 'RUNNING' | 'PAUSED' | 'TIME_UP'
    
    this.startTime = null;
    this.animFrameId = null;
    this.lastTickTime = null;

    this.warning30sFired = false;

    this.onTick = options.onTick || (() => {});
    this.onTimeUp = options.onTimeUp || (() => {});
    this.onWarning30s = options.onWarning30s || (() => {});
  }

  start() {
    if (this.status === 'RUNNING' || this.status === 'TIME_UP') return;

    this.status = 'RUNNING';
    this.startTime = performance.now() - this.elapsedMs;
    this.lastTickTime = performance.now();

    const loop = (now) => {
      if (this.status !== 'RUNNING') return;

      this.elapsedMs = Math.min(now - this.startTime, this.maxTimeMs);

      // Alerta de 30s restantes (150s decorridos)
      if (this.elapsedMs >= 150000 && !this.warning30sFired) {
        this.warning30sFired = true;
        this.onWarning30s();
      }

      // Trava oficial de 180 segundos (Art. 7º)
      if (this.elapsedMs >= this.maxTimeMs) {
        this.elapsedMs = this.maxTimeMs;
        this.status = 'TIME_UP';
        this.onTick(this.elapsedMs, this.format(this.elapsedMs));
        this.onTimeUp();
        return;
      }

      this.onTick(this.elapsedMs, this.format(this.elapsedMs));
      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  pause() {
    if (this.status !== 'RUNNING') return;
    this.status = 'PAUSED';
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  reset() {
    this.status = 'STOPPED';
    this.elapsedMs = 0;
    this.startTime = null;
    this.warning30sFired = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.onTick(0, this.format(0));
  }

  setTime(ms) {
    this.elapsedMs = Math.min(Math.max(0, ms), this.maxTimeMs);
    this.onTick(this.elapsedMs, this.format(this.elapsedMs));
  }

  getTimeMs() {
    return Math.floor(this.elapsedMs);
  }

  format(ms = this.elapsedMs) {
    const totalCentis = Math.floor(ms / 10);
    const centis = totalCentis % 100;
    const totalSeconds = Math.floor(ms / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);

    const pad = (num, digits = 2) => String(num).padStart(digits, '0');
    return `${pad(minutes)}:${pad(seconds)}.${pad(centis)}`;
  }
}

window.PrecisionTimer = PrecisionTimer;

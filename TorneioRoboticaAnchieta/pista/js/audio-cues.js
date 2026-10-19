/**
 * Torneio de Robótica Anchieta - Web Audio API
 * Sintetizador nativo de alertas sonoros (100% offline, zero dependências externas)
 */

class AudioCueSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.25) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Erro ao reproduzir tom de áudio:', e);
    }
  }

  // Bip de início de bateria (som esportivo ascendente)
  playStart() {
    this.playTone(587.33, 'triangle', 0.1, 0.3); // D5
    setTimeout(() => this.playTone(880, 'triangle', 0.25, 0.35), 110); // A5
  }

  // Bip de pausa
  playPause() {
    this.playTone(440, 'sine', 0.12, 0.2);
    setTimeout(() => this.playTone(330, 'sine', 0.15, 0.2), 110);
  }

  // Bip de falta / infração aplicada (grave e seco)
  playFoul() {
    this.playTone(220, 'sawtooth', 0.2, 0.3);
  }

  // Alerta de 30 segundos restantes
  playWarning30s() {
    this.playTone(700, 'sine', 0.12, 0.25);
    setTimeout(() => this.playTone(700, 'sine', 0.12, 0.25), 160);
  }

  // Alarme de fim de prova (tempo esgotado 180s ou 5ª falta DNF)
  playFinishAlarm(isDNF = false) {
    if (!this.enabled) return;
    try {
      this.init();
      if (isDNF) {
        // Sequência descendente de desclassificação
        this.playTone(350, 'sawtooth', 0.2, 0.35);
        setTimeout(() => this.playTone(280, 'sawtooth', 0.25, 0.4), 220);
        setTimeout(() => this.playTone(190, 'sawtooth', 0.45, 0.45), 480);
      } else {
        // Sequência esportiva de encerramento de tempo oficial
        this.playTone(880, 'square', 0.15, 0.2);
        setTimeout(() => this.playTone(880, 'square', 0.15, 0.2), 200);
        setTimeout(() => this.playTone(1174, 'square', 0.4, 0.25), 400);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

window.audioCues = new AudioCueSystem();

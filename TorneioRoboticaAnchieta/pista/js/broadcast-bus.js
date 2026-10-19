/**
 * Torneio de Robótica Anchieta - Barramento BroadcastChannel
 * Comunicação entre Mesa do Operador e Telão do Ginásio com latência zero (100% offline)
 */

class PistaBroadcastBus {
  constructor(channelName = 'torneio_pista') {
    this.channelName = channelName;
    this.channel = null;
    this.listeners = new Map();
    this.isSupported = 'BroadcastChannel' in window;
    this.init();
  }

  init() {
    if (this.isSupported) {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event) => {
          this.handleIncoming(event.data);
        };
      } catch (err) {
        console.error('Falha ao inicializar BroadcastChannel:', err);
      }
    } else {
      console.warn('BroadcastChannel não suportado neste navegador. Utilizando fallback local.');
    }
  }

  send(type, payload = {}) {
    const message = {
      type,
      payload,
      timestamp: Date.now()
    };

    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.error('Erro ao enviar via BroadcastChannel:', err);
      }
    }
    return message;
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);
  }

  off(type, callback) {
    if (!this.listeners.has(type)) return;
    const list = this.listeners.get(type).filter(cb => cb !== callback);
    this.listeners.set(type, list);
  }

  handleIncoming(data) {
    if (!data || !data.type) return;
    const callbacks = this.listeners.get(data.type) || [];
    callbacks.forEach(cb => {
      try {
        cb(data.payload, data.timestamp);
      } catch (err) {
        console.error(`Erro ao executar callback para ${data.type}:`, err);
      }
    });

    // Notifica listeners universais "*"
    const wildcards = this.listeners.get('*') || [];
    wildcards.forEach(cb => {
      try {
        cb(data.type, data.payload, data.timestamp);
      } catch (err) {
        console.error('Erro em listener wildcard:', err);
      }
    });
  }

  close() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

window.pistaBus = new PistaBroadcastBus();

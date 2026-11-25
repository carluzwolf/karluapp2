/*
 * Ponte Web Bluetooth -> Bluetooth nativo (Capacitor).
 * O site usa navigator.bluetooth (Chrome). O WebView do Android NÃO tem isso,
 * então aqui criamos um navigator.bluetooth equivalente que fala com o
 * plugin nativo @capacitor-community/bluetooth-le. Assim o configurar.js
 * funciona no app sem nenhuma alteração.
 */
import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';

(function () {
  if (!Capacitor.isNativePlatform()) return;

  var SCAN_NAME_PREFIX = 'Starboy';
  var inited = null;

  function init() {
    if (!inited) {
      inited = BleClient.initialize({ androidNeverForLocation: true }).catch(function (e) {
        inited = null;
        throw e;
      });
    }
    return inited;
  }

  function toDataView(v) {
    if (v instanceof DataView) return v;
    if (ArrayBuffer.isView(v)) return new DataView(v.buffer, v.byteOffset, v.byteLength);
    return new DataView(v);
  }

  function domErr(name, msg) {
    var e = new Error(msg || name);
    e.name = name;
    return e;
  }

  /* ---------- Characteristic ---------- */
  class Char extends EventTarget {
    constructor(dev, svc, uuid) {
      super();
      this._dev = dev; this._svc = svc; this.uuid = uuid; this.value = null;
    }
    writeValueWithoutResponse(v) {
      return BleClient.writeWithoutResponse(this._dev.id, this._svc, this.uuid, toDataView(v));
    }
    writeValue(v) { return BleClient.write(this._dev.id, this._svc, this.uuid, toDataView(v)); }
    writeValueWithResponse(v) { return this.writeValue(v); }
    async startNotifications() {
      var self = this;
      await BleClient.startNotifications(this._dev.id, this._svc, this.uuid, function (value) {
        self.value = value;
        self.dispatchEvent(new Event('characteristicvaluechanged'));
      });
      return this;
    }
    async stopNotifications() {
      try { await BleClient.stopNotifications(this._dev.id, this._svc, this.uuid); } catch (e) {}
      return this;
    }
  }

  class Service {
    constructor(dev, uuid) { this._dev = dev; this.uuid = uuid; }
    async getCharacteristic(uuid) { return new Char(this._dev, this.uuid, String(uuid).toLowerCase()); }
  }

  /* ---------- GATT server ---------- */
  class Gatt {
    constructor(dev) { this._dev = dev; this.connected = false; }
    async connect() {
      await init();
      var self = this;
      await BleClient.connect(this._dev.id, function () { self._lost(); }, { timeout: 15000 });
      this.connected = true;
      return this;
    }
    _lost() {
      if (!this.connected) return;
      this.connected = false;
      this._dev.dispatchEvent(new Event('gattserverdisconnected'));
    }
    disconnect() {
      var self = this;
      return BleClient.disconnect(this._dev.id).catch(function () {}).then(function () { self._lost(); });
    }
    async getPrimaryService(uuid) { return new Service(this._dev, String(uuid).toLowerCase()); }
  }

  /* ---------- Device ---------- */
  class Device extends EventTarget {
    constructor(id, name) {
      super();
      this.id = id; this.name = name || 'Starboy'; this.gatt = new Gatt(this);
    }
    /* reconexão automática: espera o Karlu aparecer no scan e avisa o site */
    async watchAdvertisements() {
      var self = this, done = false;
      await init();
      function stop() { BleClient.stopLEScan().catch(function () {}); }
      await BleClient.requestLEScan({ allowDuplicates: false }, function (r) {
        if (done || !r || !r.device || r.device.deviceId !== self.id) return;
        done = true; stop();
        self.dispatchEvent(new Event('advertisementreceived'));
      });
      setTimeout(function () { if (!done) { done = true; stop(); } }, 10 * 60 * 1000);
    }
  }

  /* ---------- navigator.bluetooth ---------- */
  var bluetooth = {
    async requestDevice() {
      try {
        await init();
      } catch (e) {
        throw domErr('SecurityError', 'Permissão de Bluetooth negada ou Bluetooth desligado.');
      }
      try {
        var d = await BleClient.requestDevice({ namePrefix: SCAN_NAME_PREFIX });
        return new Device(d.deviceId, d.name);
      } catch (e) {
        throw domErr('NotFoundError', (e && e.message) || 'Nenhum dispositivo escolhido.');
      }
    },
    async getDevices() {
      var id = '';
      try { id = localStorage.getItem('karlu.dev') || ''; } catch (e) {}
      return id ? [new Device(id, 'Starboy')] : [];
    },
    async getAvailability() { try { await init(); return await BleClient.isEnabled(); } catch (e) { return false; } }
  };

  try {
    Object.defineProperty(navigator, 'bluetooth', { value: bluetooth, configurable: true });
  } catch (e) {
    navigator.bluetooth = bluetooth;
  }
  document.documentElement.classList.add('karlu-app');
})();

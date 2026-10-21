'use strict';
window.Sync = (() => {
  const K_PIN = 'midinero_pin', K_REV = 'midinero_rev', K_BASE = 'midinero_base';
  const disponible = location.protocol === 'http:' || location.protocol === 'https:';
  let rev = +(localStorage.getItem(K_REV) || 0);
  let base = null;
  try { base = JSON.parse(localStorage.getItem(K_BASE) || 'null'); } catch (e) { base = null; }
  let temporizador = null, enviando = false, otraVez = false, conectado = false, renderPendiente = false;
  let solicitudPin = null, accesoCancelado = false;
  let trayendo = false, traerPendiente = false, escuchando = false;

  const nube = !!window.MIDINERO_CLOUD;
  const pin = () => localStorage.getItem(K_PIN) || '';
  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const sinVista = s => { const { vista, ...resto } = s; return resto; };

  function ui(txt, cls) {
    const el = document.getElementById('syncEstado');
    if (el) { el.textContent = txt; el.className = 'sync ' + cls; }
  }
  const copia = o => JSON.parse(JSON.stringify(o));
  function guardarBase(estado, nuevaRev) {
    base = copia(estado); rev = nuevaRev;
    try { localStorage.setItem(K_BASE, JSON.stringify(base)); localStorage.setItem(K_REV, String(rev)); } catch (e) {}
  }

  function pedirPin(incorrecto = false) {
    if (solicitudPin) return solicitudPin;
    if (accesoCancelado) return Promise.resolve('');
    const dlg = document.getElementById('dlgPin');
    document.getElementById('formPin').reset();
    document.getElementById('pinMensaje').textContent = incorrecto
      ? 'PIN incorrecto. Revisa el PIN de tu computadora e inténtalo de nuevo.'
      : 'Introduce el PIN que aparece al iniciar Mi Dinero en tu computadora.';
    dlg.returnValue = '';
    solicitudPin = new Promise(resolve => {
      dlg.addEventListener('close', () => {
        const valor = dlg.returnValue === 'conectar' ? document.getElementById('syncPin').value.trim() : '';
        accesoCancelado = !valor;
        resolve(valor);
      }, { once: true });
      dlg.showModal();
    }).finally(() => { solicitudPin = null; });
    return solicitudPin;
  }

  async function api(metodo, ruta, cuerpo) {
    if (!nube && !pin()) {
      const p = await pedirPin();
      if (!p) throw new Error('Falta el PIN');
      localStorage.setItem(K_PIN, p);
    }
    const r = await fetch(ruta, {
      method: metodo, cache: 'no-store',
      headers: { ...(nube ? {} : { 'X-PIN': pin() }), 'X-MiDinero-Client': '1', 'Content-Type': 'application/json' },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    if (nube && (r.status === 401 || r.status === 403 || r.redirected)) {
      ui('Sesión vencida · vuelve a entrar', 'off');
      throw new Error('Vuelve a abrir la app e inicia sesión');
    }
    if (r.status === 401) {
      localStorage.removeItem(K_PIN);
      const p = await pedirPin(true);
      if (p) { localStorage.setItem(K_PIN, p); return api(metodo, ruta, cuerpo); }
      throw new Error('Falta el PIN');
    }
    const datos = await r.json().catch(() => ({}));
    return { status: r.status, datos };
  }

  const esListaConId = v => Array.isArray(v) && v.length > 0 && v.every(x => x && typeof x === 'object' && 'id' in x);
  function fusionarLista(r = [], l = [], b = []) {
    const R = new Map(r.map(x => [x.id, x])), L = new Map(l.map(x => [x.id, x])), B = new Map((b || []).map(x => [x.id, x]));
    const out = [];
    for (const id of new Set([...R.keys(), ...L.keys()])) {
      const enR = R.has(id), enL = L.has(id), enB = B.has(id);
      if (enR && enL) out.push(igual(L.get(id), B.get(id)) ? R.get(id) : L.get(id));
      else if (enL) { if (!enB || !igual(L.get(id), B.get(id))) out.push(L.get(id)); }
      else if (enR) { if (!enB || !igual(R.get(id), B.get(id))) out.push(R.get(id)); }
    }
    return out;
  }
  function fusionarObjeto(r = {}, l = {}, b = {}) {
    const out = {};
    for (const k of new Set([...Object.keys(r || {}), ...Object.keys(l || {})])) {
      const lv = l?.[k], rv = r?.[k], bv = b?.[k];
      const v = igual(lv, bv) ? rv : lv;
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  function fusionar(remoto, local) {
    if (!base) {
      const out = { ...remoto };
      for (const k of Object.keys(local)) {
        if (Array.isArray(local[k]) && Array.isArray(remoto[k]) && (esListaConId(local[k]) || esListaConId(remoto[k]))) {
          const ids = new Set(remoto[k].map(x => x.id));
          out[k] = [...remoto[k], ...local[k].filter(x => !ids.has(x.id))];
        } else if (!(k in remoto)) out[k] = local[k];
      }
      return out;
    }
    const out = {};
    for (const k of new Set([...Object.keys(remoto), ...Object.keys(local)])) {
      const r = remoto[k], l = local[k], b = base[k];
      if (esListaConId(r) || esListaConId(l) || esListaConId(b)) out[k] = fusionarLista(r, l, b);
      else if (r && l && typeof r === 'object' && typeof l === 'object' && !Array.isArray(r) && !Array.isArray(l)) out[k] = fusionarObjeto(r, l, b);
      else out[k] = igual(l, b) ? r : l;
    }
    return out;
  }

  function aplicar(estado) {
    const vista = S.vista;
    S = Object.assign(nuevoEstado(), copia(estado), { vista });
    if (Array.isArray(S.movs)) S.movs.sort((a, b) => a.fecha.localeCompare(b.fecha));
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    refrescarVista();
  }
  function refrescarVista() {
    if (typeof ocupado === 'function' && ocupado()) renderPendiente = true;
    else { renderPendiente = false; initPeriodo(); render(); }
  }

  async function traer() {
    if (!disponible) return;
    if (enviando || trayendo) { traerPendiente = true; return; }
    trayendo = true;
    try {
      const { status, datos } = await api('GET', '/api/estado');
      if (status !== 200) throw new Error(datos.error || 'HTTP ' + status);
      conectado = true;
      if (!datos.estado) { otraVez = true; return; }
      if (datos.rev === rev) { ui('● Sincronizado', 'ok'); if (!igual(sinVista(S), base)) programar(); return; }
      const local = sinVista(S);
      const mezcla = fusionar(datos.estado, local);
      guardarBase(datos.estado, datos.rev);
      aplicar(mezcla);
      if (!igual(mezcla, datos.estado)) programar(); else ui('● Sincronizado', 'ok');
    } catch (e) {
      conectado = false;
      ui('○ Sin conexión · guardado aquí', 'off');
    } finally {
      trayendo = false;
      if (otraVez) { otraVez = false; await enviar(); }
      if (traerPendiente) { traerPendiente = false; setTimeout(traer, 150); }
    }
  }
  async function enviar() {
    if (!disponible) return;
    if (enviando || trayendo) { otraVez = true; return; }
    enviando = true; ui('↻ Sincronizando…', 'run');
    try {
      for (let intento = 0; intento < 4; intento++) {
        const estado = copia(sinVista(S));
        const { status, datos } = await api('PUT', '/api/estado', { baseRev: rev, estado });
        if (status === 200) {
          guardarBase(estado, datos.rev); conectado = true;
          otraVez = !igual(sinVista(S), base);
          ui(otraVez ? '↻ Guardando…' : '● Sincronizado', otraVez ? 'run' : 'ok');
          break;
        }
        if (status === 409) {
          // Puede haber otra edición local mientras el PUT está en vuelo.
          const mezcla = fusionar(datos.estado || {}, sinVista(S));
          guardarBase(datos.estado || {}, datos.rev);
          aplicar(mezcla);
          if (intento === 3) throw new Error('Conflicto pendiente de reintento');
          continue;
        }
        throw new Error(datos.error || 'HTTP ' + status);
      }
    } catch (e) {
      conectado = false;
      ui('○ Sin conexión · guardado aquí', 'off');
    } finally {
      enviando = false;
      if (otraVez) { otraVez = false; programar(); }
      if (traerPendiente) { traerPendiente = false; setTimeout(traer, 150); }
    }
  }
  function programar() {
    if (!disponible) return;
    clearTimeout(temporizador);
    ui('↻ Guardando…', 'run');
    temporizador = setTimeout(enviar, 150);
  }
  async function revisar() {
    if (!disponible || enviando || solicitudPin || (!nube && !pin()) || document.visibilityState !== 'visible') return;
    try {
      const { status, datos } = await api('GET', '/api/rev');
      if (status === 200 && datos.rev !== rev) await traer();
      else if (status === 200 && !igual(sinVista(S), base)) programar();
      else if (status === 200 && !conectado) { conectado = true; ui('● Sincronizado', 'ok'); }
    } catch (e) { conectado = false; ui('○ Sin conexión · guardado aquí', 'off'); }
  }

  async function escuchar() {
    if (escuchando) return;
    if ((!nube && !pin()) || solicitudPin || document.visibilityState !== 'visible') {
      setTimeout(escuchar, 1500); return;
    }
    escuchando = true;
    let pausa = 150;
    try {
      const { status, datos } = await api('GET', '/api/cambios?desde=' + rev);
      if (status !== 200) throw new Error('Sin aviso de cambios');
      pausa = Math.max(150, Math.min(30000, datos.pollAfterMs || 150));
      if (datos.rev !== rev) await traer();
      else if (!igual(sinVista(S), base)) programar();
    } catch (e) { pausa = 3000; }
    finally { escuchando = false; setTimeout(escuchar, pausa); }
  }

  function init() {
    if (!disponible) { ui('Solo en este dispositivo', 'off'); return; }
    // Los datos recién generados son la base, no cambios hechos por el usuario.
    // Así la primera sincronización los reemplaza con los datos del servidor
    // sin duplicar registros cuyos IDs se generaron en este navegador.
    // Persistir la base también conserva este comportamiento tras usar la app sin conexión.
    if (!estadoLocalCargado) guardarBase(sinVista(S), 0);
    document.getElementById('syncEstado')?.addEventListener('click', () => {
      accesoCancelado = false;
      traer();
    });
    traer().then(escuchar);
    setInterval(revisar, 8000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') traer(); });
    const refrescarPendiente = () => { if (renderPendiente) refrescarVista(); };
    document.addEventListener('focusout', () => setTimeout(refrescarPendiente, 50));
    document.addEventListener('close', refrescarPendiente, true);
  }

  async function prepararActualizacion() {
    if (!disponible || enviando || trayendo) return false;
    clearTimeout(temporizador);
    if (!igual(sinVista(S), base)) await enviar();
    return conectado && !enviando && !trayendo && igual(sinVista(S), base);
  }
  return { init, programar, traer, refrescarVista, prepararActualizacion, get disponible() { return disponible; } };
})();
Sync.init();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

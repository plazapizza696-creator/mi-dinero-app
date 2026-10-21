const CACHE = 'midinero-v11-standalone';
const ARCHIVOS = ['/', '/index.html', '/app.js', '/reembolsos.js', '/wallets.js', '/prestamos.js', '/actualizaciones.js', '/version.json', '/sync.js', '/styles.css', '/manifest.json', '/icon-192.png', '/icon-512.png', '/icon.svg'];
ARCHIVOS.push(...['bbva', 'banamex', 'nu', 'spin', 'hsbc', 'plata', 'didi'].map(banco => `/assets/banks/${banco}.svg`));
ARCHIVOS.push('/assets/banks/rappicard.png');

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' },
});

const DB_NAME = 'MiDineroStandalone';
const DB_VERSION = 1;
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('estado')) db.createObjectStore('estado');
      if (!db.objectStoreNames.contains('respaldos')) db.createObjectStore('respaldos');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbGet(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbPut(store, key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function dbGetAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    const reqK = tx.objectStore(store).getAllKeys();
    let values, keys;
    req.onsuccess = () => { values = req.result; };
    reqK.onsuccess = () => { keys = reqK.result; };
    tx.oncomplete = () => resolve(keys.map((k, i) => ({ id: k, ...values[i] })));
    tx.onerror = () => reject(tx.error);
  });
}

async function readState() {
  const row = await dbGet('estado', 'main');
  return row ? { rev: row.rev, estado: row.estado, ts: row.ts } : { rev: 0, estado: null };
}

const coinIds = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'ripple', USDT: 'tether', USDC: 'usd-coin', BNB: 'binancecoin', ADA: 'cardano', DOGE: 'dogecoin', DOT: 'polkadot', LTC: 'litecoin', AVAX: 'avalanche-2', LINK: 'chainlink', TRX: 'tron', SHIB: 'shiba-inu', MATIC: 'matic-network', POL: 'polygon-ecosystem-token', TON: 'the-open-network', XLM: 'stellar', PEPE: 'pepe' };

async function fetchPrices(url) {
  const list = key => [...new Set((url.searchParams.get(key) || '').split(',').map(v => v.trim().toUpperCase()).filter(v => /^[A-Z0-9.^=\-]{1,20}$/.test(v)))].slice(0, 30);
  const coins = list('cripto'), precios = {}, errores = {};

  // MXN exchange rate from exchangerate.host
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    if (r.ok) {
      const d = await r.json();
      if (d.rates && d.rates.MXN) {
        precios['MXN=X'] = { precio: d.rates.MXN, previo: d.rates.MXN, moneda: 'MXN', nombre: 'USD/MXN' };
      }
    }
  } catch { errores['MXN=X'] = 'Tipo de cambio no disponible'; }

  // Crypto from CoinGecko
  const allCoins = coins.filter(s => coinIds[s]);
  if (allCoins.length) {
    try {
      const ids = allCoins.map(s => coinIds[s]).join(',');
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&include_24hr_change=true&ids=' + ids);
      if (r.ok) {
        const data = await r.json();
        for (const s of allCoins) {
          const d = data[coinIds[s]];
          if (d?.usd) {
            precios['cripto:' + s] = { precio: d.usd, previo: d.usd / (1 + (d.usd_24h_change || 0) / 100), moneda: 'USD', nombre: coinIds[s] };
          } else {
            errores['cripto:' + s] = 'Cotización no disponible';
          }
        }
      }
    } catch {
      for (const s of allCoins) errores['cripto:' + s] = 'Cotización no disponible';
    }
  }

  // Stocks via Yahoo Finance (may fail due to CORS, but try)
  const stocks = list('acciones').filter(s => s !== 'MXN=X');
  for (const symbol of stocks) {
    try {
      const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(symbol) + '?range=1d&interval=1d', {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
      if (r.ok) {
        const d = await r.json();
        const m = d.chart.result[0].meta;
        if (m.regularMarketPrice > 0) {
          precios[symbol] = { precio: m.regularMarketPrice, previo: m.chartPreviousClose || m.previousClose || m.regularMarketPrice, moneda: m.currency || 'USD', nombre: m.shortName || symbol };
        }
      }
    } catch { errores[symbol] = 'Cotización no disponible'; }
  }

  return { precios, errores, ts: Date.now() };
}

async function handleApi(request) {
  const url = new URL(request.url), path = url.pathname;

  if (request.method === 'POST' && path === '/api/error') return json({ ok: true });

  try {
    if (request.method === 'GET') {
      if (path === '/api/salud') return json({ app: 'Mi Dinero', nube: true, almacenamiento: 'standalone' });
      if (path === '/api/estado') return json(await readState());
      if (path === '/api/rev' || path === '/api/cambios') {
        const state = await readState();
        return json({ rev: state.rev, ...(path === '/api/cambios' ? { pollAfterMs: 10000 } : {}) });
      }
      if (path === '/api/respaldos') {
        const id = url.searchParams.get('id');
        if (id) {
          const row = await dbGet('respaldos', id);
          return row ? json({ rev: row.rev, estado: row.estado, ts: row.ts }) : json({ error: 'Respaldo no encontrado' }, 404);
        }
        const all = await dbGetAll('respaldos');
        return json({ respaldos: all.map(r => ({ id: r.id, rev: r.rev, ts: r.ts })).sort((a, b) => b.ts - a.ts) });
      }
      if (path === '/api/precios') return json(await fetchPrices(url));
      return json({ error: 'No existe' }, 404);
    }
    if (request.method === 'PUT' && path === '/api/estado') {
      const body = await request.json();
      const current = await readState();
      if (body.baseRev !== current.rev && current.rev > 0) return json({ rev: current.rev, estado: current.estado, ts: current.ts }, 409);
      const now = Date.now(), newRev = current.rev + 1;
      const day = new Date(now).toISOString().slice(0, 10);
      if (current.estado) await dbPut('respaldos', 'dia-' + day, { rev: current.rev, estado: current.estado, ts: now });
      await dbPut('estado', 'main', { rev: newRev, estado: body.estado, ts: now });
      return json({ rev: newRev });
    }
    return json({ error: 'Método no permitido' }, 405);
  } catch (e) { return json({ error: 'Error local: ' + (e.message || e) }, 503); }
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' && e.request.method !== 'PUT' && e.request.method !== 'POST') return;
  if (url.origin !== location.origin) return;

  // Handle API calls locally
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(handleApi(e.request));
    return;
  }

  // Static files: network-first with cache fallback
  if (url.pathname === '/version.json' || url.pathname.startsWith('/signin-') || url.pathname.startsWith('/signout-') || url.pathname === '/callback') return;
  e.respondWith((async () => {
    try {
      const r = await fetch(e.request, { cache: 'no-store' });
      if (r.redirected || r.status === 401 || r.status === 403) return r;
      if (r.ok) { const c = await caches.open(CACHE); c.put(url.pathname === '/' ? '/index.html' : e.request, r.clone()); return r; }
      throw new Error('HTTP ' + r.status);
    } catch (err) {
      const guardada = await caches.match(url.pathname === '/' ? '/index.html' : e.request);
      if (guardada) return guardada;
      throw err;
    }
  })());
});

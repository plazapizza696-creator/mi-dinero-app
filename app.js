'use strict';

const KEY = 'satapp_resico_v1';
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const LIMITE_RESICO = 3500000;
const TRAMOS_MES = [[25000, 0.01], [50000, 0.011], [83333.33, 0.015], [208333.33, 0.02], [Infinity, 0.025]];
const TRAMOS_ANIO = [[300000, 0.01], [600000, 0.011], [1000000, 0.015], [2500000, 0.02], [Infinity, 0.025]];
const RET_ISR_PM = 0.0125;
const TARIFA_152 = [[0.01, 0, 0.0192], [8952.50, 171.88, 0.064], [75984.56, 4461.94, 0.1088], [133536.08, 10723.55, 0.16],
  [155229.81, 14194.54, 0.1792], [185852.58, 19682.13, 0.2136], [374837.89, 60049.40, 0.2352], [590796.00, 110842.74, 0.30],
  [1127926.85, 271981.99, 0.32], [1503902.47, 392294.17, 0.34], [4511707.38, 1414947.85, 0.35]];

const CLASES = {
  pendiente: '⚠ Sin clasificar',
  ingreso: 'Ingreso de mi actividad',
  no_ingreso: 'Depósito que NO es ingreso',
  gasto_negocio: 'Gasto del negocio',
  personal: 'Gasto personal',
  traspaso: 'Traspaso / pago de tarjeta',
  impuesto: 'Pago de impuestos',
};

const CATEGORIAS_BASE = ['Comida', 'Supermercado', 'Transporte', 'Gasolina', 'Servicios (luz, agua, internet)', 'Renta',
  'Salud', 'Entretenimiento', 'Suscripciones', 'Ropa', 'Educación', 'Herramientas de trabajo', 'Comisiones bancarias', 'Viaje', 'Salidas', 'Otros'];

const CATS_RAPIDAS = [
  { emoji: '🍽️', nombre: 'Comida' },
  { emoji: '🛒', nombre: 'Supermercado' },
  { emoji: '🚗', nombre: 'Transporte' },
  { emoji: '⛽', nombre: 'Gasolina' },
  { emoji: '✈️', nombre: 'Viaje' },
  { emoji: '🍺', nombre: 'Salidas' },
  { emoji: '🎮', nombre: 'Entretenimiento' },
  { emoji: '👕', nombre: 'Ropa' },
  { emoji: '📱', nombre: 'Suscripciones' },
  { emoji: '💊', nombre: 'Salud' },
  { emoji: '🏠', nombre: 'Renta' },
  { emoji: '💡', nombre: 'Servicios (luz, agua, internet)' },
  { emoji: '🎓', nombre: 'Educación' },
  { emoji: '💳', nombre: 'Otros' },
];

const REGLAS_BASE = [
  { patron: 'TRASPASO|ENTRE CUENTAS|PAGO TARJETA|PAGO A TARJETA|PAGO TDC', clase: 'traspaso', categoria: '', cfdi: false },
  { patron: 'COMISION|COMISIÓN|ANUALIDAD', clase: 'gasto_negocio', categoria: 'Comisiones bancarias', cfdi: true },
  { patron: '\\bSAT\\b|IMPUESTO|DECLARACION|LINEA DE CAPTURA', clase: 'impuesto', categoria: '', cfdi: false },
  { patron: 'PEMEX|GASOLIN|OXXO GAS|SHELL|MOBIL|G500', clase: 'gasto_negocio', categoria: 'Gasolina', cfdi: false },
  { patron: 'UBER EATS|RAPPI|DIDI FOOD|STARBUCKS', clase: 'personal', categoria: 'Comida', cfdi: false },
  { patron: 'NETFLIX|SPOTIFY|DISNEY|HBO|MAX COM|PRIME VIDEO|YOUTUBE', clase: 'personal', categoria: 'Suscripciones', cfdi: false },
  { patron: 'CINEPOLIS|CINEMEX|TICKETMASTER', clase: 'personal', categoria: 'Entretenimiento', cfdi: false },
  { patron: 'WALMART|SORIANA|CHEDRAUI|BODEGA AURRERA|COSTCO|SAMS|LA COMER|HEB', clase: 'personal', categoria: 'Supermercado', cfdi: false },
  { patron: 'OXXO|7 ELEVEN|7-ELEVEN', clase: 'personal', categoria: 'Comida', cfdi: false },
  { patron: 'UBER|DIDI|CABIFY', clase: 'personal', categoria: 'Transporte', cfdi: false },
  { patron: 'TELMEX|TOTALPLAY|IZZI|TELCEL|AT&T|MEGACABLE|CFE', clase: 'gasto_negocio', categoria: 'Servicios (luz, agua, internet)', cfdi: false },
  { patron: 'AMAZON WEB|AWS|GOOGLE|MICROSOFT|ADOBE|OPENAI|ANTHROPIC|GITHUB|CANVA', clase: 'gasto_negocio', categoria: 'Herramientas de trabajo', cfdi: false },
];

/* ---------- utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const pct = n => (n * 100).toLocaleString('es-MX', { maximumFractionDigits: 2 }) + '%';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const hoyISO = () => isoDate(new Date());
const pad = n => String(n).padStart(2, '0');
function isoDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function fechaLarga(d) { return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
function diasEntre(a, b) { return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5); }
function hoy() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function diaEnMes(anio, mes, dia) { return new Date(anio, mes, Math.min(dia, new Date(anio, mes + 1, 0).getDate())); }
function escRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function toast(msg, tipo = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + tipo; t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('sale'), 4500);
  setTimeout(() => t.remove(), 5000);
}
function animarNumeros() {
  document.querySelectorAll('#app [data-n]').forEach(el => {
    el.textContent = fmt(+el.dataset.n);
  });
}

/* ---------- estado ---------- */
function nuevoEstado() {
  const ant = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  return {
    version: 1,
    perfil: { nombre: '', rfc: '', actividad: '', ivaTasa: 0.16, arrastrarSaldoIVA: true },
    movs: [], pagos: {}, tarjetas: [], presupuesto: {}, reembolsosPendientes: [],
    cuentas: [], inversiones: [], wallets: [], prestamos: [], abonosPrestamos: [], precios: {}, preciosTs: 0, historial: [], ultimaCuenta: '',
    categorias: [...CATEGORIAS_BASE],
    reglas: REGLAS_BASE.map(r => ({ ...r })),
    vista: { anio: ant.getFullYear(), mes: ant.getMonth(), tab: 'inicio' },
    meta: {
      capitalInicial: 0,
      prestamo: 0,
      metaPatrimonio: 10000000,
      reembolso: { inicio: '', diasLimite: 90 },
      ingresoRecurrente: { monto: 0, dia: 28 },
      personas: [],
    },
    filtroMovs: 'todos',
  };
}
let estadoLocalCargado = false;
function cargar() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.movs)) {
      estadoLocalCargado = true;
      return Object.assign(nuevoEstado(), s);
    }
  } catch (e) {}
  return nuevoEstado();
}
function guardar() {
  registrarHistorial();
  if (window.Sync) Sync.programar();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar: ' + e.message, 'bad'); }
}
let S = cargar();
if (!S.meta) S.meta = nuevoEstado().meta;
const filtro = { alcance: 'mes', clase: '', q: '' };
let imp = null;
let cuentaImport = '';

/* ---------- motor fiscal ---------- */
function tasaDe(tramos, monto) { for (const [lim, t] of tramos) if (monto <= lim) return t; return tramos[tramos.length - 1][1]; }
function tasaIvaDe(m) { return m.ivaTasa ?? S.perfil.ivaTasa; }

function desgloseIngreso(m) {
  const t = tasaIvaDe(m);
  let base;
  if (m.base > 0) base = +m.base;
  else base = m.monto / (1 + t - (m.clientePM ? RET_ISR_PM + t * 2 / 3 : 0));
  const iva = base * t;
  return { base, iva, retIsr: m.clientePM ? base * RET_ISR_PM : 0, retIva: m.clientePM ? iva * 2 / 3 : 0 };
}
function desgloseGasto(m) {
  const t = tasaIvaDe(m);
  const base = m.monto / (1 + t), iva = m.monto - base;
  const efectivoAlto = m.forma === 'efectivo' && m.monto > 2000;
  const acreditable = m.cfdi && !efectivoAlto ? iva : 0;
  return { base, iva, acreditable, perdido: iva - acreditable, efectivoAlto };
}
const claveMes = (a, me) => `${a}-${pad(me + 1)}`;
const movsDelMes = (a, me) => S.movs.filter(m => m.fecha.startsWith(claveMes(a, me)));

function calcMes(a, me, saldoPrevio = 0) {
  const r = { ingresos: 0, ivaTras: 0, retIsr: 0, retIva: 0, gastosNeg: 0, ivaAcred: 0, ivaPerdido: 0, personal: 0,
    pendientes: 0, depPendientes: 0, noIngreso: 0, sinFactura: 0, efectivoAlto: 0, nMovs: 0 };
  for (const m of movsDelMes(a, me)) {
    r.nMovs++;
    if (m.clase === 'ingreso') {
      const d = desgloseIngreso(m);
      r.ingresos += d.base; r.ivaTras += d.iva; r.retIsr += d.retIsr; r.retIva += d.retIva;
    } else if (m.clase === 'gasto_negocio') {
      const d = desgloseGasto(m);
      r.gastosNeg += d.base; r.ivaAcred += d.acreditable; r.ivaPerdido += d.perdido;
      if (!m.cfdi) r.sinFactura++;
      if (d.efectivoAlto) r.efectivoAlto++;
    } else if (m.clase === 'personal') r.personal += m.monto;
    else if (m.clase === 'no_ingreso') r.noIngreso += m.monto;
    else if (m.clase === 'pendiente') { r.pendientes++; if (m.dir === 'in') r.depPendientes += m.monto; }
  }
  r.tasaIsr = tasaDe(TRAMOS_MES, r.ingresos);
  r.isrCausado = r.ingresos * r.tasaIsr;
  r.isrPagar = Math.max(0, r.isrCausado - r.retIsr);
  r.saldoPrevio = saldoPrevio;
  const ivaNeto = r.ivaTras - r.retIva - r.ivaAcred - saldoPrevio;
  r.ivaPagar = Math.max(0, ivaNeto);
  r.ivaFavor = Math.max(0, -ivaNeto);
  r.total = r.isrPagar + r.ivaPagar;
  return r;
}
function calcAnio(a) {
  const meses = [];
  let saldo = 0;
  for (let i = 0; i < 12; i++) {
    const r = calcMes(a, i, S.perfil.arrastrarSaldoIVA ? saldo : 0);
    saldo = r.ivaFavor;
    meses.push(r);
  }
  const t = k => meses.reduce((s, r) => s + r[k], 0);
  const ingresos = t('ingresos'), tasaAnual = tasaDe(TRAMOS_ANIO, ingresos);
  const isrAnual = ingresos * tasaAnual;
  const conDatos = meses.map((r, i) => r.nMovs ? i + 1 : 0).reduce((x, y) => Math.max(x, y), 0);
  return { meses, ingresos, tasaAnual, isrAnual, retIsr: t('retIsr'), isrMensual: t('isrPagar'),
    difAnual: isrAnual - t('retIsr') - t('isrPagar'), gastosNeg: t('gastosNeg'), ivaPerdido: t('ivaPerdido'),
    total: t('total'), conDatos };
}
function isrTarifa152(base) {
  if (base <= 0) return 0;
  let fila = TARIFA_152[0];
  for (const f of TARIFA_152) if (base >= f[0]) fila = f;
  return fila[1] + (base - fila[0]) * fila[2];
}
function fechaLimite(a, me) {
  const d = new Date(a, me + 1, 17);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

/* ---------- reglas de clasificación ---------- */
function aplicarReglas(m) {
  for (const r of S.reglas) {
    let re;
    try { re = new RegExp(r.patron, 'i'); } catch (e) { continue; }
    if (re.test(m.concepto)) {
      if (CLASES[r.clase]) m.clase = r.clase;
      if (r.categoria) m.categoria = r.categoria;
      if (r.cfdi) m.cfdi = true;
      return true;
    }
  }
  return false;
}

/* ---------- parseo de estados de cuenta ---------- */
const MES_TXT = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12 };
function parseFecha(s) {
  s = String(s ?? '').trim();
  let m;
  const mk = (y, mo, d) => {
    y = +y; mo = +mo; d = +d;
    if (y < 100) y += 2000;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${pad(mo)}-${pad(d)}`;
  };
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return mk(m[1], m[2], m[3]);
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))) return mk(m[3], m[2], m[1]);
  if ((m = s.match(/^(\d{1,2})[-/\s]*([a-záéíóú]{3})[a-záéíóú]*\.?[-/\s]*(\d{2,4})/i))) {
    const mo = MES_TXT[m[2].toLowerCase()];
    return mo ? mk(m[3], mo, m[1]) : null;
  }
  return null;
}
function parseMonto(s) {
  if (typeof s === 'number') return s;
  s = String(s ?? '').replace(/[$\s]|MXN|MN/gi, '');
  if (!s) return null;
  const neg = /^\(.*\)$/.test(s) || /^-/.test(s) || /-$/.test(s);
  s = s.replace(/[()\-+]/g, '');
  if (/,\d{1,2}$/.test(s) && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : (neg ? -n : n);
}
function parseCSV(text) {
  const muestra = text.split(/\r?\n/).slice(0, 8).join('\n');
  const delim = [',', ';', '\t', '|'].map(d => [d, muestra.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cur.trim()); cur = ''; }
    else if (c === '\n') { row.push(cur.trim()); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur.trim()); rows.push(row); }
  return rows.filter(r => r.some(x => x));
}
function autoMapear(rows) {
  let headerIdx = rows.findIndex(r => r.some(c => /fecha|date/i.test(c)));
  if (headerIdx < 0) headerIdx = 0;
  const h = rows[headerIdx].map(c => c.toLowerCase());
  const busca = re => h.findIndex(c => re.test(c));
  return {
    headerIdx,
    map: {
      fecha: busca(/fecha|date/),
      concepto: busca(/descrip|concepto|detalle|referencia|movimiento|establecimiento/),
      cargo: busca(/cargo|retiro|d[eé]bito|egreso/),
      abono: busca(/abono|dep[oó]sito|cr[eé]dito|ingreso/),
      monto: busca(/importe|monto|cantidad|amount/),
    },
    invertir: false,
  };
}
function filasImportables() {
  if (!imp) return [];
  const { rows, headerIdx, map, invertir, cuenta } = imp;
  const out = [];
  for (const r of rows.slice(headerIdx + 1)) {
    const fecha = parseFecha(r[map.fecha]);
    if (!fecha) continue;
    const concepto = map.concepto >= 0 ? r[map.concepto] : '';
    let monto = 0, dir = null;
    if (map.cargo >= 0 || map.abono >= 0) {
      const ab = Math.abs(parseMonto(r[map.abono]) || 0), ca = Math.abs(parseMonto(r[map.cargo]) || 0);
      if (ab > 0) { monto = ab; dir = 'in'; } else if (ca > 0) { monto = ca; dir = 'out'; }
    } else if (map.monto >= 0) {
      let v = parseMonto(r[map.monto]) || 0;
      if (invertir) v = -v;
      monto = Math.abs(v); dir = v >= 0 ? 'in' : 'out';
    }
    if (!dir || !monto) continue;
    out.push({ fecha, concepto: concepto || '(sin concepto)', monto: Math.round(monto * 100) / 100, dir, cuenta: cuenta || '' });
  }
  return out;
}
const claveDup = m => `${m.fecha}|${m.dir}|${(+m.monto).toFixed(2)}|${String(m.concepto).slice(0, 40).toUpperCase()}`;
function agregarMovs(lista) {
  const existentes = new Map();
  for (const m of S.movs) { const k = claveDup(m); existentes.set(k, (existentes.get(k) || 0) + 1); }
  let nuevos = 0, dup = 0, auto = 0;
  for (const raw of lista) {
    const k = claveDup(raw);
    if (existentes.get(k) > 0) { existentes.set(k, existentes.get(k) - 1); dup++; continue; }
    const m = Object.assign({ id: uid(), clase: 'pendiente', cfdi: false, forma: 'transferencia', clientePM: false, categoria: '', notas: '' }, raw);
    m.id = m.id || uid();
    if (m.clase === 'pendiente' && aplicarReglas(m)) auto++;
    S.movs.push(m); nuevos++;
  }
  S.movs.sort((a, b) => a.fecha.localeCompare(b.fecha));
  guardar();
  return { nuevos, dup, auto };
}

/* ---------- tarjetas ---------- */
function ciclosTarjeta(t, ref = hoy()) {
  let corte = diaEnMes(ref.getFullYear(), ref.getMonth(), t.diaCorte);
  if (corte < ref) corte = diaEnMes(ref.getFullYear(), ref.getMonth() + 1, t.diaCorte);
  const ultimoCorte = diaEnMes(corte.getFullYear(), corte.getMonth() - 1, t.diaCorte);
  const pagoTras = c => {
    const p = diaEnMes(c.getFullYear(), c.getMonth(), t.diaPago);
    return p > c ? p : diaEnMes(c.getFullYear(), c.getMonth() + 1, t.diaPago);
  };
  let pago = pagoTras(ultimoCorte);
  let corteDelPago = ultimoCorte;
  if (pago < ref) { pago = pagoTras(corte); corteDelPago = corte; }
  // Un vencimiento confirmado no se recorre al mes siguiente mientras esté sin pagar.
  if (/^\d{4}-\d{2}-\d{2}$/.test(t.fechaPagoConfirmada || '') && t.pagadoHasta !== t.fechaPagoConfirmada) {
    const confirmado = new Date(t.fechaPagoConfirmada + 'T00:00:00');
    if (!Number.isNaN(confirmado.getTime())) pago = confirmado;
  }
  // Una tarjeta nueva puede tener corte conocido sin fecha límite de pago todavía.
  if (!t.fechaPagoConfirmada && !(+t.diaPago >= 1 && +t.diaPago <= 31)) pago = null;
  return { corte, ultimoCorte, pago, corteDelPago, mejorDiaCompra: new Date(ultimoCorte.getFullYear(), ultimoCorte.getMonth(), ultimoCorte.getDate() + 1) };
}
function gastadoDesde(nombreCuenta, desde) {
  const d = isoDate(desde);
  return S.movs.filter(m => m.cuenta && m.cuenta.toLowerCase() === nombreCuenta.toLowerCase() && m.dir === 'out' && m.fecha > d && m.clase !== 'traspaso')
    .reduce((s, m) => s + m.monto, 0);
}

/* ---------- asesor ---------- */
function consejos(a, me) {
  const an = calcAnio(a), r = an.meses[me], out = [];
  const lim = fechaLimite(a, me), dias = diasEntre(hoy(), lim);
  const pago = S.pagos[claveMes(a, me)];
  if (r.total > 0 && !(pago && pago.pagado)) {
    if (dias < 0) out.push({ n: 'bad', t: `Declaración de ${MESES[me]} vencida`, d: `Venció el ${fechaLarga(lim)}. Cada día suma actualización y recargos (~1.47% mensual). Preséntala cuanto antes.` });
    else if (dias <= 7) out.push({ n: 'warn', t: `Faltan ${dias} días para declarar ${MESES[me]}`, d: `Fecha límite ${fechaLarga(lim)}. Monto estimado: ${fmt(r.total)}.` });
  }
  if (r.pendientes) out.push({ n: 'warn', t: `${r.pendientes} movimientos sin clasificar en ${MESES[me]}`, d: `Hay ${fmt(r.depPendientes)} en depósitos sin identificar. El SAT ve tus depósitos bancarios: si un depósito no es ingreso (préstamo, traspaso propio, reembolso) márcalo como "Depósito que NO es ingreso" y guarda el soporte.` });
  if (r.sinFactura) out.push({ n: 'warn', t: `${r.sinFactura} gastos del negocio sin factura`, d: `Estás dejando de acreditar IVA. Pide CFDI a tu RFC en cada compra del negocio (gasolina, internet, equipo, software). IVA perdido este mes: ${fmt(r.ivaPerdido)}.` });
  if (r.efectivoAlto) out.push({ n: 'bad', t: 'Gastos mayores a $2,000 pagados en efectivo', d: 'Su IVA no es acreditable. Paga con tarjeta o transferencia desde una cuenta a tu nombre.' });
  if (r.ivaFavor > 0) out.push({ n: 'ok', t: `IVA a favor: ${fmt(r.ivaFavor)}`, d: S.perfil.arrastrarSaldoIVA ? 'Se acredita automáticamente contra el IVA de los meses siguientes.' : 'Puedes acreditarlo en meses siguientes o solicitar devolución.' });
  const sig = TRAMOS_MES.find(([l]) => r.ingresos <= l);
  if (r.ingresos > 0 && sig && sig[0] !== Infinity && sig[0] - r.ingresos < sig[0] * 0.05) {
    out.push({ n: 'info', t: 'Estás cerca del siguiente tramo de ISR', d: `Con ${fmt(sig[0] - r.ingresos)} más de ingreso en ${MESES[me]} la tasa sube y se aplica a TODO el ingreso del mes. Si un cobro puede recibirse legítimamente el mes siguiente, el pago mensual baja (la declaración anual luego ajusta con la tabla anual).` });
  }
  const uso = an.ingresos / LIMITE_RESICO;
  if (uso > 0.8) out.push({ n: uso > 0.95 ? 'bad' : 'warn', t: `Llevas ${pct(uso)} del límite RESICO`, d: `Si pasas de $3,500,000 en el año sales de RESICO y tributas en el régimen general desde el ejercicio siguiente.` });
  if (an.difAnual > 1) out.push({ n: 'info', t: 'Ajuste en la declaración anual', d: `Con la tabla anual, a la fecha te faltarían ${fmt(an.difAnual)} de ISR en la anual (abril). Guárdalos.` });
  if (an.conDatos && an.ingresos > 0) {
    const f = 12 / an.conDatos, ingA = an.ingresos * f, gasA = an.gastosNeg * f;
    const resico = ingA * tasaDe(TRAMOS_ANIO, ingA), general = isrTarifa152(ingA - gasA);
    if (general < resico) out.push({ n: 'warn', t: 'Revisa si te conviene salir de RESICO', d: `Proyectando el año: ISR RESICO ≈ ${fmt(resico)} vs Actividad Empresarial ≈ ${fmt(general)} (con tus gastos deducibles actuales). Tienes gastos muy altos; coméntalo con tu contador.` });
    else out.push({ n: 'ok', t: 'RESICO te conviene', d: `Proyección anual: ISR RESICO ≈ ${fmt(resico)} vs Actividad Empresarial ≈ ${fmt(general)}. Te ahorras ≈ ${fmt(general - resico)}.` });
  }
  if (!out.length) out.push({ n: 'ok', t: 'Todo en orden', d: 'No hay pendientes para este periodo.' });
  return out;
}

/* ---------- render ---------- */
let ultimaTab = null;
const TITULOS = {
  inicio: ['Mi dinero', 'Inicio'], presupuesto: ['Mi dinero', 'Balance mensual'], inversiones: ['Mi dinero', 'Portafolio'], memecoin: ['Portafolio · Criptomonedas', 'Meme Coin'],
  prestamos: ['Mi dinero', 'Préstamos'], prestamosFondo: ['Préstamos', 'Fondo para reinvertir'], cuentas: ['Mi dinero', 'Mis cuentas'], tarjetas: ['Mi dinero', 'Tarjetas'], movimientos: ['Mi dinero', 'Actividad'],
  cuentasTerceros: ['Otras personas', 'Cuentas de otras personas'],
  resumen: ['SAT', 'Resumen fiscal'], asesor: ['SAT', 'Asesor fiscal'], pagos: ['SAT', 'Pagos al SAT'],
  config: ['', 'Configuración'], instalar: ['Mi dinero', 'Mi Dinero en iPhone'],
};
const VISTAS_SAT = ['resumen', 'asesor', 'pagos'], VISTAS_SIN_PERIODO = ['instalar', 'prestamos', 'prestamosFondo', 'inversiones', 'memecoin', 'cuentas', 'cuentasTerceros', 'tarjetas', 'config'];
function render() {
  if (!TITULOS[S.vista.tab]) S.vista.tab = 'inicio';
  const { tab } = S.vista;
  document.querySelectorAll('#tabs button, #bottomNav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  document.body.dataset.sec = VISTAS_SAT.includes(tab) ? 'sat' : 'fin';
  $('.periodo').style.display = VISTAS_SIN_PERIODO.includes(tab) ? 'none' : '';
  $('#vistaSeccion').textContent = TITULOS[tab][0];
  $('#vistaTitulo').textContent = tab === 'inicio' && S.perfil.nombre ? `${new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'}, ${S.perfil.nombre.split(' ')[0]}` : TITULOS[tab][1];
  $('#perfilNombre').textContent = [S.perfil.nombre, S.perfil.rfc].filter(Boolean).join(' · ') || 'Control financiero';
  $('#listaCuentas').innerHTML = cuentas().map(c => `<option value="${esc(c)}">`).join('');
  $('#listaCategorias').innerHTML = S.categorias.map(c => `<option value="${esc(c)}">`).join('');
  const vistas = { inicio: vInicio, resumen: vResumen, movimientos: vMovimientos, asesor: vAsesor, presupuesto: vPresupuesto, tarjetas: vTarjetas,
    pagos: vPagos, config: vConfig, instalar: vInstalar, prestamos: vPrestamos, prestamosFondo: () => vPrestamos(true), inversiones: vInversiones, memecoin: vMemeCoin, cuentas: vCuentas, cuentasTerceros: vCuentasTerceros };
  const app = $('#app'), cambio = tab !== ultimaTab;
  app.innerHTML = vistas[tab]();
  if (cambio) {
    app.classList.remove('anim'); void app.offsetWidth; app.classList.add('anim');
    animarNumeros(); window.scrollTo(0, 0);
    if (['inversiones', 'inicio', 'memecoin'].includes(tab) && Date.now() - (S.preciosTs || 0) > 60000) setTimeout(actualizarPrecios, 300);
  } else app.classList.remove('anim');
  ultimaTab = tab;
  document.body.classList.remove('menu-abierto');
}
function cuentas() {
  return [...new Set([...S.movs.map(m => m.cuenta).filter(Boolean), ...S.tarjetas.map(t => t.nombre), ...S.cuentas.map(c => c.nombre)])].sort();
}
function tip(c) { return `<div class="tip ${c.n}"><b>${esc(c.t)}</b>${esc(c.d)}</div>`; }

const kv = (n, extra = '') => `<div class="v ${extra}" data-n="${n || 0}">${fmt(n)}</div>`;
function grafMeses(an, me) {
  const W = 720, H = 210, pt = 12, pb = 26, max = Math.max(1, ...an.meses.map(m => m.ingresos));
  const col = W / 12, bw = col * 0.32, y = v => H - pb - (v / max) * (H - pb - pt);
  let s = '';
  for (const f of [0.25, 0.5, 0.75, 1]) s += `<line x1="0" x2="${W}" y1="${y(max * f)}" y2="${y(max * f)}" stroke="#eef0f3"/>`;
  an.meses.forEach((m, i) => {
    const x = i * col + col / 2;
    s += `<rect class="b" x="${x - bw - 1}" y="${y(m.ingresos)}" width="${bw}" height="${H - pb - y(m.ingresos)}" rx="3" fill="#b9e3d3" style="animation-delay:${i * 35}ms"><title>${MESES[i]} · ingresos ${fmt(m.ingresos)}</title></rect>`;
    s += `<rect class="b" x="${x + 1}" y="${y(m.total)}" width="${bw}" height="${H - pb - y(m.total)}" rx="3" fill="#0f6b4f" style="animation-delay:${i * 35 + 80}ms"><title>${MESES[i]} · al SAT ${fmt(m.total)}</title></rect>`;
    s += `<text x="${x}" y="${H - 8}" text-anchor="middle"${i === me ? ' style="font-weight:700;fill:#1d2330"' : ''}>${MESES[i].slice(0, 3)}</text>`;
  });
  return `<svg class="graf" viewBox="0 0 ${W} ${H}">${s}</svg>`;
}

function vResumen() {
  const { anio: a, mes: me } = S.vista;
  const an = calcAnio(a), r = an.meses[me], lim = fechaLimite(a, me), dias = diasEntre(hoy(), lim);
  const pago = S.pagos[claveMes(a, me)];
  const estado = pago && pago.pagado ? '<span class="chip">Pagado ✓</span>' : dias < 0 ? '<span class="chip">Vencido</span>' : `<span class="chip">faltan ${dias} días</span>`;
  const uso = an.ingresos / LIMITE_RESICO;
  return `
  <div class="kpis">
    <div class="kpi"><small>Ingresos cobrados (sin IVA)</small>${kv(r.ingresos)}<small>${MESES[me]} ${a}</small></div>
    <div class="kpi"><small>ISR a pagar · tasa ${pct(r.tasaIsr)}</small>${kv(r.isrPagar)}</div>
    <div class="kpi"><small>IVA a pagar</small>${kv(r.ivaPagar)}${r.ivaFavor ? `<small class="in">A favor: ${fmt(r.ivaFavor)}</small>` : ''}</div>
    <div class="kpi main"><small>Total a pagar al SAT</small>${kv(r.total)}<small>Límite ${fechaLarga(lim)} ${estado}</small></div>
  </div>
  ${r.pendientes ? `<div class="tip warn"><b>Tienes ${r.pendientes} movimientos sin clasificar este mes</b>El cálculo no estará completo hasta que los clasifiques. <button class="link" data-act="ir" data-tab="movimientos">Ir a clasificarlos →</button></div>` : ''}
  <div class="card"><div class="toolbar"><h3 style="margin:0">Ingresos vs. pagos al SAT · ${a}</h3><span class="sp"></span>
    <div class="leyenda"><span><i style="background:#b9e3d3"></i>Ingresos</span><span><i style="background:#0f6b4f"></i>Impuestos</span></div></div>
    ${grafMeses(an, me)}
  </div>
  <div class="cols">
    <div class="card"><h3>ISR · RESICO (art. 113-E LISR)</h3>
      <table>
        <tr><td>Ingresos efectivamente cobrados</td><td class="n">${fmt(r.ingresos)}</td></tr>
        <tr><td>Tasa aplicable al total del mes</td><td class="n">${pct(r.tasaIsr)}</td></tr>
        <tr><td>ISR causado</td><td class="n">${fmt(r.isrCausado)}</td></tr>
        <tr><td>(−) ISR retenido por personas morales</td><td class="n">${fmt(r.retIsr)}</td></tr>
        <tr class="tot"><td>ISR a pagar</td><td class="n">${fmt(r.isrPagar)}</td></tr>
      </table>
      <p class="muted">En RESICO el ISR se paga sobre ingresos, sin restar gastos. Los gastos con factura te ayudan en el IVA.</p>
    </div>
    <div class="card"><h3>IVA</h3>
      <table>
        <tr><td>IVA trasladado (cobrado a clientes)</td><td class="n">${fmt(r.ivaTras)}</td></tr>
        <tr><td>(−) IVA retenido por personas morales</td><td class="n">${fmt(r.retIva)}</td></tr>
        <tr><td>(−) IVA acreditable (gastos con CFDI)</td><td class="n">${fmt(r.ivaAcred)}</td></tr>
        <tr><td>(−) Saldo a favor de meses anteriores</td><td class="n">${fmt(r.saldoPrevio)}</td></tr>
        <tr class="tot"><td>${r.ivaFavor ? 'IVA a favor' : 'IVA a pagar'}</td><td class="n">${fmt(r.ivaFavor || r.ivaPagar)}</td></tr>
      </table>
      ${r.ivaPerdido > 0.5 ? `<p class="out">IVA que perdiste por gastos sin factura o en efectivo: ${fmt(r.ivaPerdido)}</p>` : ''}
    </div>
  </div>
  <div class="card"><h3>Límite anual RESICO ${a}</h3>
    <div class="barra ${uso > 0.8 ? 'alerta' : uso > 0.6 ? 'medio' : ''}"><div style="width:${Math.min(100, uso * 100)}%"></div></div>
    <p class="muted">${fmt(an.ingresos)} de ${fmt(LIMITE_RESICO)} (${pct(uso)}) · Tasa anual estimada ${pct(an.tasaAnual)} · ISR anual ${fmt(an.isrAnual)} · ${an.difAnual > 0 ? `faltante estimado para la anual: <b>${fmt(an.difAnual)}</b>` : 'sin faltante estimado para la anual'}</p>
  </div>
  <div class="card tabla-scroll"><h3>Año ${a} mes por mes</h3>
    <table><tr><th>Mes</th><th class="n">Ingresos</th><th class="n">Gastos negocio</th><th class="n">ISR</th><th class="n">IVA</th><th class="n">Total SAT</th><th>Estado</th></tr>
    ${an.meses.map((m, i) => {
      const p = S.pagos[claveMes(a, i)], venc = fechaLimite(a, i) < hoy();
      const est = !m.nMovs ? '<span class="muted">—</span>' : p && p.pagado ? '<span class="chip ok">Pagado</span>' : m.total === 0 ? '<span class="chip">En ceros</span>' : venc ? '<span class="chip bad">Pendiente</span>' : '<span class="chip warn">Por pagar</span>';
      return `<tr${i === me ? ' style="font-weight:600"' : ''}><td>${MESES[i]}</td><td class="n">${fmt(m.ingresos)}</td><td class="n">${fmt(m.gastosNeg)}</td><td class="n">${fmt(m.isrPagar)}</td><td class="n">${fmt(m.ivaPagar)}</td><td class="n">${fmt(m.total)}</td><td>${est}</td></tr>`;
    }).join('')}
    <tr class="tot"><td>Total</td><td class="n">${fmt(an.ingresos)}</td><td class="n">${fmt(an.gastosNeg)}</td><td class="n">${fmt(an.isrMensual)}</td><td class="n">${fmt(an.meses.reduce((s, m) => s + m.ivaPagar, 0))}</td><td class="n">${fmt(an.total)}</td><td></td></tr>
    </table>
  </div>`;
}

function opcionesClase(sel) { return Object.entries(CLASES).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${v}</option>`).join(''); }

function vMovimientos() {
  const { anio: a, mes: me } = S.vista;
  const q = filtro.q.toLowerCase();
  const lista = S.movs.filter(m =>
    (filtro.alcance === 'todo' || m.fecha.startsWith(claveMes(a, me))) &&
    (!filtro.clase || m.clase === filtro.clase) &&
    (!q || `${m.concepto} ${m.cuenta} ${m.categoria} ${m.notas}`.toLowerCase().includes(q)));
  const ent = lista.filter(m => m.dir === 'in').reduce((s, m) => s + m.monto, 0);
  const sal = lista.filter(m => m.dir === 'out').reduce((s, m) => s + m.monto, 0);
  return `<div class="card">
    <div class="toolbar">
      <select data-f="alcance"><option value="mes"${filtro.alcance === 'mes' ? ' selected' : ''}>${MESES[me]} ${a}</option><option value="todo"${filtro.alcance === 'todo' ? ' selected' : ''}>Todos los meses</option></select>
      <select data-f="clase"><option value="">Todas las clasificaciones</option>${opcionesClase(filtro.clase)}</select>
      <input data-f="q" placeholder="Buscar…" value="${esc(filtro.q)}">
      <span class="sp"></span>
      <span class="in">+${fmt(ent)}</span><span class="out">−${fmt(sal)}</span>
      <button class="primary" data-act="nuevo">+ Movimiento</button>
    </div>
    ${lista.length ? `<div class="tabla-scroll"><table>
      <tr><th>Fecha</th><th>Concepto</th><th class="n">Monto</th><th>Clasificación</th><th>Datos fiscales</th><th></th></tr>
      ${lista.slice().reverse().map(filaMov).join('')}
    </table></div>` : `<div class="empty">No hay movimientos. Agrega uno o <button class="link" data-act="ir" data-tab="inicio">arrastra tu estado de cuenta en Inicio</button>.</div>`}
  </div>`;
}
function filaMov(m) {
  let det = '';
  if (m.clase === 'ingreso') {
    const d = desgloseIngreso(m);
    det = `<label><input type="checkbox" data-campo="cfdi" ${m.cfdi ? 'checked' : ''}>Facturado</label>
      <label><input type="checkbox" data-campo="clientePM" ${m.clientePM ? 'checked' : ''}>Cliente persona moral</label>
      <span class="muted">Base ${fmt(d.base)} · IVA ${fmt(d.iva)}</span>`;
  } else if (m.clase === 'gasto_negocio') {
    const d = desgloseGasto(m);
    det = `<label><input type="checkbox" data-campo="cfdi" ${m.cfdi ? 'checked' : ''}>Tengo CFDI</label>
      <select data-campo="forma">${['transferencia', 'tarjeta', 'efectivo', 'cheque'].map(f => `<option${m.forma === f ? ' selected' : ''}>${f}</option>`).join('')}</select>
      ${d.acreditable ? `<span class="chip ok">IVA acred. ${fmt(d.acreditable)}</span>` : `<span class="chip bad">${d.efectivoAlto ? 'Efectivo > $2,000' : 'Sin CFDI'}</span>`}`;
  }
  if (m.clase === 'personal' || m.clase === 'gasto_negocio') det += ` <span class="chip">${esc(m.categoria || 'sin categoría')}</span>`;
  return `<tr data-id="${m.id}" class="${m.clase === 'pendiente' ? 'row-pend' : ''}">
    <td>${m.fecha}</td>
    <td>${esc(m.concepto)}${m.cuenta ? `<br><small>${esc(m.cuenta)}</small>` : ''}</td>
    <td class="n ${m.dir}">${m.dir === 'in' ? '+' : '−'}${fmt(m.monto)}</td>
    <td><select class="clase" data-campo="clase">${opcionesClase(m.clase)}</select></td>
    <td><div class="det">${det}</div></td>
    <td style="white-space:nowrap"><button class="link" title="Crear regla con este concepto" data-act="regla">📌</button><button class="link" title="Editar" data-act="editar">✎</button><button class="link danger" title="Borrar" data-act="borrar">✕</button></td>
  </tr>`;
}

/* ---------- patrimonio, cuentas e inversiones ---------- */
const BANCOS = ['BBVA', 'Banorte', 'Santander', 'Banamex', 'HSBC', 'Nu', 'Scotiabank', 'Inbursa', 'Mercado Pago', 'Hey Banco', 'Spin', 'Plata', 'DiDi', 'RappiCard'];
function bankLogo(banco, size = 32) {
  const nombre = String(banco || '').trim();
  const alias = { bbva: 'bbva', banamex: 'banamex', citibanamex: 'banamex', hsbc: 'hsbc', nu: 'nu', nubank: 'nu',
    spin: 'spin', 'spin by oxxo': 'spin', plata: 'plata', 'plata card': 'plata', 'banco plata': 'plata', didi: 'didi', 'didi card': 'didi', rappi: 'rappicard', rappicard: 'rappicard', 'rappi card': 'rappicard' };
  const marca = alias[nombre.toLowerCase()];
  if (marca) return `<img class="bank-brand bank-brand--${marca}" src="assets/banks/${marca}.${marca === 'rappicard' ? 'png' : 'svg'}" width="${size * 2}" height="${size}" alt="Logo de ${esc(nombre)}">`;
  return `<svg class="bank-brand" width="${size * 2}" height="${size}" viewBox="0 0 32 32" role="img" aria-label="${esc(nombre || 'Banco')}"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12 16 5l13 7H3Zm2 15h22M8 15v8m8-8v8m8-8v8M3 27h26"/></g></svg>`;
}
const TIPOS_INV = { accion: 'Acción / ETF', cripto: 'Cripto', manual: 'Otro (CETES, fondo, plazo…)' };
const TIPOS_CTA = { banco: 'Cuenta bancaria', ahorro: 'Ahorro', efectivo: 'Efectivo', plazo: 'Inversión a plazo' };
const CRIPTO_IDS = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'ripple', USDT: 'tether', USDC: 'usd-coin', BNB: 'binancecoin',
  ADA: 'cardano', DOGE: 'dogecoin', DOT: 'polkadot', LTC: 'litecoin', AVAX: 'avalanche-2', LINK: 'chainlink', TRX: 'tron',
  SHIB: 'shiba-inu', MATIC: 'matic-network', POL: 'polygon-ecosystem-token', TON: 'the-open-network', XLM: 'stellar', PEPE: 'pepe' };
const flecha = n => n >= 0 ? '▲' : '▼';
const pctS = x => (x >= 0 ? '+' : '−') + pct(Math.abs(x || 0));
const num = n => (+n || 0).toLocaleString('es-MX', { maximumFractionDigits: 8 });
const fmtMon = (v, mon) => mon === 'USD' ? 'US$' + v.toLocaleString('en-US', { maximumFractionDigits: v < 1 ? 6 : 2, minimumFractionDigits: v < 1 ? 2 : 2 }) : fmt(v);
const usdmxn = () => S.precios['MXN=X']?.precio || 18;
const clavePrecio = i => i.tipo === 'cripto' ? 'cripto:' + i.simbolo.toUpperCase() : i.simbolo.toUpperCase();
const ocupado = () => !!imp || !!document.querySelector('dialog[open], #app form[data-editando]') || ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
document.addEventListener('input', e => {
  const form = e.target.closest('#app form');
  if (form) form.dataset.editando = 'true';
});
document.addEventListener('toggle', e => {
  if (e.target.id === 'importFormato' && imp) imp.ajustesAbiertos = e.target.open;
}, true);
const gastosMes = (a, me) => movsDelMes(a, me)
  .filter(m => m.dir === 'out' && (m.clase === 'personal' || m.clase === 'gasto_negocio' || m.clase === 'pendiente'))
  .map(m => ({ ...m, monto: Reembolsos.gastoNeto(m, S.movs) })).filter(m => m.monto > 0);
function rankingGastos(a, me) {
  const porCat = {};
  for (const m of gastosMes(a, me)) { const c = m.categoria || 'Sin categoría'; porCat[c] = (porCat[c] || 0) + m.monto; }
  let r = Object.entries(porCat).sort((x, y) => y[1] - x[1]);
  if (r.length > 9) r = [...r.slice(0, 8), ['Otras', r.slice(8).reduce((s, [, v]) => s + v, 0)]];
  return r;
}

function valorInv(i) {
  const costo = +i.costo || 0;
  if (i.tipo === 'manual') { const v = +i.valorManual || costo; return { valor: v, hoy: 0, precio: null, pl: v - costo, cambioPct: 0 }; }
  const p = S.precios[clavePrecio(i)];
  if (!p || !p.precio) return { valor: costo, hoy: 0, precio: null, pl: 0, cambioPct: 0, sinPrecio: true };
  const fx = p.moneda === 'USD' ? usdmxn() : 1;
  const valor = (+i.cantidad || 0) * p.precio * fx;
  return { valor, hoy: (+i.cantidad || 0) * (p.precio - (p.previo || p.precio)) * fx, precio: p.precio, moneda: p.moneda,
    cambioPct: p.previo ? p.precio / p.previo - 1 : 0, pl: costo ? valor - costo : 0 };
}
function resumenWallets() { return Wallets.resumen(S.wallets || [], S.precios['MXN=X']?.precio); }
function resumenPrestamos() { return Prestamos.resumen(S.prestamos || [], S.abonosPrestamos || [], hoyISO()); }
function patrimonio() {
  const bancos = S.cuentas.filter(c => !c.persona).reduce((s, c) => s + (+c.saldo || 0), 0);
  const bancosPN = S.cuentas.filter(c => c.persona).reduce((s, c) => s + (+c.saldo || 0), 0);
  let inv = 0, hoy = 0, costo = 0;
  for (const i of S.inversiones) { const v = valorInv(i); inv += v.valor; hoy += v.hoy; costo += +i.costo || 0; }
  const deuda = S.tarjetas.reduce((s, t) => s + (+t.saldoActual || 0), 0);
  const meme = resumenWallets(), prestamos = resumenPrestamos(), inversionesBase = inv;
  inv += meme.totalMXN || 0;
  return { bancos, bancosPN, inv, inversionesBase, meme, prestamos, hoy, costo, deuda, neto: bancos + inv + prestamos.patrimonio - deuda, previoInv: inversionesBase - hoy };
}
function registrarHistorial() {
  if (!S.cuentas.length && !S.inversiones.length && !S.tarjetas.length && !S.wallets.length && !S.prestamos.length) return;
  const porFecha = new Map();
  for (const x of S.historial) {
    const anterior = porFecha.get(x.fecha);
    if (!anterior || Number.isFinite(x.meme) || !Number.isFinite(anterior.meme)) porFecha.set(x.fecha, x);
  }
  const p = patrimonio(), h = [...porFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
  S.historial = h; const ult = h.find(x => x.fecha === hoyISO());
  const reg = { fecha: hoyISO(), neto: Math.round(p.neto), inv: Math.round(p.inv), meme: p.meme.totalMXN, prestamos: p.prestamos.patrimonio, bancos: Math.round(p.bancos), deuda: Math.round(p.deuda) };
  if (ult && ult.fecha === reg.fecha) { if (JSON.stringify(ult) !== JSON.stringify(reg)) h[h.indexOf(ult)] = reg; }
  else { h.push(reg); h.sort((a, b) => a.fecha.localeCompare(b.fecha)); }
  if (h.length > 1500) h.splice(0, h.length - 1500);
}
function historialComparable() {
  const inicioWallets = (S.wallets || []).map(w => w.actualizado).filter(Boolean).sort()[0];
  return [...new Map(S.historial.filter(h => !inicioWallets || h.fecha < inicioWallets || Number.isFinite(h.meme)).map(h => [h.fecha, h])).values()]
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
function sparkline(vals, w = 300, h = 80, color = '#fff') {
  if (vals.length < 2) return '<div class="spark-vacio">La gráfica de tendencia aparece desde el segundo día</div>';
  const min = Math.min(...vals), max = Math.max(...vals), r = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1) * w).toFixed(1)},${(h - 4 - (v - min) / r * (h - 8)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polygon points="0,${h} ${pts} ${w},${h}" fill="${color}" opacity=".15"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
}

/* ---------- precios de mercado ---------- */
let preciosCargando = false, preciosPrevios = {};
async function preciosDirecto(cri) {
  const ids = cri.map(s => CRIPTO_IDS[s] || s.toLowerCase());
  const r = await fetch('https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd,mxn&include_24hr_change=true&ids=' + [...new Set([...ids, 'tether'])].join(','));
  const d = await r.json(), precios = {};
  cri.forEach((s, k) => { const x = d[ids[k]]; if (x) precios['cripto:' + s] = { precio: x.usd, previo: x.usd / (1 + (x.usd_24h_change || 0) / 100), moneda: 'USD', nombre: ids[k] }; });
  if (d.tether?.mxn) { const fx = d.tether.mxn / (d.tether.usd || 1); precios['MXN=X'] = { precio: fx, previo: fx, moneda: 'MXN' }; }
  return { precios, errores: {}, ts: Date.now() };
}
async function actualizarPrecios(manual = false) {
  if (preciosCargando || (!S.inversiones.length && !S.wallets.length && !manual)) return;
  if (Sync.disponible && !window.MIDINERO_CLOUD && !localStorage.getItem('midinero_pin')) return;
  const acc = [...new Set(S.inversiones.filter(i => i.tipo === 'accion').map(i => i.simbolo.toUpperCase()))];
  const cri = [...new Set(S.inversiones.filter(i => i.tipo === 'cripto').map(i => i.simbolo.toUpperCase()))];
  preciosCargando = true;
  document.querySelectorAll('[data-act="precios"]').forEach(b => b.classList.add('girando'));
  try {
    let datos;
    if (Sync.disponible) {
      const _bp = location.pathname.replace(/\/[^/]*$/, '');
      const r = await fetch(`${_bp}/api/precios?acciones=${encodeURIComponent(acc.join(','))}&cripto=${encodeURIComponent(cri.join(','))}`,
        { headers: { 'X-PIN': localStorage.getItem('midinero_pin') || '' }, cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      datos = await r.json();
    } else {
      datos = await preciosDirecto(cri);
      if (acc.length && manual) toast('Para precios de acciones abre la app con "Iniciar Mi Dinero".', 'warn');
    }
    preciosPrevios = Object.fromEntries(Object.entries(S.precios).map(([k, v]) => [k, v?.precio]));
    Object.assign(S.precios, datos.precios);
    S.preciosTs = datos.ts;
    const sin = Object.keys(datos.errores || {}).filter(k => k !== 'MXN=X');
    if (manual && sin.length) toast('Sin precio para: ' + sin.join(', ') + '. Revisa el símbolo.', 'warn');
    else if (manual) toast('Precios actualizados');
    guardar();
    if (['inicio', 'inversiones', 'memecoin'].includes(S.vista.tab)) Sync.refrescarVista();
  } catch (e) {
    if (manual) toast('No se pudieron actualizar los precios: ' + e.message, 'bad');
  } finally {
    preciosCargando = false;
    document.querySelectorAll('[data-act="precios"]').forEach(b => b.classList.remove('girando'));
  }
}
setInterval(() => {
  if (document.visibilityState === 'visible' && ['inicio', 'inversiones', 'memecoin'].includes(S.vista.tab)) actualizarPrecios();
}, 60000);

/* ---------- vistas: inicio ---------- */
function calcRecuperacion() {
  const total = patrimonio().neto;
  const meta = S.meta?.metaPatrimonio || 10000000;
  return { total, meta, falta: Math.max(0, meta - total), pct: Math.max(0, Math.min(1, total / meta)) };
}
function calcReembolso() {
  return Reembolsos.porCuenta(S.cuentas, S.movs, hoyISO());
}
function proximoIngreso() {
  const dia = S.meta?.ingresoRecurrente?.dia || 28, monto = S.meta?.ingresoRecurrente?.monto || 0;
  if (!monto) return null;
  const h = hoy();
  let prox = new Date(h.getFullYear(), h.getMonth(), dia);
  if (prox <= h) prox = new Date(h.getFullYear(), h.getMonth() + 1, dia);
  return { fecha: prox, monto, dias: diasEntre(h, prox) };
}
function gastosPorPersona(a, me) {
  const porP = {};
  for (const m of movsDelMes(a, me).filter(x => x.dir === 'out' && x.clase !== 'traspaso')) {
    const cta = S.cuentas.find(c => c.nombre === m.cuenta) || S.tarjetas.find(t => t.nombre === m.cuenta);
    const persona = cta?.persona || cta?.banco || 'Sin asignar';
    porP[persona] = (porP[persona] || 0) + m.monto;
  }
  return porP;
}
function cuentasDePersona(persona) {
  return S.cuentas.filter(c => c.persona === persona || c.nombre.includes(persona));
}
function saldoPersona(persona) {
  return cuentasDePersona(persona).reduce((s, c) => s + (+c.saldo || 0), 0);
}

function vInicio() {
  const { anio: a, mes: me } = S.vista;
  const p = patrimonio(), hist = historialComparable().slice(-90).map(h => h.neto);
  const rec = calcRecuperacion(), reem = calcReembolso(), prox = proximoIngreso();
  const entradas = movsDelMes(a, me).filter(m => m.dir === 'in' && m.clase === 'ingreso').reduce((s, m) => s + m.monto, 0);
  const totG = gastosMes(a, me).reduce((s, m) => s + m.monto, 0);
  const pagosArr = S.tarjetas.map(t => ({ t, c: ciclosTarjeta(t) }))
    .filter(({ t, c }) => c.pago && !t.cortePendiente && t.pagadoHasta !== isoDate(c.pago) && t.saldoCorte > 0)
    .map(({ t, c }) => ({ ic: '💳', nombre: t.nombre, fecha: c.pago, monto: t.saldoCorte, tab: 'tarjetas' }));
  pagosArr.sort((x, y) => x.fecha - y.fecha);
  const movers = S.inversiones.map(i => ({ i, v: valorInv(i) })).filter(x => x.v.precio)
    .sort((x, y) => Math.abs(y.v.cambioPct) - Math.abs(x.v.cambioPct)).slice(0, 5);
  const hoyPct = p.previoInv ? p.hoy / p.previoInv : 0;
  const recientes = S.movs.slice(-8).reverse();
  const deudaTotal = S.tarjetas.reduce((s, t) => s + (+t.saldoActual || 0), 0);
  const hy = hoy();

  const totalGastoPN = reem.reduce((sum, r) => sum + r.gasto, 0);
  const pendientesPN = S.movs.filter(m => m.dir === 'out' && m.clase === 'pendiente'
    && S.cuentas.some(c => c.persona && c.nombre === m.cuenta)).length;

  return `
  <div class="hero">
    <div class="hero-txt">
      <small>Tu patrimonio</small>
      <div class="hero-v" data-n="${p.neto}">${fmt(p.neto)}</div>
      <div class="delta ${p.hoy >= 0 ? 'up' : 'down'}">
        ${S.inversiones.length ? `${flecha(p.hoy)} ${fmt(Math.abs(p.hoy))} hoy` : ''}
      </div>
      <div class="meta-sutil">
        <div class="barra-recovery"><div style="width:${Math.min(100, rec.pct * 100)}%"><span>${pct(rec.pct)}</span></div></div>
        <small style="opacity:.85">Meta: ${fmt(rec.meta)} &middot; faltan ${fmt(rec.falta)}</small>
      </div>
      <div class="hero-mini">
        <span data-act="ir" data-tab="cuentas">🏦 ${fmt(p.bancos)}</span>
        <span data-act="ir" data-tab="inversiones">📈 Inversiones ${fmt(p.inversionesBase)}</span>
        ${p.meme.filas.length ? `<button class="hero-meme" data-act="ir" data-tab="memecoin">Meme Coin <b>${p.meme.totalMXN == null ? fmtUSD(p.meme.totalUSD) : fmt(p.meme.totalMXN)}</b><small>${p.meme.filas.length} wallets · ${fmtUSD(p.meme.totalUSD)}</small></button>` : ''}
        <span data-act="ir" data-tab="tarjetas">💳 −${fmt(deudaTotal)}</span>
        ${p.prestamos.patrimonio ? `<span data-act="ir" data-tab="prestamos">Préstamos ${fmt(p.prestamos.patrimonio)}</span>` : ''}
      </div>
    </div>
    <div class="hero-spark">${sparkline(hist)}</div>
  </div>

  <details class="patrimonio-detalle"><summary>Cómo se calcula mi patrimonio</summary>
    <dl><div><dt>Mis cuentas</dt><dd>${fmt(p.bancos)}</dd></div><div><dt>Inversiones (sin Meme Coin)</dt><dd>${fmt(p.inversionesBase)}</dd></div>
    <div><dt>Meme Coin · ${p.meme.filas.length} wallets</dt><dd>${p.meme.totalMXN == null ? 'Conversión pendiente' : fmt(p.meme.totalMXN)}</dd></div>
    <div><dt>Préstamos incluidos (capital o saldo por cobrar)</dt><dd>${fmt(p.prestamos.patrimonio)}</dd></div><div><dt>Deuda de tarjetas</dt><dd>−${fmt(p.deuda)}</dd></div>
    <div><dt>Total</dt><dd>${fmt(p.neto)}</dd></div></dl><small>Las cuentas de otras personas no se suman. Los préstamos configurados por saldo incluyen la ganancia pactada en su valor por cobrar; todavía no es efectivo. Meme Coin conserva los saldos registrados; su equivalente en pesos cambia con el dólar.</small>
  </details>
  ${p.prestamos.filas.length ? `<section class="fondo-inicio"><div><small>Préstamos · dinero por cobrar</small><strong>${fmt(p.prestamos.pendiente)}</strong><span>Valor incluido en tu patrimonio: ${fmt(p.prestamos.patrimonio)}</span></div><button data-act="ir" data-tab="prestamosFondo">Ver fondo para reinvertir</button></section>` : ''}
  <div class="acciones-simples" aria-label="Registrar y actualizar">
    <div class="acciones-registro">
      <button class="primary" data-act="rapido" data-dir="out"><span aria-hidden="true">−</span> Registrar gasto</button>
      <button data-act="rapido" data-dir="in"><span aria-hidden="true">+</span> Registrar ingreso</button>
    </div>
    <div class="acciones-datos">
      <button data-act="elegirArchivo">Importar movimientos</button>
      <button data-act="actualizar">↻ Actualizar todo</button>
    </div>
  </div>

  ${imp ? panelImport() : ''}

  <div class="resumen-mes" aria-label="Resumen del mes">
    <span>${MESES[me]} ${a}</span>
    <div><small>Ingresos</small><b class="in">${fmt(entradas)}</b></div>
    <div><small>Gastos</small><b class="out">${fmt(totG)}</b></div>
    <div><small>Balance del mes</small><b>${fmt(entradas - totG)}</b></div>
  </div>

  ${(() => {
    const alertas = [];
    for (const t of S.tarjetas) {
      const c = ciclosTarjeta(t), d = c.pago ? diasEntre(hy, c.pago) : null, pagada = c.pago && t.pagadoHasta === isoDate(c.pago);
      if (c.pago && !t.cortePendiente && !pagada && t.saldoCorte > 0 && d >= 0 && d <= 4)
        alertas.push({ nombre: t.nombre, dias: d, monto: t.saldoCorte, fecha: c.pago });
    }
    return alertas.length ? alertas.map(a => `<div class="card pago-alert">
      <div class="pago-alert-inner">
        <span class="pago-alert-ic">${a.dias <= 1 ? '🚨' : '⚡'}</span>
        <div><b>${a.nombre}: paga ${fmt(a.monto)}</b><small>${a.dias === 0 ? 'Hoy es tu fecha límite' : a.dias === 1 ? 'Mañana vence' : `Vence en ${a.dias} días`} · ${fechaLarga(a.fecha)}</small></div>
      </div>
    </div>`).join('') : '';
  })()}

  ${(S.reembolsosPendientes || []).filter(r => r.estado === 'pendiente').map(r => `<div class="card" style="border-left:4px solid var(--brand);padding:14px">
    <b>💙 Reembolso pendiente: ${fmt(r.monto)}</b> · ${esc(r.tarjeta)} · ${esc(r.concepto)}<br>
    <small class="muted">Registrado: ${r.fecha} · Se reflejará en tu próximo estado de cuenta</small>
  </div>`).join('')}

  ${prox ? `<div class="card ingreso-rec">
    <div class="item"><span class="item-ic">💰</span>
      <div class="item-txt"><b>Ingreso recurrente: ${fmt(prox.monto)}</b><small>Cada día ${S.meta.ingresoRecurrente.dia} del mes</small></div>
      <div class="item-n"><span class="chip ${prox.dias <= 3 ? 'ok' : ''}">${prox.dias === 0 ? 'Hoy' : `en ${prox.dias} días`}</span><small>${fechaLarga(prox.fecha)}</small></div>
    </div>
  </div>` : ''}

  <div class="cols">
    <div class="card"><h3>Mis cuentas</h3>
      ${S.cuentas.filter(c => !c.persona).map(c => `<div class="item" data-act="ir" data-tab="cuentas">
        <span class="item-ic bank-logo">${bankLogo(c.banco)}</span>
        <div class="item-txt"><b>${esc(c.nombre)}</b><small>${esc(c.banco)}</small></div>
        <div class="item-n"><b>${fmt(c.saldo)}</b></div>
      </div>`).join('') || '<div class="empty">Sin cuentas propias</div>'}
      <button class="link" data-act="ir" data-tab="cuentas" style="margin-top:8px">Ver todas</button>
    </div>

    <div class="card"><h3>Tarjetas de crédito</h3>
      ${S.tarjetas.length ? S.tarjetas.map(t => {
        const uso = t.limite ? t.saldoActual / t.limite : 0;
        const ct = ciclosTarjeta(t), dp = ct.pago ? diasEntre(hy, ct.pago) : null, pagada = ct.pago && t.pagadoHasta === isoDate(ct.pago);
        return `<div class="item" data-act="ir" data-tab="tarjetas">
          <span class="item-ic bank-logo">${bankLogo(t.banco)}</span>
          <div class="item-txt"><b>${esc(t.nombre)}</b><small>${esc(t.banco)} · ${t.limite ? `límite ${fmt(t.limite)}` : 'sin límite'}</small>
            ${t.cortePendiente ? '<small class="muted">Pago al corte por confirmar</small>' : ct.pago && !pagada && t.saldoCorte > 0 && dp >= 0 ? `<small class="${dp <= 3 ? 'out' : 'muted'}">Pagar ${fmt(t.saldoCorte)} · ${dp === 0 ? 'hoy' : dp === 1 ? 'mañana' : dp + ' días'}</small>` : pagada ? '<small class="in">Pagada ✓</small>' : ''}
            ${t.gastoReportado ? `<small>Gasto reportado ${esc(t.gastoReportado.periodo)}: ${fmt(t.gastoReportado.monto)}</small>` : ''}</div>
          <div class="item-n"><b class="out">${fmt(t.saldoActual)}</b>
            ${t.limite ? `<small>Disponible ${fmt(Math.max(0, t.limite - t.saldoActual))}</small>` : ''}
            ${t.limite ? `<div class="barra-mini ${uso > 0.5 ? 'alerta' : uso > 0.3 ? 'medio' : ''}"><div style="width:${Math.min(100, uso * 100)}%"></div></div>` : ''}
          </div>
        </div>`;
      }).join('') : '<div class="empty">Sin tarjetas</div>'}
      <div class="persona-header" style="margin-top:8px;padding-top:8px;border-top:1px solid #eef0f3"><b>Deuda total</b><span class="n out"><b>${fmt(deudaTotal)}</b></span></div>
    </div>
  </div>

  <section class="card reembolsos-section" aria-label="Reembolsos por cuenta">
    <div class="toolbar"><div><h3>Reembolsos por cuenta</h3><p class="muted">BBVA: 90 días · Banamex: 45 días desde la primera compra registrada.</p></div><span class="sp"></span><button class="link" data-act="ir" data-tab="cuentasTerceros">Ver sus cuentas</button></div>
    ${reem.length ? `<div class="reembolso-total"><span>Total gastado en compras</span><b>${fmt(totalGastoPN)}</b></div>
    <div class="reembolsos-grid">${reem.map(r => {
      const estado = r.quedan === null ? 'Falta fecha' : r.quedan < 0 ? `Venció hace ${-r.quedan} ${r.quedan === -1 ? 'día' : 'días'}` : r.quedan === 0 ? 'Vence hoy' : r.quedan === 1 ? 'Falta 1 día' : `Faltan ${r.quedan} días`;
      const alerta = r.quedan !== null && r.quedan <= 14;
      return `<article class="reembolso-cuenta${alerta ? ' urgente' : ''}">
        <div class="bank-account">${bankLogo(r.cuenta.banco)}<div><b>${esc(r.cuenta.persona)}</b><small>${esc(r.cuenta.nombre)}</small></div></div>
        <div class="reembolso-importe"><div><small>Gastado en esta cuenta</small><strong>${fmt(r.gasto)}</strong></div><span class="chip ${alerta ? 'warn' : ''}">${estado}</span></div>
        ${r.devoluciones ? `<small class="muted">Se descontaron ${fmt(r.devoluciones)} de compras devueltas.</small>` : ''}
        <div class="reembolso-fecha"><span>Fecha de reembolso</span><b>${r.fin ? fechaLarga(new Date(r.fin + 'T00:00:00')) : 'Revisa las fechas de las compras'}</b></div>
        <div class="barra ${alerta ? 'alerta' : ''}" role="progressbar" aria-label="Plazo transcurrido de ${esc(r.cuenta.nombre)}" aria-valuemin="0" aria-valuemax="${r.plazo}" aria-valuenow="${Math.round(r.pct * r.plazo)}"><div style="width:${r.pct * 100}%"></div></div>
        <details class="reembolso-origen"><summary>Primera compra: ${r.primera ? fechaLarga(new Date(r.primera.fecha + 'T00:00:00')) : 'sin fecha válida'}</summary>
          <p>${r.primera ? `${esc(r.primera.concepto)} · ${fmt(r.primera.monto)}<br>` : ''}${r.cantidad} ${r.cantidad === 1 ? 'compra incluida' : 'compras incluidas'}; se excluyen las devueltas por completo. El plazo de ${r.plazo} días se recalcula si importas una compra anterior.</p>
        </details>
        ${r.cuenta.movimientosNota ? `<p class="reembolso-nota">${esc(r.cuenta.movimientosNota)}</p>` : ''}
      </article>`;
    }).join('')}</div>` : '<div class="empty">Las cuentas con compras registradas aparecerán aquí con su fecha de reembolso.</div>'}
    ${pendientesPN ? `<p class="tip warn">Hay ${pendientesPN} salidas por clasificar. <button class="link" data-act="ir" data-tab="movimientos">Revisarlas</button> para distinguir compras de transferencias.</p>` : ''}
  </section>

  <div class="cols">
    <div class="card"><h3>Por pagar</h3>
      ${pagosArr.length ? pagosArr.slice(0, 6).map(x => {
        const d = diasEntre(hy, x.fecha);
        return `<div class="item" data-act="ir" data-tab="${x.tab}"><span class="item-ic">${x.ic}</span>
          <div class="item-txt"><b>${esc(x.nombre)}</b><small>${fechaLarga(x.fecha)}</small></div>
          <div class="item-n"><b>${fmt(x.monto)}</b><span class="chip ${d <= 3 ? 'bad' : d <= 7 ? 'warn' : ''}">${d < 0 ? 'vencido' : d === 0 ? 'hoy' : d + ' días'}</span></div></div>`;
      }).join('') : '<div class="empty">Sin pagos pendientes</div>'}
    </div>
    <div class="card"><div class="toolbar"><h3 style="margin:0">Mercados</h3><span class="sp"></span><button class="link" data-act="ir" data-tab="inversiones">Ver portafolio</button></div>
      ${movers.length ? movers.map(({ i, v }) => `<div class="item" data-act="ir" data-tab="inversiones">
          <span class="item-ic sym">${esc(i.simbolo.toUpperCase().slice(0, 4))}</span>
          <div class="item-txt"><b>${esc(i.simbolo.toUpperCase())}</b><small>${fmtMon(v.precio, v.moneda)}</small></div>
          <div class="item-n"><b>${fmt(v.valor)}</b><span class="delta-chip ${v.cambioPct >= 0 ? 'up' : 'down'}">${flecha(v.cambioPct)} ${pct(Math.abs(v.cambioPct))}</span></div></div>`).join('')
        : '<div class="empty">Agrega acciones o cripto en Inversiones</div>'}
    </div>
  </div>

  <div class="cols">
    <div class="card"><h3>Destino de gastos</h3>${dona(rankingGastos(a, me))}</div>
    <div class="card tabla-scroll">
      <div class="toolbar"><h3 style="margin:0">Actividad reciente</h3><span class="sp"></span>
        <select data-f="filtroMovs" style="font-size:13px">
          <option value="todos"${(S.filtroMovs || 'todos') === 'todos' ? ' selected' : ''}>Todos</option>
          <option value="compras"${S.filtroMovs === 'compras' ? ' selected' : ''}>Solo compras</option>
          <option value="transferencias"${S.filtroMovs === 'transferencias' ? ' selected' : ''}>Solo transferencias</option>
        </select>
        <button class="link" data-act="ir" data-tab="movimientos">Ver todo</button>
      </div>
      ${(() => {
        let lista = recientes;
        if (S.filtroMovs === 'compras') lista = lista.filter(m => m.clase !== 'traspaso' && m.clase !== 'no_ingreso');
        else if (S.filtroMovs === 'transferencias') lista = lista.filter(m => m.clase === 'traspaso');
        return lista.length ? `<table>${lista.map(m => `<tr><td>${m.fecha.slice(5)}</td><td>${esc(m.concepto)}<br><small>${esc(m.cuenta || '')} · ${esc(m.categoria || CLASES[m.clase])}</small></td>
          <td class="n ${m.dir}">${m.dir === 'in' ? '+' : '−'}${fmt(m.monto)}</td></tr>`).join('')}</table>` : '<div class="empty">Sin movimientos</div>';
      })()}
    </div>
  </div>

  <div class="drop drop-chica" data-act="elegirArchivo">
    <div class="drop-ic">⬆</div>
    <div><b>Arrastra aquí tus estados de cuenta</b><p>CSV, TXT o JSON. Para PDF o capturas, compártelos en el chat para incorporarlos.</p></div>
  </div>
  <details class="card"><summary>¿Tu banco no deja descargar CSV? Pega aquí los movimientos copiados</summary>
    <textarea id="pegado" placeholder="Fecha,Concepto,Cargo,Abono&#10;01/09/2026,SPEI RECIBIDO CLIENTE,,11600.00"></textarea>
    <button class="primary" data-act="leerPegado">Leer texto</button>
  </details>`;
}

function panelImport() {
  const h = imp.rows[imp.headerIdx] || [];
  const sel = campo => `<select data-map="${campo}"><option value="-1">—</option>${h.map((c, i) => `<option value="${i}"${imp.map[campo] === i ? ' selected' : ''}>${esc(c || 'Columna ' + (i + 1))}</option>`).join('')}</select>`;
  const filas = filasImportables();
  return `<div class="card" id="panelImport" style="border-color:var(--brand)">
    <h3>Importar movimientos</h3><p class="muted">${esc(imp.archivo || 'Texto pegado')} · Elige la cuenta y revisa la vista previa.</p>
    <label>Cuenta o tarjeta <input id="impCuenta" list="listaCuentas" value="${esc(imp.cuenta || cuentaImport)}" placeholder="Selecciona o escribe una cuenta"></label>
    <details id="importFormato" class="import-formato" ${(imp.ajustesAbiertos ?? !filas.length) ? 'open' : ''}><summary>Revisar columnas y formato</summary>
    <div class="form-row">
      <label>Fila de encabezados <input type="number" min="1" max="${imp.rows.length}" value="${imp.headerIdx + 1}" data-imp="headerIdx" style="width:80px"></label>
      <label>Fecha ${sel('fecha')}</label><label>Concepto ${sel('concepto')}</label>
      <label>Cargo (salida) ${sel('cargo')}</label><label>Abono (entrada) ${sel('abono')}</label>
      <label>…o Monto con signo ${sel('monto')}</label>
      <label><span><input type="checkbox" data-imp="invertir" ${imp.invertir ? 'checked' : ''}> Invertir signo</span></label>
    </div></details>
    <div class="toolbar"><b>${filas.length} movimientos detectados</b><span class="muted">de ${imp.rows.length - imp.headerIdx - 1} filas</span><span class="sp"></span>
      <button data-act="cancelarImport">Cancelar</button>
      <button class="primary" data-act="confirmarImport" ${filas.length ? '' : 'disabled'}>Importar ${filas.length} movimientos</button></div>
    <div class="tabla-scroll"><table><tr><th>Fecha</th><th>Concepto</th><th class="n">Monto</th></tr>
      ${filas.slice(0, 10).map(f => `<tr><td>${f.fecha}</td><td>${esc(f.concepto)}</td><td class="n ${f.dir}">${f.dir === 'in' ? '+' : '−'}${fmt(f.monto)}</td></tr>`).join('')}
    </table></div>${filas.length > 10 ? `<p class="muted">…y ${filas.length - 10} más</p>` : ''}
  </div>`;
}

/* ---------- vistas: inversiones ---------- */
function vInversiones() {
  const p = patrimonio();
  const filas = S.inversiones.map(i => ({ i, v: valorInv(i) })).sort((x, y) => y.v.valor - x.v.valor);
  const grupos = [['accion', 'Acciones'], ['cripto', 'Cripto'], ['manual', 'Otras inversiones']]
    .map(([tipo, nombre]) => ({ tipo, nombre, filas: filas.filter(x => x.i.tipo === tipo) }))
    .map(g => ({ ...g, valor: g.filas.reduce((sum, x) => sum + x.v.valor, 0) }));
  const conCosto = filas.filter(x => +x.i.costo > 0), costoCompleto = filas.length && conCosto.length === filas.length && !p.meme.filas.length;
  const sinPrecio = filas.filter(x => x.v.sinPrecio).length;
  const act = S.preciosTs ? new Date(S.preciosTs).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'pendientes';
  const html = `
  <section class="card portafolio-resumen" aria-label="Resumen del portafolio">
    <div class="portafolio-valor"><small>Valor actual del portafolio · MXN</small><strong>${fmt(p.inv)}</strong>
      <span class="${p.hoy >= 0 ? 'in' : 'out'}">${flecha(p.hoy)} ${fmt(Math.abs(p.hoy))} hoy</span></div>
    <div class="portafolio-desglose">${p.meme.filas.length ? `<div><small>Meme Coin · wallets</small><b>${p.meme.totalMXN == null ? 'Conversión pendiente' : fmt(p.meme.totalMXN)}</b></div>` : ''}${grupos.filter(g => g.filas.length).map(g => `<div><small>${g.nombre}</small><b>${fmt(g.valor)}</b></div>`).join('')}
      <div><small>${costoCompleto ? 'Capital aportado' : conCosto.length ? 'Capital aportado (parcial)' : 'Capital aportado'}</small><b>${conCosto.length ? fmt(p.costo) : 'Sin registrar'}</b></div>
      ${costoCompleto ? `<div><small>Ganancia total</small><b class="${p.inv >= p.costo ? 'in' : 'out'}">${fmt(p.inv - p.costo)}</b></div>` : ''}
    </div>
  </section>
  ${p.meme.filas.length ? '<p class="muted">El total incluye Meme Coin una sola vez. Sus saldos conservan los valores registrados.</p>' : ''}
  <div class="toolbar precios-toolbar"><small class="muted">Precios: ${act} · consulta automática cada minuto</small><span class="sp"></span>
    <button data-act="precios">↻ Actualizar precios</button></div>
  ${sinPrecio ? `<p class="tip warn">${sinPrecio} activos sin cotización. Su valor usa el costo registrado hasta recibir un precio.</p>` : ''}
  ${grupos.filter(g => g.filas.length).map(g => `<section class="card portafolio-grupo" aria-label="${g.nombre}">
    <div class="toolbar"><h3>${g.nombre} <small class="muted">${g.filas.length} activos</small></h3><span class="sp"></span><b>${fmt(g.valor)}</b></div>
    <div class="tabla-scroll"><table><thead><tr><th>Activo</th><th class="n">Valor (MXN)</th><th class="n">Precio unitario</th><th class="n">Hoy</th><th class="n">Cantidad</th><th class="n">Ganancia</th><th></th></tr></thead><tbody>
    ${g.filas.map(({ i, v }) => {
      const k = clavePrecio(i), antes = preciosPrevios[k];
      const fl = antes && v.precio && antes !== v.precio ? (v.precio > antes ? 'flash-up' : 'flash-down') : '';
      return `<tr data-inv="${i.id}" class="${fl}">
        <td><b>${esc(i.simbolo.toUpperCase())}</b><br><small>${esc(i.nombre || S.precios[k]?.nombre || '')}${i.plataforma ? ' · ' + esc(i.plataforma) : ''}</small></td>
        <td class="n"><b>${fmt(v.valor)}</b></td>
        <td class="n">${v.precio ? fmtMon(v.precio, v.moneda) : i.tipo === 'manual' ? '—' : '<span class="chip warn">sin precio</span>'}</td>
        <td class="n">${v.precio ? `<span class="delta-chip ${v.cambioPct >= 0 ? 'up' : 'down'}">${flecha(v.cambioPct)} ${pct(Math.abs(v.cambioPct))}</span>` : '—'}</td>
        <td class="n">${i.tipo === 'manual' ? '—' : num(i.cantidad)}</td>
        <td class="n ${v.pl >= 0 ? 'in' : 'out'}">${i.costo ? `${v.pl >= 0 ? '+' : '−'}${fmt(Math.abs(v.pl))}` : '<small class="muted">Falta costo</small>'}</td>
        <td style="white-space:nowrap"><button class="link" aria-label="Editar ${esc(i.simbolo)}" data-act="editarInv">✎</button><button class="link danger" aria-label="Borrar ${esc(i.simbolo)}" data-act="borrarInv">✕</button></td></tr>`;
    }).join('')}</tbody></table></div>${g.tipo === 'cripto' ? accesoMemeCoin() : ''}</section>`).join('') || '<div class="empty">Agrega tu primera inversión.</div>'}
  ${!grupos.find(g => g.tipo === 'cripto').filas.length ? `<section class="card"><h3>Criptomonedas</h3>${accesoMemeCoin()}</section>` : ''}
  <details class="card"><summary id="invTitulo">Agregar inversión</summary>
    <form id="formInv" class="form-row">
      <input type="hidden" name="iid">
      <label>Tipo <select name="tipo">${Object.entries(TIPOS_INV).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label>Símbolo o nombre <input name="simbolo" required placeholder="AAPL, WALMEX.MX, BTC…" style="text-transform:uppercase"></label>
      <label>Cantidad <input name="cantidad" type="number" step="any" min="0" placeholder="Títulos o monedas"></label>
      <label>Total invertido (MXN) <input name="costo" type="number" step="0.01" min="0"></label>
      <label>Valor actual (solo "Otro") <input name="valorManual" type="number" step="0.01" min="0"></label>
      <label>Plataforma <input name="plataforma" placeholder="GBM, Bitso, Binance…"></label>
      <button class="primary">Guardar</button>
    </form>
    <p class="muted">EE.UU.: AAPL, NVDA, VOO, QQQ… · Bolsa Mexicana: agrega <b>.MX</b> (WALMEX.MX, AMXB.MX, GFNORTEO.MX, FIBRAPL14.MX) · Cripto: BTC, ETH, SOL… · CETES, fondos o pagarés: tipo "Otro" y actualiza su valor a mano.</p>
  </details>
  ${filas.length ? `<details class="card"><summary>Ver distribución y evolución</summary><div class="cols portafolio-graficas"><div>${dona([...grupos.filter(g => g.valor).map(g => [g.nombre, g.valor]), ...(p.meme.totalMXN ? [['Meme Coin', p.meme.totalMXN]] : [])])}</div><div>${sparkline(historialComparable().slice(-90).map(h => h.inv), 300, 80, '#0047cc')}</div></div></details>` : ''}`;
  preciosPrevios = {};
  return html;
}

/* ---------- wallets de Meme Coin ---------- */
const fmtUSD = n => 'US$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nombresToken = { KASH: 'KASH', SOL: 'Solana', USDC: 'USDC' };
function cantidadToken(t) {
  if (t.cantidad == null || t.cantidadCompleta === false) return 'Cantidad no visible';
  const aprox = t.cantidadAproximada || t.aproximada;
  return `${aprox ? '≈ ' : ''}${t.cantidad >= 1000000 ? num(t.cantidad / 1000000) + ' M' : num(t.cantidad)} ${esc(t.simbolo)}`;
}
function fechaWallet(w) { return w.actualizado ? fechaLarga(new Date(w.actualizado + 'T12:00:00')) : 'Fecha pendiente'; }
function accesoMemeCoin() {
  const r = resumenWallets();
  return `<div class="meme-acceso"><div><h3>Meme Coin</h3><p class="muted">${r.filas.length} wallets · KASH, Solana y USDC</p></div>
    <div class="meme-acceso-valor"><b>${fmtUSD(r.totalUSD)}</b><small>${r.totalMXN == null ? 'Conversión a MXN pendiente' : fmt(r.totalMXN) + ' MXN'}</small></div>
    <button data-act="ir" data-tab="memecoin">Ver mis wallets</button></div>`;
}
function vMemeCoin() {
  const r = resumenWallets();
  return `<button class="link meme-volver" data-act="ir" data-tab="inversiones">‹ Portafolio · Criptomonedas</button>
    <section class="card meme-resumen" aria-label="Total de Meme Coin">
      <div><small>Total de mis wallets · USD</small><strong>${fmtUSD(r.totalUSD)}</strong>
        <p>${r.totalMXN == null ? 'Equivalente en pesos pendiente de tipo de cambio' : fmt(r.totalMXN) + ' MXN'} <span class="muted">· ${r.filas.length} wallets</span></p>
      </div><div class="meme-fuente"><b>Saldos registrados</b><p>Valores de tus capturas o actualizaciones manuales. No están conectados a la blockchain.</p>
        <small>${r.tipoCambio == null ? 'El patrimonio los incluirá cuando haya un tipo de cambio disponible.' : `Incluidos una sola vez en tu patrimonio · USD/MXN ${num(r.tipoCambio)}`}</small>
      </div>
    </section>
    <section class="meme-tokens" aria-label="Desglose por criptomoneda">
      ${r.tokens.map(t => `<div class="meme-token"><span class="token-marca token-${esc(t.simbolo.toLowerCase())}" aria-hidden="true">${t.simbolo === 'SOL' ? '≋' : t.simbolo === 'USDC' ? '$' : 'K'}</span>
        <div><h3>${esc(nombresToken[t.simbolo] || t.simbolo)}</h3><strong>${fmtUSD(t.valorUSD)}</strong><small>${cantidadToken(t)}</small></div></div>`).join('')}
    </section>
    ${r.diferenciaUSD ? `<p class="meme-diferencia">Diferencia por conciliar: <b>${fmtUSD(r.diferenciaUSD)}</b>. Los totales mostrados en las wallets difieren de la suma de los tokens visibles. Conservamos el total mostrado; la diferencia no se asigna a ninguna moneda.</p>` : ''}
    <div class="toolbar"><h2>Mis wallets</h2><span class="sp"></span><button data-act="nuevaWallet">Agregar wallet</button></div>
    <div class="wallet-grid">${r.filas.map(w => `<article class="card wallet-card" aria-label="${esc(w.nombre)}">
      <header><div><h3>${esc(w.nombre)}</h3><small>${esc(w.titular || '')}</small></div><div class="wallet-total"><b>${fmtUSD(w.totalUSD)}</b><small>Total registrado</small></div></header>
      <div class="wallet-activos">${w.tokens.map(t => `<div><div><b>${esc(nombresToken[t.simbolo] || t.simbolo)}</b><small>${cantidadToken(t)}</small></div><strong>${fmtUSD(t.valorUSD)}</strong></div>`).join('')}</div>
      ${w.diferenciaUSD ? `<small class="wallet-diferencia">Por conciliar: ${fmtUSD(w.diferenciaUSD)}</small>` : ''}
      <footer><small>Registrado: ${fechaWallet(w)}</small><button class="link" data-act="editarWallet" data-wallet="${esc(w.id)}" aria-label="Actualizar ${esc(w.nombre)}">Actualizar</button></footer>
    </article>`).join('') || '<p class="empty">Agrega una wallet con su total y el valor de sus tokens.</p>'}</div>
    <details class="card" id="walletEditor"><summary id="walletTitulo">Agregar wallet</summary>
      <form id="formWallet">
        <input type="hidden" name="wid">
        <div class="form-row"><label>Nombre <input name="nombre" placeholder="Holder 9" required maxlength="80"></label>
          <label>Usuario (opcional) <input name="titular" placeholder="@usuario" maxlength="80"></label>
          <label>Fecha del registro <input type="date" name="actualizado" value="${hoyISO()}" required></label></div>
        ${['KASH', 'SOL', 'USDC'].map(s => `<fieldset class="wallet-campos"><legend>${nombresToken[s]}</legend><div class="form-row">
          <label>Cantidad de tokens <input name="cantidad${s}" type="number" min="0" step="any" placeholder="Opcional"></label>
          <label>Valor total (USD) <input name="valor${s}" type="number" min="0" step="0.01" value="0" required></label>
          <label class="wallet-aprox"><input name="aprox${s}" type="checkbox"> Cantidad aproximada</label></div></fieldset>`).join('')}
        <div class="form-row"><label>Total mostrado por la wallet (USD) <input name="totalUSD" type="number" min="0" step="0.01" placeholder="Vacío = suma de tokens"></label></div>
        <p class="muted">Deja el total vacío para sumar los tokens. Si registras un total distinto, verás la diferencia por conciliar.</p>
        <button class="primary">Guardar wallet</button> <button type="button" data-act="cancelarWallet">Cancelar</button>
      </form>
    </details>`;
}
function editarWallet(w) {
  const f = $('#formWallet'); f.reset(); $('#walletEditor').open = true;
  $('#walletTitulo').textContent = w ? 'Actualizar ' + w.nombre : 'Agregar wallet';
  f.elements.wid.value = w?.id || '';
  if (w) {
    for (const k of ['nombre', 'titular', 'actualizado', 'totalUSD']) f.elements[k].value = w[k] ?? '';
    for (const t of w.tokens) if (f.elements['valor' + t.simbolo]) {
      f.elements['cantidad' + t.simbolo].value = t.cantidad ?? '';
      f.elements['valor' + t.simbolo].value = t.valorUSD;
      f.elements['aprox' + t.simbolo].checked = !!t.cantidadAproximada;
    }
  }
  f.dataset.editando = 'true';
  f.scrollIntoView({ behavior: 'smooth', block: 'start' }); f.elements.nombre.focus({ preventScroll: true });
}

/* ---------- préstamos personales ---------- */
const fechaPrestamo = s => new Date(s + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
function vPrestamos(soloFondo = false) {
  const fondo = Prestamos.fondo(S.prestamos, S.abonosPrestamos, hoyISO());
  const r = soloFondo ? fondo : resumenPrestamos();
  return `<div class="prestamos-encabezado"><div><p class="eyebrow">DINERO QUE ME DEBEN · MXN</p><h2>${soloFondo ? 'Fondo para reinvertir' : 'Mis préstamos'}</h2><p class="muted">Personas, pagos semanales y ganancias en un solo lugar.</p></div><button class="primary" data-act="nuevoPrestamo">+ Registrar préstamo</button></div>
    <div class="prestamo-tabs"><button data-act="ir" data-tab="prestamos" class="${!soloFondo ? 'primary' : ''}">Todos los préstamos</button><button data-act="ir" data-tab="prestamosFondo" class="${soloFondo ? 'primary' : ''}">Fondo para reinvertir</button></div>
    ${soloFondo ? `<section class="fondo-reinversion"><div><small>Cobros disponibles para reinvertir</small><strong>${fmt(fondo.disponible)}</strong><p>Abonos recibidos ${fmt(fondo.cobrado)} − reinvertido ${fmt(fondo.reinvertido)}</p></div><div><button data-act="reinvertirPrestamo" ${fondo.disponible <= 0 ? 'disabled' : ''}>Registrar reinversión</button><p>Es el destino que reservas para los cobros. Este disponible ya forma parte del dinero recibido en tus cuentas; no se suma otra vez al patrimonio.</p></div></section>` : ''}
    ${soloFondo && fondo.excesoReinversion ? `<p class="tip warn">Las reinversiones superan los cobros en ${fmt(fondo.excesoReinversion)}. Revisa abonos anulados o reinversiones registradas.</p>` : ''}
    ${soloFondo && r.filas.length ? `<div class="fondo-personas" aria-label="Por cobrar por persona">${[...new Set(r.filas.map(p=>p.persona))].map(persona=>`<div><span>${esc(persona)}</span><strong>${fmt(r.filas.filter(p=>p.persona===persona).reduce((s,p)=>s+p.pendiente,0))}</strong></div>`).join('')}</div>` : ''}
    ${r.patrimonioNominal ? `<p class="prestamo-valor">${fmt(r.patrimonioNominal)} incluidos en el patrimonio por su saldo nominal por cobrar. Puede contener ganancia pactada; no es dinero disponible todavía.</p>` : ''}
    ${r.desglosesPendientes ? `<p class="tip warn">${r.desglosesPendientes} préstamo(s) con capital y ganancia pendientes de desglosar. Su calendario conserva los importes registrados.</p>` : ''}
    <div class="kpis prestamos-kpis">
      <div class="kpi main"><small>Pendiente por cobrar</small>${kv(r.pendiente)}<small>Capital + ganancia pendiente</small></div>
      <div class="kpi"><small>Capital original identificado</small>${kv(r.capital)}<small>${fmt(r.capitalPendiente)} de capital identificado por recuperar${r.desglosesPendientes ? " · desglose incompleto" : ""}</small></div>
      <div class="kpi"><small>Ganancia ${r.desglosesPendientes ? "identificada" : "pactada"}</small>${kv(r.ganancia)}<small>${fmt(r.gananciaCobrada)} ya cobrada</small></div>
      <div class="kpi"><small>Abonos recibidos</small>${kv(r.cobrado)}<small>${r.vencido ? fmt(r.vencido) + ' vencidos por cobrar' : 'Sin cuotas vencidas'}</small></div>
    </div>
    ${r.filas.length ? `<div class="prestamo-lista">${r.filas.map(p => `<article class="card prestamo" aria-label="Préstamo a ${esc(p.persona)}">
      <header><div><h3>${esc(p.persona)}</h3><small>${p.planPagos ? p.cuotas.length + (p.cuotas.length === 1 ? " pago registrado" : " pagos registrados") : p.semanas + " semanas"}${p.fecha ? " · Entregado " + fechaPrestamo(p.fecha) : " · Fecha de entrega sin confirmar"}${p.fondo === "reinversion" ? " · Fondo para reinvertir" : ""}</small></div><span class="prestamo-estado ${p.vencido ? 'vencido' : ''}">${p.estado}</span></header>
      <div class="prestamo-numeros"><div><small>Me debe</small><strong>${fmt(p.pendiente)}</strong></div><div><small>${p.planPagos ? "Próxima cuota pendiente" : "Pago semanal"}</small><b>${fmt(p.planPagos ? p.proximo?.pendiente || 0 : p.cuotas[0].importe)}</b></div><div><small>Próximo pago pendiente</small><b>${p.proximo ? fechaPrestamo(p.proximo.fecha) : 'Todo cobrado'}</b></div></div>
      <progress max="${p.total}" value="${p.cobrado}" aria-label="Cobrado a ${esc(p.persona)}"></progress>
      <p class="prestamo-avance">${fmt(p.cobrado)} de ${fmt(p.total)} cobrados · ${p.semanasPagadas} de ${p.cuotas.length} cuotas cubiertas${p.registroParcial ? " desde el saldo registrado" : ""}</p>
      <div class="prestamo-datos"><span>Capital original <b>${p.capital == null ? "Por confirmar" : fmt(p.capital)}</b></span><span>${p.registroParcial ? "Ganancia del saldo registrado" : "Ganancia pactada"} <b>${p.desglosePendiente ? "Por confirmar" : fmt(p.ganancia)}</b></span><span>Ganancia cobrada <b>${p.desglosePendiente ? "Por confirmar" : fmt(p.gananciaCobrada)}</b></span></div>
      ${p.notas ? `<p>${esc(p.notas)}</p>` : ''}
      ${p.exceso ? `<p class="out">Hay ${fmt(p.exceso)} de abonos en exceso. Revisa los registros antes de agregar otro.</p>` : ''}
      <details><summary>Calendario y abonos</summary><p class="muted">Termina el ${fechaPrestamo(p.fechaFinal)}. Los abonos cubren primero la cuota más antigua.</p>
        <div class="tabla-scroll"><table><thead><tr><th>Pago</th><th>Fecha</th><th class="n">Cuota</th><th class="n">Falta</th></tr></thead><tbody>${p.cuotas.map(c => `<tr><td>${c.numero}</td><td>${fechaPrestamo(c.fecha)}</td><td class="n">${fmt(c.importe)}</td><td class="n ${c.fecha < hoyISO() && c.pendiente ? 'out' : ''}">${fmt(c.pendiente)}</td></tr>`).join('')}</tbody></table></div>
        <h4>Abonos registrados</h4>${(S.abonosPrestamos || []).filter(a => a.prestamoId === p.id).map(a => `<div class="prestamo-abono ${a.anulado ? 'anulado' : ''}"><span>${fechaPrestamo(a.fecha)} · ${fmt(a.monto)} ${a.nota ? '· ' + esc(a.nota) : ''}${a.anulado ? ' · Anulado' : ''}</span>${!a.anulado ? `<button class="link danger" data-act="anularAbono" data-abono="${esc(a.id)}">Anular</button>` : ''}</div>`).join('') || '<p class="muted">Todavía no hay abonos.</p>'}
      </details>
      <footer><small>${p.incluirPatrimonio && p.criterioPatrimonio === 'saldo' ? 'Saldo por cobrar incluido en patrimonio · aún no es efectivo' : p.incluirPatrimonio && !p.desglosePendiente ? 'Capital pendiente incluido en patrimonio' : p.desglosePendiente ? 'Capital por conciliar antes de sumarlo al patrimonio' : 'Solo seguimiento · no se suma al patrimonio'}</small><button data-act="editarPrestamo" data-prestamo="${esc(p.id)}">Editar</button>${p.pendiente && !p.exceso ? `<button class="primary" data-act="abonarPrestamo" data-prestamo="${esc(p.id)}">Registrar abono</button>` : ''}</footer>
    </article>`).join('')}</div>` : `<section class="card prestamos-vacio"><span aria-hidden="true">↗</span><h3>Tu primer préstamo empieza aquí</h3><p>Registra a quién le prestaste, cuánto y en cuántas semanas te pagará.<br>Verás cada cobro pendiente y la ganancia que vas recibiendo.</p><button data-act="nuevoPrestamo">Registrar mi primer préstamo</button></section>`}
    <details class="card" id="prestamoEditor"><summary id="prestamoTitulo">Registrar préstamo</summary>
      <form id="formPrestamo"><input type="hidden" name="pid">
        <div class="form-row"><label>Apartado<select name="fondo"><option value="">Préstamos generales</option><option value="reinversion" ${soloFondo ? 'selected' : ''}>Fondo para reinvertir</option></select></label><label>De cobros anteriores reinvierto (MXN)<input name="reinvertido" type="number" min="0" step="0.01" value="0"></label></div>
        <div class="form-row"><label>Quién me debe<input name="persona" required maxlength="100" placeholder="Nombre de la persona"></label><label>Capital prestado (MXN)<input name="capital" type="number" min="0.01" max="10000000000" step="0.01" placeholder="0.00"></label><label>Ganancia total pactada (MXN)<input name="ganancia" type="number" min="0" max="10000000000" step="0.01" required value="0"></label></div>
        <div class="form-row"><label>Plazo en semanas<input name="semanas" type="number" min="1" max="520" step="1" required value="10"></label><label>Fecha de entrega (si la conoces)<input name="fecha" type="date" value="${hoyISO()}"></label><label>Primer pago semanal<input name="primerPago" type="date" required value="${Prestamos.sumarDias(hoyISO(), 7)}"></label></div>
        <details class="prestamo-plan"><summary>Calendario personalizado o préstamo ya iniciado</summary><p class="muted">Usa una línea por pago: fecha AAAA-MM-DD, espacio y monto en MXN. Conserva pagos distintos o varios en el mismo día.</p><label>Pagos exactos<textarea name="planPagos" rows="4" placeholder="2026-10-26 1200.00"></textarea></label>
        <div class="form-row"><label>Qué estoy registrando<select name="tipoRegistro"><option value="completo">Préstamo completo</option><option value="saldo_pendiente">Solo lo que falta por cobrar</option></select></label><label>Capital que queda en ese saldo (MXN)<input name="capitalPendienteInicial" type="number" min="0" step="0.01" placeholder="Vacío = por confirmar"></label></div><p class="muted">Si registras solo lo pendiente, los pagos anteriores y su ganancia no se inventan. El capital pendiente permite separar la ganancia de lo que todavía te deben.</p></details>
        <div id="prestamoProyeccion" class="prestamo-proyeccion" aria-live="polite">Ingresa el capital para calcular los pagos.</div>
        <label>Notas (opcional)<textarea name="notas" maxlength="1000" rows="2" placeholder="Acuerdo o detalle del préstamo"></textarea></label>
        <label class="prestamo-check"><input type="checkbox" name="incluirPatrimonio"> Incluir este préstamo en mi patrimonio</label><label>Valor que sumo<select name="criterioPatrimonio"><option value="capital">Solo capital pendiente</option><option value="saldo">Saldo por cobrar (capital y ganancia pactada)</option></select></label><p class="muted">Inclúyelo solo si tus saldos bancarios ya excluyen el dinero prestado. El saldo por cobrar es el valor nominal del adeudo; todavía no es efectivo ni ganancia cobrada.</p>
        <button class="primary">Guardar préstamo</button> <button type="button" data-act="cancelarPrestamo">Cancelar</button>
      </form>
    </details>
    <section class="card" id="abonoEditor" hidden><h3 id="abonoTitulo">Registrar abono</h3><form id="formAbono"><input name="pid" type="hidden"><div class="form-row"><label>Abono recibido (MXN)<input name="monto" type="number" min="0.01" step="0.01" required></label><label>Fecha del abono<input name="fecha" type="date" max="${hoyISO()}" value="${hoyISO()}" required></label><label>Nota (opcional)<input name="nota" maxlength="300" placeholder="Ej. transferencia recibida"></label></div><button class="primary">Guardar abono</button> <button type="button" data-act="cancelarPrestamo">Cancelar</button></form></section>
    <p class="prestamo-aclaracion">Este apartado lleva el control de tus préstamos. No modifica los saldos de tus bancos: actualízalos cuando entregues o recibas dinero. El fondo separa los cobros que puedes volver a prestar. Cuando el desglose está confirmado, cada abono se reparte proporcionalmente entre capital y ganancia. Si falta ese dato, solo se reduce el saldo por cobrar.</p>`;
}
function datosPrestamo(f) {
  const v = k => f.elements[k].value;
  const lineas = v('planPagos').trim();
  const plan = lineas ? lineas.split(/\n/).filter(l=>l.trim()).map(l=>{ const [fecha, monto] = l.trim().split(/\s+/); return {fecha, monto:Number(monto)}; }) : null;
  const existente = S.prestamos.find(p=>p.id === v('pid'));
  return { id: v('pid') || uid(), persona: v('persona').trim(), capital: v('capital') === '' ? null : Number(v('capital')), ganancia: Number(v('ganancia')),
    semanas: plan ? plan.length : Number(v('semanas')), fecha: v('fecha') || null, primerPago: plan?.[0]?.fecha || v('primerPago'), notas: v('notas').trim(), incluirPatrimonio: f.elements.incluirPatrimonio.checked,
    planPagos:plan, tipoRegistro:v('tipoRegistro'), capitalPendienteInicial: v('capitalPendienteInicial') === '' ? null : Number(v('capitalPendienteInicial')),
    criterioPatrimonio:v('criterioPatrimonio'), fondo:v('fondo'), reinvertido:Number(v('reinvertido')), registrado:existente?.registrado || hoyISO() };
}
function proyeccionPrestamo() {
  const f = $('#formPrestamo'), p = datosPrestamo(f), d = Prestamos.detalle(p, [], hoyISO());
  f.elements.ganancia.disabled = p.tipoRegistro === 'saldo_pendiente';
  $('#prestamoProyeccion').textContent = d ? `Total por cobrar: ${fmt(d.total)} · ${d.cuotas.length} pagos${p.planPagos ? ' según calendario' : ' de ' + fmt(d.cuotas[0].importe)} · Termina ${fechaPrestamo(d.fechaFinal)}${d.desglosePendiente ? ' · Capital y ganancia por confirmar' : ''}` : 'Completa los datos para calcular los pagos.';
}
function editarPrestamo(p) {
  const f = $('#formPrestamo'); f.reset(); $('#prestamoEditor').open = true;
  $('#prestamoTitulo').textContent = p ? 'Editar préstamo a ' + p.persona : 'Registrar préstamo';
  f.elements.pid.value = p?.id || '';
  if (p) for (const k of ['persona', 'capital', 'ganancia', 'semanas', 'fecha', 'primerPago', 'notas', 'fondo', 'reinvertido', 'capitalPendienteInicial']) f.elements[k].value = p[k] ?? '';
  f.elements.criterioPatrimonio.value = p?.criterioPatrimonio || 'capital';
  f.elements.tipoRegistro.value = p?.tipoRegistro || 'completo';
  f.elements.planPagos.value = p?.planPagos?.map(c=>`${c.fecha} ${c.monto.toFixed(2)}`).join('\n') || '';
  f.querySelector('.prestamo-plan').open = !!p?.planPagos;
  f.elements.incluirPatrimonio.checked = !!p?.incluirPatrimonio;
  f.dataset.editando = 'true'; proyeccionPrestamo(); f.scrollIntoView({ behavior: 'smooth', block: 'start' }); f.elements.persona.focus({ preventScroll: true });
}
function abonarPrestamo(p) {
  if (!p) return;
  const d = Prestamos.detalle(p, S.abonosPrestamos, hoyISO()), f = $('#formAbono'); f.reset();
  $('#abonoEditor').hidden = false; $('#abonoTitulo').textContent = 'Abono de ' + p.persona + ' · Faltan ' + fmt(d.pendiente);
  f.elements.pid.value = p.id; f.elements.monto.max = d.pendiente; f.elements.fecha.min = p.fecha || p.registrado || '';
  f.dataset.editando = 'true'; f.scrollIntoView({ behavior: 'smooth', block: 'center' }); f.elements.monto.focus({ preventScroll: true });
}

/* ---------- vistas: cuentas ---------- */
function tablaCuentas(ctas) {
  return `<table><tr><th>Cuenta</th><th>Tipo</th><th class="n">Saldo</th><th>Actualizado</th><th></th></tr>
    ${ctas.map(c => `<tr data-cta="${c.id}"><td><div class="bank-account">${bankLogo(c.banco)}<div><b>${esc(c.nombre)}</b>${c.banco ? `<small>${esc(c.banco)}${c.persona ? ` · <span style="color:var(--brand)">${esc(c.persona)}</span>` : ''}</small>` : ''}</div></div></td>
      <td>${TIPOS_CTA[c.tipo] || esc(c.tipo)}</td>
      <td class="n"><input type="number" step="0.01" data-cta-saldo value="${c.saldo ?? ''}" style="width:140px;text-align:right"></td>
      <td><small>${c.actualizado || '—'}</small>${c.saldoNota ? `<small class="saldo-nota">${esc(c.saldoNota)}</small>` : ''}</td>
      <td><button class="link danger" data-act="borrarCta">✕</button></td></tr>`).join('')}</table>`;
}
function vCuentas() {
  const p = patrimonio(), ctasPropias = S.cuentas.filter(c => !c.persona);
  return `<div class="kpis">
    <div class="kpi main"><small>Mis cuentas</small>${kv(p.bancos)}<small>${ctasPropias.length} cuentas</small></div>
    <div class="kpi"><small>Deuda en tarjetas</small>${kv(p.deuda, 'out')}</div>
    <div class="kpi"><small>Disponible real</small>${kv(p.bancos - p.deuda, p.bancos - p.deuda >= 0 ? 'in' : 'out')}<small>cuentas − tarjetas</small></div>
  </div>
  <div class="card tabla-scroll"><h3>Mis cuentas</h3>
    ${ctasPropias.length ? tablaCuentas(ctasPropias) : '<div class="empty">Agrega tus cuentas de banco, ahorro y efectivo 👇</div>'}
  </div>
  <div class="card"><h3>Agregar a Mis cuentas</h3>
    <form id="formCta" class="form-row">
      <label>Nombre <input name="nombre" required placeholder="Ej. BBVA nómina"></label>
      <label>Banco <input name="banco" list="listaBancos"></label>
      <label>Tipo <select name="tipo">${Object.entries(TIPOS_CTA).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label>Saldo actual <input name="saldo" type="number" step="0.01"></label>
      <button class="primary">Agregar</button>
    </form>
    <datalist id="listaBancos">${BANCOS.map(b => `<option value="${b}">`).join('')}</datalist>
    <p class="muted">Cuando captures un gasto o ingreso rápido (botón +) eligiendo esta cuenta, su saldo se ajusta solo.</p>
  </div>`;
}
function vCuentasTerceros() {
  const ctas = S.cuentas.filter(c => c.persona);
  if (!ctas.length) return '<div class="card"><div class="empty">No hay cuentas de otras personas.</div></div>';
  const personas = [...new Set(ctas.map(c => c.persona))];
  return `<div class="kpis">
    <div class="kpi main"><small>Saldo de otras personas</small>${kv(patrimonio().bancosPN)}<small>${ctas.length} cuentas</small></div>
  </div>
  ${personas.map(persona => {
    const cuentasPersona = ctas.filter(c => c.persona === persona);
    const saldo = cuentasPersona.reduce((total, c) => total + (+c.saldo || 0), 0);
    return `<div class="card tabla-scroll"><h3>${esc(persona)}</h3>
      <p class="muted">${cuentasPersona.length} cuentas · Saldo: ${fmt(saldo)}</p>
      ${tablaCuentas(cuentasPersona)}
    </div>`;
  }).join('')}`;
}

/* ---------- captura rápida ---------- */
function abrirRapido(dir = 'out') {
  const f = $('#formRapido');
  f.reset();
  f.querySelector(`[name=dir][value=${dir}]`).checked = true;
  f.fecha.value = hoyISO();
  f.categoria.value = '';
  const opciones = [...S.cuentas.map(c => c.nombre), ...S.tarjetas.map(t => t.nombre)];
  f.cuenta.innerHTML = '<option value="">— sin cuenta —</option>' + opciones.map(n => `<option${n === S.ultimaCuenta ? ' selected' : ''}>${esc(n)}</option>`).join('');
  $('#rapidoCats').innerHTML = CATS_RAPIDAS.map(c =>
    `<button type="button" class="cat-rapida" data-cat="${esc(c.nombre)}"><span class="cat-emoji">${c.emoji}</span><span class="cat-label">${esc(c.nombre.replace(/ \(.*\)/, ''))}</span></button>`
  ).join('');
  $('#rapidoMontos').innerHTML = [50, 100, 200, 500, 1000, 2000].map(n =>
    `<button type="button" class="monto-chip" data-monto="${n}">$${n >= 1000 ? (n/1000)+'k' : n}</button>`
  ).join('');
  ajustarRapido();
  $('#dlgRapido').showModal();
  setTimeout(() => f.monto.focus(), 50);
}
function ajustarRapido() {
  const f = $('#formRapido'), ingreso = f.querySelector('[name=dir]:checked').value === 'in';
  $('#lblNegocio').textContent = ingreso ? 'Es ingreso de mi actividad (cuenta para el SAT)' : 'Es gasto de mi negocio (SAT)';
  $('#rapidoCats').style.display = ingreso ? 'none' : '';
  $('#lblCfdi').style.display = ingreso ? 'none' : '';
  f.negocio.checked = ingreso;
}
$('#formRapido').addEventListener('change', e => { if (e.target.name === 'dir') ajustarRapido(); });
$('#rapidoCats').addEventListener('click', e => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  const f = $('#formRapido'), ya = b.classList.contains('on');
  document.querySelectorAll('#rapidoCats .on').forEach(x => x.classList.remove('on'));
  if (!ya) b.classList.add('on');
  f.categoria.value = ya ? '' : b.dataset.cat;
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-monto]');
  if (!b || !$('#dlgRapido[open]')) return;
  const f = $('#formRapido');
  f.monto.value = b.dataset.monto;
  document.querySelectorAll('.monto-chip.on').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
});
$('#formRapido').addEventListener('submit', e => {
  if (e.submitter?.value !== 'ok') return;
  const f = $('#formRapido'), dir = f.querySelector('[name=dir]:checked').value, monto = Math.abs(+f.monto.value);
  if (!monto) return;
  const cuenta = f.cuenta.value, tarjeta = S.tarjetas.find(t => t.nombre === cuenta), cta = S.cuentas.find(c => c.nombre === cuenta);
  const clase = dir === 'out' ? (f.negocio.checked ? 'gasto_negocio' : 'personal') : (f.negocio.checked ? 'ingreso' : 'no_ingreso');
  const concepto = f.concepto.value.trim() || (dir === 'out' ? f.categoria.value || 'Gasto' : 'Ingreso');
  S.movs.push({ id: uid(), fecha: f.fecha.value, dir, concepto, monto, clase, categoria: dir === 'out' ? f.categoria.value : '',
    cuenta, cfdi: dir === 'out' && f.cfdi.checked, forma: tarjeta ? 'tarjeta' : 'transferencia', clientePM: false, notas: 'captura rápida' });
  S.movs.sort((x, y) => x.fecha.localeCompare(y.fecha));
  let extra = '';
  if (cta) { cta.saldo = Math.round(((+cta.saldo || 0) + (dir === 'in' ? monto : -monto)) * 100) / 100; cta.actualizado = hoyISO(); extra = ` · saldo de ${cta.nombre}: ${fmt(cta.saldo)}`; }
  if (tarjeta) { tarjeta.saldoActual = Math.round(((+tarjeta.saldoActual || 0) + (dir === 'out' ? monto : -monto)) * 100) / 100; extra = ` · ${tarjeta.nombre} debe ${fmt(tarjeta.saldoActual)}`; }
  S.ultimaCuenta = cuenta;
  guardar(); render();
  toast(`${dir === 'out' ? 'Gasto' : 'Ingreso'} de ${fmt(monto)} guardado ✓${extra}`);
});

function vAsesor() {
  const { anio: a, mes: me } = S.vista;
  return `<div class="card"><h2>Tu asesor · ${MESES[me]} ${a}</h2>${consejos(a, me).map(tip).join('')}</div>
  <div class="cols">
    <div class="card"><h3>Lo que SÍ te baja impuestos en RESICO</h3>
      <div class="tip ok"><b>Facturar tus gastos del negocio</b>El IVA de cada gasto con CFDI a tu RFC (pagado con tarjeta/transferencia) se resta del IVA que cobras.</div>
      <div class="tip ok"><b>Acreditar retenciones</b>Si facturas a empresas (personas morales), el 1.25% de ISR y 2/3 del IVA que te retienen ya están pagados. Marca "Cliente persona moral".</div>
      <div class="tip ok"><b>Identificar depósitos que no son ingreso</b>Traspasos entre tus cuentas, préstamos, reembolsos o regalos de familiares no pagan ISR. Documéntalos.</div>
      <div class="tip ok"><b>Pagar a tiempo</b>Evitas recargos y actualizaciones, y no pierdes el régimen (3 declaraciones mensuales omitidas = salida de RESICO).</div>
      <div class="tip ok"><b>Cuidar la fecha de cobro</b>El ISR se paga cuando cobras. La tasa mensual depende del total del mes.</div>
    </div>
    <div class="card"><h3>Lo que NO funciona en RESICO</h3>
      <div class="tip bad"><b>Deducir gastos para ISR</b>En RESICO no se restan gastos al ISR; sólo cuentan para IVA.</div>
      <div class="tip bad"><b>Deducciones personales en la anual</b>Médicos, colegiaturas, intereses hipotecarios, etc. no aplican en RESICO.</div>
      <div class="tip bad"><b>Ocultar ingresos</b>El SAT cruza tus depósitos bancarios y CFDI. No declararlos genera multas de 55% a 75% del impuesto omitido más recargos.</div>
      <div class="tip warn"><b>Gastos personales como del negocio</b>Solo es acreditable lo estrictamente indispensable para tu actividad.</div>
    </div>
  </div>`;
}

const PALETA = ['#0047cc', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16', '#64748b'];
const fmtCorto = n => n >= 1e6 ? '$' + (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? '$' + (n / 1e3).toFixed(1) + 'k' : fmt(n);
function dona(datos) {
  const tot = datos.reduce((s, [, v]) => s + v, 0);
  if (!tot) return '<div class="empty">Sin gastos registrados este mes</div>';
  const R = 70, C = 2 * Math.PI * R;
  let acc = 0;
  const segs = datos.map(([l, v], i) => {
    const len = v / tot * C;
    const s = `<circle class="seg" cx="90" cy="90" r="${R}" fill="none" stroke="${PALETA[i % PALETA.length]}" stroke-width="24" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc}" transform="rotate(-90 90 90)"><title>${esc(l)}: ${fmt(v)}</title></circle>`;
    acc += len;
    return s;
  }).join('');
  return `<div class="dona-wrap"><svg viewBox="0 0 180 180">${segs}
      <text x="90" y="86" text-anchor="middle" font-size="11" fill="#677085">Total</text>
      <text x="90" y="105" text-anchor="middle" font-size="16" font-weight="700" fill="#1d2330">${fmtCorto(tot)}</text></svg>
    <div class="dona-lista">${datos.map(([l, v], i) => `<div><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${PALETA[i % PALETA.length]};margin-right:6px"></i>${esc(l)}</span><span><b>${fmt(v)}</b> <small>${pct(v / tot)}</small></span></div>`).join('')}</div></div>`;
}

function vPresupuesto() {
  const { anio: a, mes: me } = S.vista;
  const gastos = gastosMes(a, me);
  const entradas = movsDelMes(a, me).filter(m => m.dir === 'in' && m.clase !== 'traspaso').reduce((s, m) => s + m.monto, 0);
  const porCat = {};
  for (const m of gastos) { const c = m.categoria || 'Sin categoría'; porCat[c] = (porCat[c] || 0) + m.monto; }
  const prom = {};
  for (let k = 1; k <= 3; k++) {
    const d = new Date(a, me - k, 1);
    for (const m of gastosMes(d.getFullYear(), d.getMonth())) { const c = m.categoria || 'Sin categoría'; prom[c] = (prom[c] || 0) + m.monto / 3; }
  }
  let ranking = Object.entries(porCat).sort((x, y) => y[1] - x[1]);
  if (ranking.length > 9) ranking = [...ranking.slice(0, 8), ['Otras', ranking.slice(8).reduce((s, [, v]) => s + v, 0)]];
  const cats = [...new Set([...S.categorias, ...Object.keys(porCat)])];
  const totGasto = gastos.reduce((s, m) => s + m.monto, 0);
  const totPres = Object.values(S.presupuesto).reduce((s, v) => s + (+v || 0), 0);
  const opcCat = sel => `<option value="">— categoría —</option>` + S.categorias.map(c => `<option${c === sel ? ' selected' : ''}>${esc(c)}</option>`).join('');
  const opcTipo = sel => [['pendiente', '⚠ Sin clasificar'], ['personal', 'Personal'], ['gasto_negocio', 'Negocio'], ['traspaso', 'Traspaso']]
    .map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${v}</option>`).join('');
  return `<div class="kpis">
    <div class="kpi"><small>Entradas del mes</small>${kv(entradas, 'in')}</div>
    <div class="kpi"><small>Gastado en ${MESES[me]}</small>${kv(totGasto, 'out')}<small>${gastos.length} gastos</small></div>
    <div class="kpi"><small>Presupuesto mensual</small>${kv(totPres)}${totPres ? `<small>${pct(totGasto / totPres)} usado</small>` : '<small>defínelo abajo</small>'}</div>
    <div class="kpi main"><small>Te queda</small>${kv(entradas - totGasto)}<small>entradas − gastos</small></div>
  </div>
  <div class="cols">
    <div class="card"><h3>¿En qué se va tu dinero?</h3>${dona(ranking)}</div>
    <div class="card"><h3>Presupuesto por categoría</h3>
      <div class="tabla-scroll" style="max-height:340px;overflow-y:auto"><table>
      ${cats.map(c => {
        const p = +S.presupuesto[c] || 0, g = porCat[c] || 0, u = p ? g / p : 0;
        if (!p && !g && !prom[c] && c === 'Sin categoría') return '';
        return `<tr><td>${esc(c)}<div class="barra ${u > 1 ? 'alerta' : u > 0.85 ? 'medio' : ''}" style="margin-top:4px"><div style="width:${p ? Math.min(100, u * 100) : 0}%"></div></div>
            <small class="${p && g > p ? 'out' : 'muted'}">${fmt(g)}${p ? ` de ${fmt(p)}${g > p ? ' · te pasaste ' + fmt(g - p) : ''}` : ''}</small></td>
          <td class="n"><input type="number" min="0" step="100" style="width:105px;text-align:right" data-pres="${esc(c)}" value="${p || ''}" placeholder="${prom[c] ? Math.round(prom[c]) : '0'}" title="Promedio últimos 3 meses: ${fmt(prom[c] || 0)}"></td></tr>`;
      }).join('')}
      </table></div>
      <div class="form-row" style="margin-top:12px"><label>Nueva categoría <input id="nuevaCat"></label><button data-act="agregarCat">Agregar</button></div>
    </div>
  </div>
  <div class="card tabla-scroll">
    <div class="toolbar"><h3 style="margin:0">Gastos de ${MESES[me]}</h3><span class="sp"></span><button class="primary" data-act="nuevoGasto">+ Gasto</button></div>
    ${gastos.length ? `<table><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Tipo</th><th class="n">Monto</th><th></th></tr>
      ${gastos.slice().reverse().map(m => `<tr data-id="${m.id}" class="${m.clase === 'pendiente' ? 'row-pend' : ''}"><td>${m.fecha}</td>
        <td>${esc(m.concepto)}${m.cuenta ? `<br><small>${esc(m.cuenta)}</small>` : ''}</td>
        <td><select data-campo="categoria">${opcCat(m.categoria)}</select></td>
        <td><select data-campo="clase">${opcTipo(m.clase)}</select></td>
        <td class="n out">−${fmt(m.monto)}</td>
        <td><button class="link" title="Editar" data-act="editar">✎</button></td></tr>`).join('')}</table>`
      : '<div class="empty">Sin gastos este mes. Importa tu estado de cuenta desde Inicio o agrega uno.</div>'}
    <p class="muted">El número gris en cada presupuesto es tu promedio de los últimos 3 meses. Usa 📌 en Movimientos para que los gastos se categoricen solos.</p>
  </div>`;
}

function alertasTarjetas() {
  const out = [];
  for (const t of S.tarjetas) {
    const c = ciclosTarjeta(t), d = c.pago ? diasEntre(hoy(), c.pago) : null, pagada = c.pago && t.pagadoHasta === isoDate(c.pago);
    if (c.pago && !t.cortePendiente && !pagada && t.saldoCorte > 0 && d <= 7) out.push({ n: d <= 2 ? 'bad' : 'warn', t: `${t.nombre}: ${d < 0 ? `pago vencido hace ${-d} días` : d === 0 ? 'pago para hoy' : `pago en ${d} días`}`, d: `Fecha límite ${fechaLarga(c.pago)}: ${fmt(t.saldoCorte)} para no generar intereses.` });
    if (t.limite && t.saldoActual / t.limite > 0.3) out.push({ n: 'info', t: `${t.nombre}: usas ${pct(t.saldoActual / t.limite)} de tu línea`, d: 'Arriba de 30% afecta tu score en Buró de Crédito. Intenta bajar el saldo antes del corte.' });
  }
  return out;
}

function vTarjetas() {
  const hy = hoy();
  const datos = S.tarjetas.map(t => ({ t, c: ciclosTarjeta(t) })).sort((x, y) => (x.c.pago ? +x.c.pago : Infinity) - (y.c.pago ? +y.c.pago : Infinity));
  const porPagar = datos.filter(({ t, c }) => !t.cortePendiente && (!c.pago || t.pagadoHasta !== isoDate(c.pago))).reduce((s, { t }) => s + (+t.saldoCorte || 0), 0);
  const deuda = S.tarjetas.reduce((s, t) => s + (+t.saldoActual || 0), 0), lim = S.tarjetas.reduce((s, t) => s + (+t.limite || 0), 0);
  const usoT = lim ? deuda / lim : 0;
  return `<div class="kpis">
    <div class="kpi main"><small>Por pagar este ciclo (sin intereses)</small>${kv(porPagar)}<small>${datos.length} tarjetas</small></div>
    <div class="kpi"><small>Deuda total actual</small>${kv(deuda, 'out')}</div>
    <div class="kpi"><small>Uso de tus líneas de crédito</small><div class="v">${lim ? pct(usoT) : '—'}</div>
      <div class="barra ${usoT > 0.5 ? 'alerta' : usoT > 0.3 ? 'medio' : ''}"><div style="width:${Math.min(100, usoT * 100)}%"></div></div><small>ideal: menos de 30%</small></div>
  </div>
  ${alertasTarjetas().map(tip).join('')}
  ${S.tarjetas.some(t => t.cortePendiente) ? `<p class="tip warn">Pago al corte pendiente de confirmar: ${S.tarjetas.filter(t => t.cortePendiente).map(t => esc(t.nombre)).join(', ')}. No se incluye en el total por pagar.</p>` : ''}
  <div class="card"><h3>Calendario de pagos</h3>
    ${datos.length ? `<div class="tabla-scroll"><table><tr><th>Tarjeta</th><th>Pagar antes de</th><th class="n">Para no generar intereses</th><th class="n">Mínimo</th><th class="n">Interés si pagas el mínimo</th><th>Próximo corte</th><th class="n">Gastado desde el corte</th><th>Mejor día para comprar</th><th></th></tr>
      ${datos.map(({ t, c }) => {
        const d = c.pago ? diasEntre(hy, c.pago) : null, pagada = c.pago && t.pagadoHasta === isoDate(c.pago);
        const interes = Math.max(0, (+t.saldoCorte || 0) - (+t.pagoMinimo || 0)) * ((+t.tasaAnual || 0) / 100 / 12) * 1.16;
        const usoI = t.limite ? t.saldoActual / t.limite : 0;
        return `<tr data-tid="${t.id}">
          <td><div class="bank-account">${bankLogo(t.banco)}<div><b>${esc(t.nombre)}</b><small>${esc(t.banco || '')} · límite ${fmt(t.limite)}</small></div></div>
            <div class="barra ${usoI > 0.5 ? 'alerta' : usoI > 0.3 ? 'medio' : ''}" style="margin-top:4px;width:140px"><div style="width:${Math.min(100, usoI * 100)}%"></div></div></td>
          <td>${t.cortePendiente ? 'Por confirmar' : !c.pago ? `${t.saldoCorte === 0 ? 'Sin saldo pendiente<br>' : ''}<small>Fecha por confirmar</small>` : `${fechaLarga(c.pago)}<br>${pagada ? '<span class="chip ok">Pagada ✓</span>' : `<span class="chip ${d <= 2 ? 'bad' : d <= 7 ? 'warn' : ''}">${d < 0 ? 'Vencido' : d === 0 ? 'Hoy' : d + ' días'}</span>`}`}</td>
          <td class="n"><b>${t.cortePendiente ? 'Por confirmar' : fmt(t.saldoCorte)}</b></td>
          <td class="n">${t.cortePendiente ? 'Por confirmar' : fmt(t.pagoMinimo)}</td>
          <td class="n out">${interes ? fmt(interes) + '/mes' : '—'}</td>
          <td>${t.corteSinConfirmar ? 'Por confirmar' : fechaLarga(c.corte)}</td>
          <td class="n">${t.corteSinConfirmar ? '—' : fmt(gastadoDesde(t.nombre, c.ultimoCorte))}${t.gastoReportado ? `<br><small>${esc(t.gastoReportado.periodo)}: ${fmt(t.gastoReportado.monto)} reportados<br>Desglose pendiente</small>` : ''}</td>
          <td>${t.corteSinConfirmar ? '—' : fechaLarga(c.mejorDiaCompra)}</td>
          <td style="white-space:nowrap">${t.cortePendiente || !c.pago || !(t.saldoCorte > 0) ? '' : pagada ? `<button class="link" data-act="tarjetaNoPagada">Deshacer</button>` : `<button data-act="tarjetaPagada">Marcar pagada</button>`}
            <button class="link" data-act="editarTarjeta">✎</button><button class="link danger" data-act="borrarTarjeta">✕</button></td></tr>`;
      }).join('')}</table></div>` : '<div class="empty">Aún no registras tarjetas. Agrega la primera abajo 👇</div>'}
  </div>
  <div class="card"><h3 id="tarjetaTitulo">Agregar tarjeta</h3>
    <form id="formTarjeta" class="form-row">
      <input type="hidden" name="tid">
      <label>Nombre <input name="nombre" required placeholder="Ej. BBVA Azul"></label>
      <label>Banco <input name="banco"></label>
      <label>Límite de crédito <input name="limite" type="number" step="0.01" min="0"></label>
      <label>Día de corte <input name="diaCorte" type="number" min="1" max="31" required style="width:80px"></label>
      <label>Día límite de pago <input name="diaPago" type="number" min="1" max="31" placeholder="—" style="width:80px"></label>
      <label>Pago para no generar intereses <input name="saldoCorte" type="number" step="0.01" min="0"></label>
      <label>Pago mínimo <input name="pagoMinimo" type="number" step="0.01" min="0"></label>
      <label>Saldo actual <input name="saldoActual" type="number" step="0.01" min="0"></label>
      <label>Tasa anual (%) <input name="tasaAnual" type="number" step="0.01" min="0" style="width:90px"></label>
      <button class="primary">Guardar tarjeta</button>
    </form>
    <p class="muted">Los datos salen del estado de cuenta de la tarjeta. Usa el mismo nombre como cuenta al importar sus movimientos para ver lo gastado desde el corte. Nunca captures aquí el número completo de la tarjeta.</p>
  </div>`;
}

function vPagos() {
  const a = S.vista.anio, an = calcAnio(a);
  return `<div class="card tabla-scroll"><h2>Pagos al SAT ${a}</h2>
    <table><tr><th>Periodo</th><th class="n">ISR</th><th class="n">IVA</th><th class="n">Total calculado</th><th>Fecha límite</th><th>Pagado</th><th>Fecha de pago</th><th class="n">Monto pagado</th></tr>
    ${an.meses.map((m, i) => {
      const k = claveMes(a, i), p = S.pagos[k] || {}, lim = fechaLimite(a, i), venc = lim < hoy() && !p.pagado && m.total > 0;
      return `<tr data-pago="${k}" class="${venc ? 'row-pend' : ''}"><td>${MESES[i]}</td><td class="n">${fmt(m.isrPagar)}</td><td class="n">${fmt(m.ivaPagar)}</td><td class="n"><b>${fmt(m.total)}</b></td>
        <td>${fechaLarga(lim)}${venc ? ' <span class="chip bad">vencido</span>' : ''}</td>
        <td><input type="checkbox" data-p="pagado" ${p.pagado ? 'checked' : ''}></td>
        <td><input type="date" data-p="fecha" value="${esc(p.fecha || '')}"></td>
        <td class="n"><input type="number" step="0.01" data-p="monto" value="${esc(p.monto ?? '')}" style="width:110px;text-align:right"></td></tr>`;
    }).join('')}
    </table>
    <p class="muted">La declaración mensual se presenta en sat.gob.mx (Declaraciones → Simplificado de Confianza). Aunque no tengas ingresos, presenta en ceros. Anual: abril del año siguiente.</p>
  </div>`;
}

const URL_MI_DINERO = 'https://dineroapp-personal.alightsun32.chatgpt.site';
function vInstalar() {
  const instalada = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;
  return `<section class="card instalar-app"><img src="icon-192.png" width="72" height="72" alt="Ícono de Mi Dinero"><h2>Tu dinero, también en tu iPhone</h2>
    <p>Abre Mi Dinero desde tu pantalla de inicio. Usa los mismos registros de tu Mac aunque la laptop esté apagada.</p>
    ${instalada ? '<p class="in">Estás usando la app desde la pantalla de inicio.</p>' : ''}
    <div class="instalar-enlace"><a href="${URL_MI_DINERO}" target="_blank" rel="noopener">Abrir Mi Dinero en la nube</a><button data-act="copiarEnlaceApp">Copiar enlace</button></div>
    <ol><li><b>Abre el enlace en Safari en tu iPhone.</b> Inicia sesión con la misma cuenta de ChatGPT que utilizas aquí y espera a ver tus saldos.</li>
    <li><b>En Safari, toca Compartir.</b> Puede estar dentro del menú de la página. Selecciona <b>Agregar a Inicio</b>.</li>
    <li>Activa <b>Abrir como app web</b>, si aparece, y toca <b>Agregar</b>. Verás el ícono de Mi Dinero junto a tus demás apps.</li></ol>
    <p class="muted">Agrega la página de Mi Dinero cuando ya hayas iniciado sesión. Si vuelve a pedir acceso al abrir el ícono, utiliza la misma cuenta. La instalación se completa desde tu iPhone.</p>
    <a href="https://support.apple.com/es-lamr/guide/iphone/iphea86e5236/ios" target="_blank" rel="noopener">Ver instrucciones de Apple</a>
    <hr><h3>Tus registros y tus actualizaciones</h3><p>Los saldos, movimientos y préstamos se guardan en tu nube privada al sincronizar. Comprueba que aparezca <b>Sincronizado</b> antes de cerrar tras una edición. Sin conexión, los cambios quedan pendientes en ese dispositivo.</p>
    <p>El código de la aplicación se conserva en tu repositorio privado de GitHub. Una edición de tus saldos se guarda en la base de datos privada, sin crear un commit de código.</p></section>`;
}

function vConfig() {
  const p = S.perfil, m = S.meta || {};
  return `<div class="card instalar-acceso"><div><h2>Mi Dinero en tu iPhone</h2><p>Agrega el ícono a tu pantalla de inicio y usa tus datos sincronizados.</p></div><button data-act="ir" data-tab="instalar">Ver cómo instalar</button></div><div class="card"><h2>Mi perfil</h2>
    <form id="formPerfil" class="form-row">
      <label>Nombre <input name="nombre" value="${esc(p.nombre)}"></label>
      <label>RFC <input name="rfc" value="${esc(p.rfc)}" maxlength="13" style="text-transform:uppercase"></label>
      <label>Actividad <input name="actividad" value="${esc(p.actividad)}" placeholder="Ej. Servicios profesionales"></label>
      <label>IVA de mis ventas <select name="ivaTasa"><option value="0.16"${p.ivaTasa == 0.16 ? ' selected' : ''}>16%</option><option value="0.08"${p.ivaTasa == 0.08 ? ' selected' : ''}>8% frontera</option><option value="0"${p.ivaTasa == 0 ? ' selected' : ''}>0% / exento</option></select></label>
      <label class="chk"><span><input type="checkbox" name="arrastrarSaldoIVA" ${p.arrastrarSaldoIVA ? 'checked' : ''}> Acreditar IVA a favor en meses siguientes</span></label>
      <button class="primary">Guardar</button>
    </form></div>
  <div class="card"><h2>Meta financiera</h2><p class="muted">Los reembolsos se calculan por cuenta: BBVA a 90 días y Banamex a 45 días desde la primera compra registrada.</p>
    <form id="formMeta" class="form-row">
      <label>Meta de patrimonio <input name="metaPatrimonio" type="number" step="0.01" value="${m.metaPatrimonio || 10000000}"></label>
      <label>Capital base <input name="capitalInicial" type="number" step="0.01" value="${m.capitalInicial || 1000000}"></label>
      <label>Ingreso recurrente mensual <input name="ingresoMonto" type="number" step="0.01" value="${m.ingresoRecurrente?.monto || 20000}"></label>
      <label>Día del mes <input name="ingresoDia" type="number" min="1" max="31" value="${m.ingresoRecurrente?.dia || 28}" style="width:80px"></label>
      <button class="primary">Guardar meta</button>
    </form>
  </div>
  <div class="card tabla-scroll"><h2>Reglas automáticas</h2>
    <p class="muted">Al importar, si el concepto contiene el texto (expresión regular, sin importar mayúsculas), se clasifica solo. Se aplica la primera regla que coincida.</p>
    <table><tr><th>Si el concepto contiene</th><th>Clasificar como</th><th>Categoría</th><th>CFDI</th><th></th></tr>
    ${S.reglas.map((r, i) => `<tr data-regla="${i}"><td><input data-r="patron" value="${esc(r.patron)}" style="width:100%"></td>
      <td><select data-r="clase">${opcionesClase(r.clase)}</select></td>
      <td><input data-r="categoria" list="listaCategorias" value="${esc(r.categoria || '')}"></td>
      <td><input type="checkbox" data-r="cfdi" ${r.cfdi ? 'checked' : ''}></td>
      <td><button class="link danger" data-act="borrarRegla">✕</button></td></tr>`).join('')}
    </table>
    <div class="toolbar" style="margin-top:10px"><button data-act="nuevaRegla">+ Regla</button><button data-act="reaplicar">Reaplicar reglas a "sin clasificar"</button></div>
  </div>
  <div class="card"><h2>Respaldo</h2>
    <div class="toolbar">
      <button class="primary" data-act="exportar">Descargar respaldo (.json)</button>
      <label>Restaurar / importar JSON <input type="file" id="archivoRespaldo" accept=".json"></label>
      <span class="sp"></span>
      <button class="danger" data-act="borrarTodo">Borrar todos los datos</button>
    </div>
    <p class="muted">${S.movs.length} movimientos · ${S.tarjetas.length} tarjetas. Guarda tu respaldo fuera de esta computadora (USB o nube personal).</p>
  </div>`;
}

/* ---------- diálogo de movimiento ---------- */
function abrirMov(m, defaults = {}) {
  const f = $('#formMov');
  const v = m || { fecha: hoyISO(), dir: 'out', clase: 'pendiente', concepto: '', monto: '', ivaTasa: S.perfil.ivaTasa, forma: 'transferencia', cfdi: false, clientePM: false, base: '', cuenta: '', categoria: '', notas: '', ...defaults };
  f.clase.innerHTML = opcionesClase(v.clase);
  $('#dlgMovTitulo').textContent = m ? 'Editar movimiento' : 'Nuevo movimiento';
  for (const k of ['fecha', 'dir', 'concepto', 'monto', 'forma', 'cuenta', 'categoria', 'notas']) f[k].value = v[k] ?? '';
  f.ivaTasa.value = String(v.ivaTasa ?? S.perfil.ivaTasa);
  f.base.value = v.base || '';
  f.cfdi.checked = !!v.cfdi; f.clientePM.checked = !!v.clientePM;
  f.dataset.id = m?.id || '';
  $('#dlgMov').showModal();
}
$('#formMov').addEventListener('submit', e => {
  const f = $('#formMov');
  if (e.submitter?.value !== 'ok') return;
  const datos = {
    fecha: f.fecha.value, dir: f.dir.value, concepto: f.concepto.value.trim(), monto: Math.abs(+f.monto.value),
    clase: f.clase.value, ivaTasa: +f.ivaTasa.value, forma: f.forma.value, cfdi: f.cfdi.checked, clientePM: f.clientePM.checked,
    base: +f.base.value || 0, cuenta: f.cuenta.value.trim(), categoria: f.categoria.value.trim(), notas: f.notas.value.trim(),
  };
  if (datos.categoria && !S.categorias.includes(datos.categoria)) S.categorias.push(datos.categoria);
  const m = S.movs.find(x => x.id === f.dataset.id);
  if (m) Object.assign(m, datos); else S.movs.push({ id: uid(), ...datos });
  S.movs.sort((a, b) => a.fecha.localeCompare(b.fecha));
  guardar(); render();
});

/* ---------- eventos ---------- */
function initPeriodo() {
  const sm = $('#selMes'), sa = $('#selAnio');
  sm.innerHTML = MESES.map((m, i) => `<option value="${i}">${m}</option>`).join('');
  const anios = new Set([new Date().getFullYear(), new Date().getFullYear() - 1, S.vista.anio, ...S.movs.map(m => +m.fecha.slice(0, 4))]);
  sa.innerHTML = [...anios].sort().map(a => `<option>${a}</option>`).join('');
  sm.value = S.vista.mes; sa.value = S.vista.anio;
}
function cambiarPeriodo(anio, mes) {
  const d = new Date(anio, mes, 1);
  S.vista.anio = d.getFullYear(); S.vista.mes = d.getMonth();
  ultimaTab = null;
  guardar(); initPeriodo(); render();
}
$('#selMes').addEventListener('change', e => cambiarPeriodo(S.vista.anio, +e.target.value));
$('#selAnio').addEventListener('change', e => cambiarPeriodo(+e.target.value, S.vista.mes));
document.querySelectorAll('[data-mes]').forEach(b => b.addEventListener('click', () => cambiarPeriodo(S.vista.anio, S.vista.mes + +b.dataset.mes)));
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button[data-tab]'); if (b) { S.vista.tab = b.dataset.tab; guardar(); render(); } });
$('#menuBtn').addEventListener('click', () => document.body.classList.toggle('menu-abierto'));
$('#bottomNav').addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  if (b.dataset.tab === 'menu') { document.body.classList.toggle('menu-abierto'); return; }
  S.vista.tab = b.dataset.tab; guardar(); render();
});
$('#velo').addEventListener('click', () => document.body.classList.remove('menu-abierto'));

let arrastres = 0;
window.addEventListener('dragenter', e => {
  if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
  arrastres++; document.body.classList.add('arrastrando');
});
window.addEventListener('dragleave', () => { if (--arrastres <= 0) { arrastres = 0; document.body.classList.remove('arrastrando'); } });
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault(); arrastres = 0; document.body.classList.remove('arrastrando');
  procesarArchivos([...(e.dataTransfer?.files || [])]);
});
$('#archivoOculto').addEventListener('change', e => { procesarArchivos([...e.target.files]); e.target.value = ''; });

async function procesarArchivos(files) {
  const csvs = [];
  for (const f of files) {
    if (/\.pdf$/i.test(f.name)) toast(`${f.name}: comparte el PDF en el chat para incorporar sus movimientos.`, 'warn');
    else if (/\.xlsx?$/i.test(f.name)) toast(`${f.name}: ábrelo en Excel y usa "Guardar como → CSV", luego arrástralo de nuevo.`, 'warn');
    else if (/\.json$/i.test(f.name)) { try { importarJSON(await leerArchivoTexto(f)); } catch (er) { toast('JSON inválido: ' + er.message, 'bad'); } }
    else if (/\.(csv|txt|tsv)$/i.test(f.name)) csvs.push(f);
    else toast(`${f.name}: formato no soportado. Usa CSV.`, 'warn');
  }
  if (!csvs.length) return;
  if (csvs.length > 1) toast(`Importa un CSV a la vez. Empiezo con ${csvs[0].name}.`, 'warn');
  S.vista.tab = 'inicio';
  cargarTextoImport(await leerArchivoTexto(csvs[0]), csvs[0].name);
}

function leerArchivoTexto(file) {
  return new Promise((ok, err) => {
    const r = new FileReader();
    r.onload = () => {
      let txt = r.result;
      if (txt.includes('�')) { const r2 = new FileReader(); r2.onload = () => ok(r2.result); r2.onerror = err; r2.readAsText(file, 'windows-1252'); }
      else ok(txt);
    };
    r.onerror = err;
    r.readAsText(file, 'utf-8');
  });
}
function cargarTextoImport(txt, archivo = '') {
  const rows = parseCSV(txt || '');
  if (!rows.length) { toast('No se encontraron filas en el texto.', 'bad'); return; }
  imp = Object.assign({ rows, archivo, cuenta: cuentaImport }, autoMapear(rows));
  render();
  $('#panelImport')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function importarJSON(txt) {
  const d = JSON.parse(txt);
  if (Array.isArray(d)) { const r = agregarMovs(d); initPeriodo(); toast(`${r.nuevos} movimientos importados · ${r.auto} clasificados solos · ${r.dup} duplicados omitidos.`); }
  else if (d && Array.isArray(d.movs)) {
    if (!confirm('Esto reemplazará TODOS tus datos actuales con el respaldo. ¿Continuar?')) return;
    S = Object.assign(nuevoEstado(), d); guardar(); initPeriodo();
  } else throw new Error('Formato no reconocido');
  render();
}

document.addEventListener('change', async e => {
  const el = e.target;
  if (el.closest('#formPrestamo')) proyeccionPrestamo();
  if (el.id === 'archivoRespaldo' && el.files[0]) {
    try { importarJSON(await leerArchivoTexto(el.files[0])); } catch (er) { toast('Respaldo inválido: ' + er.message, 'bad'); }
    return;
  }
  if (el.id === 'impCuenta') { cuentaImport = el.value.trim(); if (imp) imp.cuenta = cuentaImport; return; }
  if (el.dataset.map && imp) { imp.map[el.dataset.map] = +el.value; render(); return; }
  if (el.dataset.imp && imp) {
    if (el.dataset.imp === 'invertir') imp.invertir = el.checked;
    else { imp.headerIdx = Math.max(0, Math.min(imp.rows.length - 1, +el.value - 1)); Object.assign(imp.map, autoMapear(imp.rows.slice(imp.headerIdx)).map); }
    render(); return;
  }
  if (el.dataset.f === 'alcance' || el.dataset.f === 'clase') { filtro[el.dataset.f] = el.value; render(); return; }
  if (el.dataset.f === 'filtroMovs') { S.filtroMovs = el.value; guardar(); render(); return; }
  const tr = el.closest('tr[data-id]');
  if (tr && el.dataset.campo) {
    const m = S.movs.find(x => x.id === tr.dataset.id);
    m[el.dataset.campo] = el.type === 'checkbox' ? el.checked : el.value;
    guardar(); render(); return;
  }
  if (el.dataset.ctaSaldo !== undefined) {
    const c = S.cuentas.find(x => x.id === el.closest('tr[data-cta]').dataset.cta);
    c.saldo = +el.value || 0; c.actualizado = hoyISO(); delete c.saldoNota;
    guardar(); render(); toast(`Saldo de ${c.nombre} actualizado`); return;
  }
  if (el.dataset.pres !== undefined) { S.presupuesto[el.dataset.pres] = +el.value || 0; guardar(); render(); return; }
  const rr = el.closest('tr[data-regla]');
  if (rr && el.dataset.r) { S.reglas[+rr.dataset.regla][el.dataset.r] = el.type === 'checkbox' ? el.checked : el.value; guardar(); return; }
  const tp = el.closest('tr[data-pago]');
  if (tp && el.dataset.p) {
    const k = tp.dataset.pago, p = S.pagos[k] = S.pagos[k] || {};
    p[el.dataset.p] = el.type === 'checkbox' ? el.checked : el.dataset.p === 'monto' ? (el.value === '' ? null : +el.value) : el.value;
    if (el.dataset.p === 'pagado' && el.checked && !p.fecha) p.fecha = hoyISO();
    if (el.dataset.p === 'pagado' && el.checked && p.monto == null) p.monto = Math.round(calcAnio(S.vista.anio).meses[+k.slice(5) - 1].total);
    guardar(); render();
  }
});
document.addEventListener('input', e => {
  if (e.target.closest('#formPrestamo')) proyeccionPrestamo();
  if (e.target.dataset.f === 'q') {
    filtro.q = e.target.value; const pos = e.target.selectionStart; render();
    const q = $('[data-f="q"]'); q.focus(); q.setSelectionRange(pos, pos);
  }
});

document.addEventListener('submit', e => {
  const f = e.target;
  const fid = f.getAttribute('id');
  if (fid === 'formPrestamo') {
    e.preventDefault();
    const p = datosPrestamo(f), error = Prestamos.validar(p) || Prestamos.validarReinversion(p, S.prestamos, S.abonosPrestamos, hoyISO());
    if (error) { toast(error, 'bad'); return; }
    const abonos = S.abonosPrestamos.filter(a => a.prestamoId === p.id && !a.anulado);
    const d = Prestamos.detalle(p, abonos, hoyISO());
    if (d.exceso || abonos.some(a => a.fecha < p.fecha)) { toast('El cambio no coincide con los abonos registrados. Revisa el total y la fecha de entrega.', 'bad'); return; }
    const existente = S.prestamos.find(x => x.id === p.id);
    if (existente) Object.assign(existente, p); else S.prestamos.push(p);
    guardar(); render(); toast('Préstamo guardado · calendario actualizado');
  } else if (fid === 'formAbono') {
    e.preventDefault();
    const p = S.prestamos.find(x => x.id === f.elements.pid.value);
    const a = { id: uid(), prestamoId: f.elements.pid.value, monto: Number(f.elements.monto.value), fecha: f.elements.fecha.value, nota: f.elements.nota.value.trim() };
    const error = Prestamos.validarAbono(p, S.abonosPrestamos, a, hoyISO());
    if (error) { toast(error, 'bad'); return; }
    S.abonosPrestamos.push(a); guardar(); render(); toast('Abono registrado · saldo por cobrar actualizado');
  } else if (fid === 'formPerfil') {
    e.preventDefault();
    Object.assign(S.perfil, { nombre: f.nombre.value.trim(), rfc: f.rfc.value.trim().toUpperCase(), actividad: f.actividad.value.trim(), ivaTasa: +f.ivaTasa.value, arrastrarSaldoIVA: f.arrastrarSaldoIVA.checked });
    guardar(); render();
  } else if (fid === 'formMeta') {
    e.preventDefault();
    S.meta = S.meta || {};
    S.meta.metaPatrimonio = +f.metaPatrimonio.value || 10000000;
    S.meta.capitalInicial = +f.capitalInicial.value || 1000000;
    S.meta.ingresoRecurrente = { monto: +f.ingresoMonto.value || 0, dia: +f.ingresoDia.value || 28 };
    guardar(); render(); toast('Meta guardada');
  } else if (fid === 'formTarjeta') {
    e.preventDefault();
    const num = k => +f[k].value || 0;
    const t = { id: f.tid.value || uid(), nombre: f.nombre.value.trim(), banco: f.banco.value.trim(), limite: num('limite'), diaCorte: num('diaCorte'), diaPago: f.diaPago.value === '' ? null : num('diaPago'),
      saldoCorte: num('saldoCorte'), pagoMinimo: num('pagoMinimo'), saldoActual: num('saldoActual'), tasaAnual: num('tasaAnual') };
    const ex = S.tarjetas.find(x => x.id === t.id);
    if (ex) {
      if (ex.diaPago !== t.diaPago) delete ex.fechaPagoConfirmada;
      const confirmaCorte = ex.diaCorte !== t.diaCorte;
      Object.assign(ex, t);
      if (f.saldoCorte.value !== '' && f.pagoMinimo.value !== '') delete ex.cortePendiente;
      if (confirmaCorte) delete ex.corteSinConfirmar;
    } else S.tarjetas.push(t);
    guardar(); render();
  } else if (fid === 'formWallet') {
    e.preventDefault();
    const v = k => f.elements[k].value;
    const tokens = ['KASH', 'SOL', 'USDC'].map(simbolo => ({ simbolo, valorUSD: Number(v('valor' + simbolo)),
      cantidad: v('cantidad' + simbolo) === '' ? null : Number(v('cantidad' + simbolo)), cantidadAproximada: f.elements['aprox' + simbolo].checked }))
      .filter(t => t.valorUSD > 0 || t.cantidad > 0);
    const w = { id: v('wid') || uid(), nombre: v('nombre').trim(), titular: v('titular').trim(), moneda: 'USD', actualizado: v('actualizado'),
      totalUSD: v('totalUSD') === '' ? tokens.reduce((s, t) => s + Math.round(t.valorUSD * 100), 0) / 100 : Number(v('totalUSD')), tokens, fuente: 'registro manual' };
    if (!Wallets.validar(w)) { toast('Revisa los importes: deben ser números positivos o cero.', 'bad'); return; }
    const ex = S.wallets.find(x => x.id === w.id);
    if (ex) Object.assign(ex, w); else S.wallets.push(w);
    guardar(); render(); toast('Wallet guardada · patrimonio actualizado');
  } else if (fid === 'formInv') {
    e.preventDefault();
    const i = { id: f.iid.value || uid(), tipo: f.tipo.value, simbolo: f.simbolo.value.trim().toUpperCase(), cantidad: +f.cantidad.value || 0,
      costo: +f.costo.value || 0, valorManual: +f.valorManual.value || 0, plataforma: f.plataforma.value.trim() };
    const ex = S.inversiones.find(x => x.id === i.id);
    if (ex) Object.assign(ex, i); else S.inversiones.push(i);
    guardar(); render(); toast(`${i.simbolo} guardado`);
    if (i.tipo !== 'manual') actualizarPrecios(true);
  } else if (fid === 'formCta') {
    e.preventDefault();
    S.cuentas.push({ id: uid(), nombre: f.nombre.value.trim(), banco: f.banco.value.trim(), tipo: f.tipo.value, saldo: +f.saldo.value || 0, actualizado: hoyISO() });
    guardar(); render(); toast('Cuenta agregada');
  }
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act, tr = b.closest('tr[data-id]'), m = tr && S.movs.find(x => x.id === tr.dataset.id);
  const tt = b.closest('tr[data-tid]'), tarjeta = tt && S.tarjetas.find(x => x.id === tt.dataset.tid);
  switch (act) {
    case 'ir': S.vista.tab = b.dataset.tab; guardar(); render(); break;
    case 'copiarEnlaceApp':
      navigator.clipboard?.writeText(URL_MI_DINERO).then(() => toast('Enlace copiado · ábrelo en Safari en tu iPhone')).catch(() => toast('Mantén pulsado el enlace para copiarlo.', 'warn'));
      break;
    case 'reinvertirPrestamo': {
      editarPrestamo(null); const f = $('#formPrestamo'); f.elements.fondo.value = 'reinversion';
      const disponible = Prestamos.fondo(S.prestamos,S.abonosPrestamos,hoyISO()).disponible;
      f.elements.reinvertido.value = disponible; f.elements.capital.value = disponible; proyeccionPrestamo(); break;
    }
    case 'nuevoPrestamo': editarPrestamo(null); break;
    case 'editarPrestamo': editarPrestamo(S.prestamos.find(p => p.id === b.dataset.prestamo)); break;
    case 'abonarPrestamo': abonarPrestamo(S.prestamos.find(p => p.id === b.dataset.prestamo)); break;
    case 'cancelarPrestamo': render(); break;
    case 'anularAbono': {
      const a = S.abonosPrestamos.find(a => a.id === b.dataset.abono);
      if (a && confirm('¿Anular este abono de ' + fmt(a.monto) + '? Se conservará en el historial y volverá a quedar pendiente.')) { a.anulado = true; guardar(); render(); toast('Abono anulado'); }
      break;
    }
    case 'editarWallet': editarWallet(S.wallets.find(w => w.id === b.dataset.wallet)); break;
    case 'nuevaWallet': editarWallet(null); break;
    case 'cancelarWallet': render(); break;
    case 'nuevo': abrirMov(null); break;
    case 'editar': abrirMov(m); break;
    case 'borrar': if (confirm(`¿Borrar "${m.concepto}"?`)) { S.movs = S.movs.filter(x => x !== m); guardar(); render(); } break;
    case 'regla': {
      const sugerido = m.concepto.split(/\s+/).slice(0, 2).join(' ');
      const pat = prompt('Texto a buscar en el concepto para clasificar automáticamente como "' + CLASES[m.clase] + '":', sugerido);
      if (pat) {
        S.reglas.unshift({ patron: escRegex(pat), clase: m.clase, categoria: m.categoria || '', cfdi: !!m.cfdi });
        const n = S.movs.filter(x => x.clase === 'pendiente' && aplicarReglas(x)).length;
        guardar(); render(); toast(`Regla creada · ${n} movimientos sin clasificar se actualizaron.`);
      }
      break;
    }
    case 'elegirArchivo': $('#archivoOculto').click(); break;
    case 'rapido': abrirRapido(b.dataset.dir); break;
    case 'precios': actualizarPrecios(true); break;
    case 'actualizar': b.disabled = true; Sync.traer().then(() => actualizarPrecios(true)).finally(() => { b.disabled = false; }); break;
    case 'borrarCta': {
      const c = S.cuentas.find(x => x.id === b.closest('tr[data-cta]').dataset.cta);
      if (confirm(`¿Borrar la cuenta ${c.nombre}?`)) { S.cuentas = S.cuentas.filter(x => x !== c); guardar(); render(); }
      break;
    }
    case 'borrarInv': {
      const i = S.inversiones.find(x => x.id === b.closest('tr[data-inv]').dataset.inv);
      if (confirm(`¿Borrar ${i.simbolo}?`)) { S.inversiones = S.inversiones.filter(x => x !== i); guardar(); render(); }
      break;
    }
    case 'editarInv': {
      const i = S.inversiones.find(x => x.id === b.closest('tr[data-inv]').dataset.inv), f = $('#formInv');
      f.closest('details').open = true;
      f.iid.value = i.id;
      for (const k of ['tipo', 'simbolo', 'cantidad', 'costo', 'valorManual', 'plataforma']) f[k].value = i[k] ?? '';
      $('#invTitulo').textContent = 'Editar ' + i.simbolo;
      f.scrollIntoView({ behavior: 'smooth' });
      break;
    }
    case 'nuevoGasto': abrirMov(null, { dir: 'out', clase: 'personal' }); break;
    case 'leerPegado': cargarTextoImport($('#pegado').value, 'el texto pegado'); break;
    case 'confirmarImport': {
      imp.cuenta = cuentaImport = $('#impCuenta').value.trim();
      const r = agregarMovs(filasImportables());
      imp = null; initPeriodo(); render();
      toast(`✓ ${r.nuevos} movimientos importados · ${r.auto} clasificados solos · ${r.dup} duplicados omitidos.`);
      const pend = S.movs.filter(x => x.clase === 'pendiente').length;
      if (pend) setTimeout(() => toast(`Tienes ${pend} movimientos sin clasificar. Revísalos en Movimientos.`, 'warn'), 600);
      break;
    }
    case 'cancelarImport': imp = null; render(); break;
    case 'agregarCat': { const c = $('#nuevaCat').value.trim(); if (c && !S.categorias.includes(c)) { S.categorias.push(c); guardar(); render(); } break; }
    case 'tarjetaPagada': { const pago = ciclosTarjeta(tarjeta).pago; if (pago && tarjeta.saldoCorte > 0) { tarjeta.pagadoHasta = isoDate(pago); guardar(); render(); } break; }
    case 'tarjetaNoPagada': tarjeta.pagadoHasta = ''; guardar(); render(); break;
    case 'borrarTarjeta': if (confirm(`¿Borrar la tarjeta ${tarjeta.nombre}?`)) { S.tarjetas = S.tarjetas.filter(x => x !== tarjeta); guardar(); render(); } break;
    case 'editarTarjeta': {
      const f = $('#formTarjeta');
      f.tid.value = tarjeta.id;
      for (const k of ['nombre', 'banco', 'limite', 'diaCorte', 'diaPago', 'saldoCorte', 'pagoMinimo', 'saldoActual', 'tasaAnual']) f[k].value = tarjeta[k] ?? '';
      $('#tarjetaTitulo').textContent = 'Editar tarjeta ' + tarjeta.nombre;
      f.scrollIntoView({ behavior: 'smooth' });
      break;
    }
    case 'nuevaRegla': S.reglas.push({ patron: 'TEXTO', clase: 'personal', categoria: '', cfdi: false }); guardar(); render(); break;
    case 'borrarRegla': S.reglas.splice(+b.closest('tr').dataset.regla, 1); guardar(); render(); break;
    case 'reaplicar': { const n = S.movs.filter(x => x.clase === 'pendiente' && aplicarReglas(x)).length; guardar(); render(); toast(`${n} movimientos clasificados.`); break; }
    case 'exportar': {
      const url = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = `respaldo-mi-sat-${hoyISO()}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      break;
    }
    case 'borrarTodo':
      if (confirm('¿Borrar TODOS tus datos? Descarga un respaldo antes.') && confirm('Esta acción no se puede deshacer. ¿Seguro?')) { S = nuevoEstado(); guardar(); initPeriodo(); render(); }
      break;
  }
});

initPeriodo();
render();

if (location.hash === '#gasto' || location.hash === '#gasto-rapido') {
  history.replaceState(null, '', location.pathname);
  setTimeout(() => abrirRapido('out'), 300);
}

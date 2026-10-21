/* Valores registrados de wallets; no consulta ni conecta claves de una wallet. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Wallets = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const centavos = n => Math.round(Number(n) * 100);
  const valido = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  function validar(w) {
    return !!w && typeof w.id === 'string' && !!w.id && typeof w.nombre === 'string' && !!w.nombre.trim()
      && w.moneda === 'USD' && valido(w.totalUSD) && Array.isArray(w.tokens)
      && new Set(w.tokens.map(t => t?.simbolo)).size === w.tokens.length
      && w.tokens.every(t => t && typeof t.simbolo === 'string' && !!t.simbolo && valido(t.valorUSD)
        && (t.cantidad == null || valido(t.cantidad)));
  }
  function detalle(w) {
    const tokensUSD = w.tokens.reduce((s, t) => s + centavos(t.valorUSD), 0) / 100;
    return { ...w, tokensUSD, diferenciaUSD: (centavos(w.totalUSD) - centavos(tokensUSD)) / 100 };
  }
  function resumen(wallets = [], tipoCambio = null) {
    const filas = wallets.filter(validar).map(detalle), activos = new Map();
    for (const w of filas) for (const t of w.tokens) {
      const a = activos.get(t.simbolo) || { simbolo: t.simbolo, centavos: 0, cantidad: 0, cantidadCompleta: true, aproximada: false };
      a.centavos += centavos(t.valorUSD);
      if (t.cantidad == null) a.cantidadCompleta = false;
      else a.cantidad += t.cantidad;
      a.aproximada ||= !!t.cantidadAproximada;
      activos.set(t.simbolo, a);
    }
    const totalUSD = filas.reduce((s, w) => s + centavos(w.totalUSD), 0) / 100;
    const tokens = [...activos.values()].map(({ centavos: c, ...a }) => ({ ...a, cantidad: Number(a.cantidad.toFixed(8)), valorUSD: c / 100 }));
    const tokensUSD = tokens.reduce((s, t) => s + centavos(t.valorUSD), 0) / 100;
    const fx = valido(tipoCambio) && tipoCambio > 0 ? tipoCambio : null;
    return { filas, tokens, totalUSD, diferenciaUSD: (centavos(totalUSD) - centavos(tokensUSD)) / 100,
      tipoCambio: fx, totalMXN: fx == null ? null : Math.round(totalUSD * fx * 100) / 100 };
  }
  return { validar, detalle, resumen };
});

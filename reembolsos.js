'use strict';

// Fechas civiles: los plazos no cambian con el horario de verano.
const Reembolsos = (() => {
  function gastoNeto(movimiento, movimientos) {
    const devoluciones = movimientos.filter(m => m.dir === 'in' && m.reembolsoDe && m.reembolsoDe === movimiento.id
      && m.cuenta === movimiento.cuenta && +m.monto > 0)
      .reduce((sum, m) => sum + Math.round(+m.monto * 100), 0);
    return Math.max(0, Math.round(+movimiento.monto * 100) - devoluciones) / 100;
  }
  const dia = fecha => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return NaN;
    const ms = Date.parse(fecha + 'T00:00:00Z');
    return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === fecha ? ms / 864e5 : NaN;
  };
  function porCuenta(cuentas, movimientos, hoy) {
    const actual = dia(hoy);
    return cuentas.filter(c => c.persona).flatMap(cuenta => {
      const banco = (cuenta.banco || '').toLowerCase();
      const plazo = banco.includes('bbva') ? 90 : banco.includes('banamex') ? 45 : null;
      if (!plazo) return [];
      const cargos = movimientos.filter(m => m.cuenta === cuenta.nombre && m.dir === 'out'
        && ['personal', 'gasto_negocio'].includes(m.clase) && +m.monto > 0);
      const compras = cargos.map(m => ({ ...m, monto: gastoNeto(m, movimientos) })).filter(m => m.monto > 0)
        .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
      if (!compras.length) return [];
      const primera = compras.find(m => Number.isFinite(dia(m.fecha)));
      const inicio = primera ? dia(primera.fecha) : NaN;
      const fin = Number.isFinite(inicio) ? new Date((inicio + plazo) * 864e5).toISOString().slice(0, 10) : null;
      const quedan = fin && Number.isFinite(actual) ? dia(fin) - actual : null;
      return [{ cuenta, plazo, primera, fin, quedan,
        pct: quedan === null ? 0 : Math.max(0, Math.min(1, (plazo - quedan) / plazo)),
        gasto: Math.round(compras.reduce((sum, m) => sum + Math.round(+m.monto * 100), 0)) / 100,
        devoluciones: Math.round(cargos.reduce((sum, m) => sum + Math.round((+m.monto - gastoNeto(m, movimientos)) * 100), 0)) / 100,
        cantidad: compras.length }];
    }).sort((a, b) => (a.fin || '9999').localeCompare(b.fin || '9999') || a.cuenta.nombre.localeCompare(b.cuenta.nombre));
  }
  return { porCuenta, gastoNeto };
})();
if (typeof module !== 'undefined') module.exports = Reembolsos;

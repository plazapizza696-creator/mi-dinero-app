(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Prestamos = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const cent = n => Math.round(Number(n) * 100);
  const dinero = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e10;
  function fechaValida(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
    const d = new Date(s + 'T12:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }
  function sumarDias(fecha, dias) {
    const d = new Date(fecha + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
  }
  function validar(p) {
    if (!p || !p.id || typeof p.persona !== 'string' || !p.persona.trim()) return 'Escribe quién te debe.';
    const parcial = p.tipoRegistro === 'saldo_pendiente';
    if (!(parcial && p.capital == null) && (!dinero(p.capital) || cent(p.capital) <= 0)) return 'El capital prestado debe ser mayor que cero.';
    if (!parcial && !dinero(p.ganancia)) return 'La ganancia pactada debe ser cero o positiva.';
    if (parcial && p.capitalPendienteInicial != null && (!dinero(p.capitalPendienteInicial) || (p.capital != null && p.capitalPendienteInicial > p.capital))) return 'Revisa el capital pendiente al registrar el saldo.';
    if (p.reinvertido != null && (!dinero(p.reinvertido) || (p.capital == null && p.reinvertido > 0) || p.reinvertido > p.capital || (p.reinvertido > 0 && p.fondo !== 'reinversion'))) return 'La reinversión debe pertenecer al fondo y no superar el capital del préstamo.';
    if (!Number.isInteger(p.semanas) || p.semanas < 1 || p.semanas > 520) return 'El plazo debe ser de 1 a 520 semanas.';
    if ((p.fecha && !fechaValida(p.fecha)) || !fechaValida(p.primerPago) || (p.fecha && p.primerPago < p.fecha)) return 'Revisa las fechas de entrega y primer pago.';
    if (p.planPagos) {
      if (!Array.isArray(p.planPagos) || !p.planPagos.length || p.planPagos.length > 520) return 'El calendario debe tener de 1 a 520 pagos.';
      if (p.planPagos.some((c, i, plan) => !fechaValida(c.fecha) || !dinero(c.monto) || cent(c.monto) <= 0 || (p.fecha && c.fecha < p.fecha) || (i && c.fecha < plan[i - 1].fecha))) return 'Revisa fechas y montos del calendario.';
      const total = p.planPagos.reduce((t,c) => t + cent(c.monto), 0);
      if (!parcial && total !== cent(p.capital) + cent(p.ganancia)) return 'La suma del calendario debe coincidir con capital y ganancia.';
      if (parcial && p.capitalPendienteInicial != null && cent(p.capitalPendienteInicial) > total) return 'El capital pendiente supera el total por cobrar.';
    } else if (parcial) return 'Un saldo pendiente necesita su calendario exacto.';
    return '';
  }
  function detalle(p, abonos = [], hoy = new Date().toISOString().slice(0, 10)) {
    if (validar(p)) return null;
    const parcial = p.tipoRegistro === 'saldo_pendiente';
    const total = p.planPagos ? p.planPagos.reduce((t,c) => t + cent(c.monto), 0) : cent(p.capital) + cent(p.ganancia);
    const capital = parcial ? (p.capitalPendienteInicial == null ? null : cent(p.capitalPendienteInicial)) : cent(p.capital);
    const ganancia = capital == null ? null : total - capital;
    const pagos = abonos.filter(a => a.prestamoId === p.id && !a.anulado && dinero(a.monto) && fechaValida(a.fecha));
    const recibido = pagos.reduce((s, a) => s + cent(a.monto), 0), cobrado = Math.min(total, recibido);
    const capitalCobrado = capital == null ? null : Math.min(capital, Math.round(cobrado * capital / total));
    let restante = cobrado, vencido = 0;
    const base = Math.floor(total / p.semanas);
    const plan = p.planPagos || Array.from({ length: p.semanas }, (_, n) => ({fecha: sumarDias(p.primerPago, n * 7), monto: (n === p.semanas - 1 ? total - base * n : base) / 100}));
    const cuotas = plan.map((c, n) => {
      const importe = cent(c.monto);
      const pagado = Math.min(importe, restante); restante -= pagado;
      const fecha = c.fecha, pendiente = importe - pagado;
      if (fecha < hoy) vencido += pendiente;
      return { numero: n + 1, fecha, importe: importe / 100, pagado: pagado / 100, pendiente: pendiente / 100 };
    });
    return { ...p, ganancia: ganancia == null ? null : ganancia / 100, desglosePendiente: capital == null, registroParcial: parcial, total: total / 100, cobrado: cobrado / 100, exceso: Math.max(0, recibido - total) / 100,
      capitalCobrado: capitalCobrado == null ? null : capitalCobrado / 100, gananciaCobrada: capital == null ? null : (cobrado - capitalCobrado) / 100,
      capitalPendiente: capital == null ? null : (capital - capitalCobrado) / 100, gananciaPendiente: capital == null ? null : (ganancia - (cobrado - capitalCobrado)) / 100,
      pendiente: (total - cobrado) / 100, vencido: vencido / 100, cuotas,
      proximo: cuotas.find(c => c.pendiente > 0) || null,
      estado: cobrado >= total ? 'Liquidado' : vencido > 0 ? 'Atrasado' : 'Al día',
      fechaFinal: cuotas[cuotas.length - 1].fecha, semanasPagadas: cuotas.filter(c => c.pendiente === 0).length };
  }
  function validarAbono(p, abonos, a, hoy) {
    const d = detalle(p, abonos, hoy);
    if (!d) return 'No se encontró un préstamo válido.';
    if (!a.id || a.prestamoId !== p.id || !dinero(a.monto) || cent(a.monto) <= 0) return 'El abono debe ser mayor que cero.';
    if (!fechaValida(a.fecha) || a.fecha < (p.fecha || p.registrado || '') || a.fecha > hoy) return 'El abono debe ser entre la entrega del préstamo y hoy.';
    if (cent(a.monto) > cent(d.pendiente)) return 'El abono supera lo que falta por cobrar.';
    if (abonos.some(x => x.id === a.id && !x.anulado)) return 'Este abono ya está registrado.';
    return '';
  }
  function resumen(prestamos = [], abonos = [], hoy) {
    const filas = prestamos.map(p => detalle(p, abonos, hoy)).filter(Boolean);
    const sumar = k => filas.reduce((s, p) => s + cent(p[k] ?? 0), 0) / 100;
    return { filas, capital: sumar('capital'), capitalPendiente: sumar('capitalPendiente'),
      pendiente: sumar('pendiente'), ganancia: sumar('ganancia'), gananciaCobrada: sumar('gananciaCobrada'),
      cobrado: sumar('cobrado'), vencido: sumar('vencido'), desglosesPendientes: filas.filter(p => p.desglosePendiente).length,
      patrimonioNominal: filas.filter(p => p.incluirPatrimonio && p.criterioPatrimonio === 'saldo').reduce((s,p)=>s+cent(p.pendiente),0)/100,
      patrimonio: filas.filter(p => p.incluirPatrimonio).reduce((s, p) => s + cent(p.criterioPatrimonio === 'saldo' ? p.pendiente : p.capitalPendiente ?? 0), 0) / 100 };
  }
  function fondo(prestamos = [], abonos = [], hoy) {
    const r = resumen(prestamos.filter(p => p.fondo === 'reinversion'), abonos, hoy);
    const reinvertido = r.filas.reduce((s,p) => s + cent(p.reinvertido || 0),0) / 100;
    return {...r, reinvertido, disponible: Math.max(0,cent(r.cobrado)-cent(reinvertido))/100, excesoReinversion: Math.max(0,cent(reinvertido)-cent(r.cobrado))/100};
  }
  function validarReinversion(p, prestamos, abonos, hoy) {
    if (!(p.reinvertido > 0)) return '';
    const r = fondo(prestamos.filter(x=>x.id!==p.id), abonos, hoy);
    // Al editar, los cobros del préstamo se conservan como fuente del fondo.
    const actual = prestamos.find(x=>x.id===p.id);
    const cobradoActual = actual?.fondo === 'reinversion' ? detalle(actual,abonos,hoy)?.cobrado || 0 : 0;
    return cent(p.reinvertido) > cent(r.cobrado) + cent(cobradoActual) - cent(r.reinvertido) ? 'La reinversión supera los cobros disponibles del fondo.' : '';
  }
  return { validar, detalle, resumen, fondo, validarReinversion, validarAbono, sumarDias, fechaValida };
});

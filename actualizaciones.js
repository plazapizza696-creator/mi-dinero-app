/* Avisa de código nuevo aunque una pestaña lleve días abierta. */
(() => {
  const version = document.documentElement.dataset.appVersion;
  if (!version || !/^https?:$/.test(location.protocol)) return;
  let consultando = false;
  async function revisarVersion() {
    if (consultando || document.visibilityState !== 'visible') return;
    consultando = true;
    try {
      const r = await fetch(location.pathname.replace(/\/[^/]*$/, '') + '/version.json', { cache: 'no-store' });
      if (!r.ok || r.redirected) return;
      const nueva = await r.json();
      if (!nueva.version || nueva.version === version || document.getElementById('avisoVersion')) return;
      const aviso = document.createElement('div'); aviso.id = 'avisoVersion'; aviso.className = 'aviso-version'; aviso.setAttribute('role', 'status');
      const texto = document.createElement('span'); texto.textContent = 'Hay una versión nueva de Mi Dinero.';
      const boton = document.createElement('button'); boton.textContent = 'Actualizar app'; boton.className = 'primary';
      boton.addEventListener('click', async () => {
        if (typeof ocupado === 'function' && ocupado()) { toast('Guarda o cierra el formulario antes de actualizar.', 'warn'); return; }
        boton.disabled = true;
        if (await window.Sync?.prepararActualizacion()) location.reload();
        else { boton.disabled = false; toast('Espera a que se guarden tus cambios y vuelve a intentar.', 'warn'); }
      });
      aviso.append(texto, boton); document.body.appendChild(aviso);
    } catch { /* La app sigue disponible con sus registros locales. */ }
    finally { consultando = false; }
  }
  revisarVersion(); setInterval(revisarVersion, 60000);
  document.addEventListener('visibilitychange', revisarVersion);
})();

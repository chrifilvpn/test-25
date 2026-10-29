// TOCCO VICINO: sul telefono le caselle di alcuni tavolieri disegnati (Hex, Quoridor, Dama cinese, Conquista, Xiangqi,
// Forza 4 3D, Backgammon, Mahjong, Battaglia navale) sono più piccole del dito. Se il tocco cade sul tavoliere ma
// non su una cosa da toccare, vale quella più vicina entro RAGGIO pixel, come se l'avessi presa in pieno.
// Solo col dito (pointer: coarse): col mouse si mira bene e un clic a vuoto resta a vuoto.
(() => {
  const TAVOLIERI = '.hx-svg, .qr-svg, .dc-svg, .cq-mappa, .f3-svg, .f3-piani, .bkg-svg, .mj-tavolo, .bn-griglia, .xq-svg, .go-svg, .mul-tavola, .ludo-svg';
  const RAGGIO = 22;
  const dito = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  document.addEventListener('click', (e) => {
    if (!e.isTrusted || !dito()) return;
    const t = e.target instanceof Element ? e.target : null;
    if (!t || t.closest('[data-az]')) return;
    const tav = t.closest(TAVOLIERI);
    if (!tav || !tav.closest('#tavolo')) return;
    let meglio = null, dm = RAGGIO;
    for (const el of tav.querySelectorAll('[data-az]')) {
      if (el.disabled) continue;
      const q = el.getBoundingClientRect();
      if (!q.width && !q.height) continue;
      const d = Math.hypot(Math.max(q.left - e.clientX, 0, e.clientX - q.right), Math.max(q.top - e.clientY, 0, e.clientY - q.bottom));
      if (d < dm) { dm = d; meglio = el; }
    }
    if (!meglio) return;
    e.stopPropagation();
    meglio.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY }));
  }, true);
})();

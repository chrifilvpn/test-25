// BASE COMUNE DEI ROMPICAPO nel browser (kakuro, gabbie aritmetiche, torre di Hanoi, spingi le casse, mahjong):
// cronometro che scorre, avversari della sfida (a che punto sono), mosse "subito" (si disegnano prima della risposta
// del server: ogni mossa ha un numero d'ordine, la vista del server vale quando ha visto tutte le mie mosse).
// I giochi la usano solo dentro le loro funzioni (window.Rompicapo), quindi l'ordine dei file non conta.
(() => {
  const { esc } = window.Nuovi;
  const fmt = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(s % 60).padStart(2, '0')}`; };
  const GIOCHI = ['kakuro', 'kenken', 'hanoi', 'sokoban', 'mahjong', 'luci', 'nurikabe', 'navale', 'picross', 'piramide', 'freecell', 'cruciverba', 'collega'];
  const ricevuto = new WeakMap();
  let ctxA = null;
  const tempo = (p) => p.tempo + (p.corre ? Date.now() - (ricevuto.get(p) || Date.now()) : 0);
  const resta = (p) => (p.limite == null ? null : p.limite - (p.finita ? 0 : Date.now() - (ricevuto.get(p) || Date.now())));
  setInterval(() => {
    const p = ctxA && ctxA.stato && ctxA.partita;
    if (!p || !GIOCHI.includes(p.gioco)) return;
    for (const el of document.querySelectorAll('.rp-tempo')) el.textContent = fmt(tempo(p));
    const r = p && resta(p);
    for (const el of document.querySelectorAll('.rp-resta')) { el.textContent = fmt(r); el.classList.toggle('poco', r < 60000); }
  }, 250);

  const R = {
    fmt,
    tempo,
    // da chiamare in reset/dopo: tiene il cronometro e ricorda quando è arrivata la vista
    attiva(ctx) { ctxA = ctx; if (ctx.partita && !ricevuto.has(ctx.partita)) ricevuto.set(ctx.partita, Date.now()); },
    // manda una mossa con il suo numero d'ordine
    invia(ctx, azione) {
      const ui = ctx.ui;
      ui.seq = Math.max(ui.seq || 0, ctx.partita.seq || 0) + 1;
      ctx.invia({ ...azione, seq: ui.seq });
    },
    // il server ha già visto tutte le mie mosse?
    allineato(ctx) { return (ctx.partita.seq || 0) >= (ctx.ui.seq || 0); },
    // barra in alto: tempo (e tempo che resta nella sfida), più le cose del gioco
    barra(ctx, extra = '') {
      const p = ctx.partita;
      const r = resta(p);
      return `<div class="rp-barra"><span class="rp-crono" title="Il tuo tempo">⏱ <b class="rp-tempo">${fmt(tempo(p))}</b>${p.penale ? ` <small>(+${Math.round(p.penale / 1000)} s di aiuti)</small>` : ''}</span>
        ${extra}${r != null && !p.finita ? `<span class="rp-limite" title="Tempo che resta nella sfida">⌛ <b class="rp-resta">${fmt(r)}</b></span>` : ''}</div>`;
    },
    // cosa si vede sotto il nome di un avversario: barretta di avanzamento, poi il tempo o il posto d'arrivo
    infoPosto(ctx, posto, testo) {
      const p = ctx.partita, x = p.altri && p.altri[posto];
      if (!x) return '';
      if (x.ritirato) return '<span class="rp-info">ritirato</span>';
      if (x.fatto != null) return `<span class="rp-info fatto">✅ ${p.arrivi.indexOf(posto) + 1}° · ${fmt(x.fatto)}${testo ? ` · ${testo}` : ''}</span>`;
      return `<span class="rp-info"><i class="rp-prog"><i style="width:${x.prog}%"></i></i>${testo || `${x.prog}%`}</span>`;
    },
    // classifica della sfida nel pannello (chi ha finito e in che tempo)
    arrivo(ctx, extra = () => '') {
      const p = ctx.partita;
      if (!p.sfida) return '';
      const righe = p.arrivi.map((i, k) => `<li class="${i === ctx.mio ? 'io' : ''}"><b>${k + 1}°</b> ${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <span>${fmt(p.altri[i].fatto)}${extra(i)}</span></li>`).join('');
      return righe ? `<ol class="rp-arrivi">${righe}</ol>` : '';
    },
    // il messaggio di chi ha finito e aspetta gli altri
    attesa(ctx) {
      const p = ctx.partita;
      if (p.finita || p.fatto == null || !p.sfida) return '';
      const pos = p.arrivi.indexOf(ctx.mio) + 1;
      return `<p class="rp-finito">${pos === 1 ? '🥇 Primo!' : `🏁 ${pos}° posto`} · tempo <b>${fmt(p.fatto)}</b>. Aspetta che finiscano gli altri…</p>`;
    },
    // tasti di un rompicapo: niente se si scrive in un campo, se ci sono le dispense o se non è quel gioco
    tastiera(id, ctxDi, gestore) {
      document.addEventListener('keydown', (e) => {
        const ctx = ctxDi();
        if (!ctx || !ctx.stato || !ctx.partita || ctx.partita.gioco !== id || (window.Boss && Boss.attivo)) return;
        if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
        if (e.altKey || e.metaKey) return;
        gestore(e, ctx);
      });
    },
  };
  window.Rompicapo = R;
})();

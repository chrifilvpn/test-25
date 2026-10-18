// LUCI SPENTE: un pannello scuro con le lucine di vetro; passando sopra una casella si vede la croce che cambierà.
// I tocchi si vedono subito, prima della risposta del server (mosse numerate, come negli altri rompicapo).
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const R = () => window.Rompicapo;
  let ctxL = null;

  const vicine = (lato, i) => {
    const x = i % lato, y = (i - x) / lato, out = [i];
    if (x > 0) out.push(i - 1); if (x < lato - 1) out.push(i + 1);
    if (y > 0) out.push(i - lato); if (y < lato - 1) out.push(i + lato);
    return out;
  };
  function locale(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (!ui.loc || R().allineato(ctx)) ui.loc = { stato: p.stato.slice(), mosse: p.mosse };
    return ui.loc;
  }
  const puoi = (ctx) => { const p = ctx.partita; return !p.finita && p.fatto == null && !p.ritirato && !ctx.stato.spettatore; };

  function premi(ctx, i) {
    if (!puoi(ctx)) return;
    const p = ctx.partita, L = locale(ctx);
    for (const j of vicine(p.lato, i)) L.stato[j] = (L.stato[j] + 1) % p.q;
    L.mosse++;
    const accese = L.stato.filter(Boolean).length;
    suono([[accese ? 420 + (i % p.lato) * 30 : 880, 0.05]], { tipo: 'sine', volume: 0.05 });
    ctx.ui.cur = i;
    R().invia(ctx, { tipo: 'tocca', i });
    ctx.ridisegna();
  }

  const tavolo = {
    libero: true,
    reset(ctx) { ctxL = ctx; R().attiva(ctx); },
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui, L = locale(ctx), lato = p.lato;
      const finito = p.fatto != null || p.finita;
      const sopra = ui.sopra != null && puoi(ctx) ? new Set(vicine(lato, ui.sopra)) : null;
      const celle = L.stato.map((v, i) => `<button type="button" class="lc-cella s${v} ${sopra && sopra.has(i) ? 'lc-croce' : ''} ${ui.sopra === i ? 'centro' : ''} ${p.suggerimento === i && R().allineato(ctx) ? 'aiuto' : ''} ${ui.tastiera && ui.cur === i ? 'cur' : ''}" data-az="tocca" data-i="${i}" aria-label="Riga ${Math.floor(i / lato) + 1}, colonna ${(i % lato) + 1}: ${['spenta', p.q === 3 ? 'rossa' : 'accesa', 'verde'][v]}"><i></i></button>`).join('');
      const accese = L.stato.filter(Boolean).length;
      const rec = p.finita && p.record && p.record.length ? `<div class="bb-record"><b>🏆 Tempi migliori · ${lato}×${lato}${p.q === 3 ? ' a tre colori' : ''}</b><ol>${p.record.map((x, k) => `<li class="${k === p.posizioneRecord ? 'nuovo' : ''}">${R().fmt(x.ms)} <small>(${x.mosse} tocchi)</small></li>`).join('')}</ol></div>` : '';
      const extra = `<span>Tocchi <b>${L.mosse}</b> <small>(minimo ${p.minimo})</small></span><span>💡 Accese <b>${accese}</b></span>${!finito && R().allineato(ctx) && L.mosse ? `<span>Ne mancano almeno <b>${p.mancano}</b></span>` : ''}`;
      const comandi = finito ? '' : `<div class="lc-comandi">
          <button type="button" class="bottone" data-az="annulla" ${p.puoAnnullare || L.mosse ? '' : 'disabled'} title="Ctrl+Z">↶ Annulla</button>
          <button type="button" class="bottone" data-az="ricomincia">↺ Da capo</button>
          <button type="button" class="bottone" data-az="aiuto" title="Una casella giusta (+15 s)">💡 Aiuto</button>
          ${p.sfida ? '<button type="button" class="bottone leggero" data-az="arrenditi">🏳️ Mi ritiro</button>' : ''}</div>
          <p class="lc-guida">${p.q === 3 ? 'Ogni tocco: spenta → <b class="r">rossa</b> → <b class="v">verde</b> → spenta' : 'Ogni tocco cambia la casella e le quattro vicine'} · frecce e <b>spazio</b> · <b>Ctrl+Z</b> annulla</p>`;
      return `<div class="lc ${finito ? 'finito' : ''} ${p.q === 3 ? 'tre' : ''}" style="--lato:${lato}">
        ${R().barra(ctx, extra)}
        <div class="lc-pannello"><div class="lc-griglia">${celle}</div></div>
        ${R().attesa(ctx)}${comandi}${R().arrivo(ctx, (i) => ` · ${p.mosseAltri[i]} tocchi`)}${rec}</div>`;
    },
    dopo(ctx) {
      ctxL = ctx; R().attiva(ctx);
      if (ctx.partita.fatto != null && primaVolta(ctx.ui, 'lc-fatto')) suono([[523, 0.08], [659, 0.08], [784, 0.08], [1046, 0.3]], { volume: 0.08 });
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.fatto != null ? 'Finito! ✅' : p.sfida ? 'Sfida: chi spegne tutto prima?' : 'Spegni tutte le luci'; },
    punteggio(ctx) { const p = ctx.partita; return p.sfida ? p.altri.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x.fatto != null ? '✅' : `${x.prog}%`}</b></span>`).join('') : ''; },
    infoPosto(ctx, posto) { return R().infoPosto(ctx, posto, `${ctx.partita.mosseAltri[posto]} tocchi`); },
    clic(ctx, el) {
      const az = el.dataset.az;
      if (az === 'tocca') { ctx.ui.tastiera = false; return premi(ctx, Number(el.dataset.i)); }
      if (az === 'annulla') return R().invia(ctx, { tipo: 'annulla' });
      if (az === 'ricomincia') { if (!confirm('Ricominciare da capo? (i tocchi tornano a zero)')) return; return R().invia(ctx, { tipo: 'ricomincia' }); }
      if (az === 'aiuto') return R().invia(ctx, { tipo: 'aiuto' });
      if (az === 'arrenditi') { if (confirm('Vuoi ritirarti dalla sfida?')) R().invia(ctx, { tipo: 'arrenditi' }); }
    },
  };

  // la croce sotto il mouse (solo con il mouse: sul telefono non c'è "sopra")
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || !ctxL || !ctxL.partita || ctxL.partita.gioco !== 'luci') return;
    const el = e.target.closest && e.target.closest('.lc-cella');
    const i = el ? Number(el.dataset.i) : null;
    if (i !== ctxL.ui.sopra) { ctxL.ui.sopra = i; ctxL.ridisegna(); }
  });

  setTimeout(() => window.Rompicapo.tastiera('luci', () => ctxL, (e, ctx) => {
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); return R().invia(ctx, { tipo: 'annulla' }); }
    if (e.ctrlKey) return;
    const p = ctx.partita, ui = ctx.ui, lato = p.lato;
    if (ui.cur == null) ui.cur = Math.floor((lato * lato) / 2);
    const d = { ArrowUp: -lato, ArrowDown: lato, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (d) {
      e.preventDefault(); ui.tastiera = true;
      const x = ui.cur % lato;
      if ((d === -1 && x === 0) || (d === 1 && x === lato - 1)) return ctx.ridisegna();
      const n = ui.cur + d; if (n >= 0 && n < lato * lato) ui.cur = n;
      return ctx.ridisegna();
    }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); ui.tastiera = true; premi(ctx, ui.cur); }
  }), 0);

  Object.assign(window.Tavoli, { luci: tavolo });
})();

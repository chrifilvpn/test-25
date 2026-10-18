// SOLITARIO PIRAMIDE: la piramide di carte che si sovrappongono, il tallone coperto con il numero di carte e gli
// scarti a ventaglio. Si tocca una carta libera (si alza) e poi la sua compagna da 13; il re si toglie toccandolo.
// Le carte tolte spariscono subito, prima della risposta del server.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const R = () => window.Rompicapo;
  let ctxPi = null;
  const VAL = (c) => c.rango;
  const SOPRA = Array.from({ length: 28 }, (_, k) => { const r = Math.floor((Math.sqrt(8 * k + 1) - 1) / 2), i = k - (r * (r + 1)) / 2; return r === 6 ? [] : [(r + 1) * (r + 2) / 2 + i, (r + 1) * (r + 2) / 2 + i + 1]; });

  function locale(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (!ui.loc || R().allineato(ctx)) ui.loc = { piramide: p.piramide.slice(), scarto: p.scarto, sotto: p.sottoScarto.slice() };
    return ui.loc;
  }
  const puoi = (ctx) => { const p = ctx.partita; return !p.finita && p.fatto == null && !p.ritirato && !ctx.stato.spettatore; };
  const libera = (L, k) => L.piramide[k] && SOPRA[k].every((j) => !L.piramide[j]);
  const cartaDi = (L, r) => (r.p != null ? L.piramide[r.p] : L.scarto);
  const uguali = (a, b) => a && b && (a.p != null ? a.p === b.p : !!a.s === !!b.s && b.p == null);

  function togli(ctx, refs) {
    const L = locale(ctx);
    for (const r of refs) { if (r.p != null) L.piramide[r.p] = null; else { L.scarto = L.sotto.shift() || null; } }
    const tipo = refs.length === 1 ? 'togli' : 'coppia';
    R().invia(ctx, refs.length === 1 ? { tipo, a: refs[0] } : { tipo, a: refs[0], b: refs[1] });
    suono([[520, 0.05], [700, 0.07]], { tipo: 'triangle', volume: 0.05 });
  }
  function tocca(ctx, r) {
    if (!puoi(ctx)) return;
    const ui = ctx.ui, L = locale(ctx), c = cartaDi(L, r);
    if (!c || (r.p != null && !libera(L, r.p))) return;
    if (VAL(c) === 13) { ui.sel = null; togli(ctx, [r]); return ctx.ridisegna(); }
    if (!ui.sel || uguali(ui.sel, r)) { ui.sel = uguali(ui.sel, r) ? null : r; return ctx.ridisegna(); }
    const s = cartaDi(L, ui.sel);
    if (s && VAL(s) + VAL(c) === 13) { const a = ui.sel; ui.sel = null; togli(ctx, [a, r]); return ctx.ridisegna(); }
    ctx.avviso(`${VAL(s)} + ${VAL(c)} fa ${VAL(s) + VAL(c)}, non 13`, 1400);
    suono([[150, 0.1]], { tipo: 'square', volume: 0.03 });
    ui.sel = r; ctx.ridisegna();
  }

  const tavolo = {
    libero: true,
    reset(ctx) { ctxPi = ctx; R().attiva(ctx); },
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui, L = locale(ctx);
      const finito = p.fatto != null || p.finita;
      const sug = R().allineato(ctx) ? p.suggerimento : null;
      const evid = (r) => sug && ((sug.a && uguali(sug.a, r)) || (sug.b && uguali(sug.b, r)));
      let file = '';
      for (let r = 0; r < 7; r++) {
        let fila = '';
        for (let i = 0; i <= r; i++) {
          const k = (r * (r + 1)) / 2 + i, c = L.piramide[k];
          if (!c) { fila += '<div class="pi-posto"></div>'; continue; }
          const lib = libera(L, k);
          fila += `<div class="pi-posto">${Carte.fronte(c, `${lib ? 'pi-libera' : 'pi-coperta'} ${ui.sel && ui.sel.p === k ? 'pi-sel' : ''} ${evid({ p: k }) ? 'pi-aiuto' : ''}`, lib ? `data-az="carta" data-p="${k}" role="button" tabindex="0"` : '')}</div>`;
        }
        file += `<div class="pi-fila">${fila}</div>`;
      }
      const tallone = p.tallone ? `<div class="pi-tallone ${sug && sug.tipo === 'pesca' ? 'pi-aiuto' : ''}" data-az="pesca" role="button" aria-label="Gira una carta">${Carte.retro()}<span>${p.tallone}</span></div>`
        : `<div class="pi-tallone vuoto ${sug && sug.tipo === 'pesca' ? 'pi-aiuto' : ''}" ${p.puoRigirare ? 'data-az="pesca" role="button"' : ''}>${p.puoRigirare ? '↻<small>rigira</small>' : '✕'}</div>`;
      const scarti = `<div class="pi-scarti">${L.sotto.slice().reverse().map((c, k) => `<div class="pi-sotto" style="--k:${k}">${Carte.fronte(c)}</div>`).join('')}${L.scarto ? Carte.fronte(L.scarto, `pi-libera ${ui.sel && ui.sel.s ? 'pi-sel' : ''} ${evid({ s: 1 }) ? 'pi-aiuto' : ''}`, 'data-az="carta" data-s="1" role="button" tabindex="0"') : '<div class="pi-vuoto">scarti</div>'}</div>`;
      const tolte = L.piramide.filter((c) => !c).length;
      const rec = p.finita && p.record && p.record.length ? `<div class="bb-record"><b>🏆 Tempi migliori</b><ol>${p.record.map((x, k) => `<li class="${k === p.posizioneRecord ? 'nuovo' : ''}">${R().fmt(x.ms)} <small>(${x.mosse} mosse)</small></li>`).join('')}</ol></div>` : '';
      const extra = `<span>🔺 Tolte <b>${tolte}/28</b></span><span>Giro <b>${p.giro}/${p.maxGiri}</b></span>`;
      const comandi = finito ? '' : `<div class="nk-bottoni">
          <button type="button" class="bottone" data-az="annulla" ${p.puoAnnullare ? '' : 'disabled'} title="Ctrl+Z">↶ Annulla</button>
          <button type="button" class="bottone" data-az="aiuto" title="La mossa giusta (+15 s)">💡 Aiuto</button>
          ${p.sfida ? '<button type="button" class="bottone leggero" data-az="arrenditi">🏳️ Mi ritiro</button>' : ''}</div>
          <p class="nk-guida">Tocca due carte libere che fanno 13 (il re da solo) · asso 1, fante 11, donna 12, re 13 · <b>spazio</b> gira il tallone</p>`;
      return `<div class="pi ${finito ? 'finito' : ''}">${R().barra(ctx, extra)}
        <div class="pi-tavolo"><div class="pi-piramide">${file}</div><div class="pi-mazzi">${tallone}${scarti}</div></div>
        ${R().attesa(ctx)}${comandi}${R().arrivo(ctx, (i) => ` · ${p.tolteAltri[i]}/28`)}${rec}</div>`;
    },
    dopo(ctx) {
      ctxPi = ctx; R().attiva(ctx);
      if (ctx.partita.fatto != null && primaVolta(ctx.ui, 'pi-fatto')) suono([[523, 0.08], [659, 0.08], [784, 0.08], [1046, 0.3]], { volume: 0.08 });
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.fatto != null ? 'Finito! ✅' : p.sfida ? 'Gara: chi svuota prima la piramide?' : 'Togli le coppie che fanno 13'; },
    punteggio(ctx) { const p = ctx.partita; return p.sfida ? p.altri.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x.fatto != null ? '✅' : `${p.tolteAltri[i]}/28`}</b></span>`).join('') : ''; },
    infoPosto(ctx, posto) { return R().infoPosto(ctx, posto, `${ctx.partita.tolteAltri[posto]}/28`); },
    clic(ctx, el) {
      const az = el.dataset.az;
      if (az === 'carta') return tocca(ctx, el.dataset.s ? { s: 1 } : { p: Number(el.dataset.p) });
      if (az === 'pesca') { if (!puoi(ctx)) return; ctx.ui.sel = null; suono([[300, 0.04]], { tipo: 'sine', volume: 0.04 }); return R().invia(ctx, { tipo: 'pesca' }); }
      if (az === 'annulla') { ctx.ui.sel = null; return R().invia(ctx, { tipo: 'annulla' }); }
      if (az === 'aiuto') return R().invia(ctx, { tipo: 'aiuto' });
      if (az === 'arrenditi') { if (confirm('Vuoi ritirarti dalla gara?')) R().invia(ctx, { tipo: 'arrenditi' }); }
    },
  };
  setTimeout(() => window.Rompicapo.tastiera('piramide', () => ctxPi, (e, ctx) => {
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); ctx.ui.sel = null; return R().invia(ctx, { tipo: 'annulla' }); }
    if (e.key === ' ' && puoi(ctx)) { e.preventDefault(); ctx.ui.sel = null; R().invia(ctx, { tipo: 'pesca' }); }
    if (e.key === 'Escape') { ctx.ui.sel = null; ctx.ridisegna(); }
  }), 0);
  Object.assign(window.Tavoli, { piramide: tavolo });
})();

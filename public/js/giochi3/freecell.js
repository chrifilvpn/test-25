// FREECELL: in alto le 4 celle e le 4 basi, sotto le 8 colonne di carte accavallate. Si tocca una carta (con le
// carte ordinate sotto di lei) e poi la destinazione; il doppio tocco la manda sulla base o in una cella libera.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const R = () => window.Rompicapo;
  let ctxF = null, ultimoTocco = { t: 0, k: '' };
  const SEMI = ['c', 'q', 'f', 'p'];
  const ROSSO = { c: true, q: true };
  const carta = (id) => ({ id, rango: parseInt(id, 10), seme: id[id.length - 1] });
  const sopraOk = (a, b) => !!ROSSO[a.slice(-1)] !== !!ROSSO[b.slice(-1)] && parseInt(a, 10) === parseInt(b, 10) + 1;
  function inizioPila(col) { let k = col.length - 1; while (k > 0 && sopraOk(col[k - 1], col[k])) k--; return k; }
  const puoi = (ctx) => { const p = ctx.partita; return !p.finita && p.fatto == null && !p.ritirato && !ctx.stato.spettatore; };
  const uguale = (x, y) => x && y && x.c === y.c && x.f === y.f && (x.k == null || y.k == null || x.k === y.k);

  function invia(ctx, da, a) { ctx.ui.sel = null; suono([[340, 0.04]], { tipo: 'triangle', volume: 0.04 }); R().invia(ctx, { tipo: 'sposta', da, a }); ctx.ridisegna(); }
  // doppio tocco: base, altrimenti la prima cella libera
  function veloce(ctx, da) {
    const p = ctx.partita;
    const id = da.f != null ? p.celle[da.f] : p.colonne[da.c][p.colonne[da.c].length - 1];
    if (!id) return;
    const c = carta(id);
    if (p.basi[c.seme] === c.rango - 1) return invia(ctx, da, { b: 1 });
    const f = p.celle.findIndex((x) => !x);
    if (da.c != null && f >= 0) return invia(ctx, { c: da.c, k: p.colonne[da.c].length - 1 }, { f });
  }
  function tocca(ctx, cosa) {
    if (!puoi(ctx)) return;
    const ui = ctx.ui, p = ctx.partita;
    const ora = performance.now(), chiave = JSON.stringify(cosa);
    const doppio = ora - ultimoTocco.t < 350 && ultimoTocco.k === chiave;
    ultimoTocco = { t: ora, k: chiave };
    if (doppio && (cosa.f != null || cosa.c != null) && !cosa.vuota) return veloce(ctx, cosa);
    // primo tocco: si sceglie la carta (o la pila che parte da lei)
    if (!ui.sel) {
      if (cosa.b || cosa.vuota || (cosa.f != null && !p.celle[cosa.f])) return;
      if (cosa.c != null) {
        const col = p.colonne[cosa.c];
        if (!col.length) return;
        if (cosa.k < inizioPila(col)) { ctx.avviso('Si spostano solo pile ordinate: colori alternati, a scendere', 1500); return; }
      }
      ui.sel = cosa; return ctx.ridisegna();
    }
    if (uguale(ui.sel, cosa)) { ui.sel = null; return ctx.ridisegna(); }
    const da = ui.sel.f != null ? { f: ui.sel.f } : { c: ui.sel.c, k: ui.sel.k };
    if (cosa.b) return invia(ctx, da, { b: 1 });
    if (cosa.f != null) return invia(ctx, da, { f: cosa.f });
    if (cosa.c != null) { if (cosa.c === ui.sel.c) { ui.sel = cosa.vuota ? null : cosa; return ctx.ridisegna(); } return invia(ctx, da, { c: cosa.c }); }
    return undefined;
  }

  const tavolo = {
    libero: true,
    reset(ctx) { ctxF = ctx; R().attiva(ctx); },
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui;
      const finito = p.fatto != null || p.finita;
      const sug = R().allineato(ctx) ? p.suggerimento : null;
      const sel = ui.sel;
      const celle = p.celle.map((id, f) => `<div class="fc-posto fc-cella ${sug && ((sug.da.f === f) || (sug.a.f === f)) ? 'fc-aiuto' : ''}" data-az="cella" data-f="${f}">${id ? Carte.fronte(carta(id), sel && sel.f === f ? 'fc-sel' : '') : '<span>cella</span>'}</div>`).join('');
      const basi = SEMI.map((s) => `<div class="fc-posto fc-base ${sug && sug.a.b && sug.da && ((sug.da.f != null && p.celle[sug.da.f] && p.celle[sug.da.f].endsWith(s)) || (sug.da.c != null && (p.colonne[sug.da.c].slice(-1)[0] || '').endsWith(s))) ? 'fc-aiuto' : ''}" data-az="base">${p.basi[s] ? Carte.fronte(carta(`${p.basi[s]}${s}`), p.ultime && p.ultime.some((x) => x.endsWith(s)) ? 'fc-salita' : '') : `<span>${Carte.seme(s)}</span>`}</div>`).join('');
      const colonne = p.colonne.map((col, i) => {
        const k0 = inizioPila(col), n = col.length;
        const carte = col.map((id, k) => {
          const scelta = sel && sel.c === i && k >= sel.k, pila = k >= k0;
          const aiuto = sug && sug.da.c === i && k >= sug.da.k;
          return `<div class="fc-c" style="--k:${k}" data-az="carta" data-c="${i}" data-k="${k}">${Carte.fronte(carta(id), `${scelta ? 'fc-sel' : ''} ${pila ? '' : 'fc-ferma'} ${aiuto ? 'fc-aiuto' : ''}`)}</div>`;
        }).join('');
        return `<div class="fc-colonna ${sug && sug.a.c === i ? 'fc-dest' : ''}" data-az="colonna" data-c="${i}" style="--n:${Math.max(n, 1)}">${carte || '<div class="fc-vuota"></div>'}</div>`;
      }).join('');
      const suBasi = SEMI.reduce((t, s) => t + p.basi[s], 0);
      const rec = p.finita && p.record && p.record.length ? `<div class="bb-record"><b>🏆 Tempi migliori</b><ol>${p.record.map((x, k) => `<li class="${k === p.posizioneRecord ? 'nuovo' : ''}">${R().fmt(x.ms)} <small>(${x.mosse} mosse)</small></li>`).join('')}</ol></div>` : '';
      const extra = `<span>🃏 Sulle basi <b>${suBasi}/52</b></span><span>Mosse <b>${p.mosse}</b></span><span title="Quante carte puoi spostare insieme">Pila max <b>${p.capienza}</b></span>`;
      const comandi = finito ? '' : `<div class="nk-bottoni">
          <button type="button" class="bottone" data-az="annulla" ${p.puoAnnullare ? '' : 'disabled'} title="Ctrl+Z">↶ Annulla</button>
          <button type="button" class="bottone" data-az="aiuto" title="La mossa giusta (+15 s)">💡 Aiuto</button>
          <button type="button" class="bottone leggero" data-az="ricomincia">↺ Da capo</button>
          ${p.sfida ? '<button type="button" class="bottone leggero" data-az="arrenditi">🏳️ Mi ritiro</button>' : ''}</div>
          <p class="nk-guida">Tocca una carta e poi dove metterla · doppio tocco: sulla base o in una cella · <b>Esc</b> annulla la scelta · <b>Ctrl+Z</b> annulla la mossa</p>`;
      return `<div class="fc ${finito ? 'finito' : ''}">${R().barra(ctx, extra)}
        <div class="fc-tavolo"><div class="fc-alto"><div class="fc-gruppo">${celle}</div><div class="fc-gruppo">${basi}</div></div>
        <div class="fc-colonne">${colonne}</div></div>
        ${R().attesa(ctx)}${comandi}${R().arrivo(ctx, (i) => ` · ${p.basiAltri[i]}/52`)}${rec}</div>`;
    },
    dopo(ctx) {
      ctxF = ctx; R().attiva(ctx);
      const p = ctx.partita;
      if (p.ultime && p.ultime.length && primaVolta(ctx.ui, `fc-u-${p.mosse}`)) suono(p.ultime.slice(0, 4).map((_, k) => [600 + k * 80, 0.05]), { tipo: 'sine', volume: 0.04 });
      if (p.fatto != null && primaVolta(ctx.ui, 'fc-fatto')) suono([[523, 0.08], [659, 0.08], [784, 0.08], [1046, 0.3]], { volume: 0.08 });
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.fatto != null ? 'Finito! ✅' : p.sfida ? 'Gara: chi mette prima tutto sulle basi?' : 'Metti tutte le carte sulle basi'; },
    punteggio(ctx) { const p = ctx.partita; return p.sfida ? p.altri.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x.fatto != null ? '✅' : `${p.basiAltri[i]}/52`}</b></span>`).join('') : ''; },
    infoPosto(ctx, posto) { return R().infoPosto(ctx, posto, `${ctx.partita.basiAltri[posto]}/52`); },
    clic(ctx, el) {
      const az = el.dataset.az;
      if (az === 'carta') return tocca(ctx, { c: Number(el.dataset.c), k: Number(el.dataset.k) });
      if (az === 'colonna') return tocca(ctx, { c: Number(el.dataset.c), k: ctx.partita.colonne[Number(el.dataset.c)].length - 1, vuota: !ctx.partita.colonne[Number(el.dataset.c)].length });
      if (az === 'cella') return tocca(ctx, { f: Number(el.dataset.f) });
      if (az === 'base') return tocca(ctx, { b: 1 });
      if (az === 'annulla') { ctx.ui.sel = null; return R().invia(ctx, { tipo: 'annulla' }); }
      if (az === 'aiuto') return R().invia(ctx, { tipo: 'aiuto' });
      if (az === 'ricomincia') { if (confirm('Ricominciare la distribuzione da capo?')) { ctx.ui.sel = null; R().invia(ctx, { tipo: 'ricomincia' }); } return; }
      if (az === 'arrenditi') { if (confirm('Vuoi ritirarti dalla gara?')) R().invia(ctx, { tipo: 'arrenditi' }); }
    },
  };
  setTimeout(() => window.Rompicapo.tastiera('freecell', () => ctxF, (e, ctx) => {
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); ctx.ui.sel = null; return R().invia(ctx, { tipo: 'annulla' }); }
    if (e.key === 'Escape') { ctx.ui.sel = null; ctx.ridisegna(); }
  }), 0);
  Object.assign(window.Tavoli, { freecell: tavolo });
})();

// PICROSS A COLORI: tavolozza in alto (colori e croce), indizi colorati a sinistra e sopra (si spengono quando la fila
// è giusta), griglia a quadretti con una linea più marcata ogni 5. Si colora toccando o trascinando; le mosse si
// vedono subito, prima della risposta del server.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const R = () => window.Rompicapo;
  let ctxP = null, tratto = null;
  const CROCE = 99;

  function locale(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (!ui.loc || R().allineato(ctx)) ui.loc = { celle: p.celle.slice() };
    return ui.loc;
  }
  const puoi = (ctx) => { const p = ctx.partita; return !p.finita && p.fatto == null && !p.ritirato && !ctx.stato.spettatore; };
  // gli indizi di una fila con quello che ha colorato il giocatore (le croci contano come vuote)
  function indiziFila(fila) {
    const out = []; let k = 0, col = 0;
    for (const x of fila) { const v = x === CROCE ? 0 : x; if (v && v === col) k++; else { if (col) out.push([k, col]); col = v; k = v ? 1 : 0; } }
    if (col) out.push([k, col]);
    return out;
  }
  const uguali = (a, b) => a.length === b.length && a.every((x, i) => x[0] === b[i][0] && x[1] === b[i][1]);
  // testo leggibile sopra un colore (nero sui chiari, bianco sugli scuri)
  const scritta = (hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return r * 0.3 + g * 0.59 + b * 0.11 > 150 ? '#1b1b1b' : '#fff'; };

  const tavolo = {
    libero: true,
    reset(ctx) { ctxP = ctx; R().attiva(ctx); },
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui, W = p.W, H = p.H;
      const finito = p.fatto != null || p.finita;
      const celle = p.soluzione && p.fatto == null ? p.soluzione : locale(ctx).celle;
      if (ui.colore == null) ui.colore = 1;
      const sb = new Set(R().allineato(ctx) ? p.sbagliate : []), scop = new Set(p.scoperte);
      const chip = ([n, c]) => `<b style="background:${p.colori[c - 1]};color:${scritta(p.colori[c - 1])}">${n}</b>`;
      const rOk = Array.from({ length: H }, (_, y) => uguali(indiziFila(celle.slice(y * W, y * W + W)), p.indizi.righe[y]));
      const cOk = Array.from({ length: W }, (_, x) => uguali(indiziFila(Array.from({ length: H }, (_, y) => celle[y * W + x])), p.indizi.colonne[x]));
      const testa = p.indizi.colonne.map((c, x) => `<div class="pc-ic ${cOk[x] ? 'ok' : ''} ${x % 5 === 4 && x < W - 1 ? 'b5' : ''}">${c.map(chip).join('') || '<em>0</em>'}</div>`).join('');
      let corpo = '';
      for (let y = 0; y < H; y++) {
        corpo += `<div class="pc-ir ${rOk[y] ? 'ok' : ''}">${p.indizi.righe[y].map(chip).join('') || '<em>0</em>'}</div>`;
        for (let x = 0; x < W; x++) {
          const i = y * W + x, v = celle[i];
          const cls = ['pc-c', v === CROCE ? 'pc-x' : '', scop.has(i) ? 'scoperta' : '', sb.has(i) ? 'sbagliata' : '', p.ultimoAiuto === i ? 'aiutata' : '', x % 5 === 4 && x < W - 1 ? 'b5' : '', y % 5 === 4 && y < H - 1 ? 'h5' : '', ui.tastiera && ui.cur === i ? 'cur' : ''].filter(Boolean).join(' ');
          corpo += `<div class="${cls}" data-i="${i}"${v && v !== CROCE ? ` style="--c:${p.colori[v - 1]}"` : ''}></div>`;
        }
      }
      const tav = p.colori.map((c, k) => `<button type="button" class="pc-col ${ui.colore === k + 1 ? 'attivo' : ''}" data-az="colore" data-v="${k + 1}" style="--c:${c}" title="Colore ${k + 1} (tasto ${k + 1})"><span>${k + 1}</span></button>`).join('')
        + `<button type="button" class="pc-col pc-x ${ui.colore === CROCE ? 'attivo' : ''}" data-az="colore" data-v="${CROCE}" title="Croce: casella vuota (tasto X)">✕</button>`;
      const anteprima = finito ? `<div class="pc-mini" style="--w:${W}">${(p.soluzione || celle).map((v) => `<i style="background:${v && v !== CROCE ? p.colori[v - 1] : 'transparent'}"></i>`).join('')}</div>` : '';
      const rec = p.finita && p.record && p.record.length ? `<div class="bb-record"><b>🏆 Tempi migliori · disegno ${p.numero}</b><ol>${p.record.map((x, k) => `<li class="${k === p.posizioneRecord ? 'nuovo' : ''}">${R().fmt(x.ms)}${x.aiuti ? ` <small>(${x.aiuti} aiuti)</small>` : ''}</li>`).join('')}</ol></div>` : '';
      const fatte = rOk.filter(Boolean).length + cOk.filter(Boolean).length;
      const extra = `<span>✔️ File giuste <b>${fatte}/${W + H}</b></span>${p.nomeDisegno ? `<span>🎨 <b>${esc(p.nomeDisegno)}</b></span>` : ''}`;
      const comandi = finito ? '' : `<div class="pc-tavolozza" role="group" aria-label="Colori">${tav}</div>`;
      const bottoni = finito ? '' : `<div class="nk-bottoni">
            <button type="button" class="bottone" data-az="annulla" ${p.puoAnnullare ? '' : 'disabled'} title="Ctrl+Z">↶ Annulla</button>
            <button type="button" class="bottone" data-az="aiuto" title="Sistema una casella (+20 s)">💡 Aiuto</button>
            <button type="button" class="bottone leggero" data-az="cancella">🧽 Svuota</button>
            ${p.sfida ? '<button type="button" class="bottone leggero" data-az="arrenditi">🏳️ Mi ritiro</button>' : ''}</div>
          <p class="nk-guida">Scegli il colore e tocca o trascina · tasto destro: ✕ · tasti <b>1-${p.colori.length}</b> e <b>X</b> · <b>Ctrl+Z</b> annulla</p>`;
      const nr = Math.max(1, ...p.indizi.righe.map((r) => r.length)), nc = Math.max(1, ...p.indizi.colonne.map((c) => c.length));
      return `<div class="pc ${finito ? 'finito' : ''}" style="--w:${W};--h:${H};--nr:${nr};--nc:${nc}">
        ${R().barra(ctx, extra)}${comandi}
        <div class="pc-tavola" oncontextmenu="return false"><span class="pc-angolo"></span>${testa}${corpo}</div>
        ${anteprima}${R().attesa(ctx)}${bottoni}${R().arrivo(ctx)}${rec}</div>`;
    },
    dopo(ctx) {
      ctxP = ctx; R().attiva(ctx);
      if (ctx.partita.fatto != null && primaVolta(ctx.ui, 'pc-fatto')) suono([[523, 0.08], [659, 0.08], [784, 0.08], [1046, 0.3]], { volume: 0.08 });
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.fatto != null ? 'Finito! ✅' : p.sfida ? 'Sfida: chi completa prima il disegno?' : 'Colora il disegno nascosto'; },
    punteggio(ctx) { const p = ctx.partita; return p.sfida ? p.altri.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x.fatto != null ? '✅' : `${x.prog}%`}</b></span>`).join('') : ''; },
    infoPosto(ctx, posto) { return R().infoPosto(ctx, posto); },
    clic(ctx, el) {
      const az = el.dataset.az;
      if (az === 'colore') { ctx.ui.colore = Number(el.dataset.v); return ctx.ridisegna(); }
      if (az === 'annulla') return R().invia(ctx, { tipo: 'annulla' });
      if (az === 'aiuto') return R().invia(ctx, { tipo: 'aiuto' });
      if (az === 'cancella') { if (confirm('Svuotare tutta la griglia?')) R().invia(ctx, { tipo: 'cancella' }); return; }
      if (az === 'arrenditi') { if (confirm('Vuoi ritirarti dalla sfida?')) R().invia(ctx, { tipo: 'arrenditi' }); }
    },
  };

  // colorare trascinando: il valore si decide sulla prima casella (lo stesso colore la svuota)
  const cella = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.closest ? el.closest('.pc-c') : null; };
  document.addEventListener('pointerdown', (e) => {
    const ctx = ctxP;
    const el = e.target.closest && e.target.closest('.pc-c');
    if (!el || !ctx || !ctx.partita || ctx.partita.gioco !== 'picross' || !puoi(ctx)) return;
    const i = Number(el.dataset.i);
    if (ctx.partita.scoperte.includes(i)) return;
    e.preventDefault();
    const loc = locale(ctx), ora = loc.celle[i];
    const scelto = e.button === 2 ? CROCE : ctx.ui.colore || 1;
    const v = ora === scelto ? 0 : scelto;
    const ui = ctx.ui; ui.seq = Math.max(ui.seq || 0, ctx.partita.seq || 0) + 1;
    tratto = { v, celle: [i], seq: ui.seq };
    ui.tastiera = false; ui.cur = i;
    loc.celle[i] = v;
    suono([[v === CROCE ? 260 : v ? 380 + v * 40 : 220, 0.04]], { tipo: 'sine', volume: 0.04 });
    ctx.ridisegna();
  });
  document.addEventListener('pointermove', (e) => {
    if (!tratto || !ctxP) return;
    const el = cella(e); if (!el) return;
    const i = Number(el.dataset.i);
    if (tratto.celle.includes(i) || ctxP.partita.scoperte.includes(i)) return;
    tratto.celle.push(i);
    locale(ctxP).celle[i] = tratto.v;
    ctxP.ridisegna();
  });
  const fine = () => {
    const t = tratto; tratto = null;
    if (!t || !ctxP) return;
    const p = ctxP.partita, cambi = t.celle.filter((i) => p.celle[i] !== t.v);
    ctxP.invia(cambi.length ? { tipo: 'segna', celle: cambi, v: t.v, seq: t.seq } : { tipo: 'pensa', seq: t.seq });
  };
  document.addEventListener('pointerup', fine);
  document.addEventListener('pointercancel', fine);

  setTimeout(() => window.Rompicapo.tastiera('picross', () => ctxP, (e, ctx) => {
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); return R().invia(ctx, { tipo: 'annulla' }); }
    if (e.ctrlKey || !puoi(ctx)) return;
    const p = ctx.partita, ui = ctx.ui, W = p.W;
    const n = Number(e.key);
    if (n >= 1 && n <= p.colori.length) { ui.colore = n; return ctx.ridisegna(); }
    if (e.key === 'x' || e.key === 'X') { ui.colore = CROCE; return ctx.ridisegna(); }
    if (ui.cur == null) ui.cur = 0;
    const d = { ArrowUp: -W, ArrowDown: W, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (d) {
      e.preventDefault(); ui.tastiera = true;
      const x = ui.cur % W;
      if (!((d === -1 && x === 0) || (d === 1 && x === W - 1))) { const k = ui.cur + d; if (k >= 0 && k < W * p.H) ui.cur = k; }
      return ctx.ridisegna();
    }
    if ((e.key === ' ' || e.key === 'Enter') && !p.scoperte.includes(ui.cur)) {
      e.preventDefault(); ui.tastiera = true;
      const loc = locale(ctx), v = loc.celle[ui.cur] === (ui.colore || 1) ? 0 : ui.colore || 1;
      loc.celle[ui.cur] = v; R().invia(ctx, { tipo: 'segna', celle: [ui.cur], v });
      ctx.ridisegna();
    }
  }), 0);

  Object.assign(window.Tavoli, { picross: tavolo });
})();

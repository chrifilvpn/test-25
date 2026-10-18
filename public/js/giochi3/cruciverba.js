// CRUCIVERBA: lo schema su carta (caselle nere piene, numeri piccoli in alto a sinistra), la definizione della parola
// scelta sopra lo schema, gli elenchi Orizzontali / Verticali di lato (sul telefono sotto) e la tastiera delle
// lettere sullo schermo per chi non ha la tastiera vera. Le lettere scritte si vedono subito (mosse numerate).
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const R = () => window.Rompicapo;
  let ctxC = null;
  const RIGHE_TASTI = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

  function locale(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (!ui.loc || R().allineato(ctx)) ui.loc = { lettere: p.lettere.slice() };
    return ui.loc;
  }
  const puoi = (ctx) => { const p = ctx.partita; return !p.finita && p.fatto == null && !p.ritirato && !ctx.stato.spettatore; };
  // la parola (definizione) della casella i nella direzione dir, o nell'altra se in quella non c'è
  function parola(p, i, dir) {
    const qui = p.definizioni.filter((d) => d.celle.includes(i));
    return qui.find((d) => d.dir === dir) || qui[0] || null;
  }
  function scelta(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (ui.sel == null || p.nere[ui.sel]) { const d = p.definizioni[0]; ui.sel = d.celle[0]; ui.dir = d.dir; }
    const d = parola(p, ui.sel, ui.dir || 'o');
    if (d) ui.dir = d.dir;
    return d;
  }
  function vaiA(ctx, d, prima = true) {
    const L = locale(ctx);
    ctx.ui.dir = d.dir;
    ctx.ui.sel = (prima && d.celle.find((k) => !L.lettere[k])) ?? d.celle[0];
  }
  // la prossima parola con caselle vuote (nell'ordine degli elenchi), dopo d
  function prossima(ctx, d, verso = 1) {
    const p = ctx.partita, L = locale(ctx), lista = p.definizioni, k0 = lista.indexOf(d);
    for (let s = 1; s <= lista.length; s++) {
      const x = lista[(k0 + verso * s + lista.length * 2) % lista.length];
      if (x.celle.some((k) => !L.lettere[k])) return x;
    }
    return lista[(k0 + verso + lista.length) % lista.length];
  }

  function scrivi(ctx, l) {
    if (!puoi(ctx)) return;
    const p = ctx.partita, ui = ctx.ui, L = locale(ctx), d = scelta(ctx);
    if (!d) return;
    const i = ui.sel;
    if (!p.fisse.includes(i) && L.lettere[i] !== l) {
      L.lettere[i] = l;
      R().invia(ctx, { tipo: 'scrivi', i, l });
    }
    suono([[640 + (l.charCodeAt(0) % 6) * 30, 0.03]], { tipo: 'triangle', volume: 0.03 });
    // avanti nella parola; finita la parola, la prossima con caselle vuote
    const k = d.celle.indexOf(i);
    if (k < d.celle.length - 1) ui.sel = d.celle[k + 1];
    else if (d.celle.every((c) => L.lettere[c])) { const n = prossima(ctx, d); if (n) vaiA(ctx, n); }
    ctx.ridisegna();
  }
  function cancella(ctx) {
    if (!puoi(ctx)) return;
    const p = ctx.partita, ui = ctx.ui, L = locale(ctx), d = scelta(ctx);
    if (!d) return;
    let i = ui.sel;
    if (!L.lettere[i] || p.fisse.includes(i)) {
      const k = d.celle.indexOf(i);
      if (k > 0) i = d.celle[k - 1];
      ui.sel = i;
    }
    if (L.lettere[i] && !p.fisse.includes(i)) { L.lettere[i] = ''; R().invia(ctx, { tipo: 'scrivi', i, l: '' }); }
    ctx.ridisegna();
  }
  function muovi(ctx, dr, dc) {
    const p = ctx.partita, ui = ctx.ui, C = p.colonne;
    scelta(ctx);
    const nuovaDir = dc ? 'o' : 'v';
    if (ui.dir !== nuovaDir && parola(p, ui.sel, nuovaDir) && parola(p, ui.sel, nuovaDir).dir === nuovaDir) { ui.dir = nuovaDir; return ctx.ridisegna(); }
    let r = Math.floor(ui.sel / C) + dr, c = (ui.sel % C) + dc;
    while (r >= 0 && c >= 0 && r < p.righe && c < C) {
      const i = r * C + c;
      if (!p.nere[i]) { ui.sel = i; const d = parola(p, i, nuovaDir); ui.dir = d ? d.dir : ui.dir; break; }
      r += dr; c += dc;
    }
    ctx.ridisegna();
  }

  const definizioneHtml = (p, d, attiva, incrocio) => `<li class="${d === attiva ? 'attiva' : ''} ${d === incrocio ? 'incrocio' : ''} ${d.w ? 'svelata' : ''}" data-az="def" data-k="${p.definizioni.indexOf(d)}"><b>${d.n}</b> <span>${esc(d.def)}${d.w ? ` <em>${esc(d.w.toUpperCase())}</em>` : ''}</span> <small>(${d.celle.length})</small></li>`;

  const tavolo = {
    libero: true,
    reset(ctx) { ctxC = ctx; R().attiva(ctx); },
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui, L = locale(ctx);
      const finito = p.fatto != null || p.finita;
      const d = scelta(ctx);
      const nella = new Set(d ? d.celle : []);
      const altra = d ? p.definizioni.find((x) => x !== d && x.celle.includes(ui.sel)) : null;
      const errate = R().allineato(ctx) ? new Set(p.errate) : new Set();
      const fisse = new Set(p.fisse);
      const celle = p.nere.map((nera, i) => {
        if (nera) return '<div class="cv-n"></div>';
        const lett = L.lettere[i] || '';
        const sol = p.soluzione ? p.soluzione[i] : null;
        const cls = ['cv-c', i === ui.sel && !finito ? 'sel' : '', nella.has(i) && !finito ? 'parola' : '', fisse.has(i) ? 'fissa' : '', errate.has(i) ? 'errata' : '', sol && lett !== sol ? (lett ? 'sbagliata' : 'mancava') : ''].join(' ');
        return `<button type="button" class="${cls}" data-az="cella" data-i="${i}" aria-label="${p.numeri[i] ? `${p.numeri[i]}, ` : ''}${lett ? lett.toUpperCase() : 'vuota'}">${p.numeri[i] ? `<small>${p.numeri[i]}</small>` : ''}<span>${(sol && lett !== sol ? sol : lett).toUpperCase()}</span></button>`;
      }).join('');
      const scritte = L.lettere.filter(Boolean).length;
      const extra = `<span>✏️ <b>${scritte}</b>/${p.nLettere} lettere</span>${p.aiuti ? `<span>💡 ${p.aiuti}</span>` : ''}`;
      const orizz = p.definizioni.filter((x) => x.dir === 'o').map((x) => definizioneHtml(p, x, d, altra)).join('');
      const vert = p.definizioni.filter((x) => x.dir === 'v').map((x) => definizioneHtml(p, x, d, altra)).join('');
      const testa = d && !finito ? `<div class="cv-def"><button type="button" class="cv-freccia" data-az="defPrima" aria-label="Definizione prima">‹</button><p><b>${d.n} ${d.dir === 'o' ? 'orizzontale' : 'verticale'}</b> ${esc(d.def)} <small>(${d.celle.length})</small></p><button type="button" class="cv-freccia" data-az="defDopo" aria-label="Definizione dopo">›</button></div>` : '';
      const tasti = finito ? '' : `<div class="cv-tasti">${RIGHE_TASTI.map((r, k) => `<div>${r.split('').map((l) => `<button type="button" data-az="tasto" data-l="${l}">${l.toUpperCase()}</button>`).join('')}${k === 2 ? '<button type="button" class="largo" data-az="canc" aria-label="Cancella">⌫</button>' : ''}</div>`).join('')}</div>`;
      const comandi = finito ? '' : `<div class="cv-comandi">
          <button type="button" class="bottone" data-az="controlla" title="Segna in rosso le lettere sbagliate (+5 s)">🔎 Controlla</button>
          <button type="button" class="bottone" data-az="aiuto" title="La lettera giusta nella casella scelta (+20 s)">💡 Lettera</button>
          <button type="button" class="bottone leggero" data-az="giro" title="Orizzontale / verticale (spazio)">⇄ ${ui.dir === 'v' ? 'Verticale' : 'Orizzontale'}</button>
          ${p.sfida ? '<button type="button" class="bottone leggero" data-az="arrenditi">🏳️ Mi ritiro</button>' : ''}</div>`;
      const rec = p.finita && p.record && p.record.length ? `<div class="bb-record"><b>🏆 Tempi migliori</b><ol>${p.record.map((x, k) => `<li class="${k === p.posizioneRecord ? 'nuovo' : ''}">${R().fmt(x.ms)} <small>(${x.aiuti} aiuti)</small></li>`).join('')}</ol></div>` : '';
      return `<div class="cv ${finito ? 'finito' : ''}" style="--r:${p.righe};--c:${p.colonne}">
        ${R().barra(ctx, extra)}
        <div class="cv-corpo">
          <div class="cv-sinistra">${testa}<div class="cv-carta"><div class="cv-griglia">${celle}</div></div>${tasti}${R().attesa(ctx)}${comandi}${R().arrivo(ctx)}${rec}</div>
          <div class="cv-elenchi"><section><h3>Orizzontali</h3><ol>${orizz}</ol></section><section><h3>Verticali</h3><ol>${vert}</ol></section></div>
        </div></div>`;
    },
    dopo(ctx) {
      ctxC = ctx; R().attiva(ctx);
      // la definizione scelta resta visibile nell'elenco
      const el = document.querySelector('.cv-elenchi li.attiva');
      if (el && ctx.ui.scorri !== `${ctx.ui.sel}${ctx.ui.dir}`) {
        ctx.ui.scorri = `${ctx.ui.sel}${ctx.ui.dir}`;
        const box = el.closest('ol');
        if (box && box.scrollHeight > box.clientHeight) box.scrollTop = el.offsetTop - box.offsetTop - box.clientHeight / 2;
      }
      // sul telefono la casella scelta resta visibile tra la definizione e la tastiera
      if (ctx.ui.selVista !== ctx.ui.sel && matchMedia('(pointer: coarse)').matches) {
        ctx.ui.selVista = ctx.ui.sel;
        const c = document.querySelector('.cv-c.sel');
        if (c) c.scrollIntoView({ block: 'nearest' });
      }
      if (ctx.partita.fatto != null && primaVolta(ctx.ui, 'cv-fatto')) suono([[523, 0.08], [659, 0.08], [784, 0.08], [1046, 0.3]], { volume: 0.08 });
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.fatto != null ? 'Finito! ✅' : p.sfida ? 'Sfida: chi completa prima il cruciverba?' : 'Completa il cruciverba'; },
    punteggio(ctx) { const p = ctx.partita; return p.sfida ? p.altri.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x.fatto != null ? '✅' : `${x.prog}%`}</b></span>`).join('') : ''; },
    infoPosto(ctx, posto) { return R().infoPosto(ctx, posto); },
    clic(ctx, el) {
      const az = el.dataset.az, ui = ctx.ui, p = ctx.partita;
      if (az === 'cella') {
        const i = Number(el.dataset.i);
        if (i === ui.sel) { const altra = p.definizioni.find((x) => x.dir !== ui.dir && x.celle.includes(i)); if (altra) ui.dir = altra.dir; } else { ui.sel = i; scelta(ctx); }
        return ctx.ridisegna();
      }
      if (az === 'def') { vaiA(ctx, p.definizioni[Number(el.dataset.k)]); return ctx.ridisegna(); }
      if (az === 'defDopo' || az === 'defPrima') { const d = scelta(ctx); if (d) vaiA(ctx, prossima(ctx, d, az === 'defDopo' ? 1 : -1)); return ctx.ridisegna(); }
      if (az === 'giro') { const altra = p.definizioni.find((x) => x.dir !== ui.dir && x.celle.includes(ui.sel)); if (altra) ui.dir = altra.dir; return ctx.ridisegna(); }
      if (az === 'tasto') return scrivi(ctx, el.dataset.l);
      if (az === 'canc') return cancella(ctx);
      if (az === 'controlla') return R().invia(ctx, { tipo: 'controlla' });
      if (az === 'aiuto') { scelta(ctx); return R().invia(ctx, { tipo: 'aiuto', i: ui.sel }); }
      if (az === 'arrenditi') { if (confirm('Vuoi ritirarti dalla sfida?')) R().invia(ctx, { tipo: 'arrenditi' }); }
      return undefined;
    },
  };

  setTimeout(() => window.Rompicapo.tastiera('cruciverba', () => ctxC, (e, ctx) => {
    if (e.ctrlKey) return;
    if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); return scrivi(ctx, e.key.toLowerCase()); }
    if (/^[àèéìòùÀÈÉÌÒÙ]$/.test(e.key)) { e.preventDefault(); return scrivi(ctx, e.key.normalize('NFD')[0].toLowerCase()); }
    if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); return cancella(ctx); }
    const m = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (m) { e.preventDefault(); return muovi(ctx, ...m); }
    if (e.key === ' ') { e.preventDefault(); return tavolo.clic(ctx, { dataset: { az: 'giro' } }); }
    if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); return tavolo.clic(ctx, { dataset: { az: e.shiftKey ? 'defPrima' : 'defDopo' } }); }
    return undefined;
  }), 0);

  Object.assign(window.Tavoli, { cruciverba: tavolo });
})();

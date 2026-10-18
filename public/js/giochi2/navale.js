// BATTAGLIA NAVALE SOLITARIA: mare a quadretti, navi grigie che prendono la forma giusta (punte tonde, centri
// dritti) guardando le caselle vicine, numeri delle file che diventano verdi quando la fila è giusta e rossi se si
// esagera. Sotto, la flotta: le navi già chiuse dall'acqua si spuntano. Le mosse si vedono subito.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const R = () => window.Rompicapo;
  let ctxB = null, tratto = null;
  const VUOTA = 0, ACQUA = 1, NAVE = 2;

  function locale(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (!ui.loc || R().allineato(ctx)) ui.loc = { celle: p.celle.slice() };
    return ui.loc;
  }
  const puoi = (ctx) => { const p = ctx.partita; return !p.finita && p.fatto == null && !p.ritirato && !ctx.stato.spettatore; };

  // forma del pezzo guardando i vicini segnati come nave
  function forma(L, celle, i) {
    const x = i % L, y = (i - x) / L, n = (j) => celle[j] === NAVE;
    const s = y > 0 && n(i - L), g = y < L - 1 && n(i + L), o = x > 0 && n(i - 1), e = x < L - 1 && n(i + 1);
    if (!s && !g && !o && !e) return 'singolo';
    if ((s && g) || (o && e)) return (s && g) ? 'centro-v' : 'centro-o';
    if (g) return 'su'; if (s) return 'giu'; if (e) return 'sinistra'; return 'destra';
  }
  // controlli: navi che si toccano in diagonale (o fanno angoli), navi chiuse dall'acqua (per la flotta)
  function controlli(p, celle) {
    const L = p.L, N = L * L, male = new Set(), chiuse = [];
    const nave = (x, y) => x >= 0 && y >= 0 && x < L && y < L && celle[y * L + x] === NAVE;
    const acqua = (x, y) => x < 0 || y < 0 || x >= L || y >= L || celle[y * L + x] === ACQUA;
    for (let i = 0; i < N; i++) {
      if (celle[i] !== NAVE) continue;
      const x = i % L, y = (i - x) / L;
      if (nave(x - 1, y - 1) || nave(x + 1, y - 1) || nave(x - 1, y + 1) || nave(x + 1, y + 1)) male.add(i);
      if ((nave(x - 1, y) || nave(x + 1, y)) && (nave(x, y - 1) || nave(x, y + 1))) male.add(i);
    }
    // navi chiuse: tratti dritti di nave con acqua (o bordo) tutto intorno
    const vis = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (celle[i] !== NAVE || vis[i]) continue;
      const x0 = i % L, y0 = (i - x0) / L, comp = [];
      if (nave(x0 + 1, y0)) { for (let x = x0; nave(x, y0); x++) comp.push(y0 * L + x); } else for (let y = y0; nave(x0, y); y++) comp.push(y * L + x0);
      comp.forEach((c) => { vis[c] = 1; });
      const ok = comp.every((c) => { const x = c % L, y = (c - x) / L; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const j = (y + dy) * L + x + dx; if (comp.includes(j) && x + dx >= 0 && x + dx < L) continue; if (!acqua(x + dx, y + dy)) return false; } return true; });
      if (ok && comp.length <= 4) chiuse.push(comp.length);
    }
    return { male, chiuse };
  }

  const tavolo = {
    libero: true,
    reset(ctx) { ctxB = ctx; R().attiva(ctx); },
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui, L = p.L;
      const finito = p.fatto != null || p.finita;
      const celle = p.soluzione && p.fatto == null ? p.soluzione.map((v) => (v ? NAVE : ACQUA)) : locale(ctx).celle;
      const { male, chiuse } = controlli(p, celle);
      const sb = new Set(R().allineato(ctx) ? p.sbagliate : []);
      const conta = (idx) => idx.filter((i) => celle[i] === NAVE).length;
      const testa = p.colonne.map((n, x) => {
        const k = conta(Array.from({ length: L }, (_, y) => y * L + x)), pieno = Array.from({ length: L }, (_, y) => celle[y * L + x] !== VUOTA).every(Boolean);
        return `<button type="button" class="nv-num ${k === n ? (pieno ? 'fatto' : 'ok') : k > n ? 'troppo' : ''}" data-az="riempi" data-dir="colonna" data-k="${x}" title="Riempi d'acqua il resto della colonna">${n}</button>`;
      }).join('');
      let griglia = '';
      for (let y = 0; y < L; y++) {
        const idx = Array.from({ length: L }, (_, x) => y * L + x), k = conta(idx), n = p.righe[y], pieno = idx.every((i) => celle[i] !== VUOTA);
        griglia += `<button type="button" class="nv-num ${k === n ? (pieno ? 'fatto' : 'ok') : k > n ? 'troppo' : ''}" data-az="riempi" data-dir="riga" data-k="${y}" title="Riempi d'acqua il resto della riga">${n}</button>`;
        for (const i of idx) {
          const v = celle[i], ind = p.indizi[i];
          const cls = ['nv-c', v === NAVE ? `nave ${forma(L, celle, i)}` : v === ACQUA ? 'acqua' : '', ind ? 'indizio' : '', male.has(i) ? 'male' : '', sb.has(i) ? 'sbagliata' : '', p.ultimoAiuto === i ? 'aiutata' : '', ui.tastiera && ui.cur === i ? 'cur' : ''].filter(Boolean).join(' ');
          griglia += `<div class="${cls}" data-i="${i}"><i></i></div>`;
        }
      }
      // la flotta: per ogni lunghezza, quante navi chiuse ci sono
      const perLung = {}; for (const n of chiuse) perLung[n] = (perLung[n] || 0) + 1;
      const flotta = p.flotta.slice().sort((a, b) => b - a).map((n) => {
        const fatta = perLung[n] > 0; if (fatta) perLung[n]--;
        return `<span class="nv-barca ${fatta ? 'fatta' : ''}" title="Nave da ${n}">${Array.from({ length: n }, (_, k) => `<i class="${n === 1 ? 'singolo' : k === 0 ? 'sinistra' : k === n - 1 ? 'destra' : 'centro-o'}"></i>`).join('')}</span>`;
      }).join('');
      const rec = p.finita && p.record && p.record.length ? `<div class="bb-record"><b>🏆 Tempi migliori · ${L}×${L}</b><ol>${p.record.map((x, k) => `<li class="${k === p.posizioneRecord ? 'nuovo' : ''}">${R().fmt(x.ms)}${x.aiuti ? ` <small>(${x.aiuti} aiuti)</small>` : ''}</li>`).join('')}</ol></div>` : '';
      const extra = `<span>⚓ Pezzi <b>${celle.filter((v) => v === NAVE).length}/${p.flotta.reduce((a, b) => a + b, 0)}</b></span>${male.size ? '<span class="nv-avviso">⚠️ navi che si toccano</span>' : ''}`;
      const comandi = finito ? '' : `<div class="nv-comandi">
          <div class="nk-pennelli" role="group" aria-label="Cosa mettere col tocco">
            <button type="button" class="${ui.pennello == null ? 'attivo' : ''}" data-az="pennello" data-v="">🔁 Giro</button>
            <button type="button" class="${ui.pennello === NAVE ? 'attivo' : ''}" data-az="pennello" data-v="${NAVE}">🚢 Nave</button>
            <button type="button" class="${ui.pennello === ACQUA ? 'attivo' : ''}" data-az="pennello" data-v="${ACQUA}">🌊 Acqua</button>
            <button type="button" class="${ui.pennello === VUOTA ? 'attivo' : ''}" data-az="pennello" data-v="${VUOTA}">⌫ Vuota</button>
          </div>
          <div class="nk-bottoni">
            <button type="button" class="bottone" data-az="annulla" ${p.puoAnnullare ? '' : 'disabled'} title="Ctrl+Z">↶ Annulla</button>
            <button type="button" class="bottone" data-az="aiuto" title="Sistema una casella (+20 s)">💡 Aiuto</button>
            <button type="button" class="bottone leggero" data-az="cancella">🧽 Svuota</button>
            ${p.sfida ? '<button type="button" class="bottone leggero" data-az="arrenditi">🏳️ Mi ritiro</button>' : ''}
          </div></div>
          <p class="nk-guida">Clic: nave → acqua → vuota · tasto destro: acqua · trascina per segnare più caselle · clic su un numero: acqua nel resto della fila</p>`;
      return `<div class="nv ${finito ? 'finito' : ''}" style="--l:${L}">
        ${R().barra(ctx, extra)}
        <div class="nv-griglia" oncontextmenu="return false"><span></span>${testa}${griglia}</div>
        <div class="nv-flotta">${flotta}</div>
        ${R().attesa(ctx)}${comandi}${R().arrivo(ctx)}${rec}</div>`;
    },
    dopo(ctx) {
      ctxB = ctx; R().attiva(ctx);
      if (ctx.partita.fatto != null && primaVolta(ctx.ui, 'nv-fatto')) suono([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.35]], { volume: 0.08 });
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.fatto != null ? 'Finito! ✅' : p.sfida ? 'Sfida: chi trova prima la flotta?' : 'Trova la flotta nascosta'; },
    punteggio(ctx) { const p = ctx.partita; return p.sfida ? p.altri.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x.fatto != null ? '✅' : `${x.prog}%`}</b></span>`).join('') : ''; },
    infoPosto(ctx, posto) { return R().infoPosto(ctx, posto); },
    clic(ctx, el) {
      const az = el.dataset.az;
      if (az === 'pennello') { ctx.ui.pennello = el.dataset.v === '' ? null : Number(el.dataset.v); return ctx.ridisegna(); }
      if (az === 'riempi') {
        if (!puoi(ctx)) return;
        const p = ctx.partita, L = p.L, k = Number(el.dataset.k), riga = el.dataset.dir === 'riga', loc = locale(ctx);
        const idx = Array.from({ length: L }, (_, j) => (riga ? k * L + j : j * L + k));
        if (idx.filter((i) => loc.celle[i] === NAVE).length !== (riga ? p.righe[k] : p.colonne[k])) return ctx.avviso('Prima metti tutte le navi di quella fila', 1600);
        idx.forEach((i) => { if (loc.celle[i] === VUOTA) loc.celle[i] = ACQUA; });
        R().invia(ctx, { tipo: 'riempiAcqua', dir: riga ? 'riga' : 'colonna', k });
        return ctx.ridisegna();
      }
      if (az === 'annulla') return R().invia(ctx, { tipo: 'annulla' });
      if (az === 'aiuto') return R().invia(ctx, { tipo: 'aiuto' });
      if (az === 'cancella') { if (confirm('Svuotare tutta la griglia? (le caselle scoperte restano)')) R().invia(ctx, { tipo: 'cancella' }); return; }
      if (az === 'arrenditi') { if (confirm('Vuoi ritirarti dalla sfida?')) R().invia(ctx, { tipo: 'arrenditi' }); }
    },
  };

  // segnare trascinando (come nel nurikabe): il valore lo decide la prima casella
  const cella = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.closest ? el.closest('.nv-c') : null; };
  document.addEventListener('pointerdown', (e) => {
    const ctx = ctxB;
    const el = e.target.closest && e.target.closest('.nv-c');
    if (!el || !ctx || !ctx.partita || ctx.partita.gioco !== 'navale' || !puoi(ctx)) return;
    const i = Number(el.dataset.i);
    if (ctx.partita.indizi[i]) return;
    e.preventDefault();
    const loc = locale(ctx), ora = loc.celle[i];
    let v;
    if (e.button === 2) v = ora === ACQUA ? VUOTA : ACQUA;
    else if (ctx.ui.pennello != null) v = ctx.ui.pennello === ora ? VUOTA : ctx.ui.pennello;
    else v = ora === VUOTA ? NAVE : ora === NAVE ? ACQUA : VUOTA;
    const ui = ctx.ui; ui.seq = Math.max(ui.seq || 0, ctx.partita.seq || 0) + 1;
    tratto = { v, celle: [i], seq: ui.seq };
    ui.tastiera = false; ui.cur = i;
    loc.celle[i] = v;
    suono([[v === NAVE ? 220 : v === ACQUA ? 520 : 300, 0.05]], { tipo: v === NAVE ? 'triangle' : 'sine', volume: 0.05 });
    ctx.ridisegna();
  });
  document.addEventListener('pointermove', (e) => {
    if (!tratto || !ctxB) return;
    const el = cella(e); if (!el) return;
    const i = Number(el.dataset.i);
    if (tratto.celle.includes(i) || ctxB.partita.indizi[i]) return;
    tratto.celle.push(i);
    locale(ctxB).celle[i] = tratto.v;
    ctxB.ridisegna();
  });
  const fine = () => {
    const t = tratto; tratto = null;
    if (!t || !ctxB) return;
    const p = ctxB.partita, cambi = t.celle.filter((i) => p.celle[i] !== t.v);
    ctxB.invia(cambi.length ? { tipo: 'segna', celle: cambi, v: t.v, seq: t.seq } : { tipo: 'pensa', seq: t.seq });
  };
  document.addEventListener('pointerup', fine);
  document.addEventListener('pointercancel', fine);

  setTimeout(() => window.Rompicapo.tastiera('navale', () => ctxB, (e, ctx) => {
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); return R().invia(ctx, { tipo: 'annulla' }); }
    if (e.ctrlKey || !puoi(ctx)) return;
    const p = ctx.partita, ui = ctx.ui, L = p.L;
    if (ui.cur == null) ui.cur = 0;
    const d = { ArrowUp: -L, ArrowDown: L, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (d) {
      e.preventDefault(); ui.tastiera = true;
      const x = ui.cur % L;
      if (!((d === -1 && x === 0) || (d === 1 && x === L - 1))) { const n = ui.cur + d; if (n >= 0 && n < L * L) ui.cur = n; }
      return ctx.ridisegna();
    }
    const v = { ' ': NAVE, n: NAVE, N: NAVE, a: ACQUA, A: ACQUA, '.': ACQUA, Backspace: VUOTA, Delete: VUOTA, '0': VUOTA }[e.key];
    if (v !== undefined && !p.indizi[ui.cur]) {
      e.preventDefault(); ui.tastiera = true;
      const loc = locale(ctx), ora = loc.celle[ui.cur], val = e.key === ' ' && ora === NAVE ? VUOTA : v;
      if (ora !== val) { loc.celle[ui.cur] = val; R().invia(ctx, { tipo: 'segna', celle: [ui.cur], v: val }); }
      ctx.ridisegna();
    }
  }), 0);

  Object.assign(window.Tavoli, { navale: tavolo });
})();

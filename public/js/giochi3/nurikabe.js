// NURIKABE: la griglia è sabbia; il mare si colora di blu con le onde, i puntini segnano le isole sicure. Si può
// trascinare per colorare più caselle. Avvisi in rosso per le regole rotte (2×2 di mare, isole troppo grandi o con
// due numeri). Le mosse si vedono subito, prima della risposta del server.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const R = () => window.Rompicapo;
  let ctxN = null, tratto = null;
  const VUOTA = 0, MARE = 1, PUNTO = 2;

  function locale(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (!ui.loc || R().allineato(ctx)) ui.loc = { celle: p.celle.slice() };
    return ui.loc;
  }
  const puoi = (ctx) => { const p = ctx.partita; return !p.finita && p.fatto == null && !p.ritirato && !ctx.stato.spettatore; };

  // regole rotte, guardando solo quello che ha segnato il giocatore
  function controlli(p, celle) {
    const W = p.W, H = p.H, N = W * H, male = new Set(), pieneOk = new Set();
    for (let y = 0; y + 1 < H; y++) for (let x = 0; x + 1 < W; x++) {
      const q = [y * W + x, y * W + x + 1, (y + 1) * W + x, (y + 1) * W + x + 1];
      if (q.every((i) => celle[i] === MARE)) q.forEach((i) => male.add(i));
    }
    // isole: caselle con numero o puntino collegate
    const vis = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (vis[i] || !(p.numeri[i] || celle[i] === PUNTO)) continue;
      const comp = [i]; vis[i] = 1;
      for (let k = 0; k < comp.length; k++) {
        const c = comp[k], x = c % W;
        for (const j of [x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1, c - W, c + W]) if (j >= 0 && j < N && !vis[j] && (p.numeri[j] || celle[j] === PUNTO)) { vis[j] = 1; comp.push(j); }
      }
      const num = comp.filter((c) => p.numeri[c]);
      if (num.length > 1 || (num.length === 1 && comp.length > p.numeri[num[0]])) comp.forEach((c) => male.add(c));
      else if (num.length === 1 && comp.length === p.numeri[num[0]]) pieneOk.add(num[0]);
    }
    return { male, pieneOk };
  }

  function applica(ctx, celle, v) {
    const L = locale(ctx), cambi = celle.filter((i) => !ctx.partita.numeri[i] && L.celle[i] !== v);
    if (!cambi.length) return;
    for (const i of cambi) L.celle[i] = v;
    R().invia(ctx, { tipo: 'segna', celle: cambi, v });
  }

  const tavolo = {
    libero: true,
    reset(ctx) { ctxN = ctx; R().attiva(ctx); },
    panno(ctx) {
      const p = ctx.partita, L = locale(ctx), ui = ctx.ui;
      const finito = p.fatto != null || p.finita;
      const celle = p.soluzione && p.fatto == null ? p.soluzione.map((v) => (v ? PUNTO : MARE)) : L.celle;
      const { male, pieneOk } = controlli(p, celle);
      const sb = new Set(R().allineato(ctx) ? p.sbagliate : []);
      const html = celle.map((v, i) => {
        const n = p.numeri[i];
        const cls = ['nk-c', n ? 'num' : v === MARE ? 'mare' : v === PUNTO ? 'punto' : '', male.has(i) ? 'male' : '', sb.has(i) ? 'sbagliata' : '', p.ultimoAiuto === i ? 'aiutata' : '', ui.cur === i && ui.tastiera ? 'cur' : '', n && pieneOk.has(i) ? 'piena' : ''].filter(Boolean).join(' ');
        return `<div class="${cls}" data-i="${i}">${n ? `<b>${n}</b>` : v === PUNTO ? '<i></i>' : ''}</div>`;
      }).join('');
      const mare = celle.filter((v) => v === MARE).length;
      const rec = p.finita && p.record && p.record.length ? `<div class="bb-record"><b>🏆 Tempi migliori · ${p.W}×${p.H}</b><ol>${p.record.map((x, k) => `<li class="${k === p.posizioneRecord ? 'nuovo' : ''}">${R().fmt(x.ms)}${x.aiuti ? ` <small>(${x.aiuti} aiuti)</small>` : ''}</li>`).join('')}</ol></div>` : '';
      const extra = `<span>🌊 Mare <b>${mare}</b></span>${male.size ? '<span class="nk-avviso">⚠️ regola rotta</span>' : ''}`;
      const comandi = finito ? '' : `<div class="nk-comandi">
          <div class="nk-pennelli" role="group" aria-label="Cosa mettere col tocco">
            <button type="button" class="${!ui.pennello ? 'attivo' : ''}" data-az="pennello" data-v="">🔁 Giro</button>
            <button type="button" class="${ui.pennello === MARE ? 'attivo' : ''}" data-az="pennello" data-v="${MARE}">🌊 Mare</button>
            <button type="button" class="${ui.pennello === PUNTO ? 'attivo' : ''}" data-az="pennello" data-v="${PUNTO}">• Isola</button>
            <button type="button" class="${ui.pennello === VUOTA ? 'attivo' : ''}" data-az="pennello" data-v="${VUOTA}">⌫ Vuota</button>
          </div>
          <div class="nk-bottoni">
            <button type="button" class="bottone" data-az="annulla" ${p.puoAnnullare ? '' : 'disabled'} title="Ctrl+Z">↶ Annulla</button>
            <button type="button" class="bottone" data-az="aiuto" title="Sistema una casella (+20 s)">💡 Aiuto</button>
            <button type="button" class="bottone leggero" data-az="cancella">🧽 Svuota</button>
            ${p.sfida ? '<button type="button" class="bottone leggero" data-az="arrenditi">🏳️ Mi ritiro</button>' : ''}
          </div></div>
          <p class="nk-guida">Clic: mare → puntino → vuota · tasto destro: puntino · trascina per colorare più caselle · <b>Ctrl+Z</b> annulla</p>`;
      return `<div class="nk ${finito ? 'finito' : ''}" style="--w:${p.W};--h:${p.H}">
        ${R().barra(ctx, extra)}
        <div class="nk-griglia" oncontextmenu="return false">${html}</div>
        ${R().attesa(ctx)}${comandi}${R().arrivo(ctx)}${rec}</div>`;
    },
    dopo(ctx) {
      ctxN = ctx; R().attiva(ctx);
      if (ctx.partita.fatto != null && primaVolta(ctx.ui, 'nk-fatto')) suono([[523, 0.08], [659, 0.08], [784, 0.08], [1046, 0.3]], { volume: 0.08 });
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.fatto != null ? 'Finito! ✅' : p.sfida ? 'Sfida: chi trova prima tutto il mare?' : 'Colora il mare intorno alle isole'; },
    punteggio(ctx) { const p = ctx.partita; return p.sfida ? p.altri.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x.fatto != null ? '✅' : `${x.prog}%`}</b></span>`).join('') : ''; },
    infoPosto(ctx, posto) { return R().infoPosto(ctx, posto); },
    clic(ctx, el) {
      const az = el.dataset.az;
      if (az === 'pennello') { ctx.ui.pennello = el.dataset.v === '' ? null : Number(el.dataset.v); return ctx.ridisegna(); }
      if (az === 'annulla') return R().invia(ctx, { tipo: 'annulla' });
      if (az === 'aiuto') return R().invia(ctx, { tipo: 'aiuto' });
      if (az === 'cancella') { if (confirm('Svuotare tutta la griglia?')) R().invia(ctx, { tipo: 'cancella' }); return; }
      if (az === 'arrenditi') { if (confirm('Vuoi ritirarti dalla sfida?')) R().invia(ctx, { tipo: 'arrenditi' }); }
    },
  };

  // colorare: premere su una casella decide il valore (il giro, o il pennello scelto); trascinando lo stesso valore
  // va sulle altre caselle; si manda tutto al server quando si alza il dito
  const cella = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.closest ? el.closest('.nk-c') : null; };
  document.addEventListener('pointerdown', (e) => {
    const ctx = ctxN;
    const el = e.target.closest && e.target.closest('.nk-c');
    if (!el || !ctx || !ctx.partita || ctx.partita.gioco !== 'nurikabe' || !puoi(ctx)) return;
    const i = Number(el.dataset.i);
    if (ctx.partita.numeri[i]) return;
    e.preventDefault();
    const L = locale(ctx), ora = L.celle[i];
    let v;
    if (e.button === 2) v = ora === PUNTO ? VUOTA : PUNTO;
    else if (ctx.ui.pennello != null) v = ctx.ui.pennello === ora ? VUOTA : ctx.ui.pennello;
    else v = ora === VUOTA ? MARE : ora === MARE ? PUNTO : VUOTA;
    // il numero d'ordine si prende subito: finché il server non lo vede, il disegno locale non si perde
    const ui = ctx.ui; ui.seq = Math.max(ui.seq || 0, ctx.partita.seq || 0) + 1;
    tratto = { v, celle: [i], seq: ui.seq };
    ui.tastiera = false; ui.cur = i;
    L.celle[i] = v;
    suono([[v === MARE ? 330 : v === PUNTO ? 520 : 240, 0.04]], { tipo: 'sine', volume: 0.04 });
    ctx.ridisegna();
  });
  document.addEventListener('pointermove', (e) => {
    if (!tratto || !ctxN) return;
    const el = cella(e); if (!el) return;
    const i = Number(el.dataset.i);
    if (tratto.celle.includes(i) || ctxN.partita.numeri[i]) return;
    tratto.celle.push(i);
    locale(ctxN).celle[i] = tratto.v;
    ctxN.ridisegna();
  });
  const fine = () => {
    const t = tratto; tratto = null;
    if (!t || !ctxN) return;
    // le celle sono già cambiate in locale; al server va il tratto intero (o un "pensa" per chiudere il numero d'ordine)
    const p = ctxN.partita;
    const cambi = t.celle.filter((i) => p.celle[i] !== t.v);
    ctxN.invia(cambi.length ? { tipo: 'segna', celle: cambi, v: t.v, seq: t.seq } : { tipo: 'pensa', seq: t.seq });
  };
  document.addEventListener('pointerup', fine);
  document.addEventListener('pointercancel', fine);

  setTimeout(() => window.Rompicapo.tastiera('nurikabe', () => ctxN, (e, ctx) => {
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); return R().invia(ctx, { tipo: 'annulla' }); }
    if (e.ctrlKey || !puoi(ctx)) return;
    const p = ctx.partita, ui = ctx.ui, W = p.W;
    if (ui.cur == null) ui.cur = 0;
    const d = { ArrowUp: -W, ArrowDown: W, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (d) {
      e.preventDefault(); ui.tastiera = true;
      const x = ui.cur % W;
      if (!((d === -1 && x === 0) || (d === 1 && x === W - 1))) { const n = ui.cur + d; if (n >= 0 && n < W * p.H) ui.cur = n; }
      return ctx.ridisegna();
    }
    const v = { ' ': MARE, m: MARE, M: MARE, '.': PUNTO, p: PUNTO, P: PUNTO, Backspace: VUOTA, Delete: VUOTA, '0': VUOTA }[e.key];
    if (v !== undefined && !p.numeri[ui.cur]) {
      e.preventDefault(); ui.tastiera = true;
      const L = locale(ctx), ora = L.celle[ui.cur];
      applica(ctx, [ui.cur], e.key === ' ' && ora === MARE ? VUOTA : v);
      ctx.ridisegna();
    }
  }), 0);

  Object.assign(window.Tavoli, { nurikabe: tavolo });
})();

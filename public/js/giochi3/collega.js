// COLLEGA I COLORI: griglia scura con i pallini colorati; si trascina da un pallino per disegnare il tubo (che si vede
// subito, prima della risposta del server). Le caselle con un tubo prendono un velo del suo colore; i colori già
// collegati hanno il pallino con l'anello. Col dito si vede un cerchio sotto il polpastrello.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const R = () => window.Rompicapo;
  const Lg = () => window.CollegaLogica;
  const COLORI = ['#e53935', '#1e63e9', '#2e9d40', '#f2cf00', '#ff8a00', '#19c3e6', '#8e3fd1', '#ff5fa8', '#8d5a2b', '#e8e8e8', '#0b8a5f', '#3949ab', '#9e9e9e'];
  const LATO = 100; // ogni casella misura 100 unità
  let T = null, ctxC = null, trascina = null, dito = null;
  const tela = () => (T = T || window.TelaFissa('cg-tela'));

  const attivo = () => ctxC && ctxC.stato && ctxC.partita && ctxC.partita.gioco === 'collega';
  const puoi = (ctx) => { const p = ctx.partita; return !p.finita && p.fatto == null && !p.ritirato && !ctx.stato.spettatore; };
  // la tavola che si vede: quella del server quando ha visto tutte le mie mosse, altrimenti la mia copia
  function locale(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (!ui.loc || (R().allineato(ctx) && !trascina)) ui.loc = { liv: p.liv, N: p.N, coppie: p.coppie, tubi: p.tubi.map((x) => x.slice()) };
    return ui.loc;
  }

  // ---- disegno ----
  function disegna() {
    requestAnimationFrame(disegna);
    if (!attivo() || !T || !T.visibile()) return;
    const ctx = ctxC, L = trascina ? trascina.vista : locale(ctx), N = L.N, g = T.g();
    const W = N * LATO;
    g.clearRect(0, 0, W, W);
    g.fillStyle = '#10141c'; g.fillRect(0, 0, W, W);
    // velo delle caselle con un tubo
    L.tubi.forEach((t, c) => { g.fillStyle = COLORI[c % COLORI.length]; g.globalAlpha = 0.2; for (const x of t) g.fillRect((x % N) * LATO, Math.floor(x / N) * LATO, LATO, LATO); });
    g.globalAlpha = 1;
    // griglia
    g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2;
    for (let k = 0; k <= N; k++) { g.beginPath(); g.moveTo(k * LATO, 0); g.lineTo(k * LATO, W); g.stroke(); g.beginPath(); g.moveTo(0, k * LATO); g.lineTo(W, k * LATO); g.stroke(); }
    const centro = (x) => [(x % N) * LATO + LATO / 2, Math.floor(x / N) * LATO + LATO / 2];
    // tubi
    g.lineCap = 'round'; g.lineJoin = 'round';
    L.tubi.forEach((t, c) => {
      if (t.length < 2) return;
      g.strokeStyle = COLORI[c % COLORI.length]; g.lineWidth = LATO * 0.34;
      g.beginPath(); t.forEach((x, k) => { const [a, b] = centro(x); if (k) g.lineTo(a, b); else g.moveTo(a, b); }); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = LATO * 0.08;
      g.beginPath(); t.forEach((x, k) => { const [a, b] = centro(x); if (k) g.lineTo(a - 6, b - 6); else g.moveTo(a - 6, b - 6); }); g.stroke();
    });
    // pallini
    L.coppie.forEach(([a, b], c) => {
      const unito = Lg().collegato(L.coppie, L.tubi, c);
      for (const x of [a, b]) {
        const [cx, cy] = centro(x);
        if (unito) { g.strokeStyle = COLORI[c % COLORI.length]; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, LATO * 0.42, 0, Math.PI * 2); g.stroke(); }
        const gr = g.createRadialGradient(cx - 10, cy - 12, 4, cx, cy, LATO * 0.36);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, COLORI[c % COLORI.length]); gr.addColorStop(1, ombra(COLORI[c % COLORI.length]));
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, LATO * 0.34, 0, Math.PI * 2); g.fill();
      }
    });
    // il dito: un cerchio del colore che si sta disegnando
    if (trascina && dito) {
      g.fillStyle = COLORI[trascina.c % COLORI.length]; g.globalAlpha = 0.28;
      g.beginPath(); g.arc(dito[0], dito[1], LATO * 0.75, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    }
    const finito = Lg().conta(N, L.coppie, L.tubi).risolto;
    if (finito) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, W, W); }
  }
  const ombra = (hex) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.round(v * 0.55); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  requestAnimationFrame(disegna);

  // ---- trascinare ----
  const cellaDi = (e, N) => { const [x, y] = T.punto(e); const cx = Math.floor(x / LATO), cy = Math.floor(y / LATO); return cx < 0 || cy < 0 || cx >= N || cy >= N ? -1 : cy * N + cx; };
  function inizia(e) {
    if (!attivo() || !puoi(ctxC) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    const L = locale(ctxC), N = L.N, i = cellaDi(e, N);
    if (i < 0) return;
    const cap = Lg().capoDi(L.coppie, i);
    let c = cap, strada;
    if (cap >= 0) strada = [i]; // da un pallino: il tubo si ridisegna da capo
    else {
      // da un punto di un tubo: si riparte da lì
      c = L.tubi.findIndex((t) => t.includes(i));
      if (c < 0) return;
      strada = L.tubi[c].slice(0, L.tubi[c].indexOf(i) + 1);
    }
    trascina = { c, strada, id: e.pointerId, base: L.tubi.map((x) => x.slice()), mosso: false, daCapo: cap >= 0, vista: null };
    dito = T.punto(e);
    aggiornaVista();
  }
  function aggiornaVista() {
    const L = locale(ctxC), tubi = trascina.base.map((x) => x.slice());
    Lg().traccia(L.N, L.coppie, tubi, trascina.c, trascina.strada);
    trascina.vista = { ...L, tubi };
  }
  // un passo verso la casella j (vicina all'ultima del tubo)
  function passo(j) {
    const L = locale(ctxC), N = L.N, s = trascina.strada, ultimo = s[s.length - 1], c = trascina.c;
    const [a, b] = L.coppie[c];
    if (j === ultimo || !Lg().accanto(N, ultimo, j)) return false;
    const k = s.indexOf(j);
    if (k >= 0) { s.length = k + 1; return true; } // si torna indietro
    // tubo già arrivato all'altro pallino: si può solo tornare indietro
    if (s.length > 1 && (ultimo === (s[0] === a ? b : a))) return false;
    const cap = Lg().capoDi(L.coppie, j);
    if (cap >= 0 && cap !== c) return false;
    if (cap === c && j === s[0]) return false;
    s.push(j);
    return true;
  }
  function muovi(e) {
    if (!trascina || e.pointerId !== trascina.id) return;
    e.preventDefault();
    dito = T.punto(e);
    const L = locale(ctxC), N = L.N, i = cellaDi(e, N);
    if (i < 0) return;
    // con il mouse veloce si saltano caselle: si arriva passo passo (prima in orizzontale, poi in verticale)
    let cambiato = false;
    for (let giri = 0; giri < 2 * N; giri++) {
      const u = trascina.strada[trascina.strada.length - 1];
      if (u === i) break;
      const ux = u % N, uy = Math.floor(u / N), ix = i % N, iy = Math.floor(i / N);
      const j = ix !== ux ? u + Math.sign(ix - ux) : u + Math.sign(iy - uy) * N;
      const ok = passo(j) || (ix !== ux && iy !== uy && passo(u + Math.sign(iy - uy) * N));
      if (!ok) break;
      cambiato = true;
    }
    if (cambiato) {
      trascina.mosso = true;
      aggiornaVista();
      const fine = trascina.strada[trascina.strada.length - 1], [a, b] = L.coppie[trascina.c];
      if (trascina.strada.length > 1 && fine === (trascina.strada[0] === a ? b : a)) suono([[660 + trascina.c * 20, 0.06], [990, 0.08]], { tipo: 'sine', volume: 0.05 });
      else suono([[300 + trascina.strada.length * 12, 0.025]], { tipo: 'sine', volume: 0.025 });
    }
  }
  function lascia(e) {
    if (!trascina || e.pointerId !== trascina.id) return;
    const t = trascina; trascina = null; dito = null;
    const ctx = ctxC, L = locale(ctx);
    // un tocco su un pallino senza trascinare: il tubo si cancella
    const celle = !t.mosso && t.daCapo ? [] : t.strada;
    if (!t.mosso && !t.daCapo) return;
    const tubi = L.tubi.map((x) => x.slice());
    if (Lg().traccia(L.N, L.coppie, tubi, t.c, celle).errore) return;
    L.tubi = tubi;
    R().invia(ctx, { tipo: 'traccia', c: t.c, celle, liv: L.liv });
    if (Lg().conta(L.N, L.coppie, L.tubi).risolto) suono([[523, 0.08], [659, 0.08], [784, 0.08], [1046, 0.25]], { volume: 0.07 });
  }
  document.addEventListener('pointermove', muovi, { passive: false });
  document.addEventListener('pointerup', lascia);
  document.addEventListener('pointercancel', lascia);
  window.addEventListener('resize', () => { if (attivo() && T) T.misura(sotto()); });
  const sotto = () => (window.matchMedia('(pointer: coarse)').matches ? 150 : 170);

  const tavolo = {
    libero: true,
    reset(ctx) { ctxC = ctx; R().attiva(ctx); },
    panno(ctx) {
      const p = ctx.partita, L = locale(ctx);
      const finito = p.fatto != null || p.finita;
      const c = Lg().conta(L.N, L.coppie, L.tubi);
      const rec = p.finita && p.record && p.record.length ? `<div class="cg-record"><b>🏆 Tempi migliori</b><ol>${p.record.map((x, k) => `<li class="${k === p.posizioneRecord ? 'nuovo' : ''}">${R().fmt(x.ms)}${x.aiuti ? ` <small>(${x.aiuti} aiuti)</small>` : ' 🏅'}</li>`).join('')}</ol></div>` : '';
      const extra = `${p.quanti > 1 ? `<span>Livello <b>${Math.min(p.finiti + 1, p.quanti)}</b> di ${p.quanti}</span>` : ''}<span>🔗 <b>${c.uniti}</b>/${L.coppie.length}</span><span>▦ <b>${Math.round((c.piene / c.tutte) * 100)}%</b></span>`;
      const comandi = finito ? '' : `<div class="cg-comandi">
          <button type="button" class="bottone" data-az="ricomincia">↺ Da capo</button>
          <button type="button" class="bottone" data-az="aiuto" title="Un colore va al suo posto (+15 s)">💡 Aiuto</button>
          ${p.sfida ? '<button type="button" class="bottone leggero" data-az="arrenditi">🏳️ Mi ritiro</button>' : ''}</div>`;
      return `<div class="cg ${finito ? 'finito' : ''}">
        ${R().barra(ctx, extra)}
        <div class="cg-box"></div>
        ${R().attesa(ctx)}${comandi}${R().arrivo(ctx, (i) => (p.quanti > 1 ? ` · ${p.livelliAltri[i]} livelli` : ''))}${rec}</div>`;
    },
    dopo(ctx) {
      ctxC = ctx; R().attiva(ctx);
      const t = tela();
      if (!t.tela._pronto) { t.tela._pronto = true; t.tela.addEventListener('pointerdown', inizia); t.tela.setAttribute('aria-label', 'Griglia di Collega i colori'); }
      const N = locale(ctx).N;
      t.metti('.cg-box', { W: N * LATO, H: N * LATO, sotto: sotto(), max: 5.6 / N });
      if (ctx.partita.fatto != null && primaVolta(ctx.ui, 'cg-fatto')) suono([[523, 0.08], [659, 0.08], [784, 0.08], [1046, 0.3]], { volume: 0.08 });
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.fatto != null ? 'Finito! ✅' : p.sfida ? 'Sfida: chi collega tutto prima?' : 'Collega i colori e riempi la griglia'; },
    punteggio(ctx) { const p = ctx.partita; return p.sfida ? p.altri.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x.fatto != null ? '✅' : `${x.prog}%`}</b></span>`).join('') : ''; },
    infoPosto(ctx, posto) { const p = ctx.partita; return R().infoPosto(ctx, posto, p.quanti > 1 ? `liv. ${Math.min(p.livelliAltri[posto] + 1, p.quanti)}/${p.quanti}` : ''); },
    clic(ctx, el) {
      const az = el.dataset.az, liv = ctx.partita.liv;
      if (az === 'ricomincia') { if (!confirm('Cancellare tutti i tubi di questo livello?')) return; return R().invia(ctx, { tipo: 'ricomincia', liv }); }
      if (az === 'aiuto') return R().invia(ctx, { tipo: 'aiuto', liv });
      if (az === 'arrenditi') { if (confirm('Vuoi ritirarti dalla sfida?')) R().invia(ctx, { tipo: 'arrenditi' }); }
    },
  };

  Object.assign(window.Tavoli, { collega: tavolo });
})();

// BOLLE COLORATE: il campo con le bolle lucide appese al soffitto, il cannone in basso che segue il mouse (o il dito)
// con la linea di mira tratteggiata fino al primo rimbalzo, la bolla dopo accanto al cannone. Il tiro si gioca subito
// nel browser con le stesse regole del server (bolle-logica.js, stesso seme): volo, scoppio, bolle che cadono, soffitto
// che scende.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const R = () => window.Rompicapo;
  const Bl = () => window.BolleLogica;
  const COLORI = [['#ff6b6b', '#c0182a'], ['#ffd93b', '#c98f00'], ['#5ddc6b', '#1a8a33'], ['#4da3ff', '#1650b8'], ['#c07bff', '#6420ad'], ['#4be3e3', '#0f8f99']];
  let T = null, ctxB = null, angolo = 0, mira = false, giu = null;
  let fasi = [], faseDal = 0, scritte = [];
  const tela = () => (T = T || window.TelaFissa('bo-tela'));
  const attivo = () => ctxB && ctxB.stato && ctxB.partita && ctxB.partita.gioco === 'bolle';
  const puoi = (ctx) => { const p = ctx.partita; return !p.finita && p.fatto == null && !p.ritirato && !ctx.stato.spettatore; };

  function locale(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (!ui.loc || (R().allineato(ctx) && !fasi.length)) ui.loc = { g: p.g.map((x) => x.slice()), sfasa: p.sfasa, r: { a: p.r }, colori: p.colori, ogni: p.ogni, mancati: p.mancati, punti: p.punti, colpi: p.colpi, attuale: p.attuale, prossima: p.prossima, perso: p.perso };
    return ui.loc;
  }

  function bolla(g, x, y, c, scala = 1, alfa = 1) {
    if (c == null || c < 0) return;
    const L = Bl(), r = (L.R - 1) * scala, [chiaro, scuro] = COLORI[c % COLORI.length];
    g.globalAlpha = alfa;
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.22, chiaro); gr.addColorStop(1, scuro);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(x - r * 0.32, y - r * 0.42, r * 0.3, r * 0.17, -0.6, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
  }
  function fondo(g, t) {
    const L = Bl();
    const gr = g.createLinearGradient(0, 0, 0, L.H); gr.addColorStop(0, '#16233f'); gr.addColorStop(1, '#0b1224');
    g.fillStyle = gr; g.fillRect(0, 0, L.W, L.H);
    // soffitto e linea del fondo
    g.fillStyle = '#4a5878'; g.fillRect(0, 0, L.W, 3);
    const yLinea = L.R + L.RIGHE_MAX * L.RH - L.R + 2;
    g.strokeStyle = 'rgba(255,90,90,.55)'; g.setLineDash([10, 8]); g.lineWidth = 2; g.beginPath(); g.moveTo(0, yLinea); g.lineTo(L.W, yLinea); g.stroke(); g.setLineDash([]);
    // tiri che mancano prima che scenda il soffitto
    if (t) {
      const resta = t.ogni - t.mancati;
      for (let k = 0; k < t.ogni; k++) { g.fillStyle = k < resta ? 'rgba(255,255,255,.55)' : 'rgba(255,90,90,.8)'; g.beginPath(); g.arc(14 + k * 14, L.H - 16, 4, 0, Math.PI * 2); g.fill(); }
    }
  }
  function griglia(g, t, salta = null, dy = 0) {
    const L = Bl();
    t.g.forEach((riga, r) => riga.forEach((v, c) => { if (v >= 0 && !(salta && salta.has(`${r},${c}`))) { const [x, y] = L.centro(t, r, c); bolla(g, x, y + dy, v); } }));
  }
  function cannone(g, t, a, inVolo) {
    const L = Bl(), { x, y } = L.CANNONE;
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = '#7d8aa8'; g.strokeStyle = '#2c3550'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(-11, -46, 22, 40, 6); g.fill(); g.stroke();
    g.restore();
    g.fillStyle = '#2c3550'; g.beginPath(); g.arc(x, y, 26, 0, Math.PI * 2); g.fill();
    if (!inVolo) bolla(g, x, y, t.attuale);
    // la bolla dopo, piccola a destra
    g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '600 11px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('dopo', x + 62, y + 30);
    bolla(g, x + 62, y + 8, t.prossima, 0.7);
  }
  function lineaMira(g, t, a) {
    const L = Bl(), tr = L.traiettoria(t, a);
    if (!tr) return;
    // fino al primo rimbalzo e un pezzetto dopo
    const pp = tr.punti.slice(0, Math.min(tr.punti.length, 3));
    let resto = 110;
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.setLineDash([2, 10]); g.lineCap = 'round';
    g.beginPath(); g.moveTo(pp[0][0], pp[0][1]);
    for (let k = 1; k < pp.length; k++) {
      const [x0, y0] = pp[k - 1], [x1, y1] = pp[k];
      if (k >= 2) { const l = Math.hypot(x1 - x0, y1 - y0), f = Math.min(1, resto / l); g.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f); break; }
      g.lineTo(x1, y1);
    }
    g.stroke(); g.setLineDash([]); g.lineCap = 'butt';
  }

  // ---- animazione di un tiro ----
  function anima(prima, r) {
    const L = Bl();
    const pp = r.punti, lun = pp.slice(1).reduce((s, q, k) => s + Math.hypot(q[0] - pp[k][0], q[1] - pp[k][1]), 0);
    const dove = (u) => { let d = u * lun; for (let k = 1; k < pp.length; k++) { const l = Math.hypot(pp[k][0] - pp[k - 1][0], pp[k][1] - pp[k - 1][1]); if (d <= l || k === pp.length - 1) { const f = l ? Math.min(1, d / l) : 1; return [pp[k - 1][0] + (pp[k][0] - pp[k - 1][0]) * f, pp[k - 1][1] + (pp[k][1] - pp[k - 1][1]) * f]; } d -= l; } return pp[pp.length - 1]; };
    const conPosata = L.copia(prima);
    while (conPosata.g.length <= r.r) conPosata.g.push(new Array(L.larghezza(conPosata, conPosata.g.length)).fill(-1));
    conPosata.g[r.r][r.c] = r.colore;
    const via = new Set([...r.scoppiate, ...r.cadute].map(([a, b]) => `${a},${b}`));
    fasi.push({ durata: Math.max(120, (lun / 1300) * 1000), disegna(g, u) { griglia(g, prima); cannone(g, prima, angolo, true); const [x, y] = dove(u); bolla(g, x, y, r.colore); } });
    if (r.scoppiate.length) {
      fasi.push({ durata: 190, inizio() { suono(r.scoppiate.map((_, k) => [700 + k * 60, 0.04]).slice(0, 8), { tipo: 'sine', volume: 0.04 }); const [x, y] = L.centro(conPosata, r.r, r.c); scritte.push({ testo: `+${r.scoppiate.length * 10 + r.cadute.length * 20}`, x, y, t: performance.now() }); },
        disegna(g, u) { griglia(g, conPosata, via); for (const [a, b, c] of r.cadute) { const [x, y] = L.centro(conPosata, a, b); bolla(g, x, y, c); } for (const [a, b, c] of r.scoppiate) { const [x, y] = L.centro(conPosata, a, b); bolla(g, x, y, c, 1 + u * 0.5, 1 - u); } } });
    } else fasi.push({ durata: 60, inizio() { suono([[260, 0.05]], { tipo: 'sine', volume: 0.04 }); }, disegna(g) { griglia(g, conPosata); } });
    if (r.cadute.length) {
      const vel = r.cadute.map(() => [(Math.random() - 0.5) * 160, -Math.random() * 120]);
      fasi.push({ durata: 650, inizio() { suono([[500, 0.08], [380, 0.1], [260, 0.14]], { tipo: 'triangle', volume: 0.04 }); },
        disegna(g, u) { griglia(g, conPosata, via); const s = u * 0.65; r.cadute.forEach(([a, b, c], k) => { const [x, y] = L.centro(conPosata, a, b); bolla(g, x + vel[k][0] * s, y + vel[k][1] * s + 1400 * s * s, c, 1, 1 - u * 0.6); }); } });
    }
    if (r.scende) fasi.push({ durata: 320, inizio() { suono([[120, 0.2]], { tipo: 'square', volume: 0.04 }); }, disegna(g, u) { griglia(g, ctxB.ui.loc, null, -L.RH * (1 - u)); } });
  }

  function disegna() {
    requestAnimationFrame(disegna);
    if (!attivo() || !T || !T.visibile()) return;
    const ctx = ctxB, p = ctx.partita, g = T.g(), Lc = locale(ctx), ora = performance.now();
    fondo(g, Lc);
    if (fasi.length) {
      if (!faseDal) { faseDal = ora; if (fasi[0].inizio) fasi[0].inizio(); }
      const f = fasi[0], u = Math.min(1, (ora - faseDal) / f.durata);
      f.disegna(g, u);
      if (fasi.length > 1 || u < 1) cannone(g, Lc, angolo, true); else cannone(g, Lc, angolo, false);
      if (u >= 1) { fasi.shift(); faseDal = 0; }
    } else {
      griglia(g, Lc);
      if (puoi(ctx) && (mira || !window.matchMedia('(pointer: coarse)').matches)) lineaMira(g, Lc, angolo);
      cannone(g, Lc, angolo, false);
    }
    scritte = scritte.filter((s) => ora - s.t < 900);
    for (const s of scritte) { const u = (ora - s.t) / 900; g.globalAlpha = 1 - u; g.font = '800 26px system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#0b1224'; g.strokeText(s.testo, s.x, s.y - u * 40); g.fillStyle = '#fff6a8'; g.fillText(s.testo, s.x, s.y - u * 40); g.globalAlpha = 1; }
    const fine = p.finita || p.fatto != null || p.perso;
    if (fine && !fasi.length) {
      const L = Bl(); g.fillStyle = 'rgba(5,10,25,.55)'; g.fillRect(0, 0, L.W, L.H); g.fillStyle = '#fff'; g.textAlign = 'center';
      g.font = '700 40px "Young Serif", Georgia, serif'; g.fillText(p.perso ? 'In fondo! 💥' : p.fatto != null ? 'Vuota! 🫧' : 'Fine', L.W / 2, L.H / 2);
    }
  }
  requestAnimationFrame(disegna);

  // ---- mira e tiro ----
  function puntaVerso(x, y) {
    const L = Bl(), dx = x - L.CANNONE.x, dy = Math.min(-8, y - L.CANNONE.y);
    angolo = Math.max(-L.ANGOLO_MAX, Math.min(L.ANGOLO_MAX, Math.atan2(dx, -dy)));
  }
  const sulCannone = (x, y) => { const L = Bl(); return Math.hypot(x - L.CANNONE.x, y - L.CANNONE.y) < 34 || Math.hypot(x - L.CANNONE.x - 62, y - L.CANNONE.y - 8) < 26; };
  function scambia() {
    const ctx = ctxB;
    if (!attivo() || !puoi(ctx) || fasi.length) return;
    const Lc = locale(ctx); Bl().scambia(Lc);
    suono([[440, 0.04], [560, 0.05]], { tipo: 'triangle', volume: 0.035 });
    R().invia(ctx, { tipo: 'scambia' });
  }
  function tira() {
    const ctx = ctxB;
    if (!attivo() || !puoi(ctx) || fasi.length) return;
    const Lc = locale(ctx), prima = Bl().copia(Lc), a = Math.round(angolo * 10000) / 10000;
    const r = Bl().tira(Lc, a);
    if (r.errore) return;
    suono([[900, 0.03], [600, 0.04]], { tipo: 'triangle', volume: 0.04 });
    anima(prima, r);
    R().invia(ctx, { tipo: 'tira', angolo: a });
  }
  function giuDito(e) {
    if (!attivo() || !puoi(ctxB)) return;
    if (e.pointerType === 'mouse' && e.button === 2) { e.preventDefault(); scambia(); return; }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    const [x, y] = T.punto(e);
    if (sulCannone(x, y)) { scambia(); return; }
    puntaVerso(x, y);
    if (e.pointerType === 'mouse') { tira(); return; }
    giu = e.pointerId; mira = true;
  }
  document.addEventListener('pointermove', (e) => {
    if (!attivo() || !T || !T.visibile()) return;
    if (e.pointerType !== 'mouse' && e.pointerId !== giu) return;
    const [x, y] = T.punto(e);
    if (e.pointerType === 'mouse' && (x < -40 || x > T.W + 40 || y < -40 || y > T.H + 40)) return;
    puntaVerso(x, y);
  }, { passive: true });
  const su = (e) => { if (e.pointerId !== giu) return; giu = null; mira = false; tira(); };
  document.addEventListener('pointerup', su);
  document.addEventListener('pointercancel', (e) => { if (e.pointerId === giu) { giu = null; mira = false; } });
  document.addEventListener('keydown', (e) => {
    if (!attivo() || (window.Boss && Boss.attivo) || (e.target.closest && e.target.closest('input, textarea, select'))) return;
    if (e.key === ' ') { e.preventDefault(); scambia(); }
  });

  const tavolo = {
    libero: true,
    reset(ctx) { ctxB = ctx; R().attiva(ctx); },
    panno(ctx) {
      const p = ctx.partita, Lc = locale(ctx);
      const finito = p.fatto != null || p.finita || p.perso;
      const rec = p.finita && p.record && p.record.length ? `<div class="bo-record"><b>🏆 Tempi migliori</b><ol>${p.record.map((x, k) => `<li class="${k === p.posizioneRecord ? 'nuovo' : ''}">${R().fmt(x.ms)} <small>(${x.tiri} tiri)</small></li>`).join('')}</ol></div>` : '';
      const extra = `<span>🫧 <b>${Bl().quante(Lc)}</b> bolle</span><span>Punti <b>${Lc.punti}</b></span>`;
      return `<div class="bo ${finito ? 'finito' : ''}">
        ${R().barra(ctx, extra)}
        <div class="bo-box"></div>
        ${R().attesa(ctx)}
        ${!finito && p.sfida ? '<div class="bo-comandi"><button type="button" class="bottone leggero" data-az="arrenditi">🏳️ Mi ritiro</button></div>' : ''}
        <p class="bo-guida">${window.matchMedia('(pointer: coarse)').matches ? 'Trascina il dito per mirare e alzalo per tirare · tocca il cannone per scambiare' : 'Mira col mouse e clicca per tirare · clic sul cannone, tasto destro o spazio per scambiare'}</p>
        ${R().arrivo(ctx, (i) => ` · ${p.bolleAltri[i]} bolle`)}${rec}</div>`;
    },
    dopo(ctx) {
      ctxB = ctx; R().attiva(ctx);
      const t = tela(), L = Bl();
      if (!t.tela._pronto) { t.tela._pronto = true; t.tela.addEventListener('pointerdown', giuDito); t.tela.addEventListener('contextmenu', (e) => e.preventDefault()); t.tela.setAttribute('aria-label', 'Campo delle bolle'); }
      t.metti('.bo-box', { W: L.W, H: L.H, sotto: window.matchMedia('(pointer: coarse)').matches ? 120 : 140, max: 1.5 });
      if (ctx.partita.fatto != null && primaVolta(ctx.ui, 'bo-fatto')) suono([[523, 0.08], [659, 0.08], [784, 0.08], [1046, 0.3]], { volume: 0.08 });
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; if (p.perso) return 'Bolle in fondo 💥'; return p.fatto != null ? 'Griglia vuota! ✅' : p.sfida ? 'Sfida: chi svuota la griglia prima?' : 'Svuota la griglia'; },
    punteggio(ctx) { const p = ctx.partita; return p.sfida ? p.altri.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x.fatto != null ? '✅' : p.persiAltri[i] ? '💥' : `${p.bolleAltri[i]}🫧`}</b></span>`).join('') : ''; },
    infoPosto(ctx, posto) { const p = ctx.partita; return p.persiAltri[posto] ? '<span class="rp-info">💥 bolle in fondo</span>' : R().infoPosto(ctx, posto, `${p.bolleAltri[posto]} bolle`); },
    clic(ctx, el) { if (el.dataset.az === 'arrenditi' && confirm('Vuoi ritirarti dalla sfida?')) R().invia(ctx, { tipo: 'arrenditi' }); },
  };

  Object.assign(window.Tavoli, { bolle: tavolo });
})();

// CARAMELLE IN FILA: la griglia di caramelle lucide su un vassoio. La mossa si gioca subito nel browser con le stesse
// regole del server (caramelle-logica.js, stesso seme): lo scambio, le file che scoppiano, le caramelle che cadono e
// quelle nuove dall'alto, con i punti che salgono. Si scambia trascinando o toccando una caramella e poi la vicina.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const R = () => window.Rompicapo;
  const Cl = () => window.CaramelleLogica;
  const LATO = 80, N = 8, W = LATO * N;
  const COLORI = [['#ff5a5f', '#b3121b'], ['#ffad33', '#c86400'], ['#ffe14d', '#c99a00'], ['#5fd36a', '#1b8a2c'], ['#4fb6ff', '#1458b8'], ['#c27bff', '#6a1fb0']];
  let T = null, ctxF = null, sel = null, giu = null;
  // animazione: un elenco di fasi { durata, disegna(u) }; quando è vuoto si disegna la tavola com'è
  let fasi = [], faseDal = 0, scritte = [];
  const tela = () => (T = T || window.TelaFissa('cf-tela'));
  const attivo = () => ctxF && ctxF.stato && ctxF.partita && ctxF.partita.gioco === 'caramelle';
  const puoi = (ctx) => { const p = ctx.partita; return !p.finita && !p.ritirato && !ctx.stato.spettatore && resta(p) > 0; };
  const ricevuto = new WeakMap();
  const resta = (p) => { if (!ricevuto.has(p)) ricevuto.set(p, Date.now()); return p.finita ? 0 : Math.max(0, p.resta - (p.corre ? Date.now() - ricevuto.get(p) : 0)); };

  function locale(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (!ui.loc || (R().allineato(ctx) && !fasi.length)) ui.loc = { c: p.c.slice(), s: p.s.slice(), r: { a: p.r }, punti: p.punti };
    return ui.loc;
  }

  // ---- disegno delle caramelle ----
  function forma(g, k, r) {
    g.beginPath();
    if (k === 0) g.arc(0, 0, r, 0, Math.PI * 2);
    else if (k === 1) g.roundRect(-r * 0.92, -r * 0.92, r * 1.84, r * 1.84, r * 0.45);
    else if (k === 2) { g.moveTo(0, -r * 1.08); g.lineTo(r * 0.95, 0); g.lineTo(0, r * 1.08); g.lineTo(-r * 0.95, 0); g.closePath(); }
    else if (k === 3) { g.moveTo(0, -r * 1.05); g.bezierCurveTo(r * 1.1, -r * 0.1, r * 0.9, r, 0, r); g.bezierCurveTo(-r * 0.9, r, -r * 1.1, -r * 0.1, 0, -r * 1.05); }
    else if (k === 4) { for (let a = 0; a < 6; a++) { const q = (a / 6) * Math.PI * 2 + Math.PI / 6; g[a ? 'lineTo' : 'moveTo'](Math.cos(q) * r, Math.sin(q) * r); } g.closePath(); }
    else { for (let a = 0; a < 10; a++) { const q = (a / 10) * Math.PI * 2 - Math.PI / 2, rr = a % 2 ? r * 0.62 : r * 1.05; g[a ? 'lineTo' : 'moveTo'](Math.cos(q) * rr, Math.sin(q) * rr); } g.closePath(); }
  }
  function caramella(g, x, y, c, s, scala = 1, alfa = 1) {
    if (c === null || c === undefined || scala <= 0.01) return;
    const r = LATO * 0.34 * scala;
    g.save(); g.translate(x, y); g.globalAlpha = alfa;
    if (s === 4) {
      // bomba di colore: palla di cioccolato con i confettini
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
      gr.addColorStop(0, '#8a5a3c'); gr.addColorStop(1, '#2b160b');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 1.05, 0, Math.PI * 2); g.fill();
      for (let k = 0; k < 14; k++) { const a = k * 2.4, d = r * (0.25 + (k % 4) * 0.2); g.fillStyle = COLORI[k % 6][0]; g.beginPath(); g.ellipse(Math.cos(a) * d, Math.sin(a) * d, r * 0.13, r * 0.06, a, 0, Math.PI * 2); g.fill(); }
      g.restore(); return;
    }
    const [chiaro, scuro] = COLORI[c];
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 6 * scala; g.shadowOffsetY = 3 * scala;
    const gr = g.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.2);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, chiaro); gr.addColorStop(1, scuro);
    g.fillStyle = gr; forma(g, c, r); g.fill();
    g.shadowColor = 'transparent';
    if (s === 1 || s === 2) {
      // strisce bianche (orizzontali: svuota la riga; verticali: la colonna)
      g.save(); forma(g, c, r); g.clip();
      g.fillStyle = 'rgba(255,255,255,.75)';
      for (let k = -3; k <= 3; k++) { if (s === 1) g.fillRect(-r * 1.2, k * r * 0.42 - r * 0.08, r * 2.4, r * 0.16); else g.fillRect(k * r * 0.42 - r * 0.08, -r * 1.2, r * 0.16, r * 2.4); }
      g.restore();
    }
    if (s === 3) {
      // incartata: la carta con i due fiocchi ai lati
      g.fillStyle = scuro; g.globalAlpha = alfa * 0.9;
      for (const v of [-1, 1]) { g.beginPath(); g.moveTo(v * r * 0.8, 0); g.lineTo(v * r * 1.35, -r * 0.5); g.lineTo(v * r * 1.35, r * 0.5); g.closePath(); g.fill(); }
      g.globalAlpha = alfa; g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; forma(g, c, r * 0.8); g.stroke();
    }
    // riflesso
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-r * 0.3, -r * 0.45, r * 0.3, r * 0.14, -0.5, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  const centro = (i) => [(i % N) * LATO + LATO / 2, Math.floor(i / N) * LATO + LATO / 2];
  function vassoio(g) {
    g.fillStyle = '#3b1f4a'; g.fillRect(0, 0, W, W);
    for (let i = 0; i < N * N; i++) {
      const x = (i % N) * LATO, y = Math.floor(i / N) * LATO;
      g.fillStyle = ((i % N) + Math.floor(i / N)) % 2 ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.13)';
      g.fillRect(x + 1, y + 1, LATO - 2, LATO - 2);
    }
  }
  function tavola(g, b, salta = new Set()) { for (let i = 0; i < N * N; i++) if (!salta.has(i)) { const [x, y] = centro(i); caramella(g, x, y, b.c[i], b.s[i]); } }

  // ---- animazione di una mossa: si rifà la mossa su una copia, passo per passo ----
  function anima(prima, i, j, r) {
    const b = Cl().copia(prima);
    const [ax, ay] = centro(i), [bx, by] = centro(j);
    const bi = { c: b.c[i], s: b.s[i] }, bj = { c: b.c[j], s: b.s[j] };
    const fermi = new Set([i, j]);
    if (r.errore) {
      // scambio non valido: vanno e tornano
      fasi.push({ durata: 260, disegna(g, u) { const k = Math.sin(u * Math.PI) * 0.5; tavola(g, b, fermi); caramella(g, ax + (bx - ax) * k, ay + (by - ay) * k, bi.c, bi.s); caramella(g, bx + (ax - bx) * k, by + (ay - by) * k, bj.c, bj.s); } });
      return;
    }
    fasi.push({ durata: 170, disegna(g, u) { tavola(g, b, fermi); caramella(g, ax + (bx - ax) * u, ay + (by - ay) * u, bi.c, bi.s); caramella(g, bx + (ax - bx) * u, by + (ay - by) * u, bj.c, bj.s); } });
    [b.c[i], b.c[j]] = [b.c[j], b.c[i]]; [b.s[i], b.s[j]] = [b.s[j], b.s[i]];
    r.passi.forEach((ps, k) => {
      const prima2 = Cl().copia(b);
      const via = new Set(ps.via);
      fasi.push({ durata: 200, inizio() { suono([[520 + k * 90, 0.06], [780 + k * 90, 0.08]], { tipo: 'triangle', volume: 0.045 }); scritte.push({ testo: `+${ps.punti}`, i: ps.via[Math.floor(ps.via.length / 2)] ?? 0, t: performance.now() }); },
        disegna(g, u) { tavola(g, prima2, via); for (const x of via) { const [cx, cy] = centro(x); caramella(g, cx, cy, prima2.c[x], prima2.s[x], 1 + u * 0.3, 1 - u); } for (const sp of ps.speciali) { const [cx, cy] = centro(sp.i); caramella(g, cx, cy, sp.c, sp.s, u); } } });
      for (const x of ps.via) { b.c[x] = null; b.s[x] = 0; }
      for (const sp of ps.speciali) { b.c[sp.i] = sp.c; b.s[sp.i] = sp.s; }
      const da = new Map();
      for (const [a, d] of ps.cadute) da.set(d, Math.floor(a / N) - Math.floor(d / N));
      // le cadute vanno applicate dal basso: si rifanno sulla tavola vera
      for (const [a, d] of ps.cadute) { b.c[d] = b.c[a]; b.s[d] = b.s[a]; b.c[a] = null; b.s[a] = 0; }
      for (const [x, c, quante] of ps.nuove) { b.c[x] = c; b.s[x] = 0; da.set(x, -quante); }
      const fine = Cl().copia(b);
      fasi.push({ durata: 230, disegna(g, u) {
        const e = u * u;
        for (let x = 0; x < N * N; x++) {
          const [cx, cy] = centro(x), su = da.get(x) || 0;
          caramella(g, cx, cy + su * LATO * (1 - e), fine.c[x], fine.s[x]);
        }
      } });
    });
    if (r.mescolata) fasi.push({ durata: 450, inizio() { scritte.push({ testo: 'Rimescolo!', i: 27, t: performance.now() }); }, disegna(g, u) { tavola(g, b); g.fillStyle = `rgba(59,31,74,${Math.sin(u * Math.PI) * 0.9})`; g.fillRect(0, 0, W, W); } });
  }

  function disegna() {
    requestAnimationFrame(disegna);
    if (!attivo() || !T || !T.visibile()) return;
    const ctx = ctxF, p = ctx.partita, g = T.g();
    const tm = document.querySelector('.cf-tempo');
    if (tm) { const ms = resta(p); const t = `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`; if (tm.textContent !== t) { tm.textContent = t; tm.classList.toggle('poco', ms < 15000); } }
    vassoio(g);
    const ora = performance.now();
    if (fasi.length) {
      if (!faseDal) { faseDal = ora; if (fasi[0].inizio) fasi[0].inizio(); }
      const f = fasi[0], u = Math.min(1, (ora - faseDal) / f.durata);
      f.disegna(g, u);
      if (u >= 1) { fasi.shift(); faseDal = 0; if (!fasi.length) aggiornaPunti(); }
    } else {
      const L = locale(ctx);
      tavola(g, L, sel != null ? new Set([sel]) : new Set());
      if (sel != null) { const [x, y] = centro(sel); const b = 1 + Math.sin(ora / 120) * 0.06; g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(x - LATO / 2 + 4, y - LATO / 2 + 4, LATO - 8, LATO - 8); caramella(g, x, y, L.c[sel], L.s[sel], b); }
    }
    // i punti che salgono
    scritte = scritte.filter((s) => ora - s.t < 900);
    for (const s of scritte) {
      const [x, y] = centro(s.i), u = (ora - s.t) / 900;
      g.globalAlpha = 1 - u; g.font = '800 34px system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#3b1f4a';
      g.strokeText(s.testo, x, y - u * 50); g.fillStyle = '#fff6a8'; g.fillText(s.testo, x, y - u * 50); g.globalAlpha = 1;
    }
    if (p.finita || resta(p) <= 0) { g.fillStyle = 'rgba(30,10,40,.55)'; g.fillRect(0, 0, W, W); g.fillStyle = '#fff'; g.font = '700 54px "Young Serif", Georgia, serif'; g.textAlign = 'center'; g.fillText('Tempo!', W / 2, W / 2); }
  }
  requestAnimationFrame(disegna);
  function aggiornaPunti() { const el = document.querySelector('.cf-punti'); if (el && ctxF && ctxF.ui.loc) el.textContent = ctxF.ui.loc.punti; }

  // ---- comandi ----
  function prova(i, j) {
    const ctx = ctxF, L = locale(ctx);
    sel = null;
    const prima = Cl().copia(L), r = Cl().scambia(L, i, j);
    anima(prima, i, j, r);
    if (r.errore) { suono([[200, 0.08]], { tipo: 'square', volume: 0.03 }); return; }
    R().invia(ctx, { tipo: 'scambia', i, j });
  }
  const cellaDi = (e) => { const [x, y] = T.punto(e); const cx = Math.floor(x / LATO), cy = Math.floor(y / LATO); return cx < 0 || cy < 0 || cx >= N || cy >= N ? -1 : cy * N + cx; };
  function premi(e) {
    if (!attivo() || !puoi(ctxF) || fasi.length || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    const i = cellaDi(e);
    if (i < 0) return;
    if (sel != null && sel !== i && Cl().vicine(sel, i)) { const a = sel; prova(a, i); return; }
    sel = sel === i ? null : i;
    giu = { i, id: e.pointerId, xy: T.punto(e) };
  }
  document.addEventListener('pointermove', (e) => {
    if (!giu || e.pointerId !== giu.id || !attivo()) return;
    const [x, y] = T.punto(e), dx = x - giu.xy[0], dy = y - giu.xy[1];
    if (Math.hypot(dx, dy) < LATO * 0.45) return;
    const i = giu.i, [cx, cy] = [i % N, Math.floor(i / N)];
    const j = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? (cx < N - 1 ? i + 1 : -1) : (cx > 0 ? i - 1 : -1)) : (dy > 0 ? (cy < N - 1 ? i + N : -1) : (cy > 0 ? i - N : -1));
    giu = null;
    if (j >= 0 && !fasi.length) prova(i, j);
  }, { passive: true });
  const su = (e) => { if (giu && e.pointerId === giu.id) giu = null; };
  document.addEventListener('pointerup', su); document.addEventListener('pointercancel', su);

  const tavolo = {
    libero: true,
    reset(ctx) { ctxF = ctx; R().attiva(ctx); },
    panno(ctx) {
      const p = ctx.partita, L = locale(ctx);
      const rec = p.finita && p.record && p.record.length ? `<div class="cf-record"><b>🏆 Punteggi migliori · ${Math.round(p.durata / 60000)} min</b><ol>${p.record.map((x, k) => `<li class="${k === p.posizioneRecord ? 'nuovo' : ''}">${x.punti} punti</li>`).join('')}</ol></div>` : '';
      const classifica = p.sfida && p.finita ? `<ol class="cf-classifica">${p.altri.map((_, i) => i).sort((a, b) => p.puntiAltri[b] - p.puntiAltri[a]).map((i, k) => `<li class="${i === ctx.mio ? 'io' : ''}"><b>${k + 1}°</b> ${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <span>${p.puntiAltri[i]} punti</span></li>`).join('')}</ol>` : '';
      return `<div class="cf ${p.finita ? 'finito' : ''}">
        <div class="cf-barra"><span>⏱ <b class="cf-tempo">${Math.ceil(resta(p) / 1000)}</b></span><span>🍬 <b class="cf-punti">${fasi.length ? p.punti : L.punti}</b> punti</span><span>Mosse <b>${p.mosse}</b></span></div>
        <div class="cf-box"></div>
        ${!p.finita && p.sfida && !p.ritirato ? '<div class="cf-comandi"><button type="button" class="bottone leggero" data-az="arrenditi">🏳️ Mi ritiro</button></div>' : ''}
        ${classifica}${rec}</div>`;
    },
    dopo(ctx) {
      ctxF = ctx; R().attiva(ctx);
      const t = tela();
      if (!t.tela._pronto) { t.tela._pronto = true; t.tela.addEventListener('pointerdown', premi); t.tela.setAttribute('aria-label', 'Griglia delle caramelle'); }
      t.metti('.cf-box', { W, H: W, sotto: window.matchMedia('(pointer: coarse)').matches ? 110 : 120, max: 0.85 });
      if (ctx.partita.finita && primaVolta(ctx.ui, 'cf-fine')) suono([[784, 0.1], [988, 0.1], [1175, 0.3]], { volume: 0.07 });
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.sfida ? 'Sfida: chi fa più punti?' : 'Fai più punti che puoi!'; },
    punteggio(ctx) { const p = ctx.partita; return p.sfida ? p.puntiAltri.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x}</b></span>`).join('') + '<span class="obiettivo">punti</span>' : ''; },
    infoPosto(ctx, posto) { const p = ctx.partita; return `<span class="rp-info">${p.puntiAltri[posto]} punti · ${p.mosseAltri[posto]} mosse</span>`; },
    clic(ctx, el) { if (el.dataset.az === 'arrenditi' && confirm('Vuoi ritirarti dalla sfida?')) R().invia(ctx, { tipo: 'arrenditi' }); },
  };

  Object.assign(window.Tavoli, { caramelle: tavolo });
})();

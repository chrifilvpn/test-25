// TIGERBALL: giungla vista di lato, la fionda, le palline tigrate (una per giocatore, gli altri un po' trasparenti),
// il cesto con le orecchie da tigre. Si mira trascinando all'indietro; la linea tratteggiata mostra l'inizio del volo.
(() => {
  const { COLORI } = window.Arena;
  const TL = window.TigerLivelli;
  let ctxT = null, fionda = null, ultimoS = null;
  const attiva = () => ctxT && ctxT.partita && ctxT.partita.gioco === 'tigerball' && !ctxT.partita.finita;
  const mia = () => ultimoS && ultimoS.s && ultimoS.s.b[ctxT.mio];
  function coord(e) { const tela = document.querySelector('.ar-tela'); const r = tela.getBoundingClientRect(), p = ctxT.partita; return [((e.clientX - r.left) / r.width) * p.W, ((e.clientY - r.top) / r.height) * p.H]; }
  const tiro = (f) => { const dx = f.x0 - f.x, dy = f.y0 - f.y, l = Math.hypot(dx, dy); return { a: Math.atan2(dy, dx), f: Math.min(1, l / 180), l }; };
  document.addEventListener('pointerdown', (e) => {
    if (!attiva() || !e.target.classList || !e.target.classList.contains('ar-tela') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const b = mia(); if (!b || b.s !== 'p' || ultimoS.fase !== 'gioco') return;
    e.preventDefault(); const [x, y] = coord(e); fionda = { id: e.pointerId, x0: x, y0: y, x, y };
    try { e.target.setPointerCapture(e.pointerId); } catch (_) { /* niente */ }
  }, { passive: false });
  document.addEventListener('pointermove', (e) => { if (fionda && e.pointerId === fionda.id) { [fionda.x, fionda.y] = coord(e); e.preventDefault(); } }, { passive: false });
  const lascia = (e) => {
    if (!fionda || e.pointerId !== fionda.id) return;
    const t = tiro(fionda); fionda = null;
    if (t.l > 14 && attiva()) { ctxT.emetti('azione', { tipo: 'tira', a: Math.round(t.a * 1000) / 1000, f: Math.round(t.f * 1000) / 1000 }); window.Nuovi.suono([[260, 0.05], [520, 0.08]], { tipo: 'triangle', volume: 0.08 }); }
  };
  document.addEventListener('pointerup', lascia); document.addEventListener('pointercancel', () => { fionda = null; });

  function linea(g, [x1, y1, x2, y2], col, spessore) { g.strokeStyle = col; g.lineWidth = spessore; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function pallina(g, x, y, giro, colore, alfa, io) {
    const r = TL.R_PALLA;
    g.save(); g.globalAlpha = alfa; g.translate(x, y); g.rotate(giro);
    g.fillStyle = '#f39a1e'; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
    g.save(); g.clip(); g.strokeStyle = '#1b1b1b'; g.lineWidth = 2.6; for (const k of [-6, 0, 6]) { g.beginPath(); g.moveTo(k - 4, -r); g.quadraticCurveTo(k + 4, 0, k - 4, r); g.stroke(); } g.restore();
    g.strokeStyle = colore; g.lineWidth = io ? 3.5 : 2.5; g.beginPath(); g.arc(0, 0, r + 1, 0, Math.PI * 2); g.stroke();
    g.restore();
  }
  function cesto(g, c) {
    const nero = '#1b1b1b';
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(c.x, c.y - c.h, c.w, c.h);
    for (const s of [[c.x, c.y - c.h, c.x, c.y], [c.x, c.y, c.x + c.w, c.y], [c.x + c.w, c.y, c.x + c.w, c.y - c.h]]) linea(g, s, '#f39a1e', 10);
    g.strokeStyle = nero; g.lineWidth = 3; for (let k = 10; k < c.h; k += 16) { g.beginPath(); g.moveTo(c.x - 5, c.y - k); g.lineTo(c.x + 5, c.y - k - 6); g.moveTo(c.x + c.w - 5, c.y - k - 6); g.lineTo(c.x + c.w + 5, c.y - k); g.stroke(); }
    // orecchie e musetto della tigre
    for (const ox of [c.x, c.x + c.w]) { g.fillStyle = '#f39a1e'; g.beginPath(); g.moveTo(ox - 11, c.y - c.h - 2); g.lineTo(ox, c.y - c.h - 22); g.lineTo(ox + 11, c.y - c.h - 2); g.closePath(); g.fill(); g.fillStyle = '#ffd9b0'; g.beginPath(); g.moveTo(ox - 5, c.y - c.h - 4); g.lineTo(ox, c.y - c.h - 14); g.lineTo(ox + 5, c.y - c.h - 4); g.fill(); }
    g.fillStyle = '#fff'; g.font = '700 13px system-ui'; g.textAlign = 'center'; g.fillText('🐯', c.x + c.w / 2, c.y + 20);
  }

  const tavolo = window.Arena.tavolo({
    id: 'tigerball', menoEMeglio: true,
    comandi: 'nessuno',
    clicAzione: false,
    obiettivo: 'tiri (meno è meglio)',
    istruzioni: () => `${window.Arena.touch() ? 'Appoggia il dito sul campo' : 'Premi sul campo'}, trascina all'indietro come una fionda e lascia: la pallina parte dalla parte opposta. Fai canestro nel cesto della tigre!`,
    statoGioco: (ctx, s) => { const b = s.s.b[ctx.mio]; return !b ? 'Guarda' : b.s === 'd' ? 'Dentro! 🐯' : b.s === 'p' ? 'Tira!' : 'In volo…'; },
    sottotitolo: (p) => (p.extra ? `${TL.LIVELLI[p.extra.liv].nome}${p.extra.modo === 'coop' ? ' · Cooperazione 🤝' : ''}` : ''),
    hud: (ctx, s) => { const b = s.s.b[ctx.mio]; const coop = ctx.partita.extra && ctx.partita.extra.modo === 'coop'; return `<span>🎯 tiri qui: <b>${b ? b.n : 0}</b></span><span>${coop ? `🤝 squadra: <b>${s.s.tt.reduce((a, x) => a + x, 0)}</b>` : `in tutto: <b>${s.s.tt[ctx.mio]}</b>`}</span><span>🐯 dentro ${s.s.b.filter((x) => x.s === 'd').length}/${s.s.b.length}</span><span>⏱️ ${s.s.resta} s</span>`; },
    fineRound: (p, s, ctx) => (p.extra && p.extra.modo === 'coop' ? `Tiri di squadra: ${s.s.tt.reduce((a, x) => a + x, 0)}` : `I tuoi tiri in tutto: ${s.s.tt[ctx.mio]}`),
    disegna(g, p, s, prima, u, ctx) {
      ctxT = ctx; ultimoS = s;
      const ex = p.extra; if (!ex || !TL) return;
      const L = TL.LIVELLI[ex.liv], W = p.W, H = p.H;
      const pr = prima && prima.s && prima.s.b ? prima : null;
      const t = pr ? pr.t + (s.t - pr.t) * u : s.t;
      // giungla
      const cielo = g.createLinearGradient(0, 0, 0, H); cielo.addColorStop(0, '#bfe6b0'); cielo.addColorStop(1, '#5d9e4f'); g.fillStyle = cielo; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(40,90,40,.35)'; for (let k = 0; k < 9; k++) { g.beginPath(); g.ellipse(k * 130 + 40, H - 30, 90, 160, 0, Math.PI, 0); g.fill(); }
      g.strokeStyle = 'rgba(60,110,50,.5)'; g.lineWidth = 3; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(k * 190 + 60, 0); g.quadraticCurveTo(k * 190 + 90, 90, k * 190 + 70, 160 + (k % 3) * 30); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, H - 8, W, 8);
      // muri e piattaforme
      const c = L.cesto, fissi = L.seg;
      for (const sg of fissi) { linea(g, sg, '#6b4526', 14); linea(g, [sg[0], sg[1] - 3, sg[2], sg[3] - 3], '#9a6a3c', 5); }
      linea(g, [0, 0, 0, H - 40], '#6b4526', 10); linea(g, [W, 0, W, H - 40], '#6b4526', 10);
      for (const [cx, cy, r, e] of L.molle || []) {
        if (r > 14) { g.fillStyle = '#d6352b'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r * 0.62, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, r * 0.25, 0, Math.PI * 2); g.fill(); }
        else { g.fillStyle = '#e6c04a'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#8a6d17'; g.lineWidth = 2; g.stroke(); void e; }
      }
      for (const q of L.pale || []) { const sg = TL.pala(q, t); linea(g, sg, '#4f5d73', 14); linea(g, sg, '#8595ad', 6); g.fillStyle = '#2d3645'; g.beginPath(); g.arc(q.cx, q.cy, 9, 0, Math.PI * 2); g.fill(); }
      for (const q of L.blocchi || []) { const b = TL.blocco(q, t); g.fillStyle = '#7b8494'; g.fillRect(b.x, b.y, b.w, b.h); g.strokeStyle = '#4c5260'; g.lineWidth = 3; g.strokeRect(b.x, b.y, b.w, b.h); g.fillStyle = 'rgba(255,255,255,.15)'; for (let y = b.y + 12; y < b.y + b.h; y += 30) g.fillRect(b.x + 4, y, b.w - 8, 4); }
      cesto(g, c);
      // la fionda
      const [fx, fy] = L.partenza;
      g.strokeStyle = '#5b3a1a'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(fx, fy + 70); g.lineTo(fx, fy + 28); g.lineTo(fx - 16, fy + 4); g.moveTo(fx, fy + 28); g.lineTo(fx + 16, fy + 4); g.stroke();
      // le palline: prima gli altri
      const io = s.s.b[ctx.mio];
      const ordine = s.s.b.map((_, i) => i).filter((i) => i !== ctx.mio).concat(ctx.mio);
      for (const i of ordine) {
        const b = s.s.b[i]; if (!b) continue;
        const a = pr && pr.s.b[i];
        let x = b.x, y = b.y;
        if (a && a.s === b.s && Math.hypot(a.x - b.x, a.y - b.y) < 120) { x = a.x + (b.x - a.x) * u; y = a.y + (b.y - a.y) * u; }
        const mio = i === ctx.mio;
        if (mio && fionda && b.s === 'p') { const tr = tiro(fionda), k = tr.f * 40; x = fx - Math.cos(tr.a) * k; y = fy - Math.sin(tr.a) * k; }
        if (mio && b.s === 'p') { g.strokeStyle = '#3b2412'; g.lineWidth = 3; g.beginPath(); g.moveTo(fx - 16, fy + 4); g.lineTo(x, y); g.lineTo(fx + 16, fy + 4); g.stroke(); }
        pallina(g, x, y, (b.g * Math.PI) / 180, COLORI[i % COLORI.length], mio ? 1 : 0.5, mio);
        if (!mio && b.s !== 'd') { g.font = '600 11px system-ui'; g.textAlign = 'center'; g.fillStyle = 'rgba(20,30,20,.7)'; g.fillText(ctx.nome(i).slice(0, 9), x, y - 16); }
      }
      // la linea tratteggiata del tiro (solo il primo tratto, senza i rimbalzi)
      if (fionda && io && io.s === 'p') {
        const tr = tiro(fionda);
        let x = fx, y = fy, vx = Math.cos(tr.a) * tr.f * TL.V_MAX, vy = Math.sin(tr.a) * tr.f * TL.V_MAX;
        g.fillStyle = 'rgba(255,255,255,.9)';
        for (let k = 0; k < 16; k++) { for (let j = 0; j < 4; j++) { vy += TL.GRAV / 120; x += vx / 120; y += vy / 120; } g.beginPath(); g.arc(x, y, 3.2 - k * 0.12, 0, Math.PI * 2); g.fill(); }
        g.font = '700 16px system-ui'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(`${Math.round(tr.f * 100)}%`, fx, fy - 30);
      }
    },
    dopoTick(ctx, d, prima) {
      ctxT = ctx;
      const a = prima && prima.s.b[ctx.mio], b = d.s.b[ctx.mio];
      if (a && b && a.s !== 'd' && b.s === 'd') window.Nuovi.suono([[523, 0.08], [659, 0.08], [784, 0.2]], { volume: 0.08 });
      if (a && b && a.s === 'v' && b.s === 't') window.Nuovi.suono([[220, 0.12]], { volume: 0.05 });
    },
  });
  tavolo.infoPosto = (ctx, posto) => `${ctx.partita.punti[posto]} tiri`;
  Object.assign(window.Tavoli, { tigerball: tavolo });
})();

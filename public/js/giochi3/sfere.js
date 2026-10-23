// CATENA DI BIGLIE: il tempio di pietra con il solco del percorso, la tana da cui escono le biglie e il buco d'oro in
// fondo (che si arrossa quando la catena si avvicina), le biglie lucide con un simbolo per colore (si distinguono anche
// senza i colori), la rana di pietra che guarda il puntatore con la biglia in bocca e quella dopo sulla schiena, la
// linea di mira, gli scoppi con i punti e le reazioni a catena. Gli altri giocatori in piccolo, in alto.
(() => {
  const { COLORI: COL_GIOC } = window.Arena;
  const TINTE = ['#e8453c', '#2f7fd8', '#2fb35a', '#f2c230', '#9b59d0', '#f07a2a'];
  const SIMBOLI = ['●', '▲', '■', '◆', '★', '✚'];
  let ex = null, ctxS = null, mira = null, particelle = [], scritte = [], perso = 0, sfondo = null;
  const ora = () => performance.now() / 1000;
  const suono = (n, o) => window.Nuovi && window.Nuovi.suono && window.Nuovi.suono(n, o);
  const attivo = () => ctxS && ctxS.partita && ctxS.partita.gioco === 'sfere' && !ctxS.partita.finita && document.querySelector('.panno-sfere');
  const scambia = () => { if (attivo()) { ctxS.invia({ tipo: 'scambia' }); suono([[440, 0.04], [520, 0.05]], { tipo: 'triangle', volume: 0.04 }); } };

  function puntoDi(e) {
    const t = e.target; if (!t || !t.classList || !t.classList.contains('ar-tela') || !ex) return null;
    const r = t.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * ex.W, ((e.clientY - r.top) / r.height) * ex.H];
  }
  document.addEventListener('pointermove', (e) => { if (attivo() && e.pointerType !== 'touch') { const q = puntoDi(e); if (q) mira = q; } });
  document.addEventListener('pointerdown', (e) => { if (attivo()) { const q = puntoDi(e); if (q) mira = q; } });
  document.addEventListener('contextmenu', (e) => { if (attivo() && e.target && e.target.classList && e.target.classList.contains('ar-tela')) { e.preventDefault(); scambia(); } });
  document.addEventListener('keydown', (e) => { if (attivo() && ['x', 'q', 'shift'].includes(e.key.toLowerCase()) && !(e.target.closest && e.target.closest('input, textarea'))) scambia(); });

  function pos(s) {
    const pt = ex.percorso, k = Math.max(0, Math.min(pt.length - 1.001, s / ex.passo)), i = Math.floor(k), f = k - i;
    return [pt[i][0] + (pt[i + 1][0] - pt[i][0]) * f, pt[i][1] + (pt[i + 1][1] - pt[i][1]) * f];
  }
  // lo sfondo (pietra, solco, tana e buco) si disegna una volta sola
  function preparaSfondo() {
    const c = document.createElement('canvas'); c.width = ex.W * 2; c.height = ex.H * 2;
    const g = c.getContext('2d'); g.scale(2, 2);
    const s = g.createRadialGradient(ex.W / 2, ex.H / 2, 50, ex.W / 2, ex.H / 2, 560); s.addColorStop(0, '#6f8a5a'); s.addColorStop(1, '#2f3f2a');
    g.fillStyle = s; g.fillRect(0, 0, ex.W, ex.H);
    // lastre di pietra
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2;
    for (let y = 0; y < ex.H; y += 75) for (let x = (y / 75) % 2 ? -60 : 0; x < ex.W; x += 120) g.strokeRect(x + 2, y + 2, 116, 71);
    // muschio
    for (let k = 0; k < 90; k++) { const x = (Math.sin(k * 91.7) * 0.5 + 0.5) * ex.W, y = (Math.sin(k * 37.3) * 0.5 + 0.5) * ex.H; g.fillStyle = 'rgba(120,170,80,.12)'; g.beginPath(); g.arc(x, y, 6 + (k % 5) * 3, 0, Math.PI * 2); g.fill(); }
    // il solco
    const linea = (w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); ex.percorso.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
    linea(ex.D + 14, 'rgba(0,0,0,.35)'); linea(ex.D + 8, '#b9a27a'); linea(ex.D + 2, '#5b4a35'); linea(4, 'rgba(255,255,255,.08)');
    // la tana
    const [tx, ty] = ex.percorso[0];
    g.fillStyle = '#1d140c'; g.beginPath(); g.arc(Math.max(20, tx), ty, 30, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8b7350'; g.lineWidth = 6; g.stroke();
    sfondo = c;
  }
  function biglia(g, x, y, r, c, alfa = 1) {
    g.globalAlpha = alfa;
    const s = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    s.addColorStop(0, '#fff'); s.addColorStop(0.25, TINTE[c]); s.addColorStop(1, 'rgba(0,0,0,.65)');
    g.fillStyle = TINTE[c]; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = s; g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.font = `${Math.round(r * 0.8)}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(SIMBOLI[c], x, y + 1);
    g.textBaseline = 'alphabetic'; g.globalAlpha = 1;
  }
  function buco(g, pericolo, t) {
    const [x, y] = ex.percorso[ex.percorso.length - 1];
    const rosso = Math.min(1, Math.max(0, (pericolo - 70) / 25));
    g.fillStyle = `rgba(255,${Math.round(200 - rosso * 170)},40,${0.25 + rosso * 0.35 * (0.6 + 0.4 * Math.sin(t * 8))})`;
    g.beginPath(); g.arc(x, y, 34 + rosso * 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0a0705'; g.beginPath(); g.arc(x, y, 24, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#d6b04a'; g.lineWidth = 5; g.stroke();
    g.fillStyle = '#d6b04a'; g.font = '18px system-ui'; g.textAlign = 'center'; g.fillText('💀', x, y + 6);
  }
  function rana(g, x, y, ang, att, pro, t) {
    g.save(); g.translate(x, y); g.rotate(ang + Math.PI / 2);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(4, 6, 40, 44, 0, 0, Math.PI * 2); g.fill();
    // zampe
    g.fillStyle = '#5f7a55'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 32, 18, 12, 18, s * 0.5, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(s * 28, -20, 9, 13, -s * 0.5, 0, Math.PI * 2); g.fill(); }
    const corpo = g.createRadialGradient(-10, -10, 5, 0, 0, 44); corpo.addColorStop(0, '#a8b9a0'); corpo.addColorStop(1, '#55704c');
    g.fillStyle = corpo; g.beginPath(); g.ellipse(0, 0, 34, 38, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.stroke();
    // crepe nella pietra
    g.strokeStyle = 'rgba(40,50,35,.45)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-14, 10); g.lineTo(-6, 18); g.lineTo(-10, 28); g.moveTo(12, 6); g.lineTo(18, 14); g.stroke();
    // occhi
    for (const s of [-1, 1]) { g.fillStyle = '#d9e3cf'; g.beginPath(); g.arc(s * 15, -26, 9, 0, Math.PI * 2); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(s * 15, -28, 4, 0, Math.PI * 2); g.fill(); }
    // la biglia dopo, sulla schiena
    if (pro !== undefined) biglia(g, 0, 16, 9, pro);
    // la biglia in bocca
    if (att !== undefined) biglia(g, 0, -40, 15, att);
    g.restore();
  }

  const tavolo = window.Arena.tavolo({
    id: 'sfere',
    mouse: 'mira',
    comandi: 'nessuno',
    obiettivo: 'punti',
    istruzioni: () => (window.Arena.touch() ? 'Tocca il campo per sparare in quella direzione. Tocca la rana o 🔄 per cambiare biglia. Tre dello stesso colore scoppiano!' : 'Muovi il mouse per mirare e clicca per sparare. Tasto destro (o clic sulla rana, o X) per scambiare la biglia. Tre dello stesso colore scoppiano!'),
    statoGioco: (ctx, s) => (s.s.st === 'vuota' ? 'Catena distrutta! 🐸' : s.s.st === 'perso' ? 'Finito nel buco 🕳️' : 'Spara! 🐸'),
    hud: (ctx, s) => `<span>🔮 ${s.s.c.length + s.s.da} biglie</span><span>⭐ ${s.s.pt[ctx.mio] || 0} punti</span>${s.s.w ? '<span>⏸️ catena ferma</span>' : ''}`,
    fineRound: (p, s, ctx) => `Hai fatto ${p.punti[ctx.mio]} punti`,
    // un clic sulla rana scambia le biglie invece di sparare
    accetta: (mx, my) => { if (ex && Math.hypot(mx - ex.tir.x, my - ex.tir.y) < 42) { scambia(); return false; } return true; },
    sopra: (ctx, d) => (d.fase === 'gioco' && d.s.st === 'gioco' ? '<button type="button" class="sf-scambia" data-az="scambia" title="Scambia la biglia (tasto destro)" aria-label="Scambia la biglia">🔄</button>' : ''),
    clic: (ctx, el) => { if (el.dataset.az === 'scambia') scambia(); },
    dopoTick(ctx, d) {
      ctxS = ctx; ex = ctx.partita.extra || ex;
      const adesso = ora();
      for (const e of d.s.e || []) {
        if (e[0] === 's') {
          const [, x, y, c, n, molt, pt] = e;
          for (let k = 0; k < n * 6; k++) { const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 220; particelle.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c, t: adesso }); }
          scritte.push({ x, y, txt: molt > 1 ? `+${pt} ×${molt}!` : `+${pt}`, grande: molt > 1, t: adesso });
          suono(molt > 1 ? [[523, 0.06], [659, 0.06], [784, 0.06], [1046, 0.12]] : [[700 + n * 40, 0.05], [900, 0.06]], { volume: 0.06 });
        } else if (e[0] === 't') suono([[260, 0.04]], { tipo: 'triangle', volume: 0.04 });
        else if (e[0] === 'i') suono([[180, 0.03]], { tipo: 'square', volume: 0.02 });
        else if (e[0] === 'p') { perso = adesso; suono([[300, 0.15], [200, 0.15], [120, 0.4]], { tipo: 'sawtooth', volume: 0.08 }); }
        else if (e[0] === 'v') { scritte.push({ x: ex.W / 2, y: ex.H / 2 - 60, txt: `Catena distrutta! +${e[1]}`, grande: true, t: adesso }); suono([[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.3]], { volume: 0.08 }); }
      }
    },
    disegna(g, p, s, prima, u, ctx) {
      ctxS = ctx; ex = p.extra || ex;
      if (!ex) return;
      if (!sfondo) preparaSfondo();
      const adesso = ora(), st = s.s;
      g.drawImage(sfondo, 0, 0, ex.W, ex.H);
      const mio = st.o[ctx.mio] || [0, 0, 0];
      buco(g, mio[2], adesso);
      // la catena (interpolata)
      const pr = new Map(prima ? prima.s.c.map((b) => [b[0], b[2]]) : []);
      for (const [id, c, sv] of st.c) {
        const a = pr.get(id), sx = a !== undefined && Math.abs(a - sv) < 60 ? a + (sv - a) * u : sv;
        if (sx < -ex.D / 2) continue;
        const [x, y] = pos(sx);
        biglia(g, x, y, ex.D / 2 - 0.5, c);
      }
      // i tiri in volo
      const pk = prima ? prima.s.k : [];
      st.k.forEach(([x, y, c], i) => { const q = pk[i]; const xx = q && Math.hypot(q[0] - x, q[1] - y) < 80 ? q[0] + (x - q[0]) * u : x, yy = q && Math.hypot(q[0] - x, q[1] - y) < 80 ? q[1] + (y - q[1]) * u : y; biglia(g, xx, yy, ex.D / 2 - 1, c); });
      // la mira
      const t = ex.tir;
      const ang = mira ? Math.atan2(mira[1] - t.y, mira[0] - t.x) : -Math.PI / 2;
      if (mira && st.st === 'gioco' && !window.Arena.touch()) {
        g.strokeStyle = 'rgba(255,255,255,.45)'; g.setLineDash([6, 8]); g.lineWidth = 2;
        g.beginPath(); g.moveTo(t.x + Math.cos(ang) * 50, t.y + Math.sin(ang) * 50); g.lineTo(t.x + Math.cos(ang) * 260, t.y + Math.sin(ang) * 260); g.stroke(); g.setLineDash([]);
      }
      rana(g, t.x, t.y, ang, st.st === 'gioco' ? st.a : undefined, st.st === 'gioco' ? st.n : undefined, adesso);
      // scoppi
      particelle = particelle.filter((z) => adesso - z.t < 0.5);
      for (const z of particelle) { const tt = adesso - z.t; g.globalAlpha = 1 - tt / 0.5; g.fillStyle = TINTE[z.c]; g.beginPath(); g.arc(z.x + z.vx * tt, z.y + z.vy * tt, 4 * (1 - tt), 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1;
      scritte = scritte.filter((w) => adesso - w.t < 1.3);
      g.textAlign = 'center';
      for (const w of scritte) {
        const tt = adesso - w.t; g.globalAlpha = Math.min(1, (1.3 - tt) * 3); g.font = `900 ${w.grande ? 30 : 20}px system-ui`;
        g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText(w.txt, w.x, w.y - tt * 35); g.fillStyle = w.grande ? '#ffe066' : '#fff'; g.fillText(w.txt, w.x, w.y - tt * 35);
      }
      g.globalAlpha = 1;
      if (st.st === 'perso') { g.fillStyle = `rgba(80,0,0,${Math.min(0.45, (adesso - perso) * 0.6)})`; g.fillRect(0, 0, ex.W, ex.H); g.fillStyle = '#fff'; g.font = '900 34px system-ui'; g.fillText('Le biglie sono arrivate al buco', ex.W / 2, ex.H / 2 - 70); }
      // gli altri giocatori, in alto a sinistra
      if (st.o.length > 1) {
        let y = 14;
        st.o.forEach(([stato, resta, peric], k) => {
          if (k === ctx.mio) return;
          g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(10, y, 170, 34);
          g.fillStyle = COL_GIOC[k % COL_GIOC.length]; g.font = '700 13px system-ui'; g.textAlign = 'left';
          g.fillText(`${ctx.nome(k).slice(0, 12)} ${stato === 1 ? '🏆' : stato === 2 ? '🕳️' : ''}`, 16, y + 14);
          g.fillStyle = '#ddd'; g.font = '11px system-ui'; g.fillText(`${resta} biglie`, 120, y + 14);
          g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(16, y + 21, 158, 6);
          g.fillStyle = peric > 80 ? '#ff5a4a' : '#ffd23f'; g.fillRect(16, y + 21, 158 * Math.min(1, peric / 100), 6);
          y += 40;
        });
      }
    },
  });
  // la rana è il nostro "cursore": si rifà lo sfondo se cambia il percorso
  const reset0 = tavolo.reset;
  tavolo.reset = (ctx) => { if (ctx.partita && ctx.partita.extra && ex && ctx.partita.extra.nome !== ex.nome) sfondo = null; ctxS = ctx; ex = ctx.partita.extra || ex; if (!ex || !ex.percorso) ex = null; reset0.call(tavolo, ctx); };
  Object.assign(window.Tavoli, { sfere: tavolo });
})();
